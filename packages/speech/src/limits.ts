/** Fits the request body limit of the supported serverless host. */
export const SPEECH_LIMITS = {
  maxBytes: 4_000_000,
  maxSeconds: 180,
  azureMaxSeconds: 120,
  maxWordSeconds: 15,
  pendingMs: 240_000,
} as const;
