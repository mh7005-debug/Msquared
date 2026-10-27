// Who's behind Msquared. Trust signals shown in the app come ONLY from this file.
// Rule: everything here must be true and verifiable. Never add invented numbers, members,
// reviewers, partners or testimonials (FTC rule on fake reviews and testimonials, 16 CFR 465).
// Empty values are simply not shown.

export const TEAM = {
  org: 'A research project by students at NYU Stern.',
  // From Sprint 1 discovery (deck: "20+ combined total").
  origin: 'Built after more than 20 interviews with women and medical professionals.',

  // People, shown as initials (no photos). Example: { name: 'Mariana', role: 'Product and research' }
  members: [],

  // Shown only when set. A real inbox someone on the team checks.
  contactEmail: '',
  replyTime: 'within 24 hours',

  // Who runs the free consultation. Must be literally true; shown to every participant.
  // Add credentials or departments only once confirmed (e.g. a named NYU affiliation the person actually holds).
  consultant: 'a research professional from our NYU team',

  // ONLY after a real clinical review is complete and the reviewer agreed to be named.
  // Example: { name: 'Dr. Jane Doe', credentials: 'MD, OB-GYN', date: 'October 2026' }
  reviewer: null,

  // Real quotes from Sprint 1 interviews, ONLY with the interviewee's permission. Shown as
  // interview quotes, never as product reviews. Example: { text: '…', who: 'Interview participant, 24' }
  quotes: [],
};
