# Msquared — Sprint 2 MVP (Treatment B)

A 5-screen web app: **consent → baseline → chat intake → care map → feedback**. It turns a participant's care-seeking history into an educational next-step care map with sourced explanations, then records non-identifying research data for the team.

> **Status:** content is **DEMO — NOT CLINICALLY REVIEWED**. Use internal mock sessions only until a clinician signs off in `CONTENT_REVIEW.md`.

---

## Deploy (first time, ~15 minutes)

You need: a GitHub account, a Vercel account, and (optional) an Anthropic API key.

1. **Put the code on GitHub.** Upload this folder to your repo (for example `mh7005-debug/Msquared`). On github.com: open the repo → **Add file → Upload files** → drag in everything *inside* this folder (not the folder itself) → **Commit changes**.
2. **Import into Vercel.** vercel.com → **Add New → Project** → pick the repo → **Import**.
   - Application Preset: leave **Other**.
   - Root Directory: `./`
   - Don't change Build and Output Settings (the repo's `vercel.json` handles them).
3. **Add the environment variables** (same screen, *Environment Variables*):
   | Key | Value |
   |---|---|
   | `EXPORT_PASSWORD` | A team password, 12+ characters. Share it only with researchers. |
   | `ANTHROPIC_API_KEY` | Optional. From console.anthropic.com → API keys. Lets testers type answers. |
   | `CLINICAL_REVIEW_COMPLETE` | `false` (switch to `true` only after a real clinician sign-off) |
4. Click **Deploy**. Wait for it to finish.
5. **Add the database.** In the project: **Storage → Create Database → Neon (Postgres)** → accept the defaults (US East region) → **Connect** to this project. This adds `DATABASE_URL` automatically.
6. **Redeploy** so the app sees the database: **Deployments → ⋯ on the latest → Redeploy**.
7. Open your link (for example `https://msquared.vercel.app`). If the welcome page says "Research storage isn't set up yet", step 5–6 didn't take; redo them.

Tester link = your Vercel URL. Give each tester a study code (P01–P20) to type on the welcome screen.

### Do a 2-minute dry run before real sessions
Go through the app once yourself with code `P00`, then download the CSV (below) and check your row is there. Delete it afterwards.

---

## Download the research data (CSV)

Open these in a browser. It asks for a username (type anything) and the `EXPORT_PASSWORD`:

- Sessions (one row per tester): `https://YOUR-APP.vercel.app/api/export?type=sessions`
- Events (one row per action): `https://YOUR-APP.vercel.app/api/export?type=events`

Or from a terminal: `MSQ_URL=https://YOUR-APP.vercel.app EXPORT_PASSWORD=... npm run export`

### Key columns
| Column | Meaning |
|---|---|
| `initial_path_id`, `path_id`, `path_changed` | Path chosen in the chat (1 where to start, 2 conflicting advice, 3 still stuck), final path, and whether they switched on the map |
| `clarity_pre` → `clarity_post` | Same 1–7 question before and after the map |
| `trust_pre` → `trust_info_post` | Same 1–7 question before and after: trust in the information they have |
| `trust_post`, `relevance_post` | 1–7 trust in the options Msquared showed (H2 threshold) and relevance |
| `own_words` | Optional free text (typed or spoken) after the intake questions. May contain health details; treat the export as sensitive |
| `rely_<option>`, `rely_change_<option>` | H2 per option (`primary_obgyn`, `specialist`, `coordination`): would bring it up before reading why (likely/unsure/unlikely), and change after reading (more/same/less) |
| `trust_source` | What most affected trust: why (explanations), sources, team, design, own, none. Separates the H2 driver from other trust signals |
| `clarity_reason`, `trust_reason` | Optional “What made you choose that number?” after the clarity and trust ratings |
| `next_step_pre`, `next_step_response` | Same open question before and after: “What, if anything, do you think your next step should be? Why?” (H1 primary; the team scores whether it names a specific professional-care step and a reason) |
| `decision_choice`, `decision_reason` | use / verify / unsure and why (H2 primary) |
| `trust_reason` | What made them trust or question the options (H2 threshold) |
| `seconds_to_map` | From starting the chat to opening the map |
| `last_screen` | Last screen **completed**: consent, baseline, intake, map, feedback |
| `status` | completed, in_progress, or abandoned (no activity for 30 minutes) |
| `safety_flag`, `safety_description` | Anything misleading or unsafe; review every "yes" |
| `quote_text` | Only filled when `quote_permission` is true |

