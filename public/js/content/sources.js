// Clinical sources. Edit here only. See CONTENT_REVIEW.md for the verification log.
// `verified: true` means the agent confirmed URL, title, year and that the cited claim
// appears in the source. It does NOT mean a clinician has reviewed our wording.
// Only verified sources are shown in the app.

export const SOURCES = {
  'asrm-2024': {
    id: 'asrm-2024',
    title: 'Current evaluation of amenorrhea: a committee opinion',
    publisher: 'American Society for Reproductive Medicine (Fertility and Sterility 122:52–61)',
    year: 2024,
    url: 'https://www.asrm.org/practice-guidance/practice-committee-documents/current-evaluation-of-amenorrhea/',
    verified: true,
    verifiedOn: '2026-10-19',
  },
  'endo-2017': {
    id: 'endo-2017',
    title: 'Functional Hypothalamic Amenorrhea: An Endocrine Society Clinical Practice Guideline',
    publisher: 'Endocrine Society (J Clin Endocrinol Metab 102(5):1413–1439)',
    year: 2017,
    url: 'https://academic.oup.com/jcem/article/102/5/1413/3077281',
    verified: true,
    verifiedOn: '2026-10-19',
  },
  'triad-2014': {
    id: 'triad-2014',
    title: '2014 Female Athlete Triad Coalition Consensus Statement on Treatment and Return to Play of the Female Athlete Triad',
    publisher: 'Female Athlete Triad Coalition (Br J Sports Med 48(4):289)',
    year: 2014,
    url: 'https://bjsm.bmj.com/content/48/4/289',
    // Abstract: guidelines cover "management by a multidisciplinary team".
    verified: true,
    verifiedOn: '2026-10-26',
  },
  'ioc-2023': {
    id: 'ioc-2023',
    title: '2023 International Olympic Committee consensus statement on Relative Energy Deficiency in Sport (REDs)',
    publisher: 'International Olympic Committee (Br J Sports Med 57(17):1073–1097)',
    year: 2023,
    url: 'https://pubmed.ncbi.nlm.nih.gov/37752011/',
    // Abstract: REDs is "a syndrome of deleterious health and performance outcomes" from low energy availability; notes interplay with mental health.
    verified: true,
    verifiedOn: '2026-10-26',
  },
  'acog-faq': {
    id: 'acog-faq',
    title: 'Amenorrhea: Absence of Periods',
    publisher: 'American College of Obstetricians and Gynecologists (patient FAQ)',
    year: null,
    url: 'https://www.acog.org/womens-health/faqs/amenorrhea-absence-of-periods',
    // URL and title confirmed via search; page text could not be read to match claims.
    verified: false,
    verifiedOn: null,
  },
};

export function getSource(id) {
  return SOURCES[id] || null;
}
