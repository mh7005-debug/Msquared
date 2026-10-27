# Decisions, trade-offs, and tests

## Why these two hypotheses (entrepreneurial logic)
Problem (Sprint 1): women who have sought help still can’t decide which advice to trust or which care to pursue.

| Value promise | Riskiest assumption | What we built | Evidence |
|---|---|---|---|
| **Clarity:** know which care option fits | **H1:** a personalized pathway helps her name a clear next step better than her usual research | 6-tap intake, 3 entry paths, care map, questions to bring, summary | 14/20 name a next step and why; clarity before → after; time to map |
| **Confidence:** know why advice is credible | **H2:** seeing why an option appears, with sources, makes her willing to rely on it | “Why this may be relevant,” linked guidance, known vs. uncertain | Reliance before → after reading why; use/verify/unsure + reason; 14/20 trust 6+ with a reason; `trust_source` |
| **Less effort:** stop repeated searching | **Enabler:** fast enough that she finishes | 2-minute taps, optional depth, voice | 16/20 finish unassisted; drop-off by screen |

If H1 fails there is no product; if H2 fails she won’t act on it or return. Both are cheap to test now, before investing in a provider network, booking or payment.

## Team decisions (Oct 19, 2026)
- **Chat intake now.** The 6 intake questions are asked in a chat. Participants can tap or type. Typed answers go to Claude (`claude-haiku-5-5`), which may only (a) map the text to the allowed option ids and (b) write a ≤20-word acknowledgement. The care map is never AI-written; it comes from the fixed content library. This narrows the spec's "no chatbot" rule rather than dropping it: there is no free-form medical conversation.
- **Hosting:** GitHub + Vercel (Hobby) + Neon Postgres, all under the team's accounts.
- **20 testers** instead of 10. Nothing in the app caps sessions; P-codes P01–P99 are accepted.
- **English only.**

## H2 measured at the moment of explanation (Oct 20, 2026)
Problem: H2 says people rely on an option more when they understand *why it appears* and can inspect evidence. The old build only measured trust once, at the end, so it couldn't link trust to the explanations, and most testers might never open them.
Fix (still one explained version, no A/B):
- On each option card, before the explanation: **“Would you bring this up with a clinician?”** Likely / Not sure / Unlikely (`rely_<option>`).
- Inside “See why this may be relevant”: **“After reading this, are you more or less likely to bring it up?”** More likely / No change / Less likely (`rely_change_<option>`).
- Events `option_rated` and `option_rerated` (with times), next to `care_option_expanded`, `evidence_opened` and `source_clicked`.

How to read H2 now:
| Question | Data |
|---|---|
| Do people open the explanations? | `care_option_expanded`, `evidence_opened`, `source_clicked` |
| Did reading why change willingness to rely? | `rely_change_*` among those who opened it; compare with `rely_*` |
| Do they act on the map? (spec primary) | `decision_choice` + `decision_reason` |
| Threshold: trust 6+ with a concrete reason | `trust_post` + `trust_reason` |
Limits: self-selection (who opens explanations) and possible demand effects from asking twice. Report as within-person change, not a causal effect.

## Human trust signals (Oct 20, 2026)
Based on the Stanford Web Credibility guidelines (real organization, real people, expertise, easy contact, verifiable information) and Sillence et al. 2004 (design decides who leaves; expertise and “women like me” decide who trusts).
- “Who’s behind Msquared” on the welcome page, a reviewer line on the map, and a “Talk to a person” card on the map and thank-you page. All content lives in `public/js/content/team.js` and is hidden while empty.
- Only true, verifiable facts. No invented network size, number of people helped, professionals, reviewers, partners or testimonials (deceptive, and banned by the FTC rule on fake reviews and testimonials).
- New `trust_source` question (“What most affected how much you trusted the options?”, randomized order) separates the H2 driver (explanations and sources) from these other signals, so H2 stays interpretable.

## Map as a route and shorter copy (Oct 20, 2026)
- The care map opens with a route: You are here, three unranked conversations, your next conversation. Sections down the page are stops on a rail. Tapping a stop scrolls to it.
- Copy shortened on every screen; one privacy line per form instead of a hint under every box.

