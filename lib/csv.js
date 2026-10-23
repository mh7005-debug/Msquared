import { sessionStatus } from './sessions.js';

export const SESSION_COLUMNS = [
  'session_id',
  'tester_code',
  'screener',
  'initial_path_id',
  'path_id',
  'path_changed',
  'intake_mode',
  'own_words',
  'clarity_pre',
  'trust_pre',
  'next_step_pre',
  'clarity_post',
  'clarity_reason',
  'trust_post',
  'trust_info_post',
  'relevance_post',
  'contact_intent_post',
  'concierge_requested',
  'concierge_focus',
  'followup_opt_in',
  'followup_status',
  'followup_note',
  'followup_at',
  'decision_choice',
  'decision_reason',
  'map_missing_info',
  'map_next_conversation',
  'next_suggested',
  'rely_next',
  'rely_change_next',
  'rely_primary_obgyn',
  'rely_change_primary_obgyn',
  'rely_specialist',
  'rely_change_specialist',
  'rely_coordination',
  'rely_change_coordination',
  'next_step_response',
  'trust_reason',
  'trust_source',
  'most_helpful_feature',
  'missing_or_confusing',
  'prefers_msquared_stated',
  'safety_flag',
  'safety_description',
  'quote_permission',
  'quote_text',
  'seconds_to_map',
  'last_screen',
  'completed',
  'status',
  'consented_at',
  'last_activity_at',
  'completed_at',
];

export const EVENT_COLUMNS = ['session_id', 'tester_code', 'event_id', 'path_id', 'event_name', 'component_id', 'elapsed_ms', 'created_at'];

/** RFC 4180 escaping plus spreadsheet formula-injection guard. */
export function cell(v) {
  if (v === null || v === undefined) return '';
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(columns, rows) {
  const lines = [columns.join(',')];
  for (const r of rows) lines.push(columns.map((c) => cell(r[c])).join(','));
  return lines.join('\r\n') + '\r\n';
}

export function sessionRows(list, now = new Date()) {
  return list.map((s) => {
    const d = s.data || {};
    const row = { ...d, session_id: s.session_id, status: sessionStatus(d, now) };
    row.path_changed = d.path_changed ? true : false;
    row.completed = d.completed ? true : false;
    if (!d.quote_permission) row.quote_text = '';
    return row;
  });
}

export function eventRows(events, sessions) {
  const codes = new Map(sessions.map((s) => [s.session_id, (s.data || {}).tester_code || '']));
  return events.map((e) => ({ ...e, event_id: e.id, tester_code: codes.get(e.session_id) || '' }));
}
