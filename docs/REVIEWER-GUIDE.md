# Review content and guardian requests

The app contains 15 authored placement candidates and 33 lesson versions, covering 11 subjects in three bands. These are drafts. Code checks structure and quoted evidence; it cannot certify suitability, question quality, Filipino wording or assessment validity. No real educator or guardian approval is seeded.

## Open review tools

1. Run the app and open `/review` on its own origin.
2. The first administrator uses the private `REVIEW_ADMIN_TOKEN` only to create their individual staff account. Hosting needs its own random secret of at least 32 characters. Never put it in a URL, source, screenshots, chat or learner accounts.
3. Sign in with your staff username and password. An administrator can issue one-use, 24-hour invitations for content or guardian reviewers. Use a staff code instead of a personal name. The server records the authenticated staff identity with each review.

Staff sessions use HttpOnly cookies and expire after eight hours. Requests require the trusted origin and persisted rate limits. Content reviewers receive material answer keys without guardian references. Guardian reviewers receive pending references without material answer keys. Neither role grants general learner progress or audio. Administrators can withdraw staff access immediately; changing a password signs out every session. See [operations](OPERATIONS.md).

## Review learning content

Select **Inspect material**. Read the passage, every question and option, answer key, quoted evidence, skill tag and explanation. Check all four wording variants. Confirm plausible distractors, supported and unique answers, correct sequences, vocabulary and complexity. A real reading specialist must assess suitability. Early, middle and advanced bands have distinct contexts and word practice. Contexts recur across skill lessons within each band. They are not empirically calibrated forms.

The structural check must pass before approval. Confirm only after completing the real review, then choose **Approve this version**. The server stores a fingerprint of the whole material, reviewer identifier, time and an append-only audit event. Source edits change the fingerprint and require another approval. **Withdraw approval** retires a version. This stops new access; completed activity remains recorded.

Review the entire placement bank before offering placement so alternate passages cover the adaptive path. Placement starts only when the whole bank is approved. Withdrawal during an active check can pause access until suitable content is available again. The app reports this visibly instead of supplying unreviewed content. Approve lessons for each band you plan to demonstrate. Practice never changes a level or labels a lesson learned. Fresh questions in an ordinary story must provide the required evidence.

Placement remains provisional even after approval. Content approval is not calibration or a validated-assessment claim. Use test accounts for the hackathon.

## Manually verify a guardian

1. The learner creates a one-use parent link code. A separate adult parent account redeems it. Linking does not share progress or authorize a microphone.
2. The parent reads the consent wording, confirms the request and re-enters the account password. A pending request and reference appear. Under-13 microphones remain blocked.
3. Your team verifies the adult's identity, relationship to the specific learner and informed consent outside the app, through its approved video-call or signed-form process. Establish the correct request reference through that process. A link code or password alone is not identity verification. Agree on document access, retention and deletion outside BasaBridge before collecting documents. Do not put identity documents or personal names in the reviewer identifier or logs.
4. Match the reference in `/review`, select the method and attest only to checks actually completed. Approve or reject. The app stores method, staff identifier, time, consent version and status, not the evidence document.
5. The learner must separately enable microphone consent. Every speech request rechecks the live link, approval and learner consent, including after transcription. Parents never receive audio.

The parent can withdraw permission. Unlinking also revokes it permanently; re-linking cannot restore an old approval. Learner consent is cleared. A recording response arriving after revocation is rejected. Silent reading remains available.

This workflow supports a real manual process; it does not establish that process or claim legal compliance. Assign staff and review consent and privacy practices before accepting real children. Include the exact consent and provider policy in the actual informed consent procedure.

## Handoff checks

Rehearse in a separate test database. Do not mark actual materials reviewed to make a demonstration look complete. Browser tests approve fixtures only in their throwaway database. After deployment, verify that approvals survive restart, withdrawn content becomes unavailable, private parent fields stay hidden and guardian withdrawal blocks speech.

Locked-area reviews remain assigned to Rhett for persistence, authorization and shared contracts; Jhade and James for models and speech; Rhett and James for consent and age gating. These assignments are not completed owner approvals.
