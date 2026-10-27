// Browser smoke tests (Playwright). Run: npm run test:e2e
// Needs Playwright + Chromium: `npm i -D playwright && npx playwright install chromium`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { createServer } from '../scripts/dev-server.js';

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try {
    return require('playwright');
  } catch {
    return require(`${execSync('npm root -g').toString().trim()}/playwright`);
  }
}
const { chromium } = loadPlaywright();

let server, mock, browser, base;
const PASSWORD = 'e2e-test-password';
const auth = { authorization: `Bearer ${PASSWORD}` };

before(async () => {
  // Fake Anthropic API: understands "6 months" for the duration question, flags "fainted" as urgent.
  mock = http
    .createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const text = JSON.parse(body).messages[0].content;
        const reply = text.match(/<reply>([\s\S]*)<\/reply>/)[1];
        let input = { understood: false, option_ids: [], acknowledgement: 'Could you rephrase that?', safety: 'none' };
        if (/fainted/.test(reply)) input = { understood: false, option_ids: [], acknowledgement: 'Thanks for telling me.', safety: 'urgent' };
        else if (/half a year|6 months/.test(reply)) input = { understood: true, option_ids: ['over6'], acknowledgement: 'Thanks, got it.', safety: 'none' };
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ content: [{ type: 'tool_use', name: 'record_answer', input }] }));
      });
    })
    .listen(0);
  await new Promise((r) => mock.once('listening', r));
  Object.assign(process.env, {
    EXPORT_PASSWORD: PASSWORD,
    ANTHROPIC_API_KEY: 'test-key',
    ANTHROPIC_API_URL: `http://localhost:${mock.address().port}/v1/messages`,
  });
  server = createServer().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://localhost:${server.address().port}`;
  browser = await chromium.launch();
});

after(async () => {
  await browser?.close();
  server?.close();
  mock?.close();
});

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(String(e)));
  return page;
}

async function consentAndBaseline(page, code) {
  await page.goto(`${base}/`);
  assert.equal(await page.isDisabled('button:has-text("Get started")'), true, 'cannot continue without both boxes');
  await page.check('#adult');
  assert.equal(await page.isDisabled('button:has-text("Get started")'), true);
  await page.check('#consent');
  if (code) await page.fill('#tester-code', code);
  await page.click('button:has-text("Get started")');
  await page.waitForURL('**/start');
  await page.check('input[name=screener][value=current]');
  await page.click('button:has-text("Continue")');
  await page.waitForURL('**/intake');
}

const PATH_CHIP = { 1: 'which professional', 2: 'whose advice', 3: 'still don' };
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** An intake option button. Exact label match unless `partial`. */
const option = (page, label, partial = false) =>
  page.locator('button.option', { hasText: partial ? label : new RegExp(`^${esc(label)}$`) });

async function tapIntake(page, path, { prior = 'Yes, more than one' } = {}) {
  await option(page, 'My period is absent').click();
  await option(page, 'Over 6 months').click();
  await option(page, prior).click();
  if (prior !== 'No') {
    await option(page, 'OB-GYN').click();
    await page.click('.question-card button:has-text("Continue")');
  }
  await option(page, PATH_CHIP[path], true).click();
}

// Events are batched in the browser (flushed every ~1.5s), so give them time to arrive.
const settle = (page) => page.waitForTimeout(2000);

async function exportCsv(type) {
  return (await fetch(`${base}/api/export?type=${type}`, { headers: auth })).text();
}

