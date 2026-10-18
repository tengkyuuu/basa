import { ReadingNote } from '@basabridge/contracts';
import type { ComprehensionSkill } from '@basabridge/contracts';
import { groqJSON } from '@basabridge/story-ai';

/** AI receives aggregates only. A null result selects catalog wording in the UI. */
export async function readingNote(input: {
  correct: number;
  total: number;
  focus: ComprehensionSkill | null;
}): Promise<ReadingNote | null> {
  try {
    return await groqJSON(
      process.env.NOTES_MODEL || 'openai/gpt-oss-20b',
      ReadingNote,
      'Write a brief, encouraging reading note in English and Filipino, each with simple and standard wording. Simple wording uses short sentences. Use only the supplied counts and focus. This is a silent reading: say nothing about pronunciation, fluency, passing, diagnoses or level changes. Do not claim a skill improved. Suggest looking for clues next time. No names, links, contact requests or questions to the learner. Return the fixed JSON shape.',
      { correct: input.correct, total: input.total, focus: input.focus },
      fetch,
      1024,
    );
  } catch {
    return null;
  }
}
