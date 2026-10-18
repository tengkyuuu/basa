import type { LearningQuestion, SubSkill } from '@basabridge/contracts';
import type { PlacementCandidate } from './placement-bank';
type Q = (
  skill: SubSkill,
  question: string,
  options: [string, string, string, string],
  answers: number[],
  evidence: string,
  word?: string | null,
) => LearningQuestion;
/** Additional authored forms remain drafts and require the same fingerprint review. */
export function additionalPlacement(q: Q): PlacementCandidate[] {
  return [
    {
      id: 'placement-message',
      level: 35,
      status: 'draft',
      story: {
        title: 'A message at the gate',
        text: 'The class trip moved to Friday. A note at the gate still said Thursday. A child saw the old date and told the teacher. They replaced the note with a clear sign. The new sign showed the day and the time. Before going home, the class checked that both notes now gave the same date.',
        questions: [
          q(
            'word_in_context',
            'What does "replaced" mean here?',
            [
              'Put a new note in place of the old one',
              'Read the old note again',
              'Hid the gate behind a sign',
              'Moved the trip back to Thursday',
            ],
            [0],
            'They replaced the note with a clear sign.',
            'replaced',
          ),
          q(
            'key_detail',
            'Choose all the information on the new sign.',
            ['The day', 'The time', 'The cost of a new gate', 'The name of every parent'],
            [0, 1],
            'The new sign showed the day and the time.',
          ),
          q(
            'sequence',
            'What did the child do after seeing the old date?',
            ['Told the teacher', 'Went on the trip', 'Closed the gate', 'Erased every note'],
            [0],
            'A child saw the old date and told the teacher.',
          ),
          q(
            'cause_effect',
            'Why did they need a new note?',
            [
              'The old note gave the wrong day',
              'The gate had fallen down',
              'The trip had been cancelled',
              'No one could find a teacher',
            ],
            [0],
            'A note at the gate still said Thursday.',
          ),
          q(
            'conclusion',
            'What did their final check help prevent?',
            [
              'People receiving different dates',
              'All trips taking place on Friday',
              'The gate opening in the morning',
              'Children reading signs at home',
            ],
            [0],
            'Before going home, the class checked that both notes now gave the same date.',
          ),
        ],
      },
    },
    {
      id: 'placement-shared-path',
      level: 60,
      status: 'draft',
      story: {
        title: 'Room along the path',
        text: 'A class set up tables for a small book fair. At first, the tables filled the path beside the hall. A visitor with a cart could not pass without moving the books. The children paused their work and measured a clear lane through the middle. They moved two tables closer to the wall and placed signs where readers could queue. This left fewer spaces for books, but people could reach every table safely. After the fair opened, the class watched the lane. When a box slipped into it, a child moved the box back under a table.',
        questions: [
          q(
            'word_in_context',
            'What does "queue" mean in this passage?',
            ['Wait in a line', 'Carry a cart', 'Cover a table', 'Pack away books'],
            [0],
            'They moved two tables closer to the wall and placed signs where readers could queue.',
            'queue',
          ),
          q(
            'key_detail',
            'Choose all the changes the children made.',
            [
              'Moved two tables toward the wall',
              'Placed signs for waiting readers',
              'Closed the fair before it opened',
              'Removed every book from sale',
            ],
            [0, 1],
            'They moved two tables closer to the wall and placed signs where readers could queue.',
          ),
          q(
            'sequence',
            'What happened after the fair opened?',
            [
              'The children watched whether the lane stayed clear',
              'They first filled the path with tables',
              'The visitor first arrived with a cart',
              'They decided no one could enter',
            ],
            [0],
            'After the fair opened, the class watched the lane.',
          ),
          q(
            'cause_effect',
            'Why did the class change the table layout?',
            [
              'A visitor could not pass through easily',
              'The books had all been sold',
              'The hall wall had disappeared',
              'The signs were too expensive',
            ],
            [0],
            'A visitor with a cart could not pass without moving the books.',
          ),
          q(
            'conclusion',
            'Which conclusion best fits their actions?',
            [
              'They treated clear access as something to maintain',
              'They believed a clear lane could never become blocked',
              'They cared only about fitting in more books',
              'They expected all visitors to move the tables themselves',
            ],
            [0],
            'When a box slipped into it, a child moved the box back under a table.',
          ),
        ],
      },
    },
    {
      id: 'placement-cool-room',
      level: 85,
      status: 'draft',
      story: {
        title: 'Testing a cooler room',
        text: 'The class wanted to make its reading corner cooler in the afternoon. One group suggested closing every window to keep warm air out. Another suggested opening windows on opposite sides so air could move through the room. Rather than arguing from memory, they agreed to compare the two setups. On the first day, the windows stayed closed. On the second, the windows were open, and several learners said the room felt cooler. Then someone noticed that the second day had also been cloudy. That difference made the result harder to explain. The teacher asked what else they could record. The class added the outside temperature, cloud cover, and time of each reading to its notes. They also agreed to repeat both setups on several days. The first comparison had not settled the question, but it had shown them how to ask it more carefully. Their new chart had room for unexpected results as well as results that matched their hopes.',
        questions: [
          q(
            'word_in_context',
            'What does "setups" refer to here?',
            [
              'The different window arrangements',
              'The learners assigned to each chair',
              'The books chosen for reading',
              'The dates printed on a calendar',
            ],
            [0],
            'On the first day, the windows stayed closed.',
            'setups',
          ),
          q(
            'key_detail',
            'Choose all the details added to the notes.',
            [
              'Outside temperature',
              'Cloud cover',
              'The cost of each book',
              "The learners' home addresses",
            ],
            [0, 1],
            'The class added the outside temperature, cloud cover, and time of each reading to its notes.',
          ),
          q(
            'cause_effect',
            'Why was the second day not a clear test of the window change alone?',
            [
              'The weather was different too',
              'The class had used the same setup twice',
              'No one had entered the room',
              'The windows had been removed permanently',
            ],
            [0],
            'Then someone noticed that the second day had also been cloudy.',
          ),
          q(
            'prediction',
            'Which next action follows their revised plan?',
            [
              'Repeat both arrangements and record the conditions',
              'Keep only observations that support open windows',
              'Declare the first result final',
              'Stop making notes after a cloudy day',
            ],
            [0],
            'They also agreed to repeat both setups on several days.',
          ),
          q(
            'main_idea',
            'What is the passage mainly showing?',
            [
              'Improving an investigation after noticing another possible explanation',
              'Proving that closing windows always cools a room',
              'Choosing books based on the temperature',
              'Replacing classroom discussion with a guess',
            ],
            [0],
            'The first comparison had not settled the question, but it had shown them how to ask it more carefully.',
          ),
        ],
      },
    },
    {
      id: 'placement-community-map',
      level: 100,
      status: 'draft',
      story: {
        title: 'A map with room for questions',
        text: 'The school invited families to help make a map of useful places near the campus. The first draft marked a clinic, a water point, and a covered waiting area. A neat line showed the shortest route between them. During a walk to check the map, a volunteer found that the line crossed a narrow bridge with steps at both ends. A person pushing a cart would need a different route. Another volunteer noticed that the water point was closed on some afternoons, although the draft made it look available all day. These discoveries did not make the map worthless. They revealed where a simple picture could hide important limits. The group added notes about steps and opening hours. It also drew a longer route that stayed on level ground. Some members worried that the extra details would make the map crowded. Others argued that a clean page was not useful if it led someone to a closed gate. They agreed to test the revised map with people who had not helped draw it. Those readers would explain which route they chose and what information they still needed. Instead of calling the next version complete, the group left a small space for corrections. The map was becoming a shared account of a place, not a promise that every journey would be the same.',
        questions: [
          q(
            'word_in_context',
            'What does "limits" mean in the passage?',
            [
              'Conditions that restrict how the map can be used',
              'The outer edge of every printed page',
              'Rules preventing any correction',
              'The exact distance between every building',
            ],
            [0],
            'They revealed where a simple picture could hide important limits.',
            'limits',
          ),
          q(
            'key_detail',
            'Choose all the limitations discovered during the walk.',
            [
              'Steps at both ends of a bridge',
              'A water point closed on some afternoons',
              'A clinic that had never existed',
              'A waiting area that required a ticket',
            ],
            [0, 1],
            'A person pushing a cart would need a different route.',
          ),
          q(
            'cause_effect',
            'Why was a longer route added?',
            [
              'It stayed on level ground for people who could not use the steps',
              'It guaranteed that the water point was always open',
              'It made every journey shorter',
              'It removed the need to check opening hours',
            ],
            [0],
            'It also drew a longer route that stayed on level ground.',
          ),
          q(
            'prediction',
            'Which feedback would most directly help their next test?',
            [
              'Readers explaining route choices and missing information',
              'Only the number of colours used on the map',
              'A vote by the original artists without new readers',
              'A statement that no correction should be allowed',
            ],
            [0],
            'Those readers would explain which route they chose and what information they still needed.',
          ),
          q(
            'conclusion',
            'Which conclusion is best supported?',
            [
              'The map should communicate different access needs and remain open to correction',
              'The shortest route is suitable for every reader',
              'Every detail should be removed to keep the page clean',
              'Testing is unnecessary after a map looks neat',
            ],
            [0],
            'The map was becoming a shared account of a place, not a promise that every journey would be the same.',
          ),
        ],
      },
    },
  ];
}
