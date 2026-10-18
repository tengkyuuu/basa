# BasaBridge

An AI reading teacher for students. A learner reads a short English story out loud, the AI listens and analyses the reading, then the learner answers questions about what they read. The next story adjusts to the result. Parents are optional and only see what a student chooses to share.

- Plan and backlog: [docs/PLAN.md](docs/PLAN.md)
- Screens: [design/](design/README.md) (exported from the design canvas)
- Decisions: [docs/adr/](docs/adr)
- Hackathon app: [BasaBridge](https://basabridge-tau.vercel.app), with [release checks](docs/HACKATHON-RELEASE.md)

## Requirements

- Node 24 or newer (`.nvmrc`)
- pnpm 12 (`corepack enable` picks the version from `package.json`)

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

`pnpm install` also turns on the pre-commit hook in `.githooks`. It runs Prettier and ESLint on staged files.

For Groq stories, copy `example.env` to `apps/web/.env.local` and set `GROQ_API_KEY`. The default generator is `openai/gpt-oss-120b`; a separate `openai/gpt-oss-20b` verifies content and answers. Without a key, the explicitly labelled included walkthrough stories are available.

For acoustic word and phoneme feedback, see [Azure Speech setup](docs/AZURE-SPEECH.md). Azure is optional and remains inactive until its key, region and `SPEECH_PROVIDER=azure` are configured. Switching audio providers requires new learner consent and renewed guardian verification for children under 13. Groq continues to generate stories and teacher notes.

See [the deployment guide](docs/DEPLOYMENT.md) for the selected Vercel and Neon configuration, [the reviewer guide](docs/REVIEWER-GUIDE.md) for individual staff access and content/guardian approvals, and [the walkthrough guide](docs/LOCAL-WALKTHROUGH.md) for local setup. Local development uses SQLite by default. Public hosting requires Postgres. [Operations](docs/OPERATIONS.md), [evaluation](docs/EVALUATION.md) and the [judging walkthrough](docs/JUDGING.md) cover the release handoff.

## Commands

| Command          | What it does                |
| ---------------- | --------------------------- |
| `pnpm dev`       | Run the web app             |
| `pnpm build`     | Build everything            |
| `pnpm typecheck` | Type-check every package    |
| `pnpm lint`      | ESLint                      |
| `pnpm test`      | Unit tests in every package |
| `pnpm format`    | Prettier                    |

CI runs format check, lint, typecheck, unit and Postgres integration tests, production build, artifact checks, and desktop/mobile browser tests on every pull request.

## Layout

```
apps/web                Next.js app (student and parent screens)
packages/contracts      zod schemas shared by everything
packages/db             Drizzle schema and migrations
packages/levels         level table, tries tiers, pass and evidence rules
packages/mastery        ability model, placement logic, focus skill, level movement
packages/learn          gap mapping, lesson recommendation, Learn rules
packages/story-ai       story generation and deterministic checks
packages/teacher-ai     teacher notes and standard fallbacks
packages/speech         provider interface, alignment, pace
packages/ui             design tokens and components
design/                 canvas screens and the early prototype
docs/                   plan, decisions
```

Workspace packages export TypeScript source. The web app compiles them through `transpilePackages`.

## Who owns what

| Owner | Area                                                                                        |
| ----- | ------------------------------------------------------------------------------------------- |
| Rhett | Platform and accounts: CI, deploy, database, auth, age gate, parent link, consent, security |
| James | Speech and reading analysis                                                                 |
| Jhade | AI teacher and learning engine                                                              |
| Sean  | Product experience: design system, screens, integration, accessibility                      |

See `.github/CODEOWNERS` and [CONTRIBUTING.md](CONTRIBUTING.md).

## Status

The hackathon build includes accounts and recovery codes, private sessions, checked Groq stories, three labelled development passages, consented Groq transcription, server word alignment and scoring, adaptive evidence, saved progress, parent sharing, reading settings, export and deletion. Screens use English and Filipino catalogs with simple and standard wording.

Placement, guided Learn lessons, fresh story rechecks, flagged-word practice, accommodation tracking, high contrast and browser read-aloud are implemented. A separate `/review` workspace gates placement and lessons on real content approval. Under-13 microphone access requires a linked adult guardian, manual team verification and the learner's separate consent. Approvals are not seeded. The authored bank contains 11 placement candidates and 33 lesson versions awaiting review.

The deployable server supports durable Postgres and requires a trusted HTTPS origin for public access. Deployment configuration includes `apps/web/vercel.json`, `render.yaml` and `Dockerfile`. Local live checks passed for Groq story generation, independent verification, bilingual teacher notes and synthetic speech transcription. A hosted database and public URL still need configuration and smoke testing. Real content and guardian reviews, speech fairness evaluation, independent security/privacy review and school-pilot approval remain human release gates. See [the learning and review decision](docs/adr/0008-learning-review-and-vercel.md).
