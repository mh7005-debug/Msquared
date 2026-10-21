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
