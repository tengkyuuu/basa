# Run BasaBridge locally

The user expanded the target to a public hackathon app. See [deployment](DEPLOYMENT.md) for Vercel or Render with Neon. Nothing has been published. This guide runs the same app on this computer.

## Start

1. Install Node 24 and the pnpm version in package.json.
2. Run `pnpm install` in the root.
3. Copy `example.env` to `apps/web/.env.local` if that file does not exist.
4. Set `GROQ_API_KEY` and a separate random `REVIEW_ADMIN_TOKEN` of at least 32 characters in the local file. The current local configuration already has both. Preserve existing values. Never paste them into source or chat.
5. Run `pnpm dev` and open http://127.0.0.1:3000.

Leave `DATABASE_URL` and `APP_ORIGIN` empty for local SQLite. Runtime files live in `apps/web/.local-data` by default and are gitignored. Set an absolute `LOCAL_DATA_DIR` outside this OneDrive workspace if you do not want local test accounts synced. Public hosting requires Postgres and never falls back to a local file.

## Demonstrate the app

1. Create your own test student account. Screens start empty. Do not use a real child's details.
2. Open the starting check after a real reviewer approves the authored placement bank through `/review`. Otherwise select the labelled temporary starting level. Placement resumes across reloads and labels its result provisional. See [the reviewer guide](REVIEWER-GUIDE.md).
3. Choose **Make my story** to use Groq. The pipeline checks structured output, length, grade, options, evidence and question coverage, then uses an independent verifier. Rejection fails visibly. Without a key, three labelled development passages are available through **Read an included story**.
4. Read silently, or explicitly allow read-aloud. The browser records only after Start recording. Stop sends audio to Groq; the server aligns words and computes pace and attempt limits. Discard closes the microphone without uploading. The app never stores audio. Under-13 microphones require linked adult guardian verification through the manual queue and separate learner consent. Recording is limited to three minutes and 4 MB.
5. Put the story away and answer. The server scores choice, choose-all and ordering questions. Neither story text, word alignment nor unsubmitted keys are returned during questions. Reloading resumes the active question.
6. View results and progress. Server timing, guessing correction and clear completed reading evidence feed the mastery rules. Silent answers alone cannot enable promotion. Speech recognition is an estimate, not a validated pronunciation assessment.
7. Open Learn after real review of the lessons for your band. Work through explanations, examples, guided practice and fresh checks. Practice does not move a level. Fresh ordinary story questions must supply the evidence before a lesson is learned. Practise flagged words from real reading through the separate short recording flow. Change reading settings: English/Filipino, simple wording, text size, spacing, sentence guide, high contrast and optional audio. Browser read-aloud needs an installed matching voice and reports when unavailable. Changes persist.
8. Save a recovery code in My account. Sign out, choose Forgot password, then use the code once to reset the password. Every old session becomes invalid.
9. Link a separate parent account with a one-use code. Sharing starts off. Grant progress and answer details separately, then revoke. Parents never receive audio.
10. Export completed data or delete the account with password confirmation. Active story content and keys stay out of exports.

## Verification and limits

Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `node scripts/prepare-standalone.mjs`, then `pnpm test:e2e` after installing Playwright Chromium. Browser tests use a separate temporary database and no real provider key. Local live checks on 2026-10-18 passed story generation with independent verification, bilingual teacher notes and synthetic speech transcription. This is a smoke check, not a model-quality or microphone accuracy evaluation. See [the live configuration decision](adr/0007-groq-live-configuration.md).

Placement, Learn and the manual guardian queue are implemented. Actual approvals remain human actions. The bank contains 11 placement candidates and 33 lesson versions awaiting real review. Speech fairness, empirical calibration, independent security/privacy review and hosted operations remain release gates. Refer to DEPLOYMENT.md and ADR 0008 for current boundaries. Browser tests approve fixtures only in their throwaway database.

For the packaged server, explicitly set `LOCAL_DATA_DIR` to the absolute `apps/web/.local-data` path to retain development accounts. Stop the packaged server before rebuilding on Windows because it locks the build directory. Read `/privacy` for current data practices.
