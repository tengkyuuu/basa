/** Explicit selection only. Never silently send audio to another provider. */
export function speechProvider(): 'groq' | 'azure' {
  return process.env.SPEECH_PROVIDER === 'azure' ? 'azure' : 'groq';
}
export function speechConfigured(): boolean {
  if (process.env.SPEECH_PROVIDER && !['azure', 'groq'].includes(process.env.SPEECH_PROVIDER))
    return false;
  return speechProvider() === 'azure'
    ? !!process.env.AZURE_SPEECH_KEY &&
        /^[a-z][a-z0-9]{1,40}$/.test(process.env.AZURE_SPEECH_REGION ?? '')
    : !!process.env.GROQ_API_KEY;
}
export function speechConsentVersion() {
  return speechProvider() === 'azure' ? ('azure-speech-v1' as const) : ('groq-speech-v1' as const);
}
export function guardianConsentVersion() {
  return speechProvider() === 'azure'
    ? ('azure-guardian-v1' as const)
    : ('groq-guardian-v1' as const);
}
