// Non-clinical and safety copy. Safety copy is DEMO — pending clinician review.

export const STUDY = {
  retention: 'the end of the fall 2026 semester',
};

export const URGENT_NOTICE = {
  title: 'If you feel unwell right now',
  body: 'Msquared can’t assess symptoms. If you have severe pain, fainting, a sudden severe headache, changes in your vision, or you feel very unwell, seek urgent medical care. In an emergency, call 911.',
};

export const CRISIS_NOTICE = {
  title: 'You don’t have to handle this alone',
  body: 'If you’re thinking about harming yourself, call or text 988 (Suicide & Crisis Lifeline) to talk with someone now. In an emergency, call 911.',
};

export const EDUCATIONAL_NOTICE =
  'Msquared is educational. It doesn’t diagnose, treat, or replace an evaluation by a healthcare professional.';

export const FREE_TEXT_REMINDER = 'Written answers are optional. Type or tap Speak, and leave out names.';

/** Optional open step after the 6 intake questions. Saved for the research team (see consent). */
export const OWN_WORDS = {
  label: 'Anything else your clinician should know? (optional)',
  hint: 'Say it once here and it goes into your visit brief. Type or tap Speak. Leave out names.',
};

/** Follow-up shown only after a rating is chosen. */
export const WHY_RATING = 'What made you choose that number? (optional)';

/**
 * Measurement items asked BEFORE and AFTER the care map. Wording must stay identical on both
 * screens so the change can be compared. Neutral wording: no presupposed answer, balanced anchors.
 */
export const MEASURES = {
  clarity: { legend: 'How clear are you about what to do next?', low: 'Not at all clear', high: 'Completely clear' },
  trustInfo: {
    legend: 'How much do you trust the information you have about your care options?',
    low: 'Not at all',
    high: 'Completely',
  },
  nextStep: {
    label: 'What, if anything, do you think your next step should be? Why? (optional)',
    hint: '“I’m not sure” is fine. Type or tap Speak.',
  },
};

/** Short labels for the route map's "You are here" stop. */
export const PATH_SHORT = {
  1: 'Not sure who to see',
  2: 'Not sure whose advice to trust',
  3: 'Not sure what comes next',
};

/** Plain-language obstacle (section B) and 1–2 questions per path. */
export const UNRESOLVED = {
  1: {
    obstacle: 'You’re not sure which professional to start with.',
    questions: [
      'Which kind of professional can start an evaluation for missing or irregular periods?',
      'What does each one usually help with, and when do they bring in others?',
    ],
  },
  2: {
    obstacle: 'You’ve heard different things and aren’t sure whose advice to trust.',
    questions: [
      'What does current clinical guidance say, and what is still uncertain for you?',
      'What could you ask so your clinicians explain why their advice differs?',
    ],
  },
  3: {
    obstacle: 'You’ve already sought help, but the next step still isn’t clear.',
    questions: [
      'What has already been ruled out, and what hasn’t?',
      'Who is coordinating your care, and what’s the plan for follow-up?',
    ],
  },
};

/** Concierge matching (MVP: the team follows up by hand). Edit the promise to what the team can actually keep. */
export const CONCIERGE = {
  cta: 'Get help from our care team',
  title: 'Let our care team take it from here',
  lede: 'A real person on our team reads your summary, looks at the whole picture across specialties, and gets back to you with the clinicians to talk to. No searching on your own.',
  promise: 'A member of our team will reach out within 2 business days.',
  share: 'Share my care summary and contact details with the Msquared team so they can match me.',
  privacy: 'Kept apart from the research data and used only to contact you about a match. We are not a medical provider; any care comes from a licensed clinician.',
  done: 'Request received. A member of our team will reach out within 2 business days.',
};

/**
 * The whole-picture message (practitioner feedback). Claims must stay within endo-2017 (Rec 2.7 bone density,
 * Rec 3.2–3.3 multidisciplinary care). STATUS: DEMO — NOT CLINICALLY REVIEWED.
 */
export const WHOLE_PICTURE = {
  short: 'Missing periods can affect more than your cycle, so getting the full picture often takes more than one professional.',
  title: 'Why the whole picture matters',
  body: 'Missing periods can affect more than your cycle. For one common cause, medical guidance suggests checking bone health after 6 months without a period, and recommends medical, nutrition and mental health support working together. That’s why the right answer often takes more than one professional, and more research than most people expect.',
  sourceId: 'endo-2017',
};
