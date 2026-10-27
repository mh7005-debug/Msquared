// Server-side whitelist of research fields. Anything not listed here is dropped.
// Tapped intake answers (symptom, duration, providers) are NOT accepted. Free text the participant
// chooses to write or speak (own_words and the optional follow-ups) IS stored, as the consent screen says.
import { HttpError } from './http.js';

export const TEXT_MAX = 1000;

const likert = (v) => (Number.isInteger(v) && v >= 1 && v <= 7 ? v : invalid());
const text = (v) => {
  if (v === null || v === '') return null;
  if (typeof v !== 'string') invalid();
  const t = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  return t.slice(0, TEXT_MAX) || null;
};
const oneOf = (...allowed) => (v) => (v === null ? null : allowed.includes(v) ? v : invalid());
const bool = (v) => (typeof v === 'boolean' ? v : invalid());
const pathId = (v) => ([1, 2, 3].includes(v) ? v : invalid());

function invalid() {
  throw new HttpError(400, 'Invalid field value');
}

export const SCREENS = ['consent', 'baseline', 'intake', 'map', 'feedback'];

const FIELDS = {
  // baseline
  clarity_pre: likert,
  trust_pre: likert,
  next_step_pre: text,
  // intake (only the funnel assignment and mode, never the answers)
  path_id: pathId,
  own_words: text,
  intake_mode: oneOf('ai', 'scripted'),
  // map
  decision_choice: oneOf('use', 'verify', 'unsure'),
  decision_reason: text,
  map_missing_info: text,
  map_next_conversation: oneOf('primary-obgyn', 'specialist', 'coordination', 'not-sure', 'none'),
  // H2: per option, would they bring it up (before reading why) and did the explanation change that
  rely_primary_obgyn: oneOf('likely', 'unsure', 'unlikely'),
  rely_specialist: oneOf('likely', 'unsure', 'unlikely'),
  rely_coordination: oneOf('likely', 'unsure', 'unlikely'),
  rely_change_primary_obgyn: oneOf('more', 'same', 'less'),
  rely_change_specialist: oneOf('more', 'same', 'less'),
  rely_change_coordination: oneOf('more', 'same', 'less'),
  next_suggested: oneOf('obgyn', 'endocrinologist', 'rei', 'coordinate'),
  rely_next: oneOf('likely', 'unsure', 'unlikely'),
  rely_change_next: oneOf('more', 'same', 'less'),
  // feedback
  clarity_post: likert,
  trust_post: likert,
  trust_info_post: likert,
  clarity_reason: text,
  relevance_post: likert,
  contact_intent_post: likert,
  screener: oneOf('current', 'past', 'other'),
  book_intent_pre: oneOf('likely', 'unsure', 'unlikely'),
  book_intent_change: oneOf('more', 'same', 'less'),
  book_choice: oneOf('booked', 'not_now'),
  research_opened: (v) => (v === true ? true : v === null || v === false ? false : invalid()),
  support_model: oneOf('one_time', 'ongoing', 'not_sure'),
  followup_status: oneOf('booked', 'contacted', 'not_yet'),
  followup_note: text,
  next_step_response: text,
  trust_reason: text,
  trust_source: oneOf('why', 'sources', 'team', 'design', 'own', 'human', 'none'),
  most_helpful_feature: oneOf('role_comparison', 'explanations_sources', 'journey_summary', 'appointment_questions', 'next_step_tools', 'concierge_match', 'none'),
  missing_or_confusing: text,
  prefers_msquared_stated: text,
  safety_flag: oneOf('yes', 'no'),
  safety_description: text,
  quote_permission: bool,
  quote_text: text,
  // progress
  last_screen: oneOf(...SCREENS),
};

/** Returns a clean object containing only allowed fields with validated values. */
export function cleanFields(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400, 'Invalid fields');
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    if (!(k in FIELDS)) continue;
    if (v === undefined) continue;
    out[k] = FIELDS[k](v);
  }
  return out;
}

export const EVENT_NAMES = new Set([
  'screen_viewed',
  'options_shown',
  'voice_input_used',
  'option_rated',
  'option_rerated',
  'intake_started',
  'chat_step_answered',
  'chat_clarification_needed',
  'chat_ai_unavailable',
  'intake_step_revisited',
  'safety_notice_shown',
  'path_selected',
  'path_changed',
  'map_viewed',
  'role_comparison_opened',
  'care_option_expanded',
  'evidence_opened',
  'source_clicked',
  'decision_selected',
  'summary_copied',
  'script_copied',
  'next_card_action',
  'finish_bar_used',
  'followup_opt_in',
  'concierge_opened',
  'map_tab',
  'clarity_rated',
  'concierge_requested',
  'followup_answered',
  'brief_printed',
  'provider_opened',
  'provider_link_clicked',
  'feedback_submitted',
  'session_completed',
]);

const COMPONENT_RE = /^[a-z0-9:_-]{1,64}$/;

export function cleanEvent(e) {
  if (!e || typeof e !== 'object') return null;
  if (!EVENT_NAMES.has(e.event_name)) return null;
  const elapsed = Number.isFinite(e.elapsed_ms) ? Math.max(0, Math.min(Math.round(e.elapsed_ms), 2147483647)) : null;
  const comp = typeof e.component_id === 'string' && COMPONENT_RE.test(e.component_id) ? e.component_id : null;
  const path = [1, 2, 3].includes(e.path_id) ? e.path_id : null;
  return { event_name: e.event_name, component_id: comp, elapsed_ms: elapsed, path_id: path };
}

export const SESSION_ID_RE = /^[a-z0-9]{12}$/;
export const TESTER_CODE_RE = /^P\d{2}$/;

export function cleanTesterCode(v) {
  if (v === undefined || v === null || v === '') return null;
  const t = String(v).trim().toUpperCase();
  return TESTER_CODE_RE.test(t) ? t : invalid();
}
