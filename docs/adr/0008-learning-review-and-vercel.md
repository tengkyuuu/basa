# Learning workflows, manual review and Vercel preparation

Status: implemented for the hackathon preview, pending human content, guardian and owner reviews. Extends ADR 0006 and 0007. Does not establish assessment calibration or school-pilot approval.

## Decision

The user requested completion before choosing hosting, possibly Vercel. They selected manual team verification with an approval queue for under-13 guardians, and authored content with a reviewer approval workflow.

Placement and lesson assets are drafts. Approval binds a deterministic fingerprint to a staff identifier and time, with an append-only audit trail. Editing content invalidates approval. The review workspace uses a separate server secret, same-origin enforcement and persisted quotas. It exposes material and minimal pending verification references.

Placement uses the code-owned Bayesian engine, quiet questions, one try, bounded passages, saved resume state and a conservative result. Candidates pass structural checks but are not empirically calibrated; results remain provisional. Silent placement caps confidence. Learn offers explanation, worked example, guided practice and fresh checks. Practice cannot change levels. Only fresh ordinary story evidence marks a lesson learned. Flagged-word practice has a separate speech action that cannot consume story tries or move levels.

Question read-aloud, supported attempts and word taps are recorded on affected answers. Browser speech synthesis requires an available matching English or Filipino voice and reports when unavailable. It does not upload text to an application speech service. High contrast is optional.

A linked adult requests guardian review after password reauthentication. The team records actual external identity, relationship and consent checks. The learner must separately consent. Revocation, unlinking and deletion invalidate access. Re-linking cannot revive an old grant. The app never persists audio.

## Persistence and deployment

Runtime schema version 3 adds content approvals and an audit table that application operations only append to. Guardian decisions, lesson state, placement state, accommodations and word practice live in revision-checked learner state. Existing accounts receive empty optional fields rather than fabricated activity. SQLite and Postgres create the two additive tables. [Versioned SQL](../../packages/db/runtime-migrations/0003-content-reviews.sql) records this addition. Normalized research migrations remain separate.

Vercel builds normal Next.js output; Render and Docker retain standalone output. Vercel requires external Postgres and uses a small connection pool. Audio is bounded to 4,000,000 bytes. Public APIs use a trusted HTTPS origin. Local SQLite is prohibited on Vercel. No service has been published.

## Consequences and checks

Real reviewers must approve materials and guardian requests. Draft screens intentionally remain unavailable. Approval is not calibration. The shared token suits a small staffed hackathon; individual administrator identities and operational controls need review before wider use. No token belongs in browser storage, public environment variables or artifacts.

Unit tests cover draft gating, stale fingerprints, scoring, fresh rechecks, quiet placement, guardian scope and revocation, accommodations and isolated word practice. Production browser tests cover placement resume, lessons, bilingual high contrast and manual guardian review at desktop and phone sizes. Live Groq checks are recorded in ADR 0007. Hosted persistence, backup restoration, monitoring, security/privacy review, provider fairness and educational calibration require external work.

Locked areas changed: persistence, authorization and shared state/contracts (Rhett); model and speech requests (Jhade and James); consent and age checks (Rhett and James). The user explicitly authorized consented Groq transcription and manual review. No PR was opened, owners tagged or approvals claimed.
