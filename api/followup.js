// POST /api/followup {session_id, email}           opt in to one check-in email about a week later (optional)
// PUT  /api/followup {session_id, status, note?}   the check-in answer, from the link in that email (/followup?s=…)
// The email is stored in its own table (ms_contacts), never in the research export, and deleted with the session.
import { handler, readJson, sendJson, HttpError } from '../lib/http.js';
import { requireStore } from '../lib/store.js';
import { cleanFields, SESSION_ID_RE } from '../lib/validate.js';

const EMAIL_RE = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,24}$/i;

export default handler(['POST', 'PUT'], async (req, res) => {
  const body = await readJson(req);
  const id = typeof body.session_id === 'string' ? body.session_id.trim().toLowerCase() : '';
  if (!SESSION_ID_RE.test(id)) throw new HttpError(400, 'Invalid session');
  const store = await requireStore();
  const existing = await store.getSession(id);
  if (!existing) throw new HttpError(404, 'We couldn’t find that session. It may have been deleted.');

  if (req.method === 'POST') {
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (!EMAIL_RE.test(email)) throw new HttpError(400, 'That email address doesn’t look right.');
    await store.saveContact(id, email);
    await store.saveSession(id, { ...existing, followup_opt_in: true });
    return sendJson(res, 200, { ok: true });
  }

  const cleaned = cleanFields({ followup_status: body.status ?? null, followup_note: body.note ?? null });
  if (!cleaned.followup_status) throw new HttpError(400, 'Choose one answer.');
  await store.saveSession(id, {
    ...existing,
    followup_status: cleaned.followup_status,
    followup_note: cleaned.followup_note || null,
    followup_at: new Date().toISOString(),
  });
  return sendJson(res, 200, { ok: true });
});
