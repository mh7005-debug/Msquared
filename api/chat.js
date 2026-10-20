// POST /api/chat {session_id, step_id, text} -> {understood, option_ids, acknowledgement, safety}
// Only used when a participant types instead of tapping. The text is never stored or logged.
import { handler, readJson, sendJson, HttpError } from '../lib/http.js';
import { requireStore } from '../lib/store.js';
import { SESSION_ID_RE } from '../lib/validate.js';
import { getStep } from '../public/js/shared/intake.js';
import { classifyAnswer } from '../lib/chatAi.js';

const MAX_CALLS_PER_SESSION = 40;
const MAX_TEXT = 300;

export default handler(['POST'], async (req, res) => {
  const body = await readJson(req);
  if (typeof body.session_id !== 'string' || !SESSION_ID_RE.test(body.session_id)) throw new HttpError(400, 'Invalid session');
  const step = getStep(body.step_id);
  if (!step) throw new HttpError(400, 'Invalid step');
  const text = typeof body.text === 'string' ? body.text.trim().slice(0, MAX_TEXT) : '';
  if (!text) throw new HttpError(400, 'Empty answer');

  if (!process.env.ANTHROPIC_API_KEY) return sendJson(res, 200, { ok: false, reason: 'disabled' });

  const store = await requireStore();
  const n = await store.incrementChatCalls(body.session_id);
  if (n === null) throw new HttpError(404, 'Session not found');
  if (n > MAX_CALLS_PER_SESSION) return sendJson(res, 200, { ok: false, reason: 'limit' });

  const result = await classifyAnswer(step, text);
  if (!result.ok) console.warn('[msquared] chat classify unavailable:', result.reason);
  return sendJson(res, 200, result);
});
