# Durable activity and individual review access

Status: implemented for hackathon evaluation; owner review pending.

## Decision

Use an incrementally applied, checksummed runtime migration ledger. Normalize sessions, answers, lesson work and placement work when an authorized account is saved. Keep core account state small, preserve optimistic revision checks and write activity in the same transaction. PostgreSQL uses a migration advisory lock; both adapters reject modified applied migrations and newer database versions.

Replace shared review access with individual staff accounts. The existing private setup secret enrolls the first administrator only. Subsequent staff require expiring, one-use invitations. Content and guardian roles expose different review data. Sessions are hashed in storage, expire, and are revoked after access withdrawal or password changes. The server supplies review attribution. General learner reads remain behind the authorization service.

Persist story generation reservations and ready results. Reserve shared quota and a learner slot transactionally before provider execution. Prevent concurrent duplicate active work across instances. Recover a persisted result without another provider call. Expired interrupted requests fail visibly and require an explicit new attempt. No background worker or exactly-once external billing guarantee is claimed.

Aggregate operations by UTC day, operation and fixed outcome without learner identifiers or private content. Keep self-reported recognition flags separate from original score evidence. Delayed skill checks use fresh ordinary story answers; lesson practice never changes a level.

## Consequences and checks

The release has migration reopening/checksum tests, normalized save/delete tests, staff scope/revocation tests, concurrent reservation and ready-result recovery tests, PostgreSQL-engine tests and browser workflows. Reports and provider smoke tests are separate from human educational evaluation. See the evaluation and operations guides.

Older builds cannot read activity after normalization. Roll forward or restore a matching backup into a separate database with reconciliation. A real hosted restore rehearsal remains required. Staff multi-factor authentication, representative speech evaluation, calibrated placement and independent privacy review remain outside the established evidence.

Locked-area review assignments: Rhett for schema, authorization and shared shapes; Jhade and James for model/speech boundaries; Rhett and James for consent and guardian handling. The user authorized implementation and consented Groq transcription. No owner approval or educational validation is implied.
