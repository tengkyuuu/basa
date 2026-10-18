import type { Scenario } from './content';
import type { LessonSubject } from './index';
type Skills = Exclude<LessonSubject, 'decoding' | 'word_practice'>;
type Case = { passage: string; questions: Record<Skills, Scenario> };
// Authored draft practice contexts. Each lesson uses four distinct passages.
// Sharing a context across lessons is deliberate; ordinary-story rechecks remain fresh.
function context(
  passage: string,
  questions: Record<
    Skills,
    readonly [string, readonly [string, string, string, string], string, string?]
  >,
): Case {
  return {
    passage,
    questions: Object.fromEntries(
      Object.entries(questions).map(([skill, [question, options, evidence, word]]) => [
        skill,
        [passage, question, options, evidence, word],
      ]),
    ) as unknown as Record<Skills, Scenario>,
  };
}
const middle = [
  context(
    'The class planned to grow beans. The first tray stood in a dim corner, where little light reached it. The children moved it beside the window and reused an old watering can. After a week, the seedlings leaned toward the bright glass. They decided to turn the tray each morning.',
    {
      word_in_context: [
        'What does "dim" mean here?',
        ['Not very bright', 'Very crowded', 'Extremely warm', 'Freshly cleaned'],
        'The first tray stood in a dim corner, where little light reached it.',
        'dim',
      ],
      word_parts: [
        'What does re- add to "reused"?',
        ['Used again', 'Used carelessly', 'Stopped using', 'Used before anyone else'],
        'The children moved it beside the window and reused an old watering can.',
        'reused',
      ],
      key_detail: [
        'Where did the children move the tray?',
        ['Beside the window', 'Under a table', 'Outside the gate', 'Into a cupboard'],
        'The children moved it beside the window and reused an old watering can.',
      ],
      sequence: [
        'What happened just before they decided to turn the tray?',
        [
          'They saw seedlings leaning toward the glass',
          'They bought a new watering can',
          'They put beans into a cupboard',
          'They harvested the beans',
        ],
        'After a week, the seedlings leaned toward the bright glass.',
      ],
      main_idea: [
        'What is the passage mainly about?',
        [
          'Adjusting a growing setup after watching the plants',
          'Buying equipment for a new classroom',
          'Choosing which beans to cook',
          'Finding a missing window',
        ],
        'They decided to turn the tray each morning.',
      ],
      cause_effect: [
        'Why was the window a better place for the tray?',
        [
          'More light could reach the plants',
          'It stopped the plants needing water',
          'The glass supplied soil',
          'It kept the tray completely dark',
        ],
        'The first tray stood in a dim corner, where little light reached it.',
      ],
      feelings: [
        'Which description best fits the children at the end?',
        [
          'Interested in helping the plants grow evenly',
          'Angry that the beans had disappeared',
          'Bored with observing anything',
          'Certain that plants need no care',
        ],
        'They decided to turn the tray each morning.',
      ],
      prediction: [
        'What will they most likely do the next morning?',
        [
          'Change the direction the tray faces',
          'Throw away every seedling',
          'Put the tray back in darkness',
          'Sell the classroom window',
        ],
        'They decided to turn the tray each morning.',
      ],
      conclusion: [
        'Which conclusion is supported?',
        [
          'The children used observations to change their care',
          'The plants grew without any light',
          'The class had finished harvesting',
          'New tools were required for every task',
        ],
        'After a week, the seedlings leaned toward the bright glass.',
      ],
    },
  ),
  context(
    'The school library received a box of donated books. Several covers were torn, but the pages were readable. A volunteer carefully repaired the covers with reusable tape. Before putting the books on the shelf, the class sorted them by subject. A small sign explained where each group belonged.',
    {
      word_in_context: [
        'What does "readable" mean here?',
        [
          'Still possible to read',
          'Ready to throw away',
          'Written in a secret code',
          'Too expensive to borrow',
        ],
        'Several covers were torn, but the pages were readable.',
        'readable',
      ],
      word_parts: [
        'What does -able suggest in "reusable"?',
        ['Able to be used again', 'Impossible to use', 'Used only once', 'Used without permission'],
        'A volunteer carefully repaired the covers with reusable tape.',
        'reusable',
      ],
      key_detail: [
        'How did the class sort the books?',
        ['By subject', 'By price', 'By donor age', 'By tape colour'],
        'Before putting the books on the shelf, the class sorted them by subject.',
      ],
      sequence: [
        'What did the class do before shelving the books?',
        [
          'Sorted them by subject',
          'Removed all their pages',
          'Returned every donation',
          'Closed the library forever',
        ],
        'Before putting the books on the shelf, the class sorted them by subject.',
      ],
      main_idea: [
        'Which statement best captures the passage?',
        [
          'Donated books were repaired and organized for use',
          'Every damaged book had to be discarded',
          'A class learned to manufacture tape',
          'A library replaced its shelves',
        ],
        'A volunteer carefully repaired the covers with reusable tape.',
      ],
      cause_effect: [
        'What was the sign intended to help readers do?',
        [
          'Find the correct group of books',
          'Pay for damaged covers',
          'Choose the oldest volunteer',
          'Repair the library roof',
        ],
        'A small sign explained where each group belonged.',
      ],
      feelings: [
        'How would a reader seeking a subject likely feel about the sign?',
        [
          'Helped by the clear directions',
          'Angry that all pages were missing',
          'Certain every book was new',
          'Confused because no groups existed',
        ],
        'A small sign explained where each group belonged.',
      ],
      prediction: [
        'What would a volunteer probably do with another readable book with a torn cover?',
        [
          'Consider repairing its cover',
          'Discard it without checking',
          'Remove all the readable pages',
          'Hide it from the library',
        ],
        'Several covers were torn, but the pages were readable.',
      ],
      conclusion: [
        'Which conclusion fits the evidence?',
        [
          'A damaged cover did not make a book useless',
          'All donations were in perfect condition',
          'Books were organized by their owners',
          'The library allowed no borrowing',
        ],
        'Several covers were torn, but the pages were readable.',
      ],
    },
  ),
  context(
    'A sudden shower interrupted the market cleanup. The workers sheltered the dry paper in a covered stall because wet paper was difficult to reuse. Once the rain eased, they unfolded sacks and collected bottles along the path. They left a clear lane so shoppers could still pass safely.',
    {
      word_in_context: [
        'What does "eased" mean here?',
        ['Became less heavy', 'Changed into wind', 'Started unexpectedly', 'Flooded every stall'],
        'Once the rain eased, they unfolded sacks and collected bottles along the path.',
        'eased',
      ],
      word_parts: [
        'What does un- tell you in "unfolded"?',
        [
          'They reversed the folded state',
          'They folded the sacks more tightly',
          'They made new sacks',
          'They lost the sacks',
        ],
        'Once the rain eased, they unfolded sacks and collected bottles along the path.',
        'unfolded',
      ],
      key_detail: [
        'Where did workers shelter the dry paper?',
        ['In a covered stall', 'In an open puddle', 'Inside every bottle', 'Across the clear lane'],
        'The workers sheltered the dry paper in a covered stall because wet paper was difficult to reuse.',
      ],
      sequence: [
        'What happened after the rain became lighter?',
        [
          'Workers collected bottles',
          'The shower first interrupted work',
          'Every stall was closed permanently',
          'The paper was deliberately soaked',
        ],
        'Once the rain eased, they unfolded sacks and collected bottles along the path.',
      ],
      main_idea: [
        'What is the central idea?',
        [
          'Workers adapted their cleanup to rain and shoppers',
          'Rain prevented all further work',
          'Shoppers were asked to leave the market',
          'Paper was the only material collected',
        ],
        'They left a clear lane so shoppers could still pass safely.',
      ],
      cause_effect: [
        'Why did the workers protect the dry paper?',
        [
          'Wet paper was difficult to reuse',
          'Bottles had to stay dry',
          'Paper was needed to block the lane',
          'The sacks could not be unfolded',
        ],
        'The workers sheltered the dry paper in a covered stall because wet paper was difficult to reuse.',
      ],
      feelings: [
        'Which attitude do their actions suggest?',
        [
          'Consideration for people using the path',
          'Annoyance at anyone entering the market',
          'Indifference to keeping materials usable',
          'A wish to stop the cleanup permanently',
        ],
        'They left a clear lane so shoppers could still pass safely.',
      ],
      prediction: [
        'If a shopper approaches, which route can they likely use?',
        [
          'The lane left clear',
          'Only the covered paper stack',
          'A closed roof',
          'A path the passage says was removed',
        ],
        'They left a clear lane so shoppers could still pass safely.',
      ],
      conclusion: [
        'Which conclusion is supported?',
        [
          'The cleanup continued while access was protected',
          'The rain destroyed all market stalls',
          'The workers collected no bottles',
          'Every shopper helped carry paper',
        ],
        'Once the rain eased, they unfolded sacks and collected bottles along the path.',
      ],
    },
  ),
  context(
    'The class prepared a simple weather chart. One learner recorded the sky each morning, while another checked the rain gauge. Their first labels were unclear, so they rewrote them in larger letters. At the end of the week, they compared the entries instead of relying on memory.',
    {
      word_in_context: [
        'What does "entries" refer to?',
        [
          'The recorded weather information',
          'The classroom doorways',
          'The names of new students',
          'The empty rain gauges',
        ],
        'At the end of the week, they compared the entries instead of relying on memory.',
        'entries',
      ],
      word_parts: [
        'What does re- mean in "rewrote"?',
        ['Wrote again', 'Wrote backwards', 'Refused to write', 'Wrote without looking'],
        'Their first labels were unclear, so they rewrote them in larger letters.',
        'rewrote',
      ],
      key_detail: [
        'What did the second learner check?',
        ['The rain gauge', 'The market price', 'The library shelf', 'The classroom clock'],
        'One learner recorded the sky each morning, while another checked the rain gauge.',
      ],
      sequence: [
        'Which action came after finding the labels unclear?',
        [
          'Writing larger labels',
          'Comparing a full year of entries',
          'Removing the rain gauge',
          'Ending all observations',
        ],
        'Their first labels were unclear, so they rewrote them in larger letters.',
      ],
      main_idea: [
        'What best summarizes the passage?',
        [
          'Making useful weather records and improving their clarity',
          'Predicting weather without collecting information',
          'Learning why memory never fails',
          'Measuring every classroom object',
        ],
        'At the end of the week, they compared the entries instead of relying on memory.',
      ],
      cause_effect: [
        'Why were the labels rewritten?',
        [
          'The first ones were difficult to understand',
          'The chart had become unnecessary',
          'The rain gauge was missing',
          'No observations had been made',
        ],
        'Their first labels were unclear, so they rewrote them in larger letters.',
      ],
      feelings: [
        'Which attitude best fits the class?',
        [
          'Careful about making records useful',
          'Unwilling to compare information',
          'Certain that guesses were enough',
          'Angry about using larger letters',
        ],
        'At the end of the week, they compared the entries instead of relying on memory.',
      ],
      prediction: [
        'What would help the class compare next week with this week?',
        [
          'Continue recording in the same chart format',
          'Erase the existing entries',
          'Rely only on a vague memory',
          'Remove all dates from the records',
        ],
        'At the end of the week, they compared the entries instead of relying on memory.',
      ],
      conclusion: [
        'What can we conclude?',
        [
          'Written observations supported their comparison',
          'The chart proved it would never rain again',
          'Only one learner did all the work',
          'The first labels needed no improvement',
        ],
        'At the end of the week, they compared the entries instead of relying on memory.',
      ],
    },
  ),
];
const advanced = [
  context(
    'The reading club wanted a quieter meeting place. Its first proposal was to reserve the library for the entire afternoon, but younger pupils also needed the room. The members reconsidered their plan. They proposed a shorter meeting after the busiest borrowing period and offered to return the chairs afterward. The librarian called this a workable compromise: neither group received everything it wanted, but both retained access. Before confirming the arrangement, she asked them to try it for a week and record any clashes.',
    {
      word_in_context: [
        'What does "compromise" mean in this situation?',
        [
          'An arrangement in which both groups accept some limits',
          'A decision that excludes all younger pupils',
          'A promise that no schedule can ever change',
          'A method for doubling the number of rooms',
        ],
        'neither group received everything it wanted, but both retained access.',
        'compromise',
      ],
      word_parts: [
        'What does re- contribute to "reconsidered"?',
        [
          'Considering the plan again',
          'Considering only the librarian',
          'Refusing every proposal',
          'Making a plan permanent',
        ],
        'The members reconsidered their plan.',
        'reconsidered',
      ],
      key_detail: [
        'What was required before the arrangement was confirmed?',
        [
          'A week-long trial with clashes recorded',
          'A vote to close the library',
          'A purchase of new chairs',
          'A promise to stop borrowing books',
        ],
        'Before confirming the arrangement, she asked them to try it for a week and record any clashes.',
      ],
      sequence: [
        'Which event followed the original proposal?',
        [
          'The members revised the plan after recognizing another need',
          'The library immediately became permanently reserved',
          'The trial finished before a new proposal existed',
          'The chairs were removed from the school',
        ],
        'The members reconsidered their plan.',
      ],
      main_idea: [
        'Which summary preserves the central reasoning?',
        [
          'A club revised an exclusive proposal into a shared arrangement to be tested',
          'The librarian rejected every possible meeting time',
          'Younger pupils were the only group allowed in the library',
          'A club solved noise by reserving the room all afternoon',
        ],
        'The librarian called this a workable compromise: neither group received everything it wanted, but both retained access.',
      ],
      cause_effect: [
        'Why was the first proposal reconsidered?',
        [
          'It conflicted with younger pupils needing the same room',
          'The members no longer wanted to meet',
          'The librarian required new furniture',
          'Borrowing had ended for the year',
        ],
        'Its first proposal was to reserve the library for the entire afternoon, but younger pupils also needed the room.',
      ],
      feelings: [
        'Which attitude is most consistent with the librarian requesting a trial?',
        [
          'Cautious openness to a plan that might need adjustment',
          'Complete certainty that no clash could occur',
          'Hostility toward every reading activity',
          'Indifference to whether either group can enter',
        ],
        'Before confirming the arrangement, she asked them to try it for a week and record any clashes.',
      ],
      prediction: [
        'If clashes recur during the trial, what would fit the approach described?',
        [
          'Revisit the meeting time using the recorded clashes',
          'Declare the trial unnecessary and discard its records',
          'Ban younger pupils without discussing alternatives',
          'Assume the first proposal must have been perfect',
        ],
        'Before confirming the arrangement, she asked them to try it for a week and record any clashes.',
      ],
      conclusion: [
        'Which conclusion is justified without going beyond the passage?',
        [
          'The arrangement is promising but has not yet been confirmed',
          'The trial has already proved that sharing always works',
          'The club has exclusive afternoon access forever',
          'Returning chairs prevents every scheduling conflict',
        ],
        'Before confirming the arrangement, she asked them to try it for a week and record any clashes.',
      ],
    },
  ),
  context(
    'A group compared two ways of watering a garden. Plants near the tap received water daily; plants farther away received it only when someone remembered to carry a bucket. The first group grew taller. One learner attributed the difference to location alone. Another pointed out that the watering schedule was inconsistent, so the comparison could not separate the effects. They redesigned the observation: use similar plants, give equal amounts of water, and record how much sunlight each area received. They described their first result as a clue rather than proof.',
    {
      word_in_context: [
        'What does "attributed" mean here?',
        [
          'Treated something as the cause',
          'Measured the exact height',
          'Changed the position of',
          'Recorded without explaining',
        ],
        'One learner attributed the difference to location alone.',
        'attributed',
      ],
      word_parts: [
        'What does in- indicate in "inconsistent"?',
        [
          'Not consistent',
          'Consistent again',
          'More consistent than before',
          'Consistent in every location',
        ],
        'Another pointed out that the watering schedule was inconsistent, so the comparison could not separate the effects.',
        'inconsistent',
      ],
      key_detail: [
        'Which condition was included in the redesigned observation?',
        [
          'Equal amounts of water',
          'Water only when remembered',
          'Different kinds of plants in each area',
          'Sunlight deliberately left unrecorded',
        ],
        'They redesigned the observation: use similar plants, give equal amounts of water, and record how much sunlight each area received.',
      ],
      sequence: [
        'What happened immediately before redesigning the observation?',
        [
          'A learner identified the unequal watering schedule',
          'The group proved that location alone caused growth',
          'All plants were removed from the garden',
          'The redesigned experiment was completed',
        ],
        'Another pointed out that the watering schedule was inconsistent, so the comparison could not separate the effects.',
      ],
      main_idea: [
        'Which statement best captures the reasoning?',
        [
          'A comparison was revised because more than one condition differed',
          'Plants near taps always grow taller regardless of care',
          'A single height measurement settled every question',
          'Recording sunlight made equal watering unnecessary',
        ],
        'They described their first result as a clue rather than proof.',
      ],
      cause_effect: [
        'Why could the first comparison not isolate location?',
        [
          'Watering frequency also differed between groups',
          'Every plant received identical care',
          'The plants had already stopped growing',
          'No learner had noticed a height difference',
        ],
        'Another pointed out that the watering schedule was inconsistent, so the comparison could not separate the effects.',
      ],
      feelings: [
        'Which attitude does "a clue rather than proof" suggest?',
        [
          'Willingness to investigate without overstating certainty',
          'Embarrassment that makes further observation impossible',
          'Confidence that no more data is needed',
          'Disinterest in the reason plants grew differently',
        ],
        'They described their first result as a clue rather than proof.',
      ],
      prediction: [
        'Which next action best follows their revised plan?',
        [
          'Record sunlight while keeping watering amounts equal',
          'Return to watering only when someone remembers',
          'Change plant types and water amounts together',
          'Announce the cause without further observation',
        ],
        'They redesigned the observation: use similar plants, give equal amounts of water, and record how much sunlight each area received.',
      ],
      conclusion: [
        'Which conclusion is supported?',
        [
          'The initial result cannot establish location as the only cause',
          'Location has been proved to have no effect',
          'Daily watering guarantees every plant will survive',
          'The revised observations have already been completed',
        ],
        'Another pointed out that the watering schedule was inconsistent, so the comparison could not separate the effects.',
      ],
    },
  ),
  context(
    'The student council proposed replacing paper notices with a shared online board. This would reduce repeated printing, but some families had unreliable internet access. Rather than treating silence as agreement, the council asked how people currently received announcements. Several pupils relied on a notice beside the school gate. The revised proposal kept that notice and added the online board. A member explained that efficiency should include reaching people, not simply using less paper. The council planned to compare missed announcements before deciding whether further changes were useful.',
    {
      word_in_context: [
        'What does "efficiency" include in the revised proposal?',
        [
          'Using resources sensibly while still reaching people',
          'Eliminating every printed notice regardless of access',
          'Making the online board available to council members only',
          'Counting silence as approval',
        ],
        'A member explained that efficiency should include reaching people, not simply using less paper.',
        'efficiency',
      ],
      word_parts: [
        'How does un- affect "unreliable"?',
        [
          'It means access cannot be consistently relied on',
          'It means access has become reliable again',
          'It means access is faster than all alternatives',
          'It means access is reserved for teachers',
        ],
        'This would reduce repeated printing, but some families had unreliable internet access.',
        'unreliable',
      ],
      key_detail: [
        'What did the revised proposal retain?',
        [
          'The notice beside the school gate',
          'Only repeated classroom printing',
          'A council-only message system',
          'A rule against asking families',
        ],
        'The revised proposal kept that notice and added the online board.',
      ],
      sequence: [
        'What informed the revision?',
        [
          'Asking how people received announcements',
          'Assuming that every family had reliable access',
          'Removing the gate notice before seeking information',
          'Counting fewer missed announcements after a completed trial',
        ],
        'Rather than treating silence as agreement, the council asked how people currently received announcements.',
      ],
      main_idea: [
        'Which summary best reflects the whole passage?',
        [
          'A resource-saving plan was adjusted to preserve access to information',
          'The council abandoned every online tool as unusable',
          'Families were required to obtain new internet connections',
          'Using less paper was treated as the only meaningful goal',
        ],
        'The revised proposal kept that notice and added the online board.',
      ],
      cause_effect: [
        'Why was an online-only approach insufficient?',
        [
          'Some families could not rely on internet access',
          'Every pupil disliked reading printed text',
          'The gate notice had no readers',
          'The council had already measured perfect online reach',
        ],
        'This would reduce repeated printing, but some families had unreliable internet access.',
      ],
      feelings: [
        'Which attitude is reflected by asking instead of treating silence as agreement?',
        [
          'Respect for needs that may not yet have been expressed',
          'Certainty that absent responses mean approval',
          'Annoyance at anyone using paper',
          'A wish to avoid hearing different experiences',
        ],
        'Rather than treating silence as agreement, the council asked how people currently received announcements.',
      ],
      prediction: [
        'What finding would support keeping both notice methods?',
        [
          'Fewer missed announcements with both methods available',
          'A lower paper count with more people missing notices',
          'No information about who received the messages',
          'A decision made before examining any result',
        ],
        'The council planned to compare missed announcements before deciding whether further changes were useful.',
      ],
      conclusion: [
        'Which conclusion is justified?',
        [
          'The council considered access as well as printing use',
          'The online board has already reached every family',
          'The gate notice is certain to remain forever',
          'A silent family has agreed to the proposal',
        ],
        'A member explained that efficiency should include reaching people, not simply using less paper.',
      ],
    },
  ),
  context(
    'A community display described a bridge as the oldest structure in the area. While checking a donated notebook, volunteers found a reference to an earlier wooden crossing nearby. The note was incomplete: it gave a season but no year, and the writer might have meant a different stream. The volunteers preserved the note and revised the display to say that the present bridge was the oldest surviving structure they had verified. They also listed the unanswered questions. Correcting the wording did not diminish the bridge; it made the claim more precise.',
    {
      word_in_context: [
        'What does "verified" mean in this context?',
        [
          'Checked and supported with evidence',
          'Repeated until familiar',
          'Assumed because it sounded impressive',
          'Described without checking',
        ],
        'the present bridge was the oldest surviving structure they had verified.',
        'verified',
      ],
      word_parts: [
        'What does in- signal in "incomplete"?',
        [
          'Not complete',
          'Complete again',
          'More complete than required',
          'Complete in every detail',
        ],
        'The note was incomplete: it gave a season but no year, and the writer might have meant a different stream.',
        'incomplete',
      ],
      key_detail: [
        'Which piece of information was missing from the note?',
        [
          'The year',
          'Any mention of a crossing',
          'Any seasonal reference',
          'The fact that the display existed',
        ],
        'The note was incomplete: it gave a season but no year, and the writer might have meant a different stream.',
      ],
      sequence: [
        'What did the volunteers do after finding the uncertain reference?',
        [
          'Preserved it and narrowed the display claim',
          'Destroyed it to protect the original display',
          'Announced an exact construction year',
          'Removed every unanswered question',
        ],
        'The volunteers preserved the note and revised the display to say that the present bridge was the oldest surviving structure they had verified.',
      ],
      main_idea: [
        'Which statement best captures the passage?',
        [
          'A historical claim was made more precise when uncertain evidence appeared',
          'A notebook conclusively dated every bridge in the area',
          'Volunteers rejected all evidence that complicated the display',
          'A wooden crossing was rebuilt during the project',
        ],
        'Correcting the wording did not diminish the bridge; it made the claim more precise.',
      ],
      cause_effect: [
        'Why could the notebook not settle the question by itself?',
        [
          'Its date and location were uncertain',
          'It contained no reference to a crossing',
          'It had already been proved false',
          'It was written after the display was revised',
        ],
        'The note was incomplete: it gave a season but no year, and the writer might have meant a different stream.',
      ],
      feelings: [
        'Which attitude best describes the volunteers?',
        [
          'Careful about distinguishing knowledge from uncertainty',
          'Determined to preserve an impressive claim at any cost',
          'Uninterested in keeping historical sources',
          'Certain that no unanswered question remained',
        ],
        'They also listed the unanswered questions.',
      ],
      prediction: [
        'What further evidence would most directly help?',
        [
          'A dated record identifying the location of the wooden crossing',
          'Another copy of the original display wording',
          'A count of visitors who liked the bridge',
          'A statement that every old notebook is accurate',
        ],
        'The note was incomplete: it gave a season but no year, and the writer might have meant a different stream.',
      ],
      conclusion: [
        'What can be concluded?',
        [
          'The revised display makes a narrower, evidence-limited claim',
          'The notebook proves the present bridge was never old',
          'The earlier crossing certainly stood at the same site',
          'The volunteers know the exact year of both crossings',
        ],
        'the present bridge was the oldest surviving structure they had verified.',
      ],
    },
  ),
];
const phonics: Record<
  'middle' | 'advanced',
  Record<'decoding' | 'word_practice', readonly Scenario[]>
