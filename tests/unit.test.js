// Unit + API tests. Run: npm test   (no network, no database needed)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../scripts/dev-server.js';
import { cleanFields, cleanEvent } from '../lib/validate.js';
import { applyUpdate, sessionStatus } from '../lib/sessions.js';
import { cell, toCsv } from '../lib/csv.js';
import { sanitize } from '../lib/chatAi.js';
import { getStep, activeSteps, pruneAnswers } from '../public/js/shared/intake.js';
import { journeySummary, copySummary, sectionOrder } from '../public/js/shared/mapText.js';
import { CARE_OPTIONS } from '../public/js/content/careOptions.js';
import { SOURCES } from '../public/js/content/sources.js';

// ---------- validation ----------
test('intake answers are never accepted as research fields', () => {
  const out = cleanFields({ concern: 'absent', duration: 'over6', types: ['obgyn'], clarity_pre: 4 });
  assert.deepEqual(out, { clarity_pre: 4 });
});

test('likert values must be 1–7 integers', () => {
  assert.throws(() => cleanFields({ clarity_pre: 8 }));
  assert.throws(() => cleanFields({ trust_post: 2.5 }));
  assert.equal(cleanFields({ relevance_post: 7 }).relevance_post, 7);
});

test('free text is trimmed to 240 characters', () => {
  assert.equal(cleanFields({ decision_reason: 'x'.repeat(500) }).decision_reason.length, 240);
});

test('events keep only allowed names and non-sensitive component ids', () => {
  assert.equal(cleanEvent({ event_name: 'made_up' }), null);
  const e = cleanEvent({ event_name: 'source_clicked', component_id: 'asrm-2024', elapsed_ms: 12.7, path_id: 2 });
  assert.deepEqual(e, { event_name: 'source_clicked', component_id: 'asrm-2024', elapsed_ms: 13, path_id: 2 });
  assert.equal(cleanEvent({ event_name: 'map_viewed', component_id: 'My period stopped!' }).component_id, null);
});

// ---------- derived fields ----------
test('path change, time to map, completion, quote permission', () => {
  const t0 = new Date('2026-10-20T10:00:00Z');
  let s = { consented_at: t0.toISOString(), last_screen: 'consent' };
  s = applyUpdate(s, { last_screen: 'baseline' }, new Date('2026-10-20T10:01:00Z'));
  s = applyUpdate(s, { path_id: 1, last_screen: 'intake' }, new Date('2026-10-20T10:02:30Z'));
  assert.equal(s.seconds_to_map, 90);
  assert.equal(s.initial_path_id, 1);
  s = applyUpdate(s, { path_id: 3 });
  assert.equal(s.path_changed, true);
  assert.equal(s.initial_path_id, 1);
  s = applyUpdate(s, { quote_permission: false, quote_text: 'hi', last_screen: 'feedback' });
  assert.equal(s.quote_text, null);
  assert.equal(s.completed, true);
  s = applyUpdate(s, { last_screen: 'baseline' });
  assert.equal(s.last_screen, 'feedback', 'last_screen never moves backwards');
});

test('abandoned after 30 minutes without activity', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  assert.equal(sessionStatus({ last_activity_at: '2026-10-20T11:00:00Z' }, now), 'abandoned');
  assert.equal(sessionStatus({ last_activity_at: '2026-10-20T11:45:00Z' }, now), 'in_progress');
  assert.equal(sessionStatus({ completed: true }, now), 'completed');
});

