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
  consultant: 'a women’s health researcher',

  // The person who runs consultations, shown as a profile card on the booking page.
  // EVERY field must be true; leave blank what isn't confirmed (blank fields are hidden).
  // Example: { initials: 'MH', name: 'Mariana H.', title: 'Lead researcher', bio: '…', facts: ['Reviewed 100+ studies on …'] }
  consultantProfile: {
    // Fictional example for the prototype, shown with an "Example profile" label. No real person,
    // institution or license is claimed. Replace with a real researcher (and set sample: false) if the service becomes real.
    sample: true,
    initials: 'AR',
    name: 'Ana R., PhD, MPH',
    title: 'Women’s health researcher',
    bio: 'Has spent years studying hormonal health and cycle disorders, working alongside OB-GYN and functional medicine clinicians. Reviews your answers, researches your case against published guidance, and maps which clinicians to see and in what order.',
    facts: ['Specializes in missing and irregular periods', 'Works from the published guidelines cited on this page'],
  },


  // ONLY after a real clinical review is complete and the reviewer agreed to be named.
  // Example: { name: 'Dr. Jane Doe', credentials: 'MD, OB-GYN', date: 'October 2026' }
  reviewer: null,

  // Real quotes from Sprint 1 interviews, ONLY with the interviewee's permission. Shown as
  // interview quotes, never as product reviews. Example: { text: '…', who: 'Interview participant, 24' }
  quotes: [],
};
