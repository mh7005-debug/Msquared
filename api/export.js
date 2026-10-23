// GET /api/export?type=sessions|events|followups|requests   (researchers only; HTTP Basic or Bearer EXPORT_PASSWORD)
// Open in a browser: it asks for a password (any username). Downloads a CSV.
import { handler, sendText, getQuery, requireResearcher, HttpError } from '../lib/http.js';
import { requireStore } from '../lib/store.js';
import { toCsv, sessionRows, eventRows, SESSION_COLUMNS, EVENT_COLUMNS } from '../lib/csv.js';

export default handler(['GET'], async (req, res) => {
  if (!requireResearcher(req, res)) return;
  const type = getQuery(req).get('type') || 'sessions';
  if (!['sessions', 'events', 'followups', 'requests'].includes(type)) throw new HttpError(400, 'type must be sessions, events, followups or requests');
  const store = await requireStore();
  const sessions = await store.listSessions();
  const stamp = new Date().toISOString().slice(0, 10);
  // followups: who opted in to the one-week check-in, with the personal link to email them. Identifying: handle with care.
  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host || 'localhost'}`;
  const byId = new Map(sessions.map((s) => [s.session_id, s.data]));
  // requests: concierge match requests the team follows up on by hand. Identifying and contains health details.
  if (type === 'requests') {
    const rows = (await store.listRequests()).map((r) => ({
      requested_at: new Date(r.created_at).toISOString(),
      session_id: r.session_id,
      tester_code: byId.get(r.session_id)?.tester_code || '',
      first_name: r.data.first_name || '',
      method: r.data.method,
      contact: r.data.contact,
      best_time: r.data.best_time || '',
      focus: r.data.focus,
      summary: r.data.summary,
    }));
    const cols = ['requested_at', 'session_id', 'tester_code', 'first_name', 'method', 'contact', 'best_time', 'focus', 'summary'];
    return sendText(res, 200, toCsv(cols, rows), 'text/csv; charset=utf-8', {
      'Content-Disposition': `attachment; filename="msquared-requests-${stamp}.csv"`,
    });
  }
  const csv =
    type === 'followups'
      ? toCsv(
          ['session_id', 'email', 'opted_in_at', 'checkin_link', 'followup_status'],
          (await store.listContacts()).map((c) => ({
            session_id: c.session_id,
            email: c.email,
            opted_in_at: new Date(c.created_at).toISOString(),
            checkin_link: `${origin}/followup?s=${c.session_id}`,
            followup_status: byId.get(c.session_id)?.followup_status || '',
          })),
        )
      : type === 'sessions'
      ? toCsv(SESSION_COLUMNS, sessionRows(sessions))
      : toCsv(EVENT_COLUMNS, eventRows(await store.listEvents(), sessions));
  return sendText(res, 200, csv, 'text/csv; charset=utf-8', {
    'Content-Disposition': `attachment; filename="msquared-${type}-${stamp}.csv"`,
  });
});
