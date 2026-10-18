# BasaBridge starter kit

Implementation update: this folder contains a working hackathon preview with accounts, reading, server-scored questions, progress, parent sharing, consent-based Groq transcription, placement, Learn and word practice. Start with [README.md](README.md), use [docs/LOCAL-WALKTHROUGH.md](docs/LOCAL-WALKTHROUGH.md) to run it, and follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) to prepare Vercel or Render. Placement and lessons unlock only after real educator review. Under-13 microphones require manual guardian verification and separate learner consent. Use [the reviewer guide](docs/REVIEWER-GUIDE.md) for both queues. Live Groq generation, verification, teacher notes and synthetic transcription checks passed locally. Public hosting is not yet selected or published.

The packaging notes below are historical. They describe the original starter kit before implementation, not the current app or setup instructions.

Everything needed to rebuild BasaBridge in a new project: the plan, the design, the rules for AI agents, and the repo scaffold.

## What is in here

| Path                              | What it is                                                                                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/PLAN.md`                    | The full system and implementation plan: flows, architecture, backlog. Read this first.                                                               |
| `docs/SCREENS.md`                 | Screen-by-screen spec.                                                                                                                                |
| `docs/adr/0001-0004`              | Decisions: stack, story model, measurement and placement, reading support.                                                                            |
| `design/canvas/project/*.dc.html` | Every screen (A1 to I1), one HTML file each, with exact styles. `canvas.json` lists boards and flow order.                                            |
| `design/prototype/`               | Early silent-reading prototype, reference only.                                                                                                       |
| `design/README.md`                | Link to the original design canvas.                                                                                                                   |
| `AGENTS.md`, `CLAUDE.md`          | Golden rules and ownership for AI coding agents. `CLAUDE.md` just imports `AGENTS.md`.                                                                |
| `README.md`, `CONTRIBUTING.md`    | Project overview, commands, workflow.                                                                                                                 |
| `.claude/skills/`                 | `/create-issue` and `/issue` skills (Linear workflow).                                                                                                |
| `.github/`, `.githooks/`          | CI workflow, CODEOWNERS, pre-commit hook.                                                                                                             |
| Root config                       | `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc`, `.nvmrc`, `example.env`, `.gitignore`. |
| `apps/web`, `packages/*`          | Scaffold only: `package.json`, `tsconfig.json`, configs. No source code.                                                                              |
| `reference-code/`                 | The existing `src/` and DB migrations for every package. Optional. Use it to compare, or delete it to build truly from scratch.                       |

## How to start the new project

1. Copy everything in this folder (except `reference-code/` if you want a clean slate) into the new repo root.
2. `git init`, then:
   ```bash
   corepack enable
   pnpm install
   ```
3. Copy `example.env` to `.env.local` and fill in values. Never commit real values.
4. Edit these project-specific bits:
   - `.github/CODEOWNERS`: replace the GitHub handles.
   - `AGENTS.md` and `README.md`: owner names (Rhett, James, Jhade, Sean).
   - `design/README.md`: the design canvas link points at the original Claude design canvas.
   - `.claude/skills/*`: they assume a Linear team `BB`. Change the team key or drop them.
5. Open the new project in Claude Code and say: "Read AGENTS.md and docs/PLAN.md, then build the backlog in order." The plan references issue IDs (BB-nn); recreate them in Linear with `/create-issue` or work from the plan directly.

## Suggested build order

Follow the backlog in `docs/PLAN.md`. In short: contracts and db first, then `levels` and `mastery` (the rules in code), then speech, story-ai and teacher-ai, then screens from `design/canvas/project` in flow order (A, B, C, D, E, F, G, H, I).

## Not included

- `pnpm-lock.yaml` (regenerates on install).
- `.env.local` and any secrets (gitignored in the original).
- Git history, Linear issues, and the live design canvas itself. Open the canvas link in `design/README.md` if you need to edit the design.
