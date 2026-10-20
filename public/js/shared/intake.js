// Shared by the browser (chat intake) and the server (/api/chat validation).
// No DOM access here. Option ids are the only thing the AI is allowed to return.

export const PATHS = {
  1: { id: 1, key: 'where-to-start', label: "I don't know which professional to see." },
  2: { id: 2, key: 'conflicting-advice', label: "I don't know whose advice to trust." },
  3: { id: 3, key: 'still-stuck', label: "I've sought help, but I still don't know what comes next." },
};

export const INTAKE_STEPS = [
  {
    id: 'concern',
    question: "First, which of these best describes what's going on with your cycle?",
    type: 'single',
    options: [
      { id: 'absent', label: 'My period is absent' },
      { id: 'irregular', label: "It's persistently irregular" },
      { id: 'after_bc', label: 'It changed after hormonal contraception' },
      { id: 'unsure', label: "I'm not sure" },
    ],
  },
  {
    id: 'duration',
    question: 'How long has this been going on?',
    type: 'single',
    options: [
      { id: 'under3', label: 'Under 3 months' },
      { id: '3to6', label: '3–6 months' },
      { id: 'over6', label: 'Over 6 months' },
      { id: 'unsure', label: "I'm not sure" },
    ],
  },
  {
    id: 'prior',
    question: 'Have you already talked with a professional about it?',
    type: 'single',
    options: [
      { id: 'none', label: 'Not yet' },
      { id: 'one', label: 'Yes, one professional' },
      { id: 'multiple', label: 'Yes, more than one' },
    ],
  },
  {
    id: 'types',
    question: 'Who have you seen? Choose all that apply.',
    type: 'multi',
    showIf: (a) => a.prior && a.prior !== 'none',
    options: [
      { id: 'primary_care', label: 'Primary care' },
      { id: 'obgyn', label: 'OB-GYN' },
      { id: 'endo', label: 'Endocrinology' },
      { id: 'dietitian', label: 'Registered dietitian' },
      { id: 'mental_health', label: 'Mental health professional' },
      { id: 'other', label: 'Other / prefer not to say' },
    ],
  },
  {
    id: 'outcome',
    question: 'What happened after those visits? Choose all that apply.',
    type: 'multi',
    showIf: (a) => a.prior && a.prior !== 'none',
    options: [
      { id: 'still_questions', label: 'I still have questions' },
      { id: 'conflicting', label: 'I got conflicting advice' },
      { id: 'referred', label: 'I was referred onward' },
      { id: 'evaluated_uncertain', label: 'I finished evaluations but I’m still uncertain' },
      { id: 'told_wait', label: 'I was told to wait or monitor' },
      { id: 'prefer_not', label: 'Prefer not to say' },
    ],
  },
  {
    id: 'path',
    question: "Last one: what's making it hardest to move forward with your care right now?",
    type: 'single',
    options: [
      { id: 'p1', label: PATHS[1].label },
      { id: 'p2', label: PATHS[2].label },
      { id: 'p3', label: PATHS[3].label },
    ],
  },
];

export function getStep(id) {
  return INTAKE_STEPS.find((s) => s.id === id) || null;
}

/** Steps that apply given current answers (conditional steps hidden when not relevant). */
export function activeSteps(answers) {
  return INTAKE_STEPS.filter((s) => !s.showIf || s.showIf(answers));
}

export function pathIdFromOption(optionId) {
  return { p1: 1, p2: 2, p3: 3 }[optionId] || null;
}

export function optionLabel(stepId, optionId) {
  const s = getStep(stepId);
  const o = s && s.options.find((x) => x.id === optionId);
  return o ? o.label : '';
}

/** Remove answers to conditional steps that no longer apply (e.g. after editing "prior" to "none"). */
export function pruneAnswers(answers) {
  const out = { ...answers };
  for (const s of INTAKE_STEPS) {
    if (s.showIf && !s.showIf(out)) delete out[s.id];
  }
  return out;
}
