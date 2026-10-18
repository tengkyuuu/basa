import { z } from 'zod';

export class AIUnavailable extends Error {
  constructor(public readonly code: 'ai_setup' | 'ai_busy' | 'ai_invalid' | 'ai_unavailable') {
    super(code);
  }
}

/** Server only. Fixed provider URL; never log requests, responses or provider errors. */
export async function groqJSON<T>(
  model: string,
  schema: z.ZodType<T>,
  instructions: string,
  facts: unknown,
  transport: typeof fetch = fetch,
  maxCompletionTokens = 3072,
): Promise<T> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new AIUnavailable('ai_setup');
  let response: Response;
  try {
    response = await transport('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(40_000),
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: instructions },
          { role: 'user', content: JSON.stringify(facts) },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'reading_response', strict: true, schema: z.toJSONSchema(schema) },
        },
        max_completion_tokens: maxCompletionTokens,
        ...(model.startsWith('openai/gpt-oss-')
          ? { reasoning_effort: 'low', include_reasoning: false }
          : {}),
        temperature: 0.4,
      }),
    });
  } catch {
    throw new AIUnavailable('ai_unavailable');
  }
  if (!response.ok) {
    if (response.status === 400) {
      const body = (await response.json().catch(() => null)) as {
        error?: { code?: string };
      } | null;
      if (body?.error?.code === 'json_validate_failed') throw new AIUnavailable('ai_invalid');
    }
    throw new AIUnavailable(response.status === 429 ? 'ai_busy' : 'ai_unavailable');
  }
  try {
    const body = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return schema.parse(JSON.parse(body.choices?.[0]?.message?.content ?? ''));
  } catch {
    throw new AIUnavailable('ai_invalid');
  }
}
