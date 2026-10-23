// POST /api/concierge  {session_id, method:'email'|'phone', contact, first_name?, focus, best_time?, summary, share:true}
// A woman asks Msquared to match her with a clinician. She explicitly shares her contact details and case summary.
// Stored in ms_requests (never in the research export). The team works from /api/export?type=requests.
import { handler, readJson, sendJson, HttpError } from '../lib/http.js';
import { requireStore } from '../lib/store.js';
import { SESSION_ID_RE } from '../lib/validate.js';

const EMAIL_RE = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,24}$/i;
const PHONE_RE = /^\+?[0-9 ().-]{7,20}$/;
export const FOCUS = ['obgyn', 'endocrinology', 'fertility', 'functional', 'coordination', 'not_sure'];
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default handler(['POST'], async (req, res) => {
  const body = await readJson(req);
  const id = str(body.session_id, 20).toLowerCase();
  if (!SESSION_ID_RE.test(id)) throw new HttpError(400, 'Invalid session');
  if (body.share !== true) throw new HttpError(400, 'Please confirm we can share your summary with our team.');
  const method = body.method === 'phone' ? 'phone' : body.method === 'email' ? 'email' : null;
  if (!method) throw new HttpError(400, 'Choose email or phone.');
  const contact = str(body.contact, 254);
  if (method === 'email' && !EMAIL_RE.test(contact)) throw new HttpError(400, 'That email address doesn’t look right.');
  if (method === 'phone' && !PHONE_RE.test(contact)) throw new HttpError(400, 'That phone number doesn’t look right.');
  const focus = FOCUS.includes(body.focus) ? body.focus : 'not_sure';

  const store = await requireStore();
  const existing = await store.getSession(id);
  if (!existing) throw new HttpError(404, 'Session not found. Please start again.');

  await store.saveRequest(id, {
    method,
    contact,
    first_name: str(body.first_name, 60) || null,
    focus,
    best_time: str(body.best_time, 120) || null,
    summary: str(body.summary, 4000),
    status: 'new',
  });
  await store.saveSession(id, { ...existing, concierge_requested: true, concierge_focus: focus, concierge_requested_at: new Date().toISOString() });
  return sendJson(res, 200, { ok: true });
});
