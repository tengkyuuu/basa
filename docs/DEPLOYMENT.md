# Publish the hackathon app

Published at [BasaBridge](https://basabridge-tau.vercel.app), in `jamescalunsag13-9119s-projects`, project `basabridge`, with separate Neon production and preview branches. Public accounts never use temporary disk. See the [release record](HACKATHON-RELEASE.md) for verification and the isolated snapshot restore rehearsal. Hosting configuration does not certify the full student-pilot plan.

## Vercel option

1. Create a Neon Postgres project and copy its pooled connection URL including `sslmode=require`. Keep it secret. Use separate databases for public production and preview/testing.
2. Put the repository in your own GitHub account. Exclude `.env.local`, `.local-data`, `.next`, traces and backups. This delivered folder has no Git metadata. Never push to another team's main branch.
3. Import it as a Vercel project. Select **Next.js**, root directory **apps/web**, and Node **24.x**. Include source files outside the root directory so the workspace packages are available. Keep the default Next.js output directory. The checked-in `apps/web/vercel.json` installs and builds from the workspace root. See [Vercel monorepos](https://vercel.com/docs/monorepos).
4. Add server environment variables: `DATABASE_URL`, `GROQ_API_KEY`, a separate random `REVIEW_ADMIN_TOKEN` of at least 32 characters, and the model/quotas from `example.env`. Never prefix secrets with `NEXT_PUBLIC_`. Keep `TRUST_PROXY=false`.
5. Set `APP_ORIGIN` to the exact canonical project address, such as `https://your-project.vercel.app`, with no trailing slash. If the address is not known until the first deployment, set it afterward and redeploy before testing that alias. Without it, the server trusts only Vercel's exact deployment URL, which may differ from the project alias. Other hostnames are rejected intentionally. Set separate preview origins and never point a preview at the production database.
6. Keep Fluid Compute enabled and allow a 300-second function duration for story generation. The app route exports 300 seconds and speech exports 90 seconds. Audio is bounded to 4,000,000 bytes, below Vercel's 4.5 MB request limit. See [function limits](https://vercel.com/docs/functions/limitations) and [duration configuration](https://vercel.com/docs/functions/configuring-functions/duration). Provider and plan limits can change; check the selected settings before judging.
7. Deploy, open `/api/health` on the canonical address, then run the checks below. Vercel builds normal Next.js output; do not run the standalone preparation script in Vercel. SQLite is prohibited in Vercel runtime. Use `/review` to carry out real reviews before enabling draft learning content or under-13 microphones.

The app uses a small Postgres pool per function instance. Persisted generation reservations prevent concurrent duplicate work for a learner across instances. Provider concurrency limits remain per instance, not a background queue. Keep quotas conservative and monitor usage. An isolated snapshot restore rehearsal passed for a test account; repeat it before schema changes. See [operations](OPERATIONS.md).

## Render option

1. Create a free Neon project at https://console.neon.tech. Copy its connection string including `sslmode=require`. Keep it in a password manager or the hosting secret form.
2. Put this repository in your GitHub account. Never upload `.env.local`, `.local-data`, `.next`, test traces or backups. This delivered folder has no Git metadata. Initialize your own repository before publishing; do not push to another team's main branch.
3. In Render, choose **New > Blueprint** and connect the repository. Render reads `render.yaml`. Select the Free web service plan.
4. Supply `DATABASE_URL` from Neon, `GROQ_API_KEY` from https://console.groq.com/keys and a separate random `REVIEW_ADMIN_TOKEN` of at least 32 characters. None may have a `NEXT_PUBLIC_` prefix.
5. Deploy. The build prepares the standalone server and checks that environment files and learner databases are absent. `/api/health` checks database access before Render marks it healthy.
6. Open the generated HTTPS `onrender.com` address. Render's server-provided `RENDER_EXTERNAL_URL` becomes the trusted origin. For a custom domain set `APP_ORIGIN=https://your-domain` without a trailing slash, and use that address exclusively.

The runtime creates additive `local_*` tables under a Postgres advisory lock. The historical prefix preserves compatibility with the local adapter. It does not overwrite research tables in the original Drizzle migrations. Runtime migration 4 adds normalized activity, staff, durable jobs and aggregate metrics. A checksum ledger rejects changed applied migrations. SQL is recorded in `packages/db/src/runtime-migrations.ts`. Future changes require new migrations and owner review.

Render Free sleeps after inactivity and has temporary local storage. Neon holds accounts across these restarts. Open the app before judging to allow a cold start. Free tiers have quotas; confirm the selected free plans in both dashboards. See [Render free-service limits](https://render.com/docs/free), [Render web services](https://render.com/docs/web-services) and [Neon plans](https://neon.com/pricing).

## Provider settings and quotas

Defaults: `STORY_MODEL=openai/gpt-oss-120b`, `VERIFIER_MODEL=openai/gpt-oss-20b`, `NOTES_MODEL=openai/gpt-oss-20b`, `SPEECH_MODEL=whisper-large-v3`. Story and verifier models must differ. Live testing led to using the larger model for generation; the verifier is a separate smaller model, which differs from the original plan's larger-verifier proposal. See [ADR 0007](adr/0007-groq-live-configuration.md). Application fields sent to Groq contain no account identifiers, credentials or learner names. Students have no free-form model chat.

The user explicitly authorized audio transcription with consent. Audio goes only to Groq's speech endpoint under a generic filename, after server-side age and consent checks. The app never writes it to storage or logs. The browser releases microphone tracks when stopped, cancelled or left. Configure Groq Data Controls and review [Groq's data policy](https://console.groq.com/docs/your-data); provider retention is separate from app retention.

Speech uses word timestamps and segment-derived reliability, not calibrated word confidence or pronunciation scoring. Completed clear recordings can supply decoding evidence. Uncertain recordings cannot enable promotion. Fairness evaluation is required before educational deployment. Under-13 microphones require actual manual guardian verification plus separate learner consent. See [reviewer operations](REVIEWER-GUIDE.md).

Default persisted limits: 10 AI story starts per account daily, 60 shared starts, 100 shared transcriptions and 100 registrations per rolling day. Failed provider calls also consume quota. Configure these in `example.env`. At most two story generations run per process; keep one web instance for the hackathon. Leave `TRUST_PROXY=false` on Render. Authentication also has a shared limit; large events need verified proxy identity and tuned quotas.

## Before sharing the URL

- Generate and finish a real Groq story. Confirm invalid content fails visibly. Mocked tests are not live model evaluation.
- On an account aged 13 or older, consent, record a short passage, stop, inspect matches, answer and inspect saved progress. Test blocked microphone and failed-provider states. Read only story text, no names or personal details.
- Save a recovery code, sign out and reset the password. Old sessions and used codes must fail.
- Link a separate parent account. Verify private defaults, independent sharing flags and immediate revocation. Parents never receive audio.
- Redeploy the server and sign in again. Progress must remain. Check `/api/health`, HTTPS Secure/HttpOnly/SameSite cookies, origin rejection, blocked framing and nonce-based CSP.
- Test export and deletion. Unfinished stories and answer keys must stay out of exports.
- Have a real specialist inspect and approve content through `/review`. Confirm that edits invalidate approval. Verify a guardian through your actual external process before recording approval. Test withdrawal. Draft approvals are never prefilled; browser test approvals are confined to a throwaway database.
- Assign an operator and contact route, review provider data controls and the `/privacy` wording, and establish deletion-aware backup retention before accepting real children. Do not invent a contact address or claim compliance.

## Operations and backup

Do not enable body, SQL-parameter or speech-payload logging in hosting or monitoring tools. Browser errors are fixed codes. Restrict database credentials and dashboard access to the team. Rotate credentials through hosting secrets; deployment artifacts never need them embedded.

Before schema changes or an event, make a Postgres custom-format backup with `pg_dump` using a secure connection profile (`PGSERVICE`) or protected password file. Encrypt it outside the repository and web-accessible storage. Restore it with `pg_restore` into a separate test database, check readiness and resume a test account. Never restore over live data just to test. Maintain deletion-aware backup retention: an old backup can restore deleted records. Provider restore history varies by plan and does not replace a tested restore.

After activity is normalized, pre-version-4 builds cannot read its complete history. Roll forward with a compatible fix. An older build requires restoring its matching backup into a separate database and reconciling later activity before switching traffic. Check readiness after any recovery. No destructive down-migration is supplied. See [the migration runbook](OPERATIONS.md).

## Verification

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node scripts/prepare-standalone.mjs
pnpm exec playwright install chromium
pnpm test:e2e
```

Browser tests run the packaged production server, temporary SQLite and no key at desktop and phone sizes. They cover reading, recovery, sharing, placement resume, Learn, bilingual high contrast, guardian review and revocation, HTTP guards, security headers and a fake microphone with visible provider failure. Speech success is tested with mocked provider output. PGlite executes runtime SQL in a PostgreSQL engine. CI also sets `RUNTIME_TEST_DATABASE_URL` to its throwaway Postgres service for the network driver. Never point that variable at live data.

## Remaining release gates

Placement, Learn, monitoring and the manual review queues are implemented. An isolated hosted snapshot restore was tested. Actual educator approval and guardian identity verification remain human actions. Empirical calibration, representative speech/model-quality evaluation, backup retention procedures and independent security/privacy review remain release gates. The app identifies itself as a hackathon preview, not a validated reading assessment or school rollout.

Locked-area review: Rhett for persistence, authorization and shared shapes; Jhade and James for providers and speech; Rhett and James for consent and age gating. These are assignments, not claims of approval. No PR was opened or owners contacted.