> = {
  middle: {
    decoding: [
      [
        'Read the word: planted. The children planted beans yesterday.',
        'Which two parts help you read planted?',
        ['plant + ed', 'plan + ted', 'pla + nted', 'p + lanted'],
        'The children planted beans yesterday.',
      ],
      [
        'Read the word: sunset. The sky changed colour at sunset.',
        'Which two familiar words form sunset?',
        ['sun + set', 'su + nset', 'sun + seat', 'soon + set'],
        'The sky changed colour at sunset.',
      ],
      [
        'Read the word: helpful. The clear sign was helpful.',
        'Which base word is in helpful?',
        ['help', 'heap', 'held', 'full'],
        'The clear sign was helpful.',
      ],
      [
        'Read the word: rereading. Rereading the note helped the class check the time.',
        'Which part is the base word?',
        ['read', 'rear', 'ring', 'reed'],
        'Rereading the note helped the class check the time.',
      ],
    ],
    word_practice: [
      [
        'Read the word: light. A light shone beside the window.',
        'Which word has the same final sound as light?',
        ['boat', 'line', 'long', 'leaf'],
        'A light shone beside the window.',
      ],
      [
        'Read the word: shade. The shade kept the bench cool.',
        'Which word starts with the same sound as shade?',
        ['ship', 'sad', 'chair', 'game'],
        'The shade kept the bench cool.',
      ],
      [
        'Read the word: rain. The rain filled the gauge.',
        'Which word rhymes with rain?',
        ['train', 'ran', 'ring', 'roam'],
        'The rain filled the gauge.',
      ],
      [
        'Read the word: shelf. Put the book on the shelf.',
        'Which word starts with the same sound as shelf?',
        ['shell', 'self', 'cell', 'fell'],
        'Put the book on the shelf.',
      ],
    ],
  },
  advanced: {
    decoding: [
      [
        'Read the word: reconsideration. The committee allowed time for reconsideration.',
        'Which base helps unlock reconsideration?',
        ['consider', 'concert', 'condition', 'corner'],
        'The committee allowed time for reconsideration.',
      ],
      [
        'Read the word: unpredictable. The weather remained unpredictable.',
        'Which parts preserve the word structure?',
        ['un + predict + able', 'unpre + dictable', 'un + predi + ctable', 'unp + redict + able'],
        'The weather remained unpredictable.',
      ],
      [
        'Read the word: disagreement. The group recorded its disagreement politely.',
        'Which base word remains after removing dis- and -ment?',
        ['agree', 'degree', 'argument', 'greet'],
        'The group recorded its disagreement politely.',
      ],
      [
        'Read the word: reconstruction. The archive described the reconstruction of the bridge.',
        'Which base word helps explain reconstruction?',
        ['construct', 'connect', 'consult', 'conclude'],
        'The archive described the reconstruction of the bridge.',
      ],
    ],
    word_practice: [
      [
        'Read the word: photograph. The archive kept a photograph of the crossing.',
        'Which word begins with the same sound as photograph?',
        ['family', 'paper', 'picture', 'bridge'],
        'The archive kept a photograph of the crossing.',
      ],
      [
        'Read the word: careful. The volunteers were careful with the notebook.',
        'Which word shares the final syllable sound of careful?',
        ['helpful', 'care', 'carry', 'carpet'],
        'The volunteers were careful with the notebook.',
      ],
      [
        'Read the word: action. The council recorded each action in its notes.',
        'Which word shares the final syllable sound of action?',
        ['station', 'active', 'actor', 'actual'],
        'The council recorded each action in its notes.',
      ],
      [
        'Read the word: discussion. The discussion included several different views.',
        'Which word shares the final syllable sound of discussion?',
        ['permission', 'discard', 'distance', 'discovery'],
        'The discussion included several different views.',
      ],
    ],
  },
};
export function scenariosForBand(
  subject: LessonSubject,
  band: 'middle' | 'advanced',
): readonly Scenario[] {
  if (subject === 'decoding' || subject === 'word_practice') return phonics[band][subject];
  return (band === 'middle' ? middle : advanced).map((item) => item.questions[subject]);
}
