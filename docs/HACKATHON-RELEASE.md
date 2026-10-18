# Hackathon release record

Published on 2026-10-18 at [BasaBridge](https://basabridge-tau.vercel.app).

Source: private [GitHub repository](https://github.com/tengkyuuu/basabridge), production branch `codex/BB-39-hackathon-release`. Vercel project `basabridge` belongs to `jamescalunsag13-9119s-projects`. Pushes to that release branch publish automatically. Develop on separate branches and review changes before publishing.

Neon project: the user's supplied `rough-bread-55365234` in their free organization, Singapore. Production branch `br-icy-cloud-ao6eccfy` uses endpoint `ep-soft-waterfall-aoqboh36`. Preview branch `br-small-river-aogv1r1n` uses a separate endpoint. Server credentials are sensitive Vercel variables, never public client variables. The earlier empty `mute-tree-22274208` project is unused and not connected.

## What was checked

The release adds individual scoped staff accounts, attributed reviews, normalized activity, checksummed runtime migrations, saved generation reservations, approved authored alternatives, distinct lesson bands, delayed fresh-story checks, recognition uncertainty and private aggregate monitoring. See [operations](OPERATIONS.md) and [evaluation](EVALUATION.md).

GitHub [CI verification](https://github.com/tengkyuuu/basabridge/actions/runs/39111293183) completed successfully:

```text
format:check: all matched files use Prettier code style
lint: passed
typecheck: 10 successful tasks
evaluate:content: 48 of 48 structural checks passed
test: 10 successful tasks, including PostgreSQL driver tests
build: 1 successful task
test:e2e: 20 passed (50.7s)
```

The local unit suite passed 147 tests. A separate bounded live evaluation passed the structural bank and one generated story with its independent verifier. The hosted app passed database readiness, registration/sign-in, hidden story and answer keys, server-scored completion, authorized export, sign-out/re-entry and preservation after redeployment. A real hosted Groq story passed generation and verification, then produced a teacher note after server-scored answers. A consented synthetic utterance passed the hosted speech endpoint and saved one attempt. This is a provider integration check, not a human speech or fairness evaluation. The temporary synthetic WAV was deleted.

Unauthenticated public requests reached the canonical URL without a Vercel account. Cross-origin writes were rejected. Cookies were Secure, HttpOnly and SameSite Strict. Framing was denied. The independent visual reviewer returned `ship` for eight supplied desktop/mobile staff and Learn captures and sampled component source. That verdict does not cover every uncaptured error, translated or populated-table state.

## Restore rehearsal and corrections

A manual snapshot was restored to `restore-isolated` with `finalize: false`. Sign-in through the packaged app recovered the original completed session, while later production activity was absent. The source production compute remained on its production branch. Use an explicit endpoint ID when retrieving credentials and verify the endpoint's branch before connecting an application.

The first restore attempt used Neon's default finalization, which moved the source compute onto the restored branch. This was detected during verification. Production was explicitly reconnected to its intended branch and redeployed; the isolated rehearsal was repeated successfully. Do not omit `finalize: false` for a rehearsal. Do not finalize a rehearsal branch or point production at it. Snapshot history, deletion-aware retention and encrypted off-provider backups remain operator responsibilities.

Other failures were resolved: marketplace CLI terms acceptance remained stuck, so authenticated Neon tools provisioned and connected the database; a Vercel build environment warning was fixed with explicit Turbo pass-through; local artifact upload exclusions were tightened. A local `npm run build` initially encountered Windows file locking while the packaged rehearsal server was running. After that server stopped, `npm run build` passed with one successful build task. The first local browser run used the earlier 60-second test timeout and had seven timeouts under severe memory pressure. The revised suite passed all 20 cases in GitHub CI. No local browser pass is claimed for that first run.

Two later live generation attempts were rejected with `ai_invalid`; no unchecked story was delivered. An explicit bounded diagnostic then passed generation and all five independent answer checks. Validated generation can fail and consume quota. The app reports this and offers a deliberate retry or an explicitly authored included story. Do not claim perfect provider availability.

## First staff setup and remaining human work

Open `/review` and enroll the first real administrator with the production setup code. Its private local handoff is the `production` value in ignored `tmp/hosting-secrets.json`; do not publish or paste it. The administrator then creates scoped invitations. No production staff account or real content approval was fabricated.

All 15 placement passages and 33 lessons remain drafts until actual review. Approved versions alone unlock those flows. Under-13 microphone permission requires real guardian verification plus learner consent. Educational calibration, representative recognition evaluation, observed learner sessions, contact/retention procedures and independent privacy/security review remain human release gates. This is a working hackathon preview, not a certified school assessment.
