import { ReadingNote } from '@basabridge/contracts';
import type { ComprehensionSkill, TryAnalysis } from '@basabridge/contracts';
import { groqJSON } from '@basabridge/story-ai';

/** AI receives aggregates only. A null result selects catalog wording in the UI. */
export async function readingNote(input: {
  correct: number;
  total: number;
  focus: ComprehensionSkill | null;
  reading?: TryAnalysis;
}): Promise<ReadingNote | null> {
  try {
    return await groqJSON(
      process.env.NOTES_MODEL || 'openai/gpt-oss-20b',
      ReadingNote,
      `Write a brief, encouraging reading note in English and Filipino, each with simple and standard wording. Simple wording uses short sentences. Use only the supplied counts and focus. ${input.reading ? 'A read-aloud attempt is included. Describe transcript differences as recognition estimates. Only discuss pronunciation or fluency when acoustic estimates are supplied. Suggest listening to the listed story words and trying them again. Never invent sounds, mistakes or scores.' : 'This is a silent reading: say nothing about pronunciation or fluency.'} Say nothing about passing, diagnoses or level changes. Do not claim a skill improved. Suggest looking for clues next time. No names, links, contact requests or questions to the learner. Return the fixed JSON shape.`,
      {
        correct: input.correct,
        total: input.total,
        focus: input.focus,
        ...(input.reading
          ? {
              reading: {
                wordsTotal: input.reading.wordsTotal,
                wordsRight: input.reading.wordsRight,
                seconds: input.reading.seconds,
                wordsPerMinute: input.reading.wordsPerMinute,
                omissions: input.reading.words.filter((w) => w.outcome === 'omission').length,
                substitutions: input.reading.words.filter((w) => w.outcome === 'substitution')
                  .length,
                repetitions: input.reading.words.filter((w) => w.outcome === 'repetition').length,
                ...(input.reading.pronunciation
                  ? {
                      acoustic: {
                        accuracy: input.reading.pronunciation.accuracy,
                        fluency: input.reading.pronunciation.fluency,
                        practiceWords: input.reading.pronunciation.words
                          .filter(
                            (w) =>
                              w.accuracy < 60 &&
                              !input.reading!.words[w.alignmentIndex]?.markedMisheard &&
                              input.reading!.words[w.alignmentIndex]!.confidence >= 0.5,
                          )
                          .slice(0, 5)
                          .map((w) => input.reading!.words[w.alignmentIndex]?.expected),
                      },
                    }
                  : {}),
              },
            }
          : {}),
      },
      fetch,
      1024,
    );
  } catch {
    return null;
  }
}
