# BasaBridge improvement roadmap

Proposed on 2026-10-18. Implementation status is recorded below. Vercel in the user's personal workspace is selected, with separate free Neon resources planned for production and preview. Estimates for human evidence still depend on reviewers and consented participants.

## Implementation status

Implemented: individual staff accounts, scoped reviewer roles, revocation and attributable reviews; versioned runtime migrations and normalized activity; persisted generation reservations and resumable ready results; approved authored reading alternatives; private aggregate service counters; distinct lesson bands; 15 placement candidates; delayed fresh-story retention checks; conservative recognition uncertainty and correction audit; repeatable structural, bounded live-provider and consented speech-evaluation tools. See [operations](OPERATIONS.md), [evaluation](EVALUATION.md) and the [judging script](JUDGING.md).

Request-driven generation does not provide a background worker or guarantee exactly-once provider charges after a process crash. Unverified recognition flags never alter scores. Hosted restoration, actual educator approvals, guardian verification procedures, empirical calibration, representative speech fairness evaluation, observed learner sessions and independent privacy/security review still require real evidence. No synthetic result substitutes for these gates.

## Product goal

A learner completes a short reading session, understands one useful next step and later demonstrates the skill on a fresh story. Improve the trustworthiness of that loop before expanding the feature list. AI writes and explains within validated formats. Code continues to own scores, tries, evidence and level movement.

## Current foundation

The hackathon build has accounts, recovery, checked Groq generation, consented transcription, server scoring, provisional placement, Learn, word practice, private parent sharing and content/guardian review queues. Automated checks exercise the local release at desktop and phone sizes. Hosted operation, actual educator reviews, speech fairness and assessment calibration are not established by those tests.

## First priority: a reliable hackathon walkthrough

Suggested scope: the next one or two working days, with human review scheduled separately.

| Work                                                                     | Purpose                                            | Acceptance evidence                                                                                                                          | Suggested owner    |
| ------------------------------------------------------------------------ | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Deploy to the chosen host with separate preview and production databases | Make the public URL dependable                     | Complete a real story, sign out, redeploy and resume saved activity on the canonical HTTPS URL                                               | Rhett              |
| Rehearse failures                                                        | Keep provider problems from ending the walkthrough | Timeouts, quota exhaustion, denied microphone and connection loss each show a recovery action; duplicate requests do not consume extra tries | Rhett and James    |
| Add approved reading alternatives                                        | Keep a session usable when generation fails        | Offer a clearly labelled reviewed passage explicitly, with equivalent validation and no invented AI result; preserve unfinished work         | Jhade and Sean     |
| Complete actual content reviews                                          | Unlock the drafted learning flows honestly         | A reading specialist reviews the placement bank and lessons needed for the walkthrough; only current approved versions become available      | Jhade and reviewer |
| Simplify the session close                                               | Make the learning loop easy to explain             | Result shows what happened, one skill to practise and a clear return to a fresh story; practice is distinct from learned status              | Sean               |
| Prepare a short judging script                                           | Demonstrate real behavior consistently             | A test-account walkthrough covers reading, hidden questions, evidence, Learn and consent/private sharing without fake activity               | Sean               |

Public URL acceptance includes a database backup restored into a separate environment. Do not approve guardian fixtures in the public database or imply that test approvals establish real verification.

## Second priority: better learning evidence

Suggested scope: the next two to four weeks, including real educator participation.

