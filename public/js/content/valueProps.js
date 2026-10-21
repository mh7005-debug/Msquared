// The value proposition is the app's architecture. Every screen section is tagged with the promise
// it delivers, and every measure maps to the hypothesis that promise depends on.
//
//   Promise      User-facing label   Hypothesis   Where it lives
//   Clarity      Clarity             H1           intake paths, journey, open questions, options, role comparison
//   Confidence   Evidence            H2           "why this may be relevant", sources, known vs. uncertain
//   Less effort  Less effort         enabler      2-minute taps, optional depth, voice, take-away summary
//
// The Confidence promise is labeled "Evidence" in the UI so we don't tell testers how to feel
// before asking them how much they trust the options (H2).

export const VALUE_PROPS = {
  clarity: {
    label: 'Clarity',
    promise: 'See which care conversations fit your situation.',
    hypothesis: 'H1',
    icon: 'pin',
  },
  evidence: {
    label: 'Evidence',
    promise: 'See why each option appears, with its sources.',
    hypothesis: 'H2',
    icon: 'book',
  },
  effort: {
    label: 'Less effort',
    promise: 'About 2 minutes. Leave with a summary for your visit.',
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
  decision: null, // the research question, not a promise
};
