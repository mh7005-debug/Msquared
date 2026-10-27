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
  const scales = page.locator('.likert-scale');
  await scales.nth(0).locator('label').nth(1).click();
  await scales.nth(1).locator('label').nth(2).click();
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

test('complete flow on each path with distinct emphasis, saved pre/post and events', async () => {
  const firstSection = {};
  for (const path of [1, 2, 3]) {
    const page = await newPage();
    await consentAndBaseline(page, `P1${path}`);
    await tapIntake(page, path);
    await page.click('button:has-text("See my care map")');
    await page.waitForURL('**/map');
    // page 1 is only the next step; everything else is on the second page
    assert.equal(await page.locator('.option-card').count(), 0, 'next-step page stays uncluttered');
    await page.click('#tab-more');

    // distinct emphasis
    const headings = await page.locator('main section h2, main section .h2like').allTextContents();
    firstSection[path] = headings.slice(0, 4).join(' | ');
    if (path === 1) assert.equal(await page.locator('table.compare-table').isVisible(), true, 'path 1 shows comparison open');
    if (path === 2) assert.ok(headings.some((h) => /What guidance says/.test(h)), 'path 2 shows known vs uncertain');
    if (path === 3) assert.equal(await page.locator('.option-card.emph').count(), 1, 'path 3 highlights coordination');
    assert.equal(await page.locator('.option-card').count(), 3, 'same three cards on every path');

    // route map: three branches, one per option
    assert.equal(await page.locator('.route-stop').count(), 3, 'route shows three conversations');
    // H2: rate an option before reading why, then say whether the explanation changed it
    const card = page.locator('.option-card').first();
    await card.locator('.chip', { hasText: 'Not sure' }).click();
    // answering reveals the why automatically (every rater sees at least one explanation)
    await card.locator('.why .chip', { hasText: 'More likely' }).click();
    assert.equal(await page.locator('.option-card').first().locator('details').first().getAttribute('open'), '');
    await page.locator('.option-card').nth(1).locator('summary', { hasText: 'evidence' }).click();
    const link = page.locator('.option-card').nth(1).locator('.source a').first();
    assert.match(await link.getAttribute('href'), /^https:\/\/(www\.asrm\.org|academic\.oup\.com)\//);
    const [popup] = await Promise.all([page.waitForEvent('popup').catch(() => null), link.click()]);
    await popup?.close().catch(() => {});

    // book your next step: provider types with official directories, call script
    assert.equal(await page.locator('.provider').count(), 6, 'six provider types');
    assert.match(await page.locator('.directory-link').first().getAttribute('href'), /^https:\/\/www\.acog\.org\//);
    await page.click('button:has-text("Copy call script")');
    await page.waitForSelector('.book .status:has-text("Copied")');
    assert.match(await page.evaluate(() => navigator.clipboard.readText()), /I’d like to book an appointment/);

    // copy
    await page.click('button:has-text("Copy brief")');
    await page.waitForSelector('#brief .status:has-text("Copied")');
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(clip, /Questions to bring/);
    assert.doesNotMatch(clip, /absent|6 months/);

    // decision required (back on the next-step page)
    await page.click('.finish-bar button');
    await page.waitForSelector('#h-dec');
    await page.click('button:has-text("Continue to feedback")');
    assert.match(await page.locator('[role=alert]').last().textContent(), /Choose one option/);
    await page.check('input[name=decision][value=use]');
    await page.getByLabel(/What led you/).fill('The sources helped');
    await page.click('button:has-text("Continue to feedback")');
    await page.waitForURL('**/feedback');
    const scales = page.locator('.likert-scale');
    for (let i = 0; i < 5; i++) await scales.nth(i).locator('label').nth(5).click();
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
  const head = sessions.split('\r\n')[0].split(',');
  const p11 = sessions.split('\r\n').find((l) => l.startsWith(sessions.split('\r\n').find((x) => x.includes('P11,')).split(',')[0]));
  const cols = Object.fromEntries(head.map((h, i) => [h, p11.split(',')[i]]));
  assert.equal(cols.rely_primary_obgyn, 'unsure', 'H2 before-rating saved');
  assert.equal(cols.rely_change_primary_obgyn, 'more', 'H2 after-explanation change saved');
  assert.equal(cols.contact_intent_post, '6', 'contact intent saved');
  const events = await exportCsv('events');
  for (const name of ['options_shown', 'option_rated', 'option_rerated', 'path_selected', 'map_viewed', 'care_option_expanded', 'evidence_opened', 'source_clicked', 'summary_copied', 'script_copied', 'decision_selected', 'feedback_submitted', 'session_completed']) {
    assert.match(events, new RegExp(name), `${name} logged`);
  }
  assert.doesNotMatch(events + sessions, /My period is absent|over6|Over 6 months/, 'tapped intake answers never stored');
});

test('optional depth: own words are saved and summarized; follow-ups open only after a rating', async () => {
  const page = await newPage();
  await consentAndBaseline(page, 'P19');
  await tapIntake(page, 2, { prior: 'No' });
  const own = page.locator('.question-card textarea');
  assert.ok(await page.locator('.question-card .btn-mic, .question-card .voice-status').count(), 'voice control or keyboard tip shown');
  await own.fill('It changed after I stopped birth control and I want to know which tests to ask about.');
  await page.click('button:has-text("See my care map")');
  await page.waitForURL('**/map');
  await page.click('#tab-more');
  assert.match(await page.locator('.summary-box').textContent(), /In my own words: It changed after I stopped birth control/);
  await page.click('#tab-next');
  await page.check('input[name=decision][value=unsure]');
  await page.click('button:has-text("Continue to feedback")');
  await page.waitForURL('**/feedback');
  const why = page.locator('.follow-up').first();
  assert.equal(await why.isHidden(), true, 'follow-up hidden before rating');
  await page.locator('.likert-scale').first().locator('label').nth(2).click();
  assert.equal(await why.isVisible(), true, 'follow-up shown after rating');
  await why.locator('textarea').fill('Still not sure who to see first');
  const scales = page.locator('.likert-scale');
  for (let i = 1; i < 4; i++) await scales.nth(i).locator('label').nth(4).click();
  await page.check('input[name=safety][value=no]');
  await page.click('button:has-text("Submit feedback")');
  await page.waitForURL('**/complete');
  const row = (await exportCsv('sessions')).split('\r\n').find((l) => l.includes('P19,'));
  assert.match(row, /It changed after I stopped birth control/);
  assert.match(row, /Still not sure who to see first/);
  await page.context().close();
});

test('editing an intake answer updates the journey summary', async () => {
  const page = await newPage();
  await consentAndBaseline(page);
  await tapIntake(page, 1);
  await page.locator('.qa-edit').nth(2).click(); // edit "prior"
  await option(page, 'No').click();
  await page.click('button:has-text("See my care map")');
  await page.waitForURL('**/map');
  await page.click('#tab-more');
  assert.match(await page.locator('#h-journey + p').textContent(), /haven’t talked with a healthcare professional/);
  await settle(page);
  const events = await exportCsv('events');
  assert.match(events, /intake_step_revisited,q3/);
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

test('changing path on the map is recorded', async () => {
  const page = await newPage();
  await consentAndBaseline(page, 'P20');
  await tapIntake(page, 1, { prior: 'No' });
  await page.click('button:has-text("See my care map")');
  await page.waitForURL('**/map');
  await page.click('.path-row button:has-text("Change")');
  await page.check('input[name=path-change][value="2"]');
  await page.click('button:has-text("Update my map")');
  await page.click('#tab-more');
  await page.waitForSelector('h2:has-text("What guidance says")');
  await new Promise((r) => setTimeout(r, 300));
  const row = (await exportCsv('sessions')).split('\r\n').find((l) => l.includes('P20,'));
  assert.match(row, /P20,current,1,2,true,/, 'initial_path_id=1, path_id=2, path_changed=true');
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
  await page.click('#tab-more');
  await noScroll();
  await page.context().close();
});

test('direct links to later screens redirect to the start without consent', async () => {
  const page = await newPage();
  await page.goto(`${base}/map`);
  await page.waitForURL(`${base}/`);
  await page.context().close();
});

test('tester link carries the study code; next-step card is personalized; one-week check-in works', async () => {
  const page = await newPage();
  await page.goto(`${base}/?code=P15`);
  assert.match(await page.locator('#tester-hint').textContent(), /P15/);
  await page.check('#adult');
  await page.check('#consent');
  await page.click('button:has-text("Get started")');
  await page.waitForURL('**/start');
  await page.click('button:has-text("Continue")');
  assert.match(await page.locator('[role=alert]').last().textContent(), /first question/);
  await page.check('input[name=screener][value=past]');
  const scales = page.locator('.likert-scale');
  await scales.nth(0).locator('label').nth(3).click();
  await scales.nth(1).locator('label').nth(3).click();
  await page.click('button:has-text("Continue")');
  await page.waitForURL('**/intake');
  await tapIntake(page, 1, { prior: 'Yes, one professional' }); // has seen an OB-GYN
  await page.click('button:has-text("See my care map")');
  await page.waitForURL('**/map');
  // the answer comes first, tailored to who they've seen
  assert.match(await page.locator('#h-nextcard').textContent(), /Endocrinologist/);
  // H2 on the headline suggestion: rate first, then the evidence opens, then re-rate
  assert.equal(await page.locator('.next-card .why').getAttribute('open'), null, 'evidence hidden before rating');
  await page.locator('.next-card .chip', { hasText: 'Not sure' }).click();
  await page.locator('.next-card .why .source a').first().waitFor();
  await page.locator('.next-card .why .chip', { hasText: 'More likely' }).click();
  await page.click('.next-card button:has-text("Copy what to say")');
  await page.waitForSelector('.next-card .status:has-text("Copied")');
  // the decision sits on the same page as the next step
  await page.check('input[name=decision][value=use]');
  await page.click('button:has-text("Continue to feedback")');
  await page.waitForURL('**/feedback');
  const fb = page.locator('.likert-scale');
  for (let i = 0; i < 4; i++) await fb.nth(i).locator('label').nth(4).click();
  await page.check('input[name=safety][value=no]');
  await page.click('button:has-text("Submit feedback")');
  await page.waitForURL('**/complete');
  // opt in to the check-in
  await page.fill('#checkin-email', 'not-an-email');
  await page.click('button:has-text("Check in with me")');
  await page.waitForSelector('[role=alert]:has-text("doesn’t look right")');
  await page.fill('#checkin-email', 'tester@example.com');
  await page.click('button:has-text("Check in with me")');
  await page.waitForSelector('text=check in once');
  await settle(page);
  const sessions = await exportCsv('sessions');
  assert.doesNotMatch(sessions, /tester@example\.com/, 'email never in the research export');
  const row = sessions.split('\r\n').find((l) => l.includes('P15,'));
  assert.match(row, /P15,past,/);
  const head = sessions.split('\r\n')[0].split(',');
  const col = Object.fromEntries(head.map((h, i) => [h, row.split(',')[i]]));
  assert.equal(col.next_suggested, 'endocrinologist');
  assert.equal(col.rely_next, 'unsure');
  assert.equal(col.rely_change_next, 'more');
  const follow = await exportCsv('followups');
  const line = follow.split('\r\n').find((l) => l.includes('tester@example.com'));
  const link = line.match(/https?:\/\/[^,]+\/followup\?s=[a-z0-9]{12}/)[0];
  // the check-in page, opened later from the email
  const later = await newPage();
  await later.goto(link.replace(/^https?:\/\/[^/]+/, base));
  await later.check('input[name=followup_status][value=booked]');
  await later.getByLabel(/What helped/).fill('The call script made it easy');
  await later.click('button:has-text("Send")');
  await later.waitForSelector('h2:has-text("Thank you")');
  const after = (await exportCsv('sessions')).split('\r\n').find((l) => l.includes('P15,'));
  assert.match(after, /booked,The call script made it easy/);
  assert.match(await exportCsv('events'), /next_card_action,copy:endocrinologist/);
  assert.deepEqual(page.errors, []);
  assert.deepEqual(later.errors, []);
  await page.context().close();
  await later.context().close();
});

test('concierge: she can ask Msquared to match her; the request reaches the team, not the research data', async () => {
  const page = await newPage();
  await consentAndBaseline(page, 'P16');
  await tapIntake(page, 3, { prior: 'No' });
  await page.getByLabel(/Anything else your clinician/).fill('I run marathons and want my cycle back');
  await page.click('button:has-text("See my care map")');
  await page.waitForURL('**/map');
  await page.click('.next-card button:has-text("Get help from our care team")');
  // focus is prefilled from the suggestion (no one seen yet -> OB-GYN)
  assert.equal(await page.isChecked('input[name=cc-focus-card][value=obgyn]'), true);
  await page.check('input[name=cc-method-card][value=phone]');
  await page.fill('#cc-contact-card', '212 555 0199');
  await page.click('.next-card button:has-text("Send my request")');
  await page.waitForSelector('.next-card [role=alert]:has-text("Check the box")');
  await page.check('#cc-share-card');
  await page.click('.next-card button:has-text("Send my request")');
  await page.waitForSelector('.concierge-done');
  assert.equal(await page.locator('.concierge-done').count(), 1);
  await page.click('#tab-more');
  assert.equal(await page.locator('.concierge-section .concierge-done').count(), 1, 'the second page shows it is done too');
  await settle(page);
  const reqs = await exportCsv('requests');
  assert.match(reqs, /212 555 0199/);
  assert.match(reqs, /P16/);
  assert.match(reqs, /In her words: I run marathons/);
  assert.match(reqs, /Your period has been absent for over 6 months/, 'summary carries her situation once she chose to share it');
  const sessions = await exportCsv('sessions');
  assert.doesNotMatch(sessions, /212 555 0199/, 'contact never in research export');
  const head = sessions.split('\r\n')[0].split(',');
  const row = sessions.split('\r\n').find((l) => l.includes('P16,'));
  const col = Object.fromEntries(head.map((h, i) => [h, row.split(',')[i]]));
  assert.equal(col.concierge_requested, 'true');
  assert.equal(col.concierge_focus, 'obgyn');
  assert.match(await exportCsv('events'), /concierge_requested,card:obgyn/);
  assert.deepEqual(page.errors, []);
  await page.context().close();
});
