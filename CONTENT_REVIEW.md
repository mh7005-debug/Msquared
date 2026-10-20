# Content review

**Clinician sign-off: PENDING.** Until the table at the bottom is filled in by a real, qualified clinician, the app shows "DEMO — NOT CLINICALLY REVIEWED" and must be used for internal mock sessions only. Do not set `CLINICAL_REVIEW_COMPLETE=true` before then.

## 1. Source checks (done by the build agent, Oct 19, 2026)
"Verified" means the URL works, the title/year/publisher match, and each claim we attach appears in the source. It is not clinical endorsement of our wording.

| ID | Source | URL/title/year | Claims matched | Shown in app |
|---|---|---|---|---|
| `asrm-2024` | ASRM Practice Committee, *Current evaluation of amenorrhea: a committee opinion*, Fertil Steril 2024;122:52–61 | ✅ | ✅ Secondary amenorrhea = no menses >3 months (6 months if previously irregular); initial evaluation = history, exam, pregnancy exclusion, FSH/estradiol/TSH/prolactin; pelvic ultrasound early; pituitary MRI for persistently high prolactin. Note: does **not** name which clinician type should evaluate, and does not discuss bone health. | Yes |
| `endo-2017` | Gordon CM et al., *Functional Hypothalamic Amenorrhea: An Endocrine Society Clinical Practice Guideline*, JCEM 2017;102(5):1413–1439, doi:10.1210/jc.2017-00131 | ✅ | ✅ FHA is a diagnosis of exclusion (1.1); screen for psychological stressors (1.3); baseline DXA after ≥6 months amenorrhea (2.7); medical, dietary, and mental health support (3.2–3.3). Note: does not explicitly name "dietitian" or "mental health professional" in the recommendations. | Yes |
| `acog-faq` | ACOG, *Amenorrhea: Absence of Periods* (patient FAQ) | ✅ URL and title (via search) | ❌ Page text could not be read; year not confirmed | **No** (hidden until checked) |

## 2. What the clinician should review
Files: `public/js/content/careOptions.js`, `public/js/content/copy.js`, `public/js/shared/mapText.js` (journey sentence templates), `public/js/shared/intake.js` (questions).

- [ ] **Three care-option cards**: role names, summaries, "Why this may be relevant" text, appointment questions. Are they accurate, non-directive, and not implying a diagnosis (especially FHA)?
- [ ] **Role comparison table**: "Can help discuss" and "Often" columns.
- [ ] **Path 2 panel**: three "What clinical guidance says" statements and three "Only your clinicians can answer" items.
- [ ] **Bone health question** on the specialist card: appropriate as a question for everyone?
- [ ] **Dietitian / mental health question** on the coordination card: appropriate for all participants, without implying an eating disorder?
- [ ] **Urgent notice**: "If you have severe pain, fainting, a sudden severe headache, changes in your vision, or you feel very unwell, seek urgent medical care. In an emergency, call 911."
- [ ] **Crisis notice** (shown if the AI detects self-harm language): 988 Suicide & Crisis Lifeline.
- [ ] **Intake questions and answer options**.
- [ ] **AI instructions** in `lib/chatAi.js` (the model only classifies answers and writes a short acknowledgement; confirm the safety triggers).
- [ ] Anything missing that participants with absent or irregular periods should be told to seek care for.

## 3. Sign-off (fill in only when it really happened)
| Reviewer name and credentials | Date | Scope reviewed | Changes requested | Approved for real participants? |
|---|---|---|---|---|
| | | | | |
