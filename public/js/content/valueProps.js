// The value proposition is the app's architecture. Every screen section is tagged with the promise
// it delivers, and every measure maps to the hypothesis that promise depends on.
//
//   Promise      User-facing label   Hypothesis   Where it lives
//   Clarity      Clarity             H1           "Your next step" card, journey, open questions, options, role comparison
//   Confidence   Evidence            H2           "why this is suggested" / "why this may be relevant", sources, known vs. uncertain
//   Less effort  Less effort         enabler      tap-don't-retell intake, live preview, voice, call script, directories, visit brief
//
// The Confidence promise is labeled "Evidence" in the UI so we don't tell testers how to feel
// before asking them how much they trust the options (H2).

export const VALUE_PROPS = {
  clarity: {
    label: 'Clarity',
    promise: 'Know who to see next, and how it fits where you are.',
    hypothesis: 'H1',
    icon: 'pin',
  },
  evidence: {
    label: 'Evidence',
    promise: 'See the reasoning and medical guidance behind every suggestion.',
    hypothesis: 'H2',
    icon: 'book',
  },
  effort: {
    label: 'Less effort',
    promise: 'Tell us once. We can match you with the right clinician, or give you everything to do it yourself.',
    hypothesis: 'enabler',
    icon: 'clock',
  },
};

/** Which promise each care-map section delivers. */
export const SECTION_PROMISE = {
  journey: 'clarity',
  unresolved: 'clarity',
  evidence: 'evidence',
  options: 'clarity',
  compare: 'clarity',
  next: 'effort',
  summary: 'effort',
  concierge: 'effort',
  decision: null, // the research question, not a promise
};
