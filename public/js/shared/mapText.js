// Deterministic templates for the care map. Pure functions (no DOM) so they can be unit-tested.
import { CARE_OPTIONS } from '../content/careOptions.js';
import { UNRESOLVED } from '../content/copy.js';

const CONCERN = {
  absent: 'Your period has been absent',
  irregular: 'Your cycle has been persistently irregular',
  after_bc: 'Your cycle changed after hormonal contraception',
  unsure: 'You’re not sure what’s going on with your cycle',
};
const DURATION = {
  under3: ' for under 3 months',
  '3to6': ' for 3–6 months',
  over6: ' for over 6 months',
  unsure: '',
};
const TYPE_NAMES = {
  primary_care: 'primary care',
  obgyn: 'an OB-GYN',
  endo: 'endocrinology',
  dietitian: 'a registered dietitian',
  mental_health: 'a mental health professional',
};
const OUTCOMES = {
  clear_plan: 'got a clear plan or answer',
  still_questions: 'still have unanswered questions',
  conflicting: 'heard advice that conflicts',
  referred: 'were referred onward',
  evaluated_uncertain: 'finished evaluations but are still uncertain',
  told_wait: 'were told to wait or monitor',
};

export function joinList(items) {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export function professionalsSeen(answers) {
  return (answers.types || []).filter((t) => TYPE_NAMES[t]).map((t) => TYPE_NAMES[t]);
}

/** Section A: 1–2 sentences built only from what the user selected. */
export function journeySummary(answers) {
  const sentences = [];
  if (answers.concern && CONCERN[answers.concern]) {
    sentences.push(`${CONCERN[answers.concern]}${DURATION[answers.duration] || ''}.`);
  }
  if (answers.prior === 'none') {
    sentences.push('You haven’t talked with a healthcare professional about it.');
  } else if (answers.prior === 'one' || answers.prior === 'multiple') {
    const who = answers.prior === 'one' ? 'one professional' : 'more than one professional';
    const seen = professionalsSeen(answers);
    const seenText = seen.length ? ` (${joinList(seen)})` : '';
    const outcomes = (answers.outcome || []).filter((o) => OUTCOMES[o]).map((o) => OUTCOMES[o]);
    const outcomeText = outcomes.length ? ` and ${joinList(outcomes)}` : '';
    sentences.push(`You’ve spoken with ${who}${seenText}${outcomeText}.`);
  }
  return sentences.join(' ');
}

/** Section E: copyable summary. Leaves out symptom and duration details on purpose. */
export function copySummary(answers, pathId, ownWords = '') {
  const u = UNRESOLVED[pathId];
  const lines = [];
  lines.push('My visit brief (prepared with Msquared, an educational tool, not medical advice)');
  lines.push('');
  lines.push(`Where I'm stuck: ${u.obstacle}`);
  const seen = professionalsSeen(answers);
  if (seen.length) lines.push(`Professionals I've seen: ${joinList(seen)}`);
  if (ownWords && ownWords.trim()) lines.push(`In my own words: ${ownWords.trim()}`);
  lines.push('');
  lines.push('Professional conversations to consider:');
  for (const c of CARE_OPTIONS) lines.push(`- ${c.shortRole}: ${c.summary}`);
  lines.push('');
  lines.push('Questions to bring:');
  for (const q of u.questions) lines.push(`- ${q}`);
  for (const c of CARE_OPTIONS) for (const q of c.appointmentQuestions) lines.push(`- ${q}`);
  return lines.join('\n');
}

/** Section order per path. Every path renders every section; only order and emphasis change. */
export function sectionOrder(pathId) {
  switch (pathId) {
    case 1:
      return ['journey', 'unresolved', 'compare', 'options', 'next', 'summary', 'decision'];
    case 2:
      return ['journey', 'unresolved', 'evidence', 'options', 'compare', 'next', 'summary', 'decision'];
    case 3:
      return ['journey', 'unresolved', 'options', 'compare', 'next', 'summary', 'decision'];
    default:
      return ['journey', 'unresolved', 'options', 'compare', 'next', 'summary', 'decision'];
  }
}
