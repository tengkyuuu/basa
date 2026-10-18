/** Authored development passages, NOT a calibrated or educator-reviewed placement bank.
 * Available only in the loopback-only local walkthrough. Never seed learner activity.
 */
import type { LearningStory, LearningQuestion, SubSkill } from '@basabridge/contracts';
import { checkLearningStory } from './pipeline';

function question(
  subskill: SubSkill,
  text: string,
  options: string[],
  answers: number[],
  evidence: string,
  word: string | null = null,
): LearningQuestion {
  return {
    type: answers.length > 1 ? 'choose_all' : 'multiple_choice',
    subskill,
    question: text,
    options,
    answerIndexes: answers,
    evidence,
    word,
    distractors: options.map((_, i) => (answers.includes(i) ? null : 'not_stated')),
  };
}

export const WALKTHROUGH_BANK: LearningStory[] = [
  {
    title: 'A place in the shade',
    text: 'The school yard was hot. A small dog lay in the sun. A child put a bowl of cool water under a tree. The dog drank, then rested in the shade. The child smiled.',
    questions: [
      question(
        'key_detail',
        'Where did the child put the bowl?',
        ['Under a tree', 'On a desk', 'By a gate', 'In a bag'],
        [0],
        'A child put a bowl of cool water under a tree.',
      ),
      question(
        'word_in_context',
        'What does "rested" mean here?',
        ['Ran fast', 'Took a break', 'Made a noise', 'Looked for food'],
        [1],
        'The dog drank, then rested in the shade.',
        'rested',
      ),
      question(
        'sequence',
        'What did the dog do after it drank?',
        ['Went home', 'Barked', 'Rested in the shade', 'Ran to the gate'],
        [2],
        'The dog drank, then rested in the shade.',
      ),
      question(
        'feelings',
        'Why did the child most likely smile?',
        [
          'The school was shut',
          'The bowl broke',
          'The dog ran away',
          'The dog was more comfortable',
        ],
        [3],
        'The child smiled.',
      ),
      question(
        'key_detail',
        'Choose all the things the child put under the tree.',
        ['A bowl', 'Cool water', 'A book', 'A hat'],
        [0, 1],
        'A child put a bowl of cool water under a tree.',
      ),
    ],
  },
  {
    title: 'Room under the umbrella',
    text: 'Rain fell as school ended. A child had a wide umbrella. A classmate stood by the door with no coat. The child waved the classmate over. They walked to the gate together and stayed dry.',
    questions: [
      question(
        'key_detail',
        'When did the rain fall?',
        ['Before dawn', 'As school ended', 'At lunch', 'During the night'],
        [1],
        'Rain fell as school ended.',
      ),
      question(
        'word_in_context',
        'What does "wide" tell us about the umbrella?',
        ['It had room across it', 'It was torn', 'It was closed', 'It was heavy'],
        [0],
        'A child had a wide umbrella.',
        'wide',
      ),
      question(
        'key_detail',
        'Where did they walk together?',
        ['To a shop', 'To a park', 'To the gate', 'To a bus'],
        [2],
        'They walked to the gate together and stayed dry.',
      ),
      question(
        'cause_effect',
        'Why did the child wave the classmate over?',
        [
          'To take the coat',
          'To stop the rain',
          'To close the door',
          'To share shelter from the rain',
        ],
        [3],
        'The child waved the classmate over.',
      ),
      question(
        'key_detail',
        'Choose all the things the story tells us about the classmate.',
        ['Stood by the door', 'Had no coat', 'Lost a bag', 'Carried a book'],
        [0, 1],
        'A classmate stood by the door with no coat.',
      ),
    ],
  },
  {
    title: 'Seeds by the window',
    text: 'The class put seeds in cups of soil by a bright window. Each day, they added a little water. Soon, green shoots grew. The class moved the cups gently so the young plants would not bend.',
    questions: [
      question(
        'key_detail',
        'Where did the class put the cups?',
        ['In a box', 'Under a bed', 'By a bright window', 'In a dark room'],
        [2],
        'The class put seeds in cups of soil by a bright window.',
      ),
      question(
        'word_in_context',
        'What does "gently" mean here?',
        ['With care', 'With a loud sound', 'In a rush', 'With force'],
        [0],
        'The class moved the cups gently so the young plants would not bend.',
        'gently',
      ),
      question(
        'key_detail',
        'What did the class add each day?',
        ['Sand', 'A little water', 'New cups', 'Paint'],
        [1],
        'Each day, they added a little water.',
      ),
      question(
        'cause_effect',
        'Why did they move the cups with care?',
        [
          'The cups were hot',
          'They wanted to hide them',
          'The soil was gone',
          'The young plants could bend',
        ],
        [3],
        'The class moved the cups gently so the young plants would not bend.',
      ),
      question(
        'key_detail',
        'Choose all the things put in the cups.',
        ['Seeds', 'Soil', 'Stones', 'Paper'],
        [0, 1],
        'The class put seeds in cups of soil by a bright window.',
      ),
    ],
  },
];

export function walkthroughStory(level: number, recentTitles: string[]): LearningStory | null {
  for (const story of WALKTHROUGH_BANK) {
    try {
      return checkLearningStory(story, level, recentTitles);
    } catch {
      /* Try the next unused passage. */
    }
  }
  return null;
}