// ---------- CSV ----------
test('CSV escapes quotes/commas and neutralises spreadsheet formulas', () => {
  assert.equal(cell('a,"b"'), '"a,""b"""');
  assert.equal(cell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(cell(-3), '-3');
  assert.equal(toCsv(['a'], [{ a: null }]), 'a\r\n\r\n');
});

// ---------- AI output contract ----------
test('AI output is forced into the allowed options and safe wording', () => {
  const step = getStep('duration');
  const r = sanitize(step, { understood: true, option_ids: ['over6', 'bogus'], acknowledgement: 'You probably have PCOS.', safety: 'none' });
  assert.deepEqual(r.option_ids, ['over6']);
  assert.equal(r.acknowledgement, 'Thanks, got it.');
  const two = sanitize(step, { understood: true, option_ids: ['over6', 'under3'], acknowledgement: 'ok', safety: 'weird' });
  assert.equal(two.understood, false, 'single-choice needs exactly one option');
  assert.equal(two.safety, 'none');
});

// ---------- templates and content ----------
test('journey summary uses only selected information', () => {
  assert.equal(
    journeySummary({ concern: 'absent', duration: 'over6', prior: 'multiple', types: ['obgyn', 'other'], outcome: ['still_questions'] }),
    'Your period has been absent for over 6 months. You’ve spoken with more than one professional (an OB-GYN) and still have unanswered questions.',
  );
  assert.equal(journeySummary({ concern: 'unsure', duration: 'unsure', prior: 'none' }), 'You’re not sure what’s going on with your cycle. You haven’t talked with a professional about it yet.');
});

test('editing an earlier answer updates the summary and drops answers that no longer apply', () => {
  const a = { concern: 'absent', prior: 'one', types: ['obgyn'], outcome: ['referred'] };
  const edited = pruneAnswers({ ...a, prior: 'none' });
  assert.equal(edited.types, undefined);
  assert.equal(activeSteps(edited).length, 4);
  assert.match(journeySummary(edited), /haven’t talked/);
});

test('copyable summary leaves out symptom and duration details', () => {
  const text = copySummary({ concern: 'absent', duration: 'over6', prior: 'one', types: ['obgyn'] }, 2);
  assert.doesNotMatch(text, /absent|6 months|irregular/i);
  assert.match(text, /whose advice to trust|heard different things/);
});

test('three paths render distinct section emphasis but the same cards', () => {
  const orders = [1, 2, 3].map((p) => sectionOrder(p).join(','));
  assert.equal(new Set(orders).size, 3);
  assert.ok(sectionOrder(1).indexOf('compare') < sectionOrder(1).indexOf('options'));
  assert.ok(sectionOrder(2).includes('evidence'));
  for (const p of [1, 2, 3]) assert.ok(sectionOrder(p).includes('options') && sectionOrder(p).includes('decision'));
});

test('no diagnosis-specific or directive language in the care library', () => {
  const all = JSON.stringify(CARE_OPTIONS);
  assert.doesNotMatch(all, /you have (pcos|fha)|you need to|you must|diagnos(e|is) you|stop exercising|eat more|increase (your )?calories/i);
  for (const c of CARE_OPTIONS) {
    assert.ok(c.appointmentQuestions.length >= 2 && c.appointmentQuestions.length <= 3, `${c.id} has 2–3 questions`);
    assert.ok(c.sources.some((s) => SOURCES[s.sourceId]?.verified), `${c.id} has a verified source`);
  }
});

// ---------- API ----------
async function withServer(env, fn) {
  const saved = { ...process.env };
  Object.assign(process.env, env);
  const { resetStoreForTests } = await import('../lib/store.js');
  resetStoreForTests();
  const server = createServer().listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://localhost:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    server.close();
    process.env = saved;
    resetStoreForTests();
  }
}
const json = (method, body) => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('no consent means no session and no data collection', async () => {
  await withServer({ EXPORT_PASSWORD: 'unit-test-password' }, async (b) => {
    assert.equal((await fetch(`${b}/api/session`, json('POST', { adult: true }))).status, 400);
    assert.equal((await fetch(`${b}/api/session`, json('POST', { consent: true }))).status, 400);
    const ev = await fetch(`${b}/api/events`, json('POST', { session_id: 'abcdefghijkm', events: [{ event_name: 'map_viewed' }] }));
    assert.equal(ev.status, 404);
    const csv = await (await fetch(`${b}/api/export?type=sessions`, { headers: { authorization: 'Bearer unit-test-password' } })).text();
    assert.equal(csv.trim().split('\n').length, 1, 'only the header row');
  });
});

test('baseline and feedback save; export requires the password', async () => {
  await withServer({ EXPORT_PASSWORD: 'unit-test-password' }, async (b) => {
    const { session_id } = await (await fetch(`${b}/api/session`, json('POST', { adult: true, consent: true, tester_code: 'p05' }))).json();
    await fetch(`${b}/api/session`, json('PATCH', { session_id, fields: { clarity_pre: 2, trust_pre: 3, last_screen: 'baseline' } }));
    await fetch(`${b}/api/session`, json('PATCH', { session_id, fields: { clarity_post: 6, trust_post: 6, relevance_post: 5, safety_flag: 'no', last_screen: 'feedback' } }));
    await fetch(`${b}/api/events`, json('POST', { session_id, events: [{ event_name: 'summary_copied', elapsed_ms: 5 }] }));

    assert.equal((await fetch(`${b}/api/export`)).status, 401);
    assert.equal((await fetch(`${b}/api/export`, { headers: { authorization: 'Bearer nope-nope-nope' } })).status, 401);
    const auth = { authorization: 'Basic ' + Buffer.from('team:unit-test-password').toString('base64') };
    const csv = await (await fetch(`${b}/api/export?type=sessions`, { headers: auth })).text();
    const [head, row] = csv.trim().split('\r\n');
    const rec = Object.fromEntries(head.split(',').map((h, i) => [h, row.split(',')[i]]));
    assert.equal(rec.tester_code, 'P05');
    assert.equal(rec.clarity_pre, '2');
    assert.equal(rec.clarity_post, '6');
    assert.equal(rec.completed, 'true');
    const events = await (await fetch(`${b}/api/export?type=events`, { headers: auth })).text();
    assert.match(events, /summary_copied/);

    // researcher deletion (accepts the dashed code shown to participants)
    const dashed = `${session_id.slice(0, 4)}-${session_id.slice(4, 8)}-${session_id.slice(8)}`;
    assert.equal((await fetch(`${b}/api/admin?session_id=${dashed}`, { method: 'DELETE' })).status, 401);
    assert.equal((await fetch(`${b}/api/admin?session_id=${dashed}`, { method: 'DELETE', headers: auth })).status, 200);
    const after = await (await fetch(`${b}/api/export?type=events`, { headers: auth })).text();
    assert.doesNotMatch(after, /summary_copied/);
  });
});

test('export stays disabled without a strong password', async () => {
  await withServer({ EXPORT_PASSWORD: 'short' }, async (b) => {
    assert.equal((await fetch(`${b}/api/export`, { headers: { authorization: 'Bearer short' } })).status, 503);
  });
});

test('deployed site without a database refuses to start sessions', async () => {
  await withServer({ VERCEL_ENV: 'production', DATABASE_URL: '', POSTGRES_URL: '' }, async (b) => {
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;
    const { resetStoreForTests } = await import('../lib/store.js');
    resetStoreForTests();
    assert.equal((await fetch(`${b}/api/session`, json('POST', { adult: true, consent: true }))).status, 503);
  });
});
