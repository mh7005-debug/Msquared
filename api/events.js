// POST /api/events {session_id, events:[{event_name, component_id?, elapsed_ms, path_id?}]}
// Accepts JSON or text/plain (navigator.sendBeacon). Unknown sessions are rejected, so nothing
// is logged for people who never consented.
import { handler, readJson, sendJson, HttpError } from '../lib/http.js';
import { requireStore } from '../lib/store.js';
import { cleanEvent, SESSION_ID_RE } from '../lib/validate.js';

export default handler(['POST'], async (req, res) => {
  const body = await readJson(req);
  if (typeof body.session_id !== 'string' || !SESSION_ID_RE.test(body.session_id)) {
    throw new HttpError(400, 'Invalid session');
  }
  if (!Array.isArray(body.events) || body.events.length === 0 || body.events.length > 50) {
    throw new HttpError(400, 'Invalid events');
  }
  const store = await requireStore();
  const session = await store.getSession(body.session_id);
  if (!session) throw new HttpError(404, 'Session not found');
  const clean = body.events.map(cleanEvent).filter(Boolean);
  if (clean.length) await store.addEvents(body.session_id, clean);
  return sendJson(res, 200, { ok: true, accepted: clean.length });
});
