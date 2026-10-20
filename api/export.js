// GET /api/export?type=sessions|events   (researchers only; HTTP Basic or Bearer EXPORT_PASSWORD)
// Open in a browser: it asks for a password (any username). Downloads a CSV.
import { handler, sendText, getQuery, requireResearcher, HttpError } from '../lib/http.js';
import { requireStore } from '../lib/store.js';
import { toCsv, sessionRows, eventRows, SESSION_COLUMNS, EVENT_COLUMNS } from '../lib/csv.js';

export default handler(['GET'], async (req, res) => {
  if (!requireResearcher(req, res)) return;
  const type = getQuery(req).get('type') || 'sessions';
  if (!['sessions', 'events'].includes(type)) throw new HttpError(400, 'type must be sessions or events');
  const store = await requireStore();
  const sessions = await store.listSessions();
  const stamp = new Date().toISOString().slice(0, 10);
  const csv =
    type === 'sessions'
      ? toCsv(SESSION_COLUMNS, sessionRows(sessions))
      : toCsv(EVENT_COLUMNS, eventRows(await store.listEvents(), sessions));
  return sendText(res, 200, csv, 'text/csv; charset=utf-8', {
    'Content-Disposition': `attachment; filename="msquared-${type}-${stamp}.csv"`,
  });
});
