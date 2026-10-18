# Acoustic pronunciation assessment

Status: implemented behind explicit provider configuration. Azure credentials and live provider verification are pending. Owner review pending.

## Decision

Keep Groq for story generation and teacher notes. Add Microsoft Azure Speech as an explicitly selected audio provider for scripted US English pronunciation assessment. Groq remains the default audio provider until deployment configuration changes. No provider fallback sends audio elsewhere.

The user authorized dedicated pronunciation assessment after authorizing Groq transcription. This extends the no-audio-to-model exception only to the selected speech endpoint, after provider-specific learner consent and, for under-13 learners, manual guardian verification. No audio reaches the teacher or story model. Old Groq consent and guardian grants do not authorize Azure. Changing providers during an assessment discards its result.

Browser capture uses an AudioWorklet and mono 16 kHz, 16-bit PCM WAV held in memory. Azure recordings stop after 120 seconds; word practice retains its shorter limit. The server validates the WAV header, size and duration before forwarding PCM. The SDK uses continuous recognition because passages can exceed 30 seconds. Application code aligns omissions and insertions because Azure continuous mode does not support EnableMiscue. Optional prosody assessment and SDK telemetry are disabled. BasaBridge never writes raw audio to storage or logs.

## Feedback and scoring

The optional pronunciation report retains only validated acoustic scores, IPA phonemes and alignment indexes. A substitute word's phonemes are never presented as an assessment of the expected word. Recognition confidence and pronunciation accuracy remain different quantities.

Displayed word sound accuracy is the mean of acoustically assessed, transcript-matched words. Reading flow is the speech-duration-weighted mean of utterance fluency scores. Story words matched is the proportion of reference words matching the transcript. These are application summaries, not Azure's proprietary overall pronunciation score. A score below 60 suggests practice; it does not diagnose an error. Learners see accent and recording-quality limitations. Word or phoneme scores below 60 suggest practice, with low recognition confidence labelled uncertain. Misheard flags stay unverified and never inflate scores.

Pronunciation evidence does not alter comprehension scores, mastery or levels. Word practice remains separate from story tries. The teacher receives only whitelisted counts, score summaries and expected story words; never raw heard text, audio, names or account identifiers. Silent readings retain a separate prompt.

## Activation and verification

See [the Azure setup guide](../AZURE-SPEECH.md). Local tests cover WAV validation, score parsing, SDK success, silence, cancellation, invalid output, timeout cleanup, provider-only routing, missing configuration, provider changes in flight and renewed guardian review. Browser tests use synthetic microphone input and intercepted provider responses only in tests. They do not establish real Azure performance or Filipino accent calibration. Live synthetic-audio verification is required after credentials are configured.

Review assignments: Rhett for the optional shared contract; James for capture, speech alignment and the Azure adapter; Jhade and James for teacher/provider data handling; Rhett and James for provider-specific learner and guardian consent. These assignments do not assert owner approval.

Source: [Microsoft pronunciation assessment](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment).
