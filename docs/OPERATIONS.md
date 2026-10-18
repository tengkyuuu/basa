# Operate the hackathon release

This is a hackathon preview. Use test accounts until the team has completed actual content, guardian, privacy and assessment reviews.

## Staff access

Open `/review`. The first administrator enrolls with the private hosting `REVIEW_ADMIN_TOKEN` and a password of at least 14 characters. After that, this bootstrap secret cannot enroll another administrator or read reviews. The administrator issues one-use invitations that expire after 24 hours. Content reviewers inspect materials only. Guardian reviewers inspect pending guardian references only. Administrators manage both and can revoke staff access immediately. Password changes invalidate every staff session. Sessions expire after eight hours. Multi-factor authentication is not implemented.

Review attribution comes from the authenticated staff account. The browser cannot supply another reviewer's identity. Use staff codes for usernames. Do not enter personal names, identity documents or audio into review notes. Keep the bootstrap secret in the hosting secret manager and a team password manager, never in chat or the repository.

## Generation recovery

The server reserves a database job and quota before calling Groq. Two requests for the same learner cannot concurrently reserve separate active jobs, including across web instances. A completed result can be delivered after signing in again without another provider call. The browser polls saved status and can resume a ready result.

These are request-driven jobs, not a background worker. A process that dies before persisting a provider result leaves a lease. After expiry, the app reports interruption and permits an explicit new request. It cannot guarantee exactly-once provider billing after an unknown network outcome. Failed calls consume reserved quota. Approved authored stories are an explicit alternative when current reviewed material is available; they are never presented as AI-generated stories.

## Metrics

Administrators can open Service health in `/review`. Daily counters report story, speech and word-practice outcomes and aggregate duration. The operations API also reports counts by job state. Counters expire after 30 days. Metrics contain no learner identifiers, usernames, audio, transcript text, prompts or provider error bodies. A missing metric never prevents reading. These counters do not establish provider invoice costs or educational effectiveness.

## Migration and rollback

Runtime migration 4 adds normalized sessions, answers, lesson work, placement work, staff, jobs and metrics. A checksum ledger rejects edited migrations and databases from a newer runtime. Account mutations move legacy activity into normalized tables atomically under revision control. Tests cover migration reopening, checksum rejection, saved activity and cascading deletion.

Once an account is normalized, a pre-version-4 build cannot read its complete activity. Do not redeploy an older build against the current database. Roll forward with a compatible fix, or restore the matching pre-migration backup into a separate database and explicitly reconcile subsequent activity before directing traffic. Never run a destructive downgrade on live data. The isolated hosted snapshot rehearsal passed for a test account; see the release record. Use `finalize: false` for a Neon rehearsal and verify the endpoint's branch explicitly. Retention and off-provider backup procedures still need an operator.

## Owner checks

Rhett reviews persistence, authorization, staff and migrations. Jhade and James review model and speech boundaries. Rhett and James review age gating, consent and guardian operations. These are required assignments, not claims that approvals have been received.
