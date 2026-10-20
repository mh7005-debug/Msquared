# Decisions, trade-offs, and tests

## Team decisions (Oct 19, 2026)
- **Chat intake now.** The 6 intake questions are asked in a chat. Participants can tap or type. Typed answers go to Claude (`claude-haiku-5-5`), which may only (a) map the text to the allowed option ids and (b) write a ≤20-word acknowledgement. The care map is never AI-written; it comes from the fixed content library. This narrows the spec's "no chatbot" rule rather than dropping it: there is no free-form medical conversation.
- **Hosting:** GitHub + Vercel (Hobby) + Neon Postgres, all under the team's accounts.
- **20 testers** instead of 10. Nothing in the app caps sessions; P-codes P01–P99 are accepted.
- **English only.**

## Changes to the spec's data model (all non-sensitive)
| Added | Why |
|---|---|
| `next_step_pre` | Baseline "name a next step" answer; H1 needs a before/after comparison |
| `decision_reason` | Spec asks for participants' stated reason for use/verify/unsure |
| `map_missing_info`, `map_next_conversation` | Spec asks these on the map but had no columns |
| `trust_reason` | H2 threshold requires "a concrete reason" for trusting or questioning |
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
