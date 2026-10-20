// Derived research fields. Kept here so the rules are testable and documented in one place.
//
// last_screen = the last screen the participant COMPLETED:
//   consent  -> agreed on the welcome screen (session created)
//   baseline -> submitted the two baseline ratings (intake starts here)
//   intake   -> finished the chat and opened the care map
//   map      -> made a decision on the map and moved on to feedback
//   feedback -> submitted feedback (session completed)

export const ABANDON_AFTER_MS = 30 * 60 * 1000;
const ORDER = ['consent', 'baseline', 'intake', 'map', 'feedback'];

/** Merge a validated update into an existing session and compute derived fields. */
export function applyUpdate(existing, cleaned, now = new Date()) {
  const next = { ...existing, ...cleaned };
  const nowIso = now.toISOString();

  if (cleaned.path_id) {
    if (!existing.initial_path_id) next.initial_path_id = cleaned.path_id;
    else if (cleaned.path_id !== existing.initial_path_id) next.path_changed = true;
  }
  if (cleaned.last_screen === 'baseline' && !existing.intake_started_at) {
    next.intake_started_at = nowIso;
  }
  if (cleaned.last_screen === 'intake' && existing.seconds_to_map == null) {
    const start = existing.intake_started_at || existing.consented_at;
    if (start) next.seconds_to_map = Math.max(0, Math.round((now - new Date(start)) / 1000));
  }
  if (cleaned.last_screen === 'feedback' && !existing.completed) {
    next.completed = true;
    next.completed_at = nowIso;
  }
  // last_screen only moves forward (going Back never erases progress).
  if (cleaned.last_screen && existing.last_screen) {
    if (ORDER.indexOf(cleaned.last_screen) < ORDER.indexOf(existing.last_screen)) next.last_screen = existing.last_screen;
  }

  // Quotes are only kept with explicit permission.
  if (!next.quote_permission) next.quote_text = null;
  // Safety description only meaningful when flagged.
  if (next.safety_flag !== 'yes') next.safety_description = null;

  next.last_activity_at = nowIso;
  return next;
}

export function sessionStatus(data, now = new Date()) {
  if (data.completed) return 'completed';
  const last = data.last_activity_at || data.consented_at;
  if (last && now - new Date(last) > ABANDON_AFTER_MS) return 'abandoned';
  return 'in_progress';
}
