# Groq configuration after live checks

Status: implemented for the hackathon preview; provider owners still need to review it.

Live requests on 2026-10-18 authenticated with the locally configured key. English and Filipino teacher notes passed the output schema. Whisper transcription of a synthetic English passage passed the speech adapter and word alignment.

The 20B story generator repeatedly produced invalid evidence, word tags or distractor alignment. Some requests returned Groq's `json_validate_failed`, and repeated attempts reached free-tier token limits. A live story from the 120B generator passed the existing deterministic checks and separate 20B answer verifier. Use `openai/gpt-oss-120b` for generation and `openai/gpt-oss-20b` for verification. Both remain configurable and must differ. This reverses the original proposal to use the larger model as verifier. A successful smoke check does not establish model quality or educational validity.

Keep strict JSON schemas and all code checks. Recognize only the provider's fixed `json_validate_failed` code as an invalid response eligible for the existing bounded retry. Other bad requests and rate limits fail visibly. Do not log provider error bodies. Retry feedback contains fixed validation guidance, never learner identity or raw provider errors.

Ask for a passage below a target grade derived from the tier cap, leaving a readability margin. When a passage fails the cap, the retry receives computed word and grade counts. Use a five-question plan with vocabulary, literal and inference coverage and an appropriate mixed question. Exact evidence and option tags remain checked in code. Independent answer disagreement still rejects a story.

Use low reasoning effort for GPT-OSS, with completion caps of 3072 tokens for a story, 1536 for verification and 1024 for notes. This bounds request size but does not remove provider quotas. Free-tier rate limits still need a visible retry path.

The full local app flow also passed with live Groq: create a temporary account, generate a checked story, hide it for questions, submit all five answers, receive server scores and bilingual AI notes, and reload the saved result. The temporary account was deleted afterward. Provider tests also covered authentication and availability of the configured models.

These checks used synthetic inputs and no learner recordings. A consented microphone walkthrough, hosted database verification and public deployment remain separate checks.