test('front door: quick questions, how we can help, research before/after, book, two ratings', async () => {
  const page = await newPage();
  await consentAndBaseline(page, 'P11');
  await tapIntake(page, 1);
  await page.click('button:has-text("See how we can help")');
  await page.waitForURL('**/help');
  assert.match(await page.locator('h1').textContent(), /how we can help/);
  assert.match(await page.locator('.heard').textContent(), /absent for over 6 months/);
  assert.equal(await page.locator('.option-card, .map-tabs').count(), 0, 'no care map anymore');
  // H2 by behavior: no rating questions; opening the research is recorded
  assert.equal(await page.locator('.card-evidence .chip').count(), 0, 'no rating questions');
  await page.click('.consult-card .why summary');
  const src = page.locator('.consult-card .research-src a').first();
  await src.waitFor();
  assert.match(await src.getAttribute('href'), /^https:\/\//);
  // booking form is open on the page
  await page.locator('.consult-card .chip.slot', { hasText: '4:00 PM' }).first().click();
  await page.fill('#cc-contact-help', 'p11@example.com');
  await page.getByLabel(/Anything you want your researcher to know/).fill('Training for a marathon');
  await page.check('#cc-share-help');
  await page.click('button:has-text("Request this time")');
  await page.waitForSelector('.concierge-done');
  assert.match(await page.locator('.concierge-done').textContent(), /prototype, so no call is booked/);
  assert.match(await page.locator('.consultant').textContent(), /Example profile/);
  await page.click('button:has-text("Finish")');
  await page.waitForURL('**/complete');
  await page.waitForSelector('h2:has-text("About your request")');
  await settle(page);
  const sessions = await exportCsv('sessions');
  const headCols = sessions.split('\r\n')[0].split(',');
  const row = sessions.split('\r\n').find((l) => l.includes('P11,'));
  const col = Object.fromEntries(headCols.map((h, i) => [h, row.split(',')[i]]));
  assert.equal(col.screener, 'current');
  assert.equal(col.completed, 'true');
  assert.equal(col.research_opened, 'true');
  assert.equal(col.book_choice, 'booked');
  assert.equal(col.concierge_requested, 'true');
  const reqs = await exportCsv('requests');
  assert.match(reqs, /p11@example\.com/);
  assert.match(reqs, /In her words: Training for a marathon/);
  const events = await exportCsv('events');
  for (const name of ['path_selected', 'map_viewed', 'care_option_expanded', 'concierge_requested', 'decision_selected', 'session_completed']) {
    assert.match(events, new RegExp(name), `${name} logged`);
  }
  assert.doesNotMatch(events + sessions, /My period is absent|over6|Over 6 months|p11@example/, 'tapped answers and contact never in research data');
  assert.deepEqual(page.errors, []);
  await page.context().close();
});

test('tester link fills the code; "not right now" leads to the one-week check-in', async () => {
  const page = await newPage();
  await page.goto(`${base}/?code=P15`);
  assert.match(await page.locator('#tester-hint').textContent(), /P15/);
  assert.match(await page.locator('.why-section').textContent(), /care plan matters/i);
  assert.equal(await page.locator('.why-section .research-src').count(), 0, 'sources wait until after the H2 before-rating');
  await page.check('#adult');
  await page.check('#consent');
  await page.click('button:has-text("Get started")');
  await page.waitForURL('**/start');
  await page.click('button:has-text("Continue")');
  assert.match(await page.locator('[role=alert]').last().textContent(), /Choose one answer/);
  await page.check('input[name=screener][value=past]');
  await page.click('button:has-text("Continue")');
  await page.waitForURL('**/intake');
  await tapIntake(page, 2, { prior: 'No' });
  await page.click('button:has-text("See how we can help")');
  await page.waitForURL('**/help');
  await page.click('button:has-text("Not right now")');
  await page.waitForURL('**/complete');
  await page.fill('#checkin-email', 'tester@example.com');
  await page.click('button:has-text("Check in with me")');
  await page.waitForSelector('text=check in once');
  await settle(page);
  const sessions = await exportCsv('sessions');
  assert.doesNotMatch(sessions, /tester@example\.com/, 'email never in the research export');
  assert.match(sessions.split('\r\n').find((l) => l.includes('P15,')), /P15,past,/);
  const follow = await exportCsv('followups');
  const line = follow.split('\r\n').find((l) => l.includes('tester@example.com'));
  const link = line.match(/https?:\/\/[^,]+\/followup\?s=[a-z0-9]{12}/)[0];
  const later = await newPage();
  await later.goto(link.replace(/^https?:\/\/[^/]+/, base));
  await later.check('input[name=followup_status][value=booked]');
  await later.click('button:has-text("Send")');
  await later.waitForSelector('h2:has-text("Thank you")');
  const after = (await exportCsv('sessions')).split('\r\n').find((l) => l.includes('P15,'));
  assert.match(after, /not_now/);
  assert.match(after, /booked/);
  assert.deepEqual(page.errors, []);
  await page.context().close();
  await later.context().close();
});

test('editing an intake answer updates what we heard', async () => {
  const page = await newPage();
  await consentAndBaseline(page);
  await tapIntake(page, 1);
  await page.click('.qa-edit >> nth=2');
  await option(page, 'No').click();
  await page.click('button:has-text("See how we can help")');
  await page.waitForURL('**/help');
  assert.match(await page.locator('.heard').textContent(), /haven’t talked with a healthcare professional/);
  await settle(page);
  assert.match(await exportCsv('events'), /intake_step_revisited,q3/);
  await page.context().close();
});

test('typed chat answers are understood, and urgent messages show the safety notice', async () => {
  const page = await newPage();
  await consentAndBaseline(page);
  await option(page, 'My period is absent').click();
  await page.fill('.typebox input', 'I fainted yesterday');
  await page.click('.typebox button');
  await page.waitForSelector('.notice.warn:has-text("urgent medical care")');
  await page.fill('.typebox input', 'about half a year');
  await page.click('.typebox button');
  await page.waitForSelector('.qa-a:has-text("Over 6 months")');
  await settle(page);
  const events = await exportCsv('events');
  assert.match(events, /safety_notice_shown,urgent/);
  assert.match(events, /chat_step_answered,q2:typed/);
  assert.doesNotMatch(events + (await exportCsv('sessions')), /fainted|half a year/, 'typed text never stored');
  await page.context().close();
});

test('mobile layout has no horizontal scroll on any screen', async () => {
  const page = await newPage();
  await page.setViewportSize({ width: 320, height: 700 });
  const noScroll = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await page.goto(`${base}/`);
  await noScroll();
  await consentAndBaseline(page);
  await noScroll();
  await tapIntake(page, 2);
  await noScroll();
  await page.click('button:has-text("See how we can help")');
  await page.waitForURL('**/help');
  await noScroll();
  await page.context().close();
});

test('direct links to later screens redirect to the start without consent', async () => {
  const page = await newPage();
  await page.goto(`${base}/help`);
  await page.waitForURL(`${base}/`);
  await page.context().close();
});
