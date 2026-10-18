# Activate pronunciation assessment

The integration can be built and used with Groq while Azure is unconfigured. No pronunciation results are simulated in the app.

1. Sign into your own [Azure portal](https://portal.azure.com/). If an unrelated organization appears, switch directory from your profile or use a private browser window with your personal account.
2. Create a Speech resource. Choose Free F0 if it is available for your subscription and region. Do not select a paid plan unless you intend to pay. Availability and quotas are set by Azure.
3. Open the resource's Keys and Endpoint page. Add these server-only values to `apps/web/.env.local`:

   ```dotenv
   SPEECH_PROVIDER=azure
   AZURE_SPEECH_KEY=your-private-resource-key
   AZURE_SPEECH_REGION=your-resource-region
   ```

   Use the region identifier, such as `southeastasia`, not the endpoint URL. Keep `GROQ_API_KEY` for stories and teacher notes. Never use a `NEXT_PUBLIC_` prefix or paste keys into chat.

4. Restart the local app. On Vercel, add the same three environment variables privately to the intended environment and redeploy. Preview and production require their own explicit configuration.
5. Open Read aloud. Accept the new Microsoft Azure Speech consent. Under-13 learners need a new guardian request approved by verified staff, even if Groq permission was previously approved.
6. Record an English story, then stop. Check that word and phoneme feedback appears. Discard a second recording and check that it sends no request. Complete questions and check that the saved pronunciation report appears with the result. Practise suggested words in Learn without changing the level.

Without a key, invalid configuration or an Azure outage, the selected Azure microphone fails visibly. It never silently forwards audio to Groq. Silent reading and questions remain usable. Set `SPEECH_PROVIDER=groq` to select the original transcript workflow; that requires consent for Groq.

## Limits and interpretation

Azure recording is limited to two minutes to keep PCM uploads below the serverless request limit. Groq retains its existing three-minute limit. Both stop microphone tracks on stop, discard, failure and navigation.

The UI reports acoustic estimates against US English. Accents, microphones, background noise and recognizer confidence can affect results. These scores do not prove comprehension, diagnose a condition or certify pronunciation accuracy. The phoneme symbols are IPA, with scores out of 100. Optional prosody scoring is not enabled.

Before describing this as live, test a real resource with synthetic audio, then conduct consented learner evaluation across relevant accents and age groups. No live Azure test has been completed without credentials.
