// DELETE /api/admin?session_id=abc123...         delete one session and its events
// DELETE /api/admin?all=true&confirm=DELETE-ALL  delete every session (end-of-study cleanup)
// Researchers only (same EXPORT_PASSWORD as the export).
import { handler, sendJson, getQuery, requireResearcher, HttpError } from '../lib/http.js';
import { requireStore } from '../lib/store.js';
import { SESSION_ID_RE } from '../lib/validate.js';

export default handler(['DELETE'], async (req, res) => {
  if (!requireResearcher(req, res)) return;
  const q = getQuery(req);
  const store = await requireStore();
  if (q.get('all') === 'true') {
    if (q.get('confirm') !== 'DELETE-ALL') throw new HttpError(400, 'Add confirm=DELETE-ALL to delete everything');
    const n = await store.deleteAll();
    return sendJson(res, 200, { deleted: n });
  }
  // Accepts the code as shown to participants (abcd-efgh-ijkm) or without dashes.
  const id = (q.get('session_id') || '').trim().toLowerCase().replace(/-/g, '');
  if (!SESSION_ID_RE.test(id)) throw new HttpError(400, 'Invalid session_id');
  const ok = await store.deleteSession(id);
  if (!ok) throw new HttpError(404, 'Session not found');
  return sendJson(res, 200, { deleted: 1 });
});
