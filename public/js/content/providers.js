// "Who to book" content. Professional TYPES and official professional-society directories only.
// No named individual clinicians, no ranking, no paid placement (spec: no provider marketplace).
// STATUS: DEMO — NOT CLINICALLY REVIEWED. Directory links must be click-checked before each test round.

export const PROVIDERS = [
  {
    id: 'obgyn',
    title: 'OB-GYN or primary care',
    what: 'A common first stop for cycle changes. Can order initial tests and refer you on.',
    ask: 'an appointment to discuss irregular or missing periods',
    directory: { label: 'ACOG: Find an OB-GYN', url: 'https://www.acog.org/womens-health/find-an-ob-gyn' },
  },
  {
    id: 'endocrinologist',
    title: 'Endocrinologist',
    what: 'A hormone specialist. Often seen by referral, after initial tests.',
    ask: 'a new-patient visit about hormones and my cycle, and whether I need a referral',
    directory: { label: 'Endocrine Society: Find an Endocrinologist', url: 'https://www.endocrine.org/patient-engagement/find-an-endocrinologist-directory' },
  },
  {
    id: 'rei',
    title: 'Reproductive endocrinologist',
    what: 'A specialist in reproductive hormones. Usually seen by referral from an OB-GYN.',
    ask: 'a referral to a reproductive endocrinologist (ask your OB-GYN)',
    directory: null,
  },
  {
    id: 'dietitian',
    title: 'Registered dietitian',
    what: 'Can talk through nutrition and energy needs alongside your medical care.',
    ask: 'a registered dietitian (RD) who works with women’s health',
    directory: { label: 'Academy of Nutrition and Dietetics: Find an Expert', url: 'https://www.eatright.org/find-a-nutrition-expert' },
  },
  {
    id: 'mental-health',
    title: 'Mental health professional',
    what: 'Support with stress, or the toll of a long search for answers.',
    ask: 'a therapist or psychologist',
    directory: { label: 'APA Psychologist Locator', url: 'https://locator.apa.org/' },
  },
  {
    id: 'functional',
    title: 'Functional medicine practitioner',
    what: 'Some people look for this too. Training and licensing vary, and evidence for some tests and supplements is limited.',
    ask: 'whether they are a licensed MD, DO or NP, and whether they’ll share results with your OB-GYN',
    askLabel: 'Ask first',
    directory: { label: 'Institute for Functional Medicine: Find a Practitioner', url: 'https://ifm.org/find-a-practitioner' },
  },
];

/** Path-based emphasis only (never symptoms): which provider cards to show open by default. */
export const PROVIDER_FOCUS = {
  1: ['obgyn'],
  2: ['obgyn', 'endocrinologist'],
  3: ['endocrinologist', 'rei'],
};

const CONCERN_PHRASE = {
  absent: 'missing periods',
  irregular: 'irregular periods',
  after_bc: 'cycle changes after stopping or changing hormonal birth control',
  unsure: 'changes in my menstrual cycle',
};
const DURATION_PHRASE = { under3: 'under 3 months', '3to6': '3–6 months', over6: 'over 6 months' };

/** What to say when booking. Built only from taps on this device; never sent to the server. */
export function bookingScript(answers) {
  const concern = CONCERN_PHRASE[answers.concern] || CONCERN_PHRASE.unsure;
  const dur = DURATION_PHRASE[answers.duration];
  return [
    `Hi, I’d like to book an appointment to discuss ${concern}${dur ? `, which has been going on for ${dur}` : ''}.`,
    'I’d like enough time to go over my history and what I’ve already tried.',
    'Do I need a referral, and is there anything I should bring?',
  ].join(' ');
}

/** Questions in the patient's own voice, per path, for a message to a clinician. */
export const PORTAL_QUESTIONS = {
  1: ['Which professional should I see next about this, and do I need a referral?', 'What tests, if any, would help clarify what’s going on?'],
  2: ['I’ve heard different advice. Could you explain your reasoning and what’s still uncertain?', 'What would help me decide between the options?'],
  3: ['What are the possible next steps from here, and who would coordinate them?', 'Is there another professional I should talk to?'],
};

/** A portal message to a clinician already seen (useful for "conflicting advice" and "still stuck"). */
export function portalMessage(answers, questions) {
  const concern = CONCERN_PHRASE[answers.concern] || CONCERN_PHRASE.unsure;
  return [
    'Hello,',
    '',
    `I’m following up about my ${concern}. I’m still unsure about next steps and would like to schedule a follow-up, or get your answer here, on:`,
    ...questions.slice(0, 3).map((q) => `- ${q}`),
    '',
    'Thank you.',
  ].join('\n');
}

/**
 * The single "Your next step" suggestion at the top of the map. Uses ONLY who they've already seen and where
 * they're stuck — never symptoms or duration — and is phrased as a common next conversation, never a requirement.
 * STATUS: DEMO — NOT CLINICALLY REVIEWED.
 */
export function suggestNext(answers, pathId) {
  const seen = answers.prior && answers.prior !== 'none' ? answers.types || [] : [];
  const has = (t) => seen.includes(t);
  if (pathId === 2 && seen.length) {
    return {
      kind: 'coordinate',
      title: 'Ask one clinician to bring the advice together',
      reason: 'You’ve heard different advice. Asking a clinician you’ve already seen to explain their reasoning and weigh it against the rest is a common next step.',
      ask: 'a follow-up visit to go over the different advice you’ve received',
      providerId: has('endo') ? 'endocrinologist' : 'obgyn',
    };
  }
  if (!seen.length || (!has('obgyn') && !has('endo'))) {
    return {
      kind: 'book',
      providerId: 'obgyn',
      reason: seen.length
        ? 'You haven’t talked with an OB-GYN about this yet. An OB-GYN or primary care clinician is a common place to start, and can refer you on.'
        : 'You haven’t talked with anyone about this yet. An OB-GYN or primary care clinician is a common place to start, and can refer you on.',
    };
  }
  if (has('obgyn') && !has('endo')) {
    return {
      kind: 'book',
      providerId: 'endocrinologist',
      reason: 'You’ve already seen an OB-GYN. A hormone specialist is a common next conversation, often by referral, so ask your OB-GYN whether it makes sense for you.',
    };
  }
  return {
    kind: 'book',
    providerId: 'rei',
    reason: 'You’ve already seen endocrinology. A reproductive endocrinologist focuses on reproductive hormones specifically; ask your OB-GYN or endocrinologist about a referral.',
  };
}