| Work                                 | Purpose                                                            | Acceptance evidence                                                                                                                                                     | Suggested owner    |
| ------------------------------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Differentiate lesson bands           | Replace reused introductory scenarios with appropriate progression | Reviewed early, middle and advanced examples differ meaningfully in vocabulary, reasoning and independent practice                                                      | Jhade and reviewer |
| Expand the placement bank            | Reduce dependence on a few passages                                | Reviewed alternate forms cover intended paths; identify gaps before starting a check; retain provisional labels until calibrated                                        | Jhade              |
| Build a repeatable AI evaluation set | Detect model or prompt regressions                                 | Versioned test cases measure answer support, ambiguity, distractor quality, difficulty and English/Filipino explanation quality; report rejects and failure reasons     | Jhade              |
| Evaluate recognition fairly          | Separate recognition errors from reading difficulty                | Consented evaluation compares human transcripts across relevant ages, accents, microphones and noise; report error patterns and uncertainty                             | James and reviewer |
| Improve recognition corrections      | Resolve the current gap between flags and recomputation            | Preserve original analysis, record authorized correction provenance, recompute only eligible evidence under reviewed rules and prevent correction-based score inflation | James and Jhade    |
| Revisit skills after a delay         | Check retained understanding                                       | A small code-owned practice plan revisits skills on fresh stories; supported and unsupported evidence remain distinct                                                   | Jhade and Sean     |
| Observe learner sessions             | Find friction that automated tests miss                            | Consented, supervised sessions record task completion and comprehension problems; findings become fixes or tracked issues                                               | Sean               |

Set evaluation thresholds with the reading specialist after collecting a baseline. Do not invent accuracy claims or equate a generated question's grade estimate with calibrated difficulty. Keep audio evaluation separate from ordinary app retention, with an approved consent and deletion process.

## Third priority: readiness for a small supervised pilot

Start after the earlier evidence is available. This is a release gate rather than a promised date.

| Work                                                        | Purpose                                              | Acceptance evidence                                                                                                                                                      | Suggested owner    |
| ----------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| Individual reviewer accounts and stronger authentication    | Replace the shared review secret                     | Separate reviewer roles, revocation and attributable approval history; content review does not grant learner access                                                      | Rhett              |
| Versioned runtime migrations and normalized activity tables | Make growth and concurrent updates manageable        | Incrementally migrate sessions, answers, placement and lessons out of the growing learner JSON document; reconcile counts, preserve authorization and rehearse rollback  | Rhett              |
| Durable generation jobs and idempotency                     | Recover long requests across serverless restarts     | Refreshing or retrying resumes one job; duplicate execution cannot duplicate charges or activity; expired jobs have a visible recovery path                              | Rhett and Jhade    |
| Minimal operational monitoring                              | Diagnose failures without collecting private content | Track request duration, fixed error codes, queue depth and provider usage; exclude audio, transcripts, prompts, usernames and learner identifiers from telemetry         | Rhett              |
| Guardian operations and privacy review                      | Make the manual queue an accountable process         | Assign staff, verify references through the external procedure, define escalation, retention, contact and withdrawal handling, and test them                             | Rhett and James    |
| Validate the assessment                                     | Establish what scores can support                    | A qualified reviewer designs comparison with an external reading measure, checks calibration and defines allowed claims                                                  | Jhade and reviewer |
| Test lower-cost phones and weak connections                 | Make access practical                                | Complete sessions on target devices; test keyboard/screen reader paths, missing Filipino voices and interrupted uploads; no sensitive response caching on shared devices | Sean and James     |

Detailed teacher or classroom views should follow a real need and an explicit authorization model. Parent permission is not teacher permission. Do not add a dashboard that exposes learner data through assumed school membership.

## Measures of improvement

Collect baselines before setting targets. Use the minimum consented data needed and suppress small groups in reporting.

- Session completion and the step where learners stop.
- Successful, validated story delivery and time spent waiting, including retries.
- Ambiguous or unsupported questions found by reviewers.
- Recognition disagreement with human transcripts, broken down by relevant evaluation conditions.
- Performance on fresh and delayed questions, with accommodations recorded.
- Guardian review turnaround, withdrawal failures and unauthorized-access test results.
- Cost or quota use per completed session and a tested restore/recovery outcome.

Do not use time in the app, streaks or raw level increases as proof of learning. Do not introduce free-form learner chat, public leaderboards or raw-audio retention to improve a demonstration. Bounded topic choices and age-appropriate progress encouragement can follow once the core loop is reliable.

## Recommended execution order

Choose hosting, verify durable operation, complete real content reviews and rehearse the walkthrough. Then improve the content bands and evaluation set while testing recognition with qualified reviewers. Add stronger administration, migrations and durable jobs before a wider pilot. Owners listed here are suggested assignments, not completed approvals; locked-area changes retain the ownership requirements in AGENTS.md.