## Optional depth and voice (Oct 20, 2026)
Problem: answers were mostly numbers, but the team needs richer explanations without tiring testers.
Approach: quick by default, depth on demand. Evidence: voice answers in smartphone surveys are longer and faster but raise nonresponse when they replace typing, so voice is offered beside typing, never instead of it ([ISR Michigan](https://api.isr.umich.edu/?p=198893), [Survey Practice](https://www.surveypractice.org/article/2713-giving-respondents-voice-the-feasibility-of-voice-input-for-mobile-web-surveys)). Constant progress bars don't reduce breakoff; fast-early/slow-later does, so taps stay first and open questions come last ([Villar, Callegaro and Yang 2013](https://research.google/pubs/where-am-i-a-meta-analysis-of-experiments-on-the-effects-of-progress-indicators-for-web-surveys/)).

- **Own-words step** (`own_words`) after the 6 taps: “Is there anything else you’d like your care map to reflect?” Optional. It is added to the participant’s copyable summary, so writing more gives them something back.
- **Follow-ups that open only after a rating:** “What made you choose that number?” under clarity after the map (`clarity_reason`) and trust in Msquared’s options (`trust_reason`).
- **Speak button** on every open text box, using the browser’s built-in speech-to-text (Chrome, Edge, Safari 14.5+; not Firefox, where a keyboard-microphone tip shows instead). Text appears in the box and can be edited. No audio reaches Msquared. Event `voice_input_used` records which field was dictated.
- **Free-text limit raised from 240 to 1,000 characters** (spoken answers run long). Spec deviation.
- **Team decision: own words are always stored.** This deviates from spec §6 (“do not store intake symptom/duration/provider answers”): tapped intake answers are still never stored, but anything a participant writes or says in their own words is, and it may contain health details. The consent screen states this, and that the browser’s speech service (Apple or Google) processes voice. The clinician reviewer and instructor should know about this before real sessions.
- **Not done:** using these answers to route people to specific practitioners. That would be individualized triage, which the spec rules out; the stored answers are evidence for designing a clinician-reviewed version later.

## Question wording review (Oct 20, 2026)
Goal: remove wording that nudges testers toward an answer. Principles: no presupposed answer ("what, if anything"), balanced options (a positive option wherever there are negative ones), identical wording for anything measured before and after, randomized option order where position could bias the choice (order logged as `options_shown`).

| Screen | Before | After | Why |
|---|---|---|---|
| Baseline and Feedback | “Can you name a professional-care next step right now?” / “Can you name one next professional-care discussion step, and why?” | “What, if anything, do you think your next step should be? Why?” (same on both screens; “I’m not sure” is a fine answer) | “Professional-care” told testers which answer we wanted, so H1 couldn’t show they named one *independently*. Two different wordings also made before/after not comparable. The team rubric now judges whether the answer is a specific professional-care step. |
| Feedback | “How clear are you now about what to do next?” | Identical to the baseline item | Identical items are needed to compare before and after |
| Feedback | Only “trust the care options Msquared presented” (different from the baseline trust item) | Adds `trust_info_post`, identical to the baseline item; keeps the Msquared-specific item for the H2 threshold | Before/after trust was comparing two different questions |
| Intake Q3 | “Have you **already** talked with a professional?” / “Not **yet**” | “Have you talked with a healthcare professional about this?” / “No” | “Already” and “not yet” imply they should have |
| Intake Q5 | Only negative outcomes | Adds “I got a clear plan or answer” | One-sided options push testers to report a bad experience |
| Intake Q6 (path) | Fixed order | Spec wording kept; three options shown in random order per session | Primacy bias: the first option gets chosen more often. The question’s presupposition (that something is hard) is kept because every recruit is, by definition, stuck. |
| Map decision | “Use this…” always listed first | Random order per session | The positive, first-listed option would collect extra picks |
| Map | “Why?” / “What information is missing?” / “Which professional conversation would you consider next?” | “What led you to that choice?” / “What information, if any, is missing?” / “…if any…” with a “None of these” choice | Removes presupposition; “Why?” can read as challenging |
| Feedback | “What made you trust or question the options? For example, a source, an explanation…” | “What, if anything, affected how much you trusted the options shown?” | The examples handed testers the H2 answer (“sources”) |
| Feedback | “Which part helped most?” | “Which part, if any, was most useful?”; features in random order, “None of these” last | Presupposed something helped; order bias |
| Feedback | “Would you use Msquared **instead of** your usual method?” | “…would you use Msquared, your usual way of looking for information, or both? Why?” | Yes/no framing invites agreeing with the builders; three balanced alternatives |
| Feedback intro | “Honest answers help most” | “There are no right answers. Critical feedback is just as useful to us as positive feedback.” | Reduces social-desirability bias |

Not changeable in the app: the moderator’s own words. Moderators should read the same neutral instructions to every tester and avoid explaining the map.

## Changes to the spec's data model (all non-sensitive)
| Added | Why |
|---|---|
| `next_step_pre` | Baseline "name a next step" answer; H1 needs a before/after comparison |
| `decision_reason` | Spec asks for participants' stated reason for use/verify/unsure |
| `map_missing_info`, `map_next_conversation` | Spec asks these on the map but had no columns |
| `trust_reason` | H2 threshold requires "a concrete reason" for trusting or questioning |
| `trust_info_post` | Same trust question as baseline, so before/after trust is comparable |
| Event `options_shown` | Records the randomized option order, to check for order effects |
| `initial_path_id`, `path_changed` | Participants can change path on the map; keeps the original funnel assignment |
| `intake_mode` | ai (typing available) vs scripted (tap only) |
| `safety_description`, `status`, `last_activity_at`, `completed_at` | Review safety flags; observable abandonment |
| Events `screen_viewed`, `intake_started`, `chat_step_answered`, `chat_clarification_needed`, `chat_ai_unavailable`, `safety_notice_shown`, `path_changed` | Where people stall inside the chat |

## Engineering trade-offs
- **No framework (plain HTML/JS + Vercel functions) instead of Next.js.** The build workspace couldn't install Next.js. The no-build approach let us run and click-test the full app before handing it over, and removes the build step as a deploy failure point. Medical wording stays in separate content files, as the spec asks (`public/js/content/careOptions.js` instead of `src/content/careOptions.ts`).
- **Session data as JSON in Postgres.** One row per session (`data jsonb`) so fields can be added without migrations. Tables are created automatically on first request.
- **Server refuses to start sessions on a deployed site without a database**, so research data is never silently lost to memory.
- **`last_screen` = last completed screen**, and only moves forward.
- **`seconds_to_map`** runs from finishing the baseline (start of chat) to opening the map — the part comparable to Control A research time.
- **Abandonment** = not completed and no activity for 30 minutes. We don't infer intent from closing the tab.
- **Path emphasis:** Path 1 opens the role comparison first; Path 2 adds "What guidance says vs. what only your clinicians can answer" and highlights evidence toggles; Path 3 highlights the journey, follow-up questions, coordination card, and summary. All paths show the same three cards in the same order.
- **Unverified sources are hidden.** ACOG's FAQ is in the library but not shown until its text is checked.
- **AI safeguards:** forced tool output, option ids validated server-side, acknowledgement filtered for advice-like wording, 300-character input, 40 calls per session, 12-second timeout, falls back to tap-only on any failure. Typed text is never stored or logged.
- **Security:** export/delete need `EXPORT_PASSWORD` (12+ chars, constant-time compare; disabled otherwise). CSP blocks third-party scripts; `Referrer-Policy: no-referrer`; CSV cells are guarded against spreadsheet formula injection.

## Not built (by design)
Control A simulation, A/B variants, dashboards, accounts, provider search or booking, payments, diagnosis or triage, treatment advice, free-form medical chatbot, wearables, insurance, record upload, voice.

## Known limits
- Neon storage was not exercised in the build workspace (no database there); the in-memory store with the same interface was. Do the dry run in the README before real sessions.
- Participants can't come back to a session after closing the tab (by design: intake stays in the tab).
- No rate limit on creating sessions (acceptable for a 20-person class study).

## Tests
`npm test` (17): intake answers rejected by the server; field validation; derived fields (path change, time to map, completion, quote permission, forward-only progress); abandonment; CSV escaping; AI output contract; journey summary built only from selections; editing intake updates summary; copyable summary omits symptoms; three distinct path orders with the same cards; no directive or diagnosis language in content; no consent → no data; baseline and feedback save; export and delete require the password; export disabled with a weak password; deployed site without a database refuses sessions.

`npm run test:e2e` (6, real browser at 375px and 320px): all three paths end to end with distinct emphasis; accordion, evidence, and source link; copy works and omits symptoms; decision is required; pre/post and events saved; no intake answers in exports; intake edit updates summary; typed answers understood and urgent notice shown, typed text never stored; path change recorded; no horizontal scroll on mobile; later screens redirect without consent.


## Tell it once, leave ready to book (tester feedback)
**Feedback:** people are tired of repeating their story; the end felt like one more step, with no provider direction.
- **Intake:** reframed as "No need to retell your whole story" — taps only, about a minute. A live "Your map so far" panel fills in with each answer so effort turns into visible output. Own words are framed as "say it once" and flow into the visit brief.
- **Map end:** new "Book your next step" section: six professional types (OB-GYN/primary care, endocrinologist, reproductive endocrinologist, registered dietitian, mental health, functional medicine), each with what they do, what to ask for, and an official professional-society directory. A call script and a portal message are pre-written from the person's taps (on the device only). The summary became a printable "visit brief".
- **Why types, not named doctors:** the spec rules out a provider marketplace and asserting a referral is required; we also have no vetted clinician network. Directory links are official society directories, unranked, with no paid placement. Named partner clinicians can come later, once real clinicians agree and the spec changes.
- **Functional medicine:** included because testers ask for it, with an honest caution (licensing varies, limited evidence for some tests and supplements) and an "ask first" prompt. Needs clinician review.
- **New measure:** `contact_intent_post` (optional 1–7) tests whether the map leads to action rather than feeling like an extra step.


## Painkiller, not vitamin (data from the first 12 sessions)
- **Answer first.** Half of the users who reached the map left before choosing a next step. The map now opens with one "Your next step" card: who to talk to, why (based only on who they've seen and where they're stuck), what to ask for, a one-tap call script, and a directory link. Details follow below. A "I'm done" bar stays on screen so users can finish from anywhere.
- **Personalized by history, not symptoms.** Seen no one, or no OB-GYN → OB-GYN/primary care; seen an OB-GYN → endocrinologist; seen endocrinology → reproductive endocrinologist; conflicting advice → ask one clinician to bring the advice together (with a ready message). Phrased as "a common next conversation." Needs clinician review (`suggestNext` in providers.js).
- **H2 exposure.** Only 2 of 8 opened explanations. Rating an option now reveals its "why" automatically, so every rater sees an explanation right after giving the before-rating; the before/after comparison stays clean.
- **Less friction before value.** 4 of 12 left before the intake. The consent copy is shorter and the baseline screen says "About 30 seconds, then your map."
- **Usable data.** Personal tester links (`/?code=P07`) and a one-tap screener (current / past / no) so analysis can be limited to the real segment.
- **Measure behavior, not just intent.** An optional one-week check-in (email kept separately) asks whether they booked or contacted a clinician. This is the real test of "not just another step."


## Concierge MVP: matchmaker, done for you (feedback, Oct 23)
- The value proposition shifts to "we do the solution for you." Without signed clinicians, the MVP tests it as a concierge request handled by hand: the app does the intake and the care map; she taps "Have Msquared match me", confirms the kind of clinician (prefilled from her next-step suggestion), and chooses email or phone. The team receives her case summary and follows up.
- The self-serve tools stay as "Or do it yourself", so we can compare who asks to be matched against who books on their own.
- Privacy: her tapped answers normally never leave the device. They are shared only inside the concierge summary, only after she checks an explicit share box, and stored in a separate table (`ms_requests`) outside the research export.
- H1 and H2 are unchanged and still measured the same way. `concierge_requested` adds a behavioral signal for the done-for-you value proposition.
- Copy states we are not a medical provider; care comes from a licensed clinician.

## Two-page care map (practitioner feedback, Oct 26)
"There's a lot of information on the final page. Separate the next steps from everything else so it's clear where to click to get to that next provider."
- Page 1, "Your next step": the personalized next step, "Have Msquared match me", do-it-yourself options, the H2 rating and evidence for that suggestion, and the "What would you do next?" decision. Nothing else.
- Page 2, "Answers & resources": her journey, open questions, every care option (with per-option H2 ratings), role comparison, all provider types and directories, the visit brief and the concierge request.
- Tabs at the top switch pages; `map_tab` events show how many open page 2. H1 and H2 measures are unchanged; the primary H2 measure (`rely_next`) stays on page 1.
