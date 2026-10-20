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
  const scales = page.locator('.likert-scale');
  await scales.nth(0).locator('label').nth(1).click();
  await scales.nth(1).locator('label').nth(2).click();
  await page.click('button:has-text("Continue")');
  await page.waitForURL('**/intake');
}

const PATH_CHIP = { 1: 'which professional', 2: 'whose advice', 3: 'still don' };

async function tapIntake(page, path, { prior = 'Yes, more than one' } = {}) {
  await page.click('button.chip:has-text("My period is absent")');
  await page.click('button.chip:has-text("Over 6 months")');
  await page.click(`button.chip:has-text("${prior}")`);
  if (prior !== 'Not yet') {
    await page.click('button.chip:has-text("OB-GYN")');
    await page.click('.composer button:has-text("Continue")');
    await page.click('button.chip:has-text("I still have questions")');
    await page.click('.composer button:has-text("Continue")');
  }
  await page.click(`button.chip:has-text("${PATH_CHIP[path]}")`);
}

// Events are batched in the browser (flushed every ~1.5s), so give them time to arrive.
const settle = (page) => page.waitForTimeout(2000);

async function exportCsv(type) {
  return (await fetch(`${base}/api/export?type=${type}`, { headers: auth })).text();
}

test('complete flow on each path with distinct emphasis, saved pre/post and events', async () => {
  const firstSection = {};
  for (const path of [1, 2, 3]) {
    const page = await newPage();
    await consentAndBaseline(page, `P1${path}`);
    await tapIntake(page, path);
    await page.click('button:has-text("See my care map")');
    await page.waitForURL('**/map');

    // distinct emphasis
    const headings = await page.locator('main section h2, main section .h2like').allTextContents();
    firstSection[path] = headings.slice(0, 4).join(' | ');
    if (path === 1) assert.equal(await page.locator('table.compare-table').isVisible(), true, 'path 1 shows comparison open');
    if (path === 2) assert.ok(headings.some((h) => /What guidance says/.test(h)), 'path 2 shows known vs uncertain');
    if (path === 3) assert.equal(await page.locator('.option-card.emph').count(), 1, 'path 3 highlights coordination');
    assert.equal(await page.locator('.option-card').count(), 3, 'same three cards on every path');

    // accordion + evidence + source link
    await page.locator('.option-card').first().locator('summary', { hasText: 'relevant' }).click();
    assert.equal(await page.locator('.option-card').first().locator('details').first().getAttribute('open'), '');
    await page.locator('.option-card').nth(1).locator('summary', { hasText: 'evidence' }).click();
    const link = page.locator('.option-card').nth(1).locator('.source a').first();
    assert.match(await link.getAttribute('href'), /^https:\/\/(www\.asrm\.org|academic\.oup\.com)\//);
    const [popup] = await Promise.all([page.waitForEvent('popup').catch(() => null), link.click()]);
    await popup?.close().catch(() => {});

    // copy
    await page.click('button:has-text("Copy summary")');
    await page.waitForSelector('.status:has-text("Copied")');
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(clip, /Questions to bring/);
    assert.doesNotMatch(clip, /absent|6 months/);

    // decision required
    await page.click('button:has-text("Continue to feedback")');
    assert.match(await page.locator('[role=alert]').last().textContent(), /Choose one option/);
    await page.check('input[name=decision][value=use]');
    await page.fill('label:has-text("Why?") + p + textarea', 'The sources helped');
    await page.click('button:has-text("Continue to feedback")');
    await page.waitForURL('**/feedback');
    const scales = page.locator('.likert-scale');
    for (let i = 0; i < 3; i++) await scales.nth(i).locator('label').nth(5).click();
    await page.check('input[name=safety][value=no]');
    await page.click('button:has-text("Submit feedback")');
    await page.waitForURL('**/complete');
    assert.deepEqual(page.errors, []);
    await page.context().close();
  }
  assert.equal(new Set(Object.values(firstSection)).size, 3, 'section order differs by path');

  const sessions = await exportCsv('sessions');
  for (const code of ['P11', 'P12', 'P13']) assert.match(sessions, new RegExp(`${code},`));
  assert.match(sessions, /,2,3,/, 'baseline saved');
  assert.match(sessions, /The sources helped/);
  const events = await exportCsv('events');
  for (const name of ['path_selected', 'map_viewed', 'care_option_expanded', 'evidence_opened', 'source_clicked', 'summary_copied', 'decision_selected', 'feedback_submitted', 'session_completed']) {
    assert.match(events, new RegExp(name), `${name} logged`);
  }
  assert.doesNotMatch(events + sessions, /My period is absent|over6|Over 6 months/, 'no intake answers stored');
});

test('editing an intake answer updates the journey summary', async () => {
  const page = await newPage();
  await consentAndBaseline(page);
  await tapIntake(page, 1);
  await page.locator('.bubble-edit').nth(2).click(); // edit "prior"
  await page.click('button.chip:has-text("Not yet")');
  await page.click('button:has-text("See my care map")');
  await page.waitForURL('**/map');
  assert.match(await page.locator('#h-journey + p').textContent(), /haven’t talked with a professional/);
  await settle(page);
  const events = await exportCsv('events');
  assert.match(events, /intake_step_revisited,q3/);
  await page.context().close();
});

test('typed chat answers are understood, and urgent messages show the safety notice', async () => {
  const page = await newPage();
  await consentAndBaseline(page);
  await page.click('button.chip:has-text("My period is absent")');
  await page.fill('.typebox input', 'I fainted yesterday');
  await page.click('.typebox button');
  await page.waitForSelector('.notice.warn:has-text("urgent medical care")');
  await page.fill('.typebox input', 'about half a year');
  await page.click('.typebox button');
  await page.waitForSelector('.bubble.user:has-text("Over 6 months")');
  await settle(page);
  const events = await exportCsv('events');
  assert.match(events, /safety_notice_shown,urgent/);
  assert.match(events, /chat_step_answered,q2:typed/);
  assert.doesNotMatch(events + (await exportCsv('sessions')), /fainted|half a year/, 'typed text never stored');
  await page.context().close();
});

test('changing path on the map is recorded', async () => {
  const page = await newPage();
  await consentAndBaseline(page, 'P20');
  await tapIntake(page, 1, { prior: 'Not yet' });
  await page.click('button:has-text("See my care map")');
  await page.waitForURL('**/map');
  await page.click('.path-row button:has-text("Change")');
  await page.check('input[name=path-change][value="2"]');
  await page.click('button:has-text("Update my map")');
  await page.waitForSelector('h2:has-text("What guidance says")');
  await new Promise((r) => setTimeout(r, 300));
  const row = (await exportCsv('sessions')).split('\r\n').find((l) => l.includes('P20,'));
  assert.match(row, /P20,1,2,true,/, 'initial_path_id=1, path_id=2, path_changed=true');
  await page.context().close();
});

test('mobile layout has no horizontal scroll on any screen', async () => {
  const page = await newPage();
  await page.setViewportSize({ width: 320, height: 700 });
  const noScroll = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await consentAndBaseline(page);
  await noScroll();
  await tapIntake(page, 2);
  await noScroll();
  await page.click('button:has-text("See my care map")');
  await page.waitForURL('**/map');
  await noScroll();
  await page.context().close();
});

test('direct links to later screens redirect to the start without consent', async () => {
  const page = await newPage();
  await page.goto(`${base}/map`);
  await page.waitForURL(`${base}/`);
  await page.context().close();
});
