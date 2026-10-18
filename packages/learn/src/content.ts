import type { LearningQuestion } from '@basabridge/contracts';
import type { Band, LessonSubject } from './index';
import { LESSON_COPY, type Wording } from './copy';
import { scenariosForBand } from './band-scenarios';
export { LESSON_COPY } from './copy';

export interface PracticeItem {
  id: string;
  passage: string;
  question: LearningQuestion;
  hint: Wording;
}
export interface LessonContent {
  id: string;
  subject: LessonSubject;
  band: Band;
  status: 'draft';
  items: PracticeItem[];
}
export type Scenario = readonly [
  passage: string,
  question: string,
  options: readonly [string, string, string, string],
  evidence: string,
  word?: string,
];
const SCENARIOS: Record<LessonSubject, readonly Scenario[]> = {
  word_in_context: [
    [
      'The cup was empty, with no water left.',
      'What does "empty" mean?',
      ['Holding nothing', 'Very heavy', 'Full of water', 'Made of glass'],
      'The cup was empty, with no water left.',
      'empty',
    ],
    [
      'The path was narrow, so only one child could walk on it at a time.',
      'What does "narrow" mean here?',
      ['Not wide', 'Very long', 'Full of light', 'Newly built'],
      'The path was narrow, so only one child could walk on it at a time.',
      'narrow',
    ],
    [
      'The stone was smooth, with no rough bumps.',
      'What does "smooth" mean?',
      ['Even, without rough bumps', 'Very sharp', 'Full of holes', 'Easy to lift'],
      'The stone was smooth, with no rough bumps.',
      'smooth',
    ],
    [
      'The room was silent, and no one made a sound.',
      'What does "silent" mean?',
      ['Quiet', 'Crowded', 'Bright', 'Warm'],
      'The room was silent, and no one made a sound.',
      'silent',
    ],
  ],
  word_parts: [
    [
      'The knot was tied. The child untied it and opened the bag.',
      'What does "untied" mean?',
      ['Undid the knot', 'Made a tighter knot', 'Lost the bag', 'Cut the bag'],
      'The child untied it and opened the bag.',
      'untied',
    ],
    [
      'The box was useful because it could hold the tools.',
      'What does -ful suggest in "useful"?',
      ['Having a use', 'Having no use', 'Being very large', 'Being broken'],
      'The box was useful because it could hold the tools.',
      'useful',
    ],
    [
      'The child reread the note to check the time.',
      'What does re- suggest in "reread"?',
      ['Read again', 'Read quietly', 'Write a note', 'Put away'],
      'The child reread the note to check the time.',
      'reread',
    ],
    [
      'The room was unlit until the lamp came on.',
      'What does "unlit" mean?',
      ['Not lit', 'Very bright', 'Newly painted', 'Too small'],
      'The room was unlit until the lamp came on.',
      'unlit',
    ],
  ],
  key_detail: [
    [
      'A child left a blue bag under the desk.',
      'Where was the bag?',
      ['Under the desk', 'On the roof', 'Behind a tree', 'By the gate'],
      'A child left a blue bag under the desk.',
    ],
    [
      'The vendor put six rolls in a paper bag.',
      'How many rolls went in the bag?',
      ['Six', 'Two', 'Four', 'Ten'],
      'The vendor put six rolls in a paper bag.',
    ],
    [
      'A bird landed on the garden wall.',
      'Where did the bird land?',
      ['On the garden wall', 'In the pond', 'Under the table', 'On the road'],
      'A bird landed on the garden wall.',
    ],
    [
      'The class planted beans in three pots.',
      'What did the class plant?',
      ['Beans', 'Rice', 'Mangoes', 'Grass'],
      'The class planted beans in three pots.',
    ],
  ],
  sequence: [
    [
      'First the child washed the cup. Then the child filled it with water.',
      'What happened after washing the cup?',
      [
        'The cup was filled',
        'The cup was broken',
        'The child went to bed',
        'The water was spilled',
      ],
      'Then the child filled it with water.',
    ],
    [
      'The class picked up the litter before sweeping the floor.',
      'What happened first?',
      ['Picking up litter', 'Sweeping the floor', 'Painting the wall', 'Closing the school'],
      'The class picked up the litter before sweeping the floor.',
    ],
    [
      'A child found a seed. Next the child put it in soil.',
      'What happened after finding the seed?',
      ['It was put in soil', 'It grew fruit at once', 'It was cooked', 'It was given to a bird'],
      'Next the child put it in soil.',
    ],
    [
      'The baker mixed the dough and then shaped the rolls.',
      'What happened before shaping the rolls?',
      ['Mixing the dough', 'Serving the rolls', 'Washing the oven', 'Buying a plate'],
      'The baker mixed the dough and then shaped the rolls.',
    ],
  ],
  main_idea: [
    [
      'The class sorted paper, cleaned the floor and put books away.',
      'What is this passage mostly about?',
      [
        'The class tidying its room',
        'A child buying a book',
        'A game at lunch',
        'A trip to a shop',
      ],
      'The class sorted paper, cleaned the floor and put books away.',
    ],
    [
      'A child filled a bowl with water and placed food beside it for a stray cat.',
      'What is the main idea?',
      ['Helping a cat', 'Building a bowl', 'Painting a wall', 'Learning a dance'],
      'A child filled a bowl with water and placed food beside it for a stray cat.',
    ],
    [
      'The neighbours cleared weeds and planted vegetables in an empty plot.',
      'What is this passage mostly about?',
      [
        'Making a vegetable garden',
        'Closing a market',
        'Repairing a bus',
        'Collecting old clothes',
      ],
      'The neighbours cleared weeds and planted vegetables in an empty plot.',
    ],
    [
      'The child checked the wheels, pumped the tyres and cleaned the bike.',
      'What is the main idea?',
      ['Caring for a bike', 'Buying a boat', 'Learning to swim', 'Cooking a meal'],
      'The child checked the wheels, pumped the tyres and cleaned the bike.',
    ],
  ],
  cause_effect: [
    [
      'Rain soaked the path, so the class stayed inside.',
      'Why did the class stay inside?',
      ['The path was soaked', 'The room was locked', 'The sun was too bright', 'The bus was early'],
      'Rain soaked the path, so the class stayed inside.',
    ],
    [
      'The plant had no water for days, and its leaves drooped.',
      'What most likely caused the leaves to droop?',
      ['Too little water', 'A new flowerpot', 'A clean window', 'A longer name'],
      'The plant had no water for days, and its leaves drooped.',
    ],
    [
      'The gate was shut, so the dog could not leave the yard.',
      'Why could the dog not leave?',
      ['The gate was shut', 'The dog had a new bowl', 'The tree was tall', 'The sky was blue'],
      'The gate was shut, so the dog could not leave the yard.',
    ],
    [
      'The child left ice in the sun, and it turned to water.',
      'Why did the ice turn to water?',
      ['The sun warmed it', 'The cup was blue', 'The child counted it', 'The table was round'],
      'The child left ice in the sun, and it turned to water.',
    ],
  ],
  feelings: [
    [
      'The child found the lost toy and smiled with a long sigh.',
      'How did the child most likely feel?',
      ['Relieved', 'Angry at the toy', 'Bored', 'Jealous'],
      'The child found the lost toy and smiled with a long sigh.',
    ],
    [
      'The child hid behind the door when the loud thunder shook the windows.',
      'How did the child most likely feel?',
      ['Afraid', 'Proud', 'Sleepy', 'Thankful for the noise'],
      'The child hid behind the door when the loud thunder shook the windows.',
    ],
    [
      'The child held up the finished drawing and beamed.',
      'How did the child most likely feel?',
      ['Proud', 'Ashamed', 'Lonely', 'Angry'],
      'The child held up the finished drawing and beamed.',
    ],
    [
      'The class cheered and jumped when its team won.',
      'How did the class most likely feel?',
      ['Excited', 'Disappointed', 'Worried', 'Bored'],
      'The class cheered and jumped when its team won.',
    ],
  ],
  prediction: [
    [
      'Dark clouds gathered. The child reached for an umbrella before going out.',
      'What will the child most likely do next?',
      [
        'Carry the umbrella outside',
        'Put ice in an oven',
        'Plant a tree indoors',
        'Take a swim in the classroom',
      ],
      'The child reached for an umbrella before going out.',
    ],
    [
      'The water in the kettle was steaming. A cup and a tea bag stood beside it.',
      'What is most likely to happen next?',
      [
        'Someone will make tea',
        'The kettle will grow leaves',
        'The cup will be buried',
        'The tea bag will become a book',
      ],
      'A cup and a tea bag stood beside it.',
    ],
    [
      'The dog saw its food bowl being filled and ran towards it.',
      'What will the dog most likely do next?',
      ['Eat from the bowl', 'Read a book', 'Paint the wall', 'Hide the sun'],
      'The dog saw its food bowl being filled and ran towards it.',
    ],
    [
      'The class lined up by the door when the teacher said it was time for the garden visit.',
      'What will the class most likely do next?',
      ['Go to the garden', 'Go to bed', 'Bake bread in the room', 'Hide under their desks'],
      'The class lined up by the door when the teacher said it was time for the garden visit.',
    ],
  ],
  conclusion: [
    [
      'Wet boots stood by the door. A damp coat hung above them.',
      'What can you reasonably conclude?',
      [
        'Someone had been out in wet weather',
        'No one had ever left the house',
        'The room was on fire',
        'The boots were made of paper',
      ],
      'A damp coat hung above them.',
    ],
    [
      'The shelf had a gap shaped like the small box. The same box lay on the floor below it.',
      'What most likely happened?',
      [
        'The box came off the shelf',
        'The box grew from the floor',
        'The shelf was always empty',
        'The box was a kind of fruit',
      ],
      'The same box lay on the floor below it.',
    ],
    [
      'Soil was scattered beside a tipped pot. A small plant lay next to it.',
      'What can you reasonably conclude?',
      [
        'The pot had tipped and the plant came out',
        'The plant had turned into a bird',
        'The pot was full of books',
        'The room had no plants',
      ],
      'A small plant lay next to it.',
    ],
    [
      'The child had flour on both hands. Fresh dough lay on the table.',
      'What was the child probably doing?',
      ['Making dough', 'Fixing a bicycle', 'Reading a map', 'Planting rice'],
      'Fresh dough lay on the table.',
    ],
  ],
  decoding: [
    [
      'Read the word: ship.',
      'Which letters work together for the first sound in ship?',
      ['sh', 'ip', 'hi', 'p'],
      'Read the word: ship.',
    ],
    [
      'Read the words: cat and cap.',
      'Which sound changes at the end?',
      ['t changes to p', 'c changes to s', 'a changes to e', 'The words sound the same'],
      'Read the words: cat and cap.',
    ],
    [
      'Read the word: chat.',
      'Which letters work together for the first sound in chat?',
      ['ch', 'at', 'ha', 't'],
      'Read the word: chat.',
    ],
    [
      'Read the words: sit and sip.',
      'Which sound changes at the end?',
      ['t changes to p', 's changes to r', 'i changes to a', 'The words sound the same'],
      'Read the words: sit and sip.',
    ],
  ],
  word_practice: [
    [
      'Read the word: sun.',
      'Which word has the same first sound as sun?',
      ['sit', 'map', 'dog', 'pen'],
      'Read the word: sun.',
    ],
    [
      'Read the word: map.',
      'Which word has the same last sound as map?',
      ['cup', 'mat', 'man', 'mud'],
      'Read the word: map.',
    ],
    [
      'Read the word: big.',
      'Which word has the same first sound as big?',
      ['bag', 'dig', 'pig', 'sit'],
      'Read the word: big.',
    ],
    [
      'Read the word: red.',
      'Which word has the same last sound as red?',
      ['bed', 'run', 'rat', 'rip'],
      'Read the word: red.',
    ],
  ],
};

export const LESSON_CONTENT: LessonContent[] = (
  Object.keys(LESSON_COPY) as LessonSubject[]
).flatMap((subject) =>
  (['early', 'middle', 'advanced'] as const).map((band) => ({
    id: `${subject}-${band}`,
    subject,
    band,
    status: 'draft' as const,
    items: (band === 'early' ? SCENARIOS[subject] : scenariosForBand(subject, band)).map(
      ([passage, question, options, evidence, word], index) => {
        const answer = index % options.length;
        const shuffled = [
          ...options.slice(options.length - answer),
          ...options.slice(0, options.length - answer),
        ];
        const subskill =
          subject === 'decoding' || subject === 'word_practice' ? 'word_in_context' : subject;
        return {
          id: `${subject}-${band}-${index}`,
          passage,
          question: {
            type: 'multiple_choice' as const,
            subskill,
            question,
            options: shuffled,
            answerIndexes: [answer],
            distractors: shuffled.map((_, i) => (i === answer ? null : ('not_stated' as const))),
            evidence,
            word:
              word ??
              (subskill === 'word_in_context' ? (passage.match(/[A-Za-z]+/)?.[0] ?? null) : null),
          },
          hint: LESSON_COPY[subject].point,
        };
      },
    ),
  })),
);
