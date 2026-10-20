// POST  /api/session  {adult:true, consent:true, tester_code?}  -> {session_id}
// PATCH /api/session  {session_id, fields:{...}}                  -> {ok:true}
// No session (and therefore no research data) exists until both confirmations are given.
import { randomBytes } from 'node:crypto';
import { handler, readJson, sendJson, HttpError } from '../lib/http.js';
import { requireStore } from '../lib/store.js';
import { cleanFields, cleanTesterCode, SESSION_ID_RE } from '../lib/validate.js';
import { applyUpdate } from '../lib/sessions.js';

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
export function newSessionId() {
  const bytes = randomBytes(12);
  let s = '';
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return s;
}

export default handler(['POST', 'PATCH'], async (req, res) => {
  const body = await readJson(req);
  const store = await requireStore();

  if (req.method === 'POST') {
    if (body.adult !== true || body.consent !== true) {
      throw new HttpError(400, 'Both confirmations are required to continue.');
    }
    const tester_code = cleanTesterCode(body.tester_code);
    const now = new Date().toISOString();
    let id;
    for (let i = 0; i < 5; i++) {
      id = newSessionId();
      if (await store.createSession(id, { tester_code, consented_at: now, last_screen: 'consent', last_activity_at: now, completed: false })) {
        return sendJson(res, 201, { session_id: id });
      }
    }
    throw new HttpError(500, 'Could not start a session. Try again.');
  }

  // PATCH
  if (typeof body.session_id !== 'string' || !SESSION_ID_RE.test(body.session_id)) {
    throw new HttpError(400, 'Invalid session');
  }
  const existing = await store.getSession(body.session_id);
  if (!existing) throw new HttpError(404, 'Session not found');
  const cleaned = cleanFields(body.fields);
  const next = applyUpdate(existing, cleaned);
  await store.saveSession(body.session_id, next);
  return sendJson(res, 200, { ok: true });
});