Events include `option_rated` / `option_rerated` (H2 per option), `voice_input_used` (which field was dictated), `options_shown` (the randomized order in which path, decision and “most useful” options appeared, e.g. `decision:verify-use-unsure`), `screen_viewed`, `intake_started`, `chat_step_answered` (`q2:tap` / `q2:typed`), `chat_clarification_needed`, `intake_step_revisited`, `safety_notice_shown`, `path_selected`, `path_changed`, `map_viewed`, `role_comparison_opened`, `care_option_expanded`, `evidence_opened`, `source_clicked`, `decision_selected`, `summary_copied`, `feedback_submitted`, `session_completed`. Clicks are engagement, not proof of trust; pair them with `decision_choice` and the written reasons.

## Delete data
- One session (the code is on the participant's thank-you page, e.g. `abcd-efgh-ijkm`):
  `curl -X DELETE -H "Authorization: Bearer $EXPORT_PASSWORD" "https://YOUR-APP.vercel.app/api/admin?session_id=abcd-efgh-ijkm"`
  or `npm run delete-session -- abcd-efgh-ijkm`
- Everything (end of study): `npm run delete-session -- ALL`, then delete the Neon database in Vercel → Storage.

---

## Privacy: what is stored where
| Where | What | Kept |
|---|---|---|
| Participant's browser tab | Tapped intake answers, chat, personalised map | Until the tab closes |
| Browser speech service (Apple or Google) | Voice, only if the participant taps Speak; converted to text in the browser | Per Apple/Google policy; Msquared never receives audio |
| Neon database (your Vercel account) | Ratings, path, optional free text including own words (up to 1,000 characters), click events, random session code, optional P-code | Until deleted (target: end of fall 2026 semester) |
| Anthropic API | Only typed chat answers, to classify them; not stored by the app | Per Anthropic's API data policy |
| Vercel logs | IP address, URL, time (standard hosting logs) | Short-term, per Vercel |

Never stored by the app: tapped answers about symptoms, duration and clinicians seen, typed chat answers, names, audio. Free text the participant chooses to write or speak is stored. No analytics SDKs or third-party trackers; links to sources send no referrer. **Access:** only people with `EXPORT_PASSWORD` and the Vercel/Neon account owner.

---

## Run locally
Requires Node 20+.
```
npm run dev          # http://localhost:3000, in-memory storage
npm test             # unit + API tests (no network)
npm run test:e2e     # browser tests (needs Playwright: npm i -D playwright && npx playwright install chromium)
```

## Edit content
Team names, contact email, a named clinical reviewer and interview quotes go in `public/js/content/team.js`. Only add what is true; empty values stay hidden.

All medical wording is in `public/js/content/careOptions.js`; sources in `public/js/content/sources.js`; safety and path copy in `public/js/content/copy.js`. Display code doesn't contain medical wording. Any edit needs clinician review before real sessions.

## Project layout
```
api/            serverless functions (session, events, chat, export, admin, config)
lib/            validation, storage (Neon or in-memory), CSV, derived fields, AI classifier
public/         the web app (no build step)
  js/screens/   welcome, baseline, intake (chat), map, feedback, complete
  js/content/   care options, sources, copy  ← clinical review happens here
  js/shared/    intake questions and map templates (used by browser and server)
scripts/        local dev server, researcher CLI
tests/          unit/API tests and browser smoke tests
```
