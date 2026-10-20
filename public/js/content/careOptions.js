// Care-option library: all medical wording lives here, separate from display code.
// STATUS: DEMO — NOT CLINICALLY REVIEWED. A qualified clinician must review every string
// in this file before real participants use the app (see CONTENT_REVIEW.md).
//
// Rules for editors:
// - Same three cards for every user and every path. Paths change emphasis, never conclusions.
// - No diagnosis, triage, medication, calorie or exercise advice. No "you need" a referral.
// - Each `supportsClaim` must describe something the source actually says.

export const CARE_OPTIONS = [
  {
    id: 'primary-obgyn',
    role: 'Primary care clinician or OB-GYN',
    shortRole: 'Primary care or OB-GYN',
    summary:
      'Can usually start an evaluation: talk through your history, do an exam, order first tests, and refer you onward if needed.',
    whyRelevant:
      'Clinical guidance from the American Society for Reproductive Medicine (2024) describes missing periods for more than 3 months — or more than 6 months if cycles were already irregular — as a reason for evaluation. It says a first evaluation usually starts with a person’s history, a physical exam, a pregnancy test, and a few hormone tests. A primary care clinician or OB-GYN can typically start that conversation.',
    appointmentQuestions: [
      'Given how long this has been going on, what evaluation would you suggest starting with?',
      'Which tests, if any, would help — and what would each one tell us?',
      'If the first results don’t explain it, who would we involve next?',
    ],
    sources: [
      {
        sourceId: 'asrm-2024',
        supportsClaim:
          'Defines secondary amenorrhea as no menses for >3 months (or 6 months with prior irregular cycles); initial evaluation is history, exam, pregnancy exclusion, and hormone tests (FSH, estradiol, TSH, prolactin).',
      },
      {
        sourceId: 'acog-faq',
        supportsClaim: 'Patient-facing overview of amenorrhea and how it is evaluated (claim match pending).',
      },
    ],
  },
  {
    id: 'specialist',
    role: 'Specialist discussion (for example, endocrinology or reproductive endocrinology)',
    shortRole: 'Specialist discussion',
    summary:
      'Can help interpret hormone results or look into less common causes when a first evaluation doesn’t give a clear answer.',
    whyRelevant:
      'The ASRM guidance (2024) describes further steps that some evaluations need — such as an ultrasound, or imaging when certain hormone results stay abnormal. Endocrine Society guidance (2017) about one specific cause of missing periods says it can only be identified after other causes are ruled out, and suggests a bone density scan for people with that condition who have gone 6 or more months without periods. This doesn’t mean you need a specialist; it’s a conversation to have with your clinician.',
    appointmentQuestions: [
      'Which possible causes have been ruled out so far, and which haven’t?',
      'Would input from an endocrinologist or reproductive endocrinologist help interpret my results?',
      'Is bone health something we should talk about, given how long this has lasted?',
    ],
    sources: [
      {
        sourceId: 'asrm-2024',
        supportsClaim:
          'Describes pelvic ultrasound early in evaluation and pituitary MRI for persistently elevated prolactin.',
      },
      {
        sourceId: 'endo-2017',
        supportsClaim:
          'FHA is a diagnosis of exclusion (Rec 1.1); baseline DXA suggested after ≥6 months of amenorrhea (Rec 2.7). Cited for the evaluation approach only, not to imply a user has FHA.',
      },
    ],
  },
  {
    id: 'coordination',
    role: 'Coordinating care across your clinicians',
    shortRole: 'Care coordination and support',
    summary:
      'Helps pull together what each professional has found, and can include support such as a registered dietitian or mental health professional alongside medical care.',
    whyRelevant:
      'Endocrine Society guidance (2017) on one specific cause of missing periods describes care that combines medical, nutrition, and mental health support, and recommends screening for sources of stress. We cite it because it shows how team-based care can work — not because it applies to you. If you’ve seen several professionals, asking who coordinates your care can make the next step clearer.',
    appointmentQuestions: [
      'Can you help me pull together what each professional I’ve seen has found?',
      'Who is coordinating my follow-up, and how will results be shared between my clinicians?',
      'Would a registered dietitian or mental health professional be a helpful part of my care team?',
    ],
    sources: [
      {
        sourceId: 'endo-2017',
        supportsClaim:
          'Recommends a multidisciplinary approach with medical, dietary, and mental health support (Rec 3.2–3.3) and screening for psychological stressors (Rec 1.3).',
      },
    ],
  },
];

/** Compact role comparison (section D). Same rows for every path. */
export const ROLE_COMPARISON = [
  {
    careOptionId: 'primary-obgyn',
    role: 'Primary care or OB-GYN',
    helpsDiscuss: 'Your history, an exam, first tests, and referrals',
    often: 'A common first stop for an evaluation',
  },
  {
    careOptionId: 'specialist',
    role: 'Specialist (endocrinology or reproductive endocrinology)',
    helpsDiscuss: 'Interpreting hormone results; less common causes',
    often: 'Usually after a first evaluation or a referral',
  },
  {
    careOptionId: 'coordination',
    role: 'Care coordination and support',
    helpsDiscuss: 'Bringing findings together; support alongside medical care',
    often: 'When you’ve seen several people or advice conflicts',
  },
];

/** Path 2: what guidance says vs. what only your clinicians can answer. */
export const KNOWN_VS_UNCERTAIN = {
  known: [
    {
      text: 'Missing periods for more than 3 months (or 6 if cycles were already irregular) are generally a reason for evaluation.',
      sourceId: 'asrm-2024',
    },
    {
      text: 'A first evaluation usually covers your history, an exam, a pregnancy test, and some hormone tests.',
      sourceId: 'asrm-2024',
    },
    {
      text: 'Some causes can only be named after other causes have been ruled out.',
      sourceId: 'endo-2017',
    },
  ],
  uncertain: [
    'What is causing changes in your cycle',
    'Which tests make sense for you',
    'Whether you need a specialist, and when',
  ],
};

export function getCareOption(id) {
  return CARE_OPTIONS.find((c) => c.id === id) || null;
}
