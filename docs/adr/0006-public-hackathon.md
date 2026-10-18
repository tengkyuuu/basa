# Public hackathon build with Groq and Postgres

Update: [ADR 0008](0008-learning-review-and-vercel.md) adds Vercel preparation, review-gated learning content and the manual guardian approval workflow. This document records the earlier public-build decision.

The user changed delivery from a local walkthrough to a public hackathon app. They selected Groq and explicitly permitted Groq speech transcription with consent as an exception to AGENTS.md's audio-to-model prohibition.

Use Next.js standalone on Render with Neon Postgres. Keep SQLite for local development and isolated tests. Route learner reads through ReadingService. The asynchronous database interface supports both engines with parameterized queries, transactions and revision checks. Runtime tables are additive and separate from the normalized research schema. Public readiness fails closed without Postgres.

Trust a configured HTTPS origin, never forwarded request headers. Use secure cookies in public mode, same-origin mutations, nonce-based CSP, bounded uploads, persisted quotas and one-use recovery codes. Recovery resets the password, consumes the code and invalidates previous sessions.

Offer Groq Whisper after stored, versioned consent. Reject under-13 accounts until verified guardian approval exists. Audio stays temporarily in request memory, never saved by the app, passed to the teacher/story model, or shared with parents. Groq Data Controls remain an operator responsibility. Recognition uses timestamps and segment-derived reliability, not pronunciation diagnosis. Word alignment and level movement run in code. Uncertain or incomplete tries cannot supply promotion evidence.

This enables a functional preview without claiming reviewed learning content, fairness evaluation or a child-facing production rollout complete. Follow docs/DEPLOYMENT.md for configuration, checks, rollback and remaining gates.
