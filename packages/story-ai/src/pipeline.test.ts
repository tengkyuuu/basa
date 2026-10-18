import { afterEach, describe, expect, it, vi } from 'vitest';
import { WALKTHROUGH_BANK } from './bank';
import { answersMatch, checkLearningStory, generateCheckedStory } from './pipeline';

afterEach(() => vi.unstubAllEnvs());
const fixture = () => structuredClone(WALKTHROUGH_BANK[0]!);
const reply = (value: unknown) =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) } }] }), {
    status: 200,
  });

describe('checked story pipeline', () => {
  it('requests fresh questions for a practised subskill while retaining independent verification', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-only-key');
    const story = fixture();
    const calls: { messages: { content: string }[] }[] = [];
    const transport: typeof fetch = async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return reply(
        calls.length === 1
          ? story
          : {
              safeForChildren: true,
              unambiguous: true,
              answers: story.questions.map((q) => q.answerIndexes),
            },
      );
    };
    await generateCheckedStory(
      { level: 25, focus: null, recentTitles: [], recheck: { subskill: 'key_detail', items: 2 } },
      transport,
    );
    const facts = JSON.parse(calls[0]!.messages[1]!.content);
    expect(
      facts.questionPlan.filter((q: { subskill: string }) => q.subskill === 'key_detail').length,
    ).toBeGreaterThanOrEqual(2);
    expect(calls[1]!.messages[1]!.content).not.toContain('answerIndexes');
  });
  it('accepts every authored walkthrough passage at its supported level', () => {
    for (const story of WALKTHROUGH_BANK)
      expect(checkLearningStory(story, 25).questions).toHaveLength(5);
  });
  it('rejects repeated titles, duplicate options, missing evidence, bad answer indices and wrong length', () => {
    expect(() => checkLearningStory(fixture(), 25, [fixture().title])).toThrow();
    const duplicate = fixture();
    duplicate.questions[0]!.options[1] = duplicate.questions[0]!.options[0]!;
    expect(() => checkLearningStory(duplicate, 25)).toThrow();
    const unsupported = fixture();
    unsupported.questions[0]!.evidence = 'Not in the passage.';
    expect(() => checkLearningStory(unsupported, 25)).toThrow();
    const badKey = fixture();
    badKey.questions[0]!.answerIndexes = [4];
    expect(() => checkLearningStory(badKey, 25)).toThrow();
    expect(() => checkLearningStory(fixture(), 1)).toThrow();
  });
  it('requires the exact set for choose-all and exact sequence for order-events', () => {
    expect(answersMatch({ type: 'choose_all', answerIndexes: [0, 2] }, [2, 0])).toBe(true);
    expect(answersMatch({ type: 'choose_all', answerIndexes: [0, 2] }, [0])).toBe(false);
    expect(answersMatch({ type: 'choose_all', answerIndexes: [0, 2] }, [0, 0])).toBe(false);
    expect(answersMatch({ type: 'order_events', answerIndexes: [2, 1, 3, 0] }, [0, 1, 2, 3])).toBe(
      false,
    );
  });
  it('uses different models, omits the key from verification, and allowlists input fields', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-only-key');
    const story = fixture();
    const calls: {
      model: string;
      messages: { content: string }[];
      max_completion_tokens: number;
      reasoning_effort?: string;
    }[] = [];
    const transport = vi.fn(async (_url, init) => {
      calls.push(JSON.parse(String(init?.body)));
      return reply(
        calls.length === 1
          ? story
          : {
              safeForChildren: true,
              unambiguous: true,
              answers: story.questions.map((q) => q.answerIndexes),
            },
      );
    }) as typeof fetch;
    await generateCheckedStory(
      {
        level: 25,
        focus: null,
        recentTitles: [],
        ...{ username: 'private-user', audio: 'private-audio' },
      },
      transport,
    );
    expect(calls).toHaveLength(2);
    expect(calls[0]!.model).not.toBe(calls[1]!.model);
    expect(calls[0]!.max_completion_tokens).toBeLessThanOrEqual(3072);
    expect(calls[1]!.max_completion_tokens).toBeLessThan(calls[0]!.max_completion_tokens);
    expect(calls[0]!.reasoning_effort).toBe('low');
    expect(JSON.stringify(calls)).not.toMatch(/private-user|private-audio/);
    expect(calls[1]!.messages[1]!.content).not.toMatch(/answerIndexes|evidence|distractors/);
  });
  it('retries provider schema failures and supplies safe validation feedback', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-only-key');
    const invalid = fixture();
    invalid.questions[0]!.evidence = 'This sentence was never in the story.';
    const requests: { messages: { content: string }[] }[] = [];
    const transport: typeof fetch = async (_url, init) => {
      requests.push(JSON.parse(String(init?.body)));
      if (requests.length === 1)
        return Response.json(
          { error: { code: 'json_validate_failed', message: 'private provider detail' } },
          { status: 400 },
        );
      if (requests.length === 2) return reply(invalid);
      if (requests.length === 3) return reply(fixture());
      return reply({
        safeForChildren: true,
        unambiguous: true,
        answers: fixture().questions.map((q) => q.answerIndexes),
      });
    };
    await expect(
      generateCheckedStory({ level: 25, focus: null, recentTitles: [] }, transport),
    ).resolves.toEqual(fixture());
    expect(requests).toHaveLength(4);
    expect(JSON.parse(requests[2]!.messages[1]!.content).feedback).toMatch(
      /ONE whole passage sentence/,
    );
    expect(JSON.stringify(requests)).not.toMatch(/private provider detail|This sentence was never/);
  });
  it('does not retry an unknown bad request or expose its details', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-only-key');
    const transport = vi.fn<typeof fetch>(async () =>
      Response.json(
        { error: { code: 'invalid_request_error', message: 'private provider detail' } },
        { status: 400 },
      ),
    );
    await expect(
      generateCheckedStory({ level: 25, focus: null, recentTitles: [] }, transport),
    ).rejects.toMatchObject({ code: 'ai_unavailable', message: 'ai_unavailable' });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('fails closed after independent safety rejection', async () => {
    vi.stubEnv('GROQ_API_KEY', 'test-only-key');
    let n = 0;
    const transport = vi.fn(async () =>
      reply(
        ++n % 2
          ? fixture()
          : {
              safeForChildren: false,
              unambiguous: true,
              answers: fixture().questions.map((q) => q.answerIndexes),
            },
      ),
    ) as typeof fetch;
    await expect(
      generateCheckedStory({ level: 25, focus: null, recentTitles: [] }, transport),
    ).rejects.toMatchObject({ code: 'ai_invalid' });
    expect(transport).toHaveBeenCalledTimes(6);
  });
  it('returns a safe error for rate limits and makes no call without a key', async () => {
    vi.stubEnv('GROQ_API_KEY', '');
    const transport = vi.fn(
      async () => new Response('sensitive provider error', { status: 429 }),
    ) as typeof fetch;
    await expect(
      generateCheckedStory({ level: 25, focus: null, recentTitles: [] }, transport),
    ).rejects.toMatchObject({ code: 'ai_setup' });
    expect(transport).not.toHaveBeenCalled();
    vi.stubEnv('GROQ_API_KEY', 'test-only-key');
    await expect(
      generateCheckedStory({ level: 25, focus: null, recentTitles: [] }, transport),
    ).rejects.toMatchObject({ code: 'ai_busy' });
    expect(transport).toHaveBeenCalledTimes(1);
  });
});
