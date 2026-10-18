/** Authored assessment candidates. Database review approval is required before learner use. */
import type { LearningQuestion, LearningStory, SubSkill } from '@basabridge/contracts';
import { WALKTHROUGH_BANK } from './bank';
import { additionalPlacement } from './placement-expansion';

function q(
  subskill: SubSkill,
  question: string,
  options: [string, string, string, string],
  answers: number[],
  evidence: string,
  word: string | null = null,
): LearningQuestion {
  const shift = [...question].reduce((n, c) => n + c.charCodeAt(0), 0) % options.length;
  const ordered = [...options.slice(shift), ...options.slice(0, shift)];
  const key = answers.map((i) => (i - shift + options.length) % options.length);
  return {
    type: key.length > 1 ? 'choose_all' : 'multiple_choice',
    subskill,
    question,
    options: ordered,
    answerIndexes: key,
    distractors: ordered.map((_, i) => (key.includes(i) ? null : 'not_stated')),
    evidence,
    word,
  };
}
export interface PlacementCandidate {
  id: string;
  level: number;
  story: LearningStory;
  status: 'draft';
}
export const PLACEMENT_CONTENT: PlacementCandidate[] = [
  ...additionalPlacement(q),
  {
    id: 'placement-cat',
    level: 10,
    status: 'draft',
    story: {
      title: 'A dry cat',
      text: 'A wet cat ran inside. A child dried it. It purred.',
      questions: [
        q(
          'word_in_context',
          'What does "dried" mean?',
          ['Made dry', 'Made wet', 'Hid away', 'Fed'],
          [0],
          'A child dried it.',
          'dried',
        ),
        q(
          'key_detail',
          'Which animal ran inside?',
          ['A cat', 'A bird', 'A fish', 'A goat'],
          [0],
          'A wet cat ran inside.',
        ),
        q(
          'sequence',
          'What did the child do after the cat came in?',
          ['Dried it', 'Flew away', 'Went swimming', 'Planted a seed'],
          [0],
          'A child dried it.',
        ),
        q(
          'feelings',
          'How did the cat most likely feel at the end?',
          ['More comfortable', 'Angry at a bird', 'Hungry for grass', 'Afraid of a fish'],
          [0],
          'It purred.',
        ),
        q(
          'key_detail',
          'Where did the cat run?',
          ['Inside', 'Up a tree', 'Into a pond', 'Down a hill'],
          [0],
          'A wet cat ran inside.',
        ),
      ],
    },
  },
  {
    id: 'placement-dog',
    level: 10,
    status: 'draft',
    story: {
      title: 'A drink for a dog',
      text: 'A dog was hot. A child gave it water. It drank and rested.',
      questions: [
        q(
          'word_in_context',
          'What does "rested" mean?',
          ['Took a break', 'Ran fast', 'Made a nest', 'Dug a hole'],
          [0],
          'It drank and rested.',
          'rested',
        ),
        q(
          'key_detail',
          'What did the child give the dog?',
          ['Water', 'A book', 'A coat', 'A bell'],
          [0],
          'A child gave it water.',
        ),
        q(
          'sequence',
          'What did the dog do before it rested?',
          ['Drank', 'Painted', 'Sang', 'Read'],
          [0],
          'It drank and rested.',
        ),
        q(
          'cause_effect',
          'Why did the child most likely give the dog water?',
          ['To help the hot dog', 'To teach it to fly', 'To make a new bell', 'To close a shop'],
          [0],
          'A dog was hot.',
        ),
        q(
          'key_detail',
          'How was the dog at first?',
          ['Hot', 'Blue', 'Lost in a boat', 'Covered in snow'],
          [0],
          'A dog was hot.',
        ),
      ],
    },
  },
  ...WALKTHROUGH_BANK.map((story, index) => ({
    id: `placement-yard-${index}`,
    level: 25,
    status: 'draft' as const,
    story,
  })),
  {
    id: 'placement-garden',
    level: 50,
    status: 'draft',
    story: {
      title: 'The bent plant',
      text: 'The class found a young plant bent near the school gate. A ball had rolled into its pot. One child lifted the stem while another pressed soil around it. They placed two sticks beside the plant and tied the stem loosely between them. The class moved the pot to a sheltered corner. The next morning, the leaves stood higher. The children smiled when they saw the change.',
      questions: [
        q(
          'word_in_context',
          'What does "sheltered" mean here?',
          ['Protected', 'Crowded', 'Painted', 'Far away'],
          [0],
          'The class moved the pot to a sheltered corner.',
          'sheltered',
        ),
        q(
          'key_detail',
          'Choose all the things placed beside the plant to support it.',
          ['Two sticks', 'Ties around the stem', 'A new ball', 'A school bell'],
          [0, 1],
          'They placed two sticks beside the plant and tied the stem loosely between them.',
        ),
        q(
          'sequence',
          'What happened before the pot was moved?',
          [
            'The stem was tied between sticks',
            'The leaves stood higher the next morning',
            'The class went on a boat',
            'A shop opened',
          ],
          [0],
          'They placed two sticks beside the plant and tied the stem loosely between them.',
        ),
        q(
          'cause_effect',
          'Why did the children most likely smile?',
          [
            'The plant looked better',
            'The gate was missing',
            'They lost their ball',
            'The pot had no soil',
          ],
          [0],
          'The next morning, the leaves stood higher.',
        ),
        q(
          'key_detail',
          'Where was the bent plant found?',
          ['Near the school gate', 'On a market roof', 'Inside a bus', 'At a beach'],
          [0],
          'The class found a young plant bent near the school gate.',
        ),
      ],
    },
  },
  {
    id: 'placement-lunch',
    level: 50,
    status: 'draft',
    story: {
      title: 'The quiet lunch table',
      text: 'A new child sat alone at lunch and looked at the other tables. Two classmates noticed the empty seats nearby. They brought their rice and fruit to the table and asked to sit down. At first, the new child only nodded. Then one classmate pointed to a funny shape in a cloud. Soon all three were laughing and talking about the sky. They agreed to sit together the next day.',
      questions: [
        q(
          'word_in_context',
          'What does "noticed" mean?',
          ['Saw and paid attention to', 'Carried away', 'Forgot', 'Covered up'],
          [0],
          'Two classmates noticed the empty seats nearby.',
          'noticed',
        ),
        q(
          'key_detail',
          'Choose all the food the classmates brought.',
          ['Rice', 'Fruit', 'Soup', 'Bread'],
          [0, 1],
          'They brought their rice and fruit to the table and asked to sit down.',
        ),
        q(
          'sequence',
          'What did the new child do at first?',
          ['Nodded', 'Ran to a bus', 'Started a song', 'Drew a map'],
          [0],
          'At first, the new child only nodded.',
        ),
        q(
          'feelings',
          'How did the new child most likely feel by the end?',
          [
            'More at ease with the classmates',
            'Angry about a lost bag',
            'Afraid of the table',
            'Bored with all food',
          ],
          [0],
          'Soon all three were laughing and talking about the sky.',
        ),
        q(
          'main_idea',
          'What is the story mostly about?',
          [
            'Helping a new child feel included',
            'Buying a new lunch table',
            'Learning to cook rice',
            'Moving a school gate',
          ],
          [0],
          'They agreed to sit together the next day.',
        ),
      ],
    },
  },
  {
    id: 'placement-market',
    level: 75,
    status: 'draft',
    story: {
      title: 'A place for the baskets',
      text: "The market was about to close when rain began to fall. A vendor had already packed most of the stall, but two baskets of vegetables still stood beside the road. A child who was waiting for a family member noticed water running towards them. The child called to the vendor instead of moving the heavy baskets alone. Together, they lifted the baskets onto a dry shelf. The vendor covered them with a clean cloth. When the rain grew stronger, the vegetables stayed dry. The child waited under the stall roof until a family member arrived. Before leaving, the child looked back at the shelf and smiled. A small warning had helped protect the last of the day's produce.",
      questions: [
        q(
          'word_in_context',
          'What does "produce" refer to here?',
          ['The vegetables', 'The roof', 'The road', 'The baskets themselves'],
          [0],
          "A small warning had helped protect the last of the day's produce.",
          'produce',
        ),
        q(
          'key_detail',
          'Choose all the things that helped keep the vegetables dry.',
          ['A dry shelf', 'A clean cloth', 'Water from the road', 'An open drain'],
          [0, 1],
          'The vendor covered them with a clean cloth.',
        ),
        q(
          'sequence',
          'What happened after the child called to the vendor?',
          [
            'They lifted the baskets together',
            'The market opened for the morning',
            'The child moved the baskets alone',
            'The road became a garden',
          ],
          [0],
          'Together, they lifted the baskets onto a dry shelf.',
        ),
        q(
          'cause_effect',
          'Why did the child call to the vendor?',
          [
            'The baskets were at risk from water and were heavy',
            'The child wanted the rain to stop at once',
            'The child had finished selling vegetables',
            'The vendor had asked for a new shelf',
          ],
          [0],
          'The child called to the vendor instead of moving the heavy baskets alone.',
        ),
        q(
          'main_idea',
          'Which idea best fits the whole story?',
          [
            'Noticing a problem and working together can help',
            'All vegetables must be grown indoors',
            'Markets should never close',
            'A cloth can stop rain everywhere',
          ],
          [0],
          "A small warning had helped protect the last of the day's produce.",
        ),
      ],
    },
  },
  {
    id: 'placement-tools',
    level: 75,
    status: 'draft',
    story: {
      title: 'The labelled shelf',
      text: 'The school garden club often lost time looking for its tools. A small rake might be under a bench, while a watering can waited beside the gate. During one meeting, a student suggested giving each tool a clear place. The club cleaned a shelf and drew simple labels for the rake and watering can. They used pictures as well as words so that younger members could follow the labels. At the next meeting, the tools were ready on the shelf. The club spent less time searching and more time caring for the plants. Before leaving, every member checked the labels and returned the tools. The shelf was a small change, but the group decided to keep using it.',
      questions: [
        q(
          'word_in_context',
          'What does "suggested" mean here?',
          ['Offered an idea', 'Hid a tool', 'Made a rule in secret', 'Refused to help'],
          [0],
          'During one meeting, a student suggested giving each tool a clear place.',
          'suggested',
        ),
        q(
          'key_detail',
          'Choose all the tools that received labels.',
          ['The rake', 'The watering can', 'A spade', 'A pair of scissors'],
          [0, 1],
          'The club cleaned a shelf and drew simple labels for the rake and watering can.',
        ),
        q(
          'sequence',
          'What did members do before leaving?',
          [
            'Returned the tools after checking the labels',
            'Threw away the shelf',
            'Moved the gate',
            'Stopped watering every plant',
          ],
          [0],
          'Before leaving, every member checked the labels and returned the tools.',
        ),
        q(
          'cause_effect',
          'Why were pictures added to the labels?',
          [
            'To help younger members use them',
            'To hide the tool names',
            'To make the tools heavier',
            'To replace the garden',
          ],
          [0],
          'They used pictures as well as words so that younger members could follow the labels.',
        ),
        q(
          'main_idea',
          'What is the main idea?',
          [
            'A shared system helped the club use its time well',
            'Tools should always be kept outdoors',
            'Only older members can care for plants',
            'Pictures are useful only for decoration',
          ],
          [0],
          'The shelf was a small change, but the group decided to keep using it.',
        ),
      ],
    },
  },
  {
    id: 'placement-library',
    level: 90,
    status: 'draft',
    story: {
      title: 'Making room for readers',
      text: 'The community reading room had a shelf of useful books, but few children stayed for long. The tables were crowded with boxes, and the only clear seats faced a noisy road. A group of students asked visitors what made reading there difficult. Several said they could not find a quiet place to sit. Others had trouble locating books that matched their interests. Rather than buying new furniture at once, the students tested a smaller change. They moved the boxes into a cupboard and turned two tables towards the garden. They also made a simple guide showing where stories and information books could be found. For a week, they watched how the room was used and asked readers for comments. More visitors stayed to finish a chapter, although some still wanted better lighting. The students wrote down that request for the next meeting. Their first changes did not solve every problem, but listening to readers had helped them choose a useful place to begin.',
      questions: [
        q(
          'word_in_context',
          'What does "locating" mean here?',
          ['Finding', 'Rewriting', 'Buying', 'Forgetting'],
          [0],
          'Others had trouble locating books that matched their interests.',
          'locating',
        ),
        q(
          'key_detail',
          'Choose all the kinds of books shown in the guide.',
          ['Stories', 'Information books', 'Only cooking books', 'Only travel maps'],
          [0, 1],
          'They also made a simple guide showing where stories and information books could be found.',
        ),
        q(
          'sequence',
          'What did the students do before changing the room?',
          [
            'Asked visitors about reading difficulties',
            'Bought new furniture',
            'Closed the garden',
            'Moved every book outside',
          ],
          [0],
          'A group of students asked visitors what made reading there difficult.',
        ),
        q(
          'conclusion',
          'What does the remaining request for lighting suggest?',
          [
            'Further improvements could still be useful',
            'The changes had made every reader leave',
            'There were no books in the room',
            'The visitors had never been asked for comments',
          ],
          [0],
          'More visitors stayed to finish a chapter, although some still wanted better lighting.',
        ),
        q(
          'main_idea',
          'Which statement best sums up the passage?',
          [
            'Listening and testing small changes helped improve a reading space',
            'Every problem requires new furniture',
            'Readers all prefer exactly the same space',
            'One change always solves every problem',
          ],
          [0],
          'Their first changes did not solve every problem, but listening to readers had helped them choose a useful place to begin.',
        ),
      ],
    },
  },
  {
    id: 'placement-water',
    level: 90,
    status: 'draft',
    story: {
      title: 'A fair way to water',
      text: 'Two classes shared a vegetable garden behind the school. Each class wanted to care for the plants, yet the watering was uneven. Some beds were watered twice in one morning, while others stayed dry. At first, students assumed that the other class had forgotten its turn. When the groups compared their notes, they found that both had been following different schedules. They decided to make one chart that everyone could see. The chart named each garden bed and showed which class would water it that day. After watering, a student marked the space beside the bed. The classes also agreed to check the soil before adding more water, especially after rain. During the next week, they kept the chart near the garden gate and reviewed it together on Friday. The plants did not change overnight, but the students noticed fewer missed beds and less repeated work. What had looked like a lack of care was mostly a problem of shared information. A clear plan helped both groups contribute.',
      questions: [
        q(
          'word_in_context',
          'What does "contribute" mean in this passage?',
          ['Take part and help', 'Stay away', 'Compete for a prize', 'Remove the garden'],
          [0],
          'A clear plan helped both groups contribute.',
          'contribute',
        ),
        q(
          'key_detail',
          'Choose all the information shown on the chart.',
          [
            'The garden beds',
            'Which class would water each day',
            "Every student's home address",
            'The price of the vegetables',
          ],
          [0, 1],
          'The chart named each garden bed and showed which class would water it that day.',
        ),
        q(
          'sequence',
          'What did a student do after watering?',
          [
            'Marked the space beside the bed',
            'Threw the chart away',
            'Changed every plant',
            'Closed the school',
          ],
          [0],
          'After watering, a student marked the space beside the bed.',
        ),
        q(
          'conclusion',
          'What did comparing notes help the groups understand?',
          [
            'They had different schedules rather than a simple lack of care',
            'Neither class wanted a garden',
            'The plants could grow without water',
            'The chart was already in use',
          ],
          [0],
          'When the groups compared their notes, they found that both had been following different schedules.',
        ),
        q(
          'main_idea',
          'What is the main idea?',
          [
            'Shared information made joint work easier',
            'One class should own every garden',
            'A chart makes plants grow overnight',
            'Rain removes the need for any plan',
          ],
          [0],
          'What had looked like a lack of care was mostly a problem of shared information.',
        ),
      ],
    },
  },
];
