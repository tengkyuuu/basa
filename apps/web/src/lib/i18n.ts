import { learningCatalog } from './learning-catalog';
import { LESSON_COPY, type LessonCopy } from '@basabridge/learn/copy';
import type { LessonSubject } from '@basabridge/learn';
export type Language = 'en' | 'fil';
type Entry = {
  en: { simple: string; standard: string };
  fil: { simple: string; standard: string };
};
const entry = (en: string, fil: string, enSimple = en, filSimple = fil): Entry => ({
  en: { standard: en, simple: enSimple },
  fil: { standard: fil, simple: filSimple },
});
export const catalog = {
  ...learningCatalog,
  azure_consent: entry(
    'I agree to send this story recording to Microsoft Azure Speech for transcription and pronunciation assessment. Basa will not store the audio. I will read only the story, without my name or personal details.',
    'Pumapayag akong ipadala sa Microsoft Azure Speech ang recording ng kuwento para masuri ang pagbasa at pagbigkas. Hindi itatago ng Basa ang audio. Kuwento lang ang babasahin ko, walang pangalan o personal na detalye.',
    'I agree to send my story recording to Microsoft Azure Speech to check my reading and sounds. Basa will not save it. I will read only the story.',
    'Pumapayag akong ipadala ang recording sa Microsoft Azure Speech para suriin ang pagbasa at mga tunog. Hindi ito itatago ng Basa. Kuwento lang ang babasahin ko.',
  ),
  azure_privacy: entry(
    'The microphone runs only while recording. Audio goes to Microsoft Azure Speech for pronunciation assessment and is not saved by Basa.',
    'Gumagana lang ang mikropono habang nagre-record. Ipinapadala ang audio sa Microsoft Azure Speech para sa pagbigkas at hindi itinatago ng Basa.',
  ),
  azure_guardian_notice: entry(
    'This permission covers sending your child’s story recordings to Microsoft Azure Speech for transcription and pronunciation assessment. Basa does not retain audio. Our team must verify your guardian request before microphone access opens.',
    'Sakop ng pahintulot ang pagpapadala ng recording ng bata sa Microsoft Azure Speech para suriin ang pagbasa at pagbigkas. Hindi iniimbak ng Basa ang audio. Kailangan munang beripikahin ng aming pangkat ang kahilingan bago magamit ang mikropono.',
  ),
  azure_guardian_agree: entry(
    'I am this child’s guardian and consent to Microsoft Azure Speech processing these story recordings.',
    'Ako ang tagapag-alaga ng batang ito at pumapayag akong iproseso ng Microsoft Azure Speech ang mga recording ng kuwento.',
  ),
  pronunciation_title: entry('Your pronunciation', 'Ang iyong pagbigkas'),
  pronunciation_not_assessed: entry('Not assessed', 'Hindi nasuri'),
  pronunciation_estimate: entry(
    'Azure estimates these scores against US English. Accent and recording quality can affect them. They do not measure understanding or change your level.',
    'Tinatantiya ng Azure ang mga marka batay sa US English. Maaaring makaapekto ang punto at kalidad ng recording. Hindi nito sinusukat ang pag-unawa o binabago ang antas.',
  ),
  pronunciation_accuracy: entry('Word sounds', 'Tunog ng mga salita'),
  pronunciation_fluency: entry('Reading flow', 'Daloy ng pagbasa'),
  pronunciation_completeness: entry('Story words matched', 'Mga salitang nagtugma'),
  pronunciation_score: entry('{score} / 100', '{score} / 100'),
  pronunciation_practice: entry('Words to practise', 'Mga salitang sanayin'),
  pronunciation_saved_next: entry(
    'You have finished the questions. Open Learn to listen and practise the suggested words.',
    'Natapos mo na ang mga tanong. Buksan ang Matuto para pakinggan at sanayin ang mga iminumungkahing salita.',
  ),
  pronunciation_parent_next: entry(
    'The learner can open Learn in their account to listen and practise these words.',
    'Maaaring buksan ng mag-aaral ang Matuto sa sariling account para pakinggan at sanayin ang mga salitang ito.',
  ),
  pronunciation_practice_next: entry(
    'Listen to the word in the practice list, then record it again when you are ready.',
    'Pakinggan ang salita sa listahan ng pagsasanay, at i-record muli kapag handa ka na.',
  ),
  pronunciation_practice_no_flags: entry(
    'No sounds were flagged in this attempt. You can try the word again or choose another.',
    'Walang natukoy na tunog na kailangang sanayin sa pagsubok na ito. Maaari mong ulitin ang salita o pumili ng iba.',
  ),
  pronunciation_saved_no_flags: entry(
    'No extra sound practice was suggested for this recording. Your comprehension result is shown separately.',
    'Walang dagdag na pagsasanay sa tunog na iminungkahi para sa recording na ito. Hiwalay na ipinapakita ang resulta sa pag-unawa.',
  ),
  pronunciation_next: entry(
    'Listen to each word, say it slowly, then try the story again. After the questions, you can practise these words in Learn.',
    'Pakinggan ang bawat salita, bigkasin nang dahan-dahan, at subukang basahin muli ang kuwento. Pagkatapos ng mga tanong, maaari itong sanayin sa Matuto.',
  ),
  pronunciation_no_flags: entry(
    'No sounds were flagged for practice in this recording. You can continue to the questions.',
    'Walang natukoy na tunog na kailangang sanayin sa recording na ito. Maaari nang sagutin ang mga tanong.',
  ),
  pronunciation_check: entry(
    'Azure suggests checking this word’s sounds.',
    'Iminumungkahi ng Azure na suriin ang mga tunog ng salitang ito.',
  ),
  pronunciation_sounds: entry(
    'Sounds to check (IPA, score out of 100):',
    'Mga tunog na susuriin (IPA, marka mula sa 100):',
  ),
  pronunciation_all: entry('See all assessed words', 'Tingnan ang lahat ng nasuring salita'),
  retry: entry('Try again', 'Subukan muli'),
  read_aloud: entry('Read aloud', 'Magbasa nang malakas'),
  speech_consent: entry(
    'I agree to send this reading recording to Groq for transcription. Basa will not store the audio. I will read only the story, without saying my name or personal details.',
    'Pumapayag akong ipadala sa Groq ang recording na ito para maisulat ang binasa. Hindi itatago ng Basa ang audio. Kuwento lang ang babasahin ko, walang pangalan o personal na detalye.',
  ),
  speech_privacy: entry(
    'Your microphone runs only while recording. Audio goes to Groq for transcription and is not saved by Basa.',
    'Gumagana lang ang mikropono habang nagre-record. Ipinapadala ang audio sa Groq at hindi iniimbak ng Basa.',
  ),
  enable_mic: entry('Allow read-aloud', 'Payagan ang pagbasa nang malakas'),
  disable_mic: entry('Withdraw microphone consent', 'Bawiin ang pahintulot sa mikropono'),
  start_recording: entry('Start recording', 'Simulan ang recording'),
  stop_recording: entry('Stop and check my reading', 'Ihinto at suriin ang pagbasa'),
  cancel_recording: entry('Discard recording', 'Burahin ang recording'),
  opening_mic: entry('Opening microphone…', 'Binubuksan ang mikropono…'),
  analysing_voice: entry('Checking your reading…', 'Sinusuri ang pagbasa…'),
  recording_seconds: entry(
    'Recording: {seconds} seconds. Stops after three minutes.',
    'Nagre-record: {seconds} segundo. Hihinto pagkalipas ng tatlong minuto.',
  ),
  guardian_required: entry(
    'Read silently for now. A linked guardian can request verified microphone permission from their parent account.',
    'Magbasa muna nang tahimik. Maaaring humiling ng beripikadong pahintulot sa mikropono ang nakakabit na tagapag-alaga mula sa kanilang account.',
  ),
  speech_consent_required: entry(
    'Allow read-aloud before using the microphone.',
    'Payagan muna ang pagbasa nang malakas bago gamitin ang mikropono.',
  ),
  tries_count: entry(
    '{used} of {allowed} reading tries used.',
    '{used} sa {allowed} pagsubok ang nagamit.',
  ),
  tries_unlimited: entry(
    '{used} reading tries. You can try again.',
    '{used} pagsubok sa pagbasa. Maaari pang sumubok.',
  ),
  tries_used: entry(
    'You have used the reading tries for this story. Continue to the questions.',
    'Nagamit na ang mga pagsubok para sa kuwentong ito. Magpatuloy sa mga tanong.',
  ),
  mic_unavailable: entry(
    'The microphone did not open. Check your browser permission, or continue reading silently.',
    'Hindi bumukas ang mikropono. Suriin ang pahintulot sa browser o magbasa nang tahimik.',
  ),
  speech_invalid: entry(
    'That recording could not be read. Try a shorter recording within the on-screen time limit.',
    'Hindi mabasa ang recording. Subukan ang mas maikling recording ayon sa takdang oras sa screen.',
  ),
  speech_unavailable: entry(
    'Read-aloud is unavailable right now. Try again later or continue silently.',
    'Hindi magamit ang pagbasa nang malakas ngayon. Subukan muli mamaya o magbasa nang tahimik.',
  ),
  speech_busy: entry(
    'A reading is being checked. Wait a moment, then refresh.',
    'May sinusuring pagbasa. Maghintay sandali at i-refresh.',
  ),
  no_speech: entry(
    'No clear speech was heard. Check the microphone and try again.',
    'Walang malinaw na boses. Suriin ang mikropono at subukan muli.',
  ),
  voice_complete: entry('You reached the end of the story.', 'Naabot mo ang dulo ng kuwento.'),
  voice_incomplete: entry(
    'The end of the story was not heard.',
    'Hindi narinig ang dulo ng kuwento.',
  ),
  voice_counts: entry(
    '{right} of {total} words matched. Pace: {pace} matched words per minute.',
    '{right} sa {total} salita ang tumugma. Bilis: {pace} tumugmang salita bawat minuto.',
  ),
  speech_accuracy: entry(
    'Speech recognition can mishear you. These are transcript matches, not a pronunciation diagnosis. Uncertain recordings do not count toward moving up.',
    'Maaaring magkamali ang pagkilala sa boses. Pagtutugma ito sa transcript, hindi pagsusuri sa pagbigkas. Hindi binibilang sa pag-angat ang hindi tiyak na recording.',
  ),
  voice_words: entry('Words to check', 'Mga salitang susuriin'),
  word_uncertain: entry('uncertain; not marked as an error', 'hindi tiyak; hindi minarkahang mali'),
  word_missing: entry('not heard', 'hindi narinig'),
  word_extra: entry('extra or repeated word', 'dagdag o inulit na salita'),
  word_different: entry('heard differently', 'iba ang narinig'),
  voice_result_note: entry(
    'The server combines your answers with completed, clear read-aloud attempts to decide your next level.',
    'Pinagsasama ng server ang mga sagot at kumpleto, malinaw na pagbasa para itakda ang susunod na antas.',
  ),
  next_level: entry(
    'Your next story will be at level {level}.',
    'Nasa antas {level} ang susunod mong kuwento.',
  ),
  recovery_title: entry('Keep access to your account', 'Panatilihin ang access sa iyong account'),
  recovery_body: entry(
    'Save a recovery code in a safe place. It lets you reset a forgotten password. Making a new code replaces your old one.',
    'Itago ang recovery code sa ligtas na lugar. Magagamit ito kapag nakalimutan ang password. Papalitan ng bagong code ang luma.',
  ),
  recovery_password: entry('Confirm your current password', 'Ilagay ang kasalukuyang password'),
  make_recovery_code: entry('Create recovery code', 'Gumawa ng recovery code'),
  recovery_code: entry('Recovery code', 'Recovery code'),
  recovery_save: entry(
    'Save this code now. It is shown only here and works once. Keep it private, just like your password.',
    'Itago ang code ngayon. Dito lang ito makikita at isang beses lang magagamit. Ililihim ito tulad ng password.',
  ),
  forgot_password: entry('Forgot password?', 'Nakalimutan ang password?'),
  recover_title: entry('Reset your password', 'Palitan ang password'),
  recover_body: entry(
    'Use the recovery code you saved in My account. Without your password or that code, we cannot restore access.',
    'Gamitin ang recovery code na itinago mula sa Aking account. Kung wala ang password o code, hindi maibabalik ang access.',
  ),
  new_password: entry('New password', 'Bagong password'),
  reset_password: entry('Reset password and sign in', 'Palitan ang password at mag-sign in'),
  recovery_invalid: entry(
    'The username or recovery code did not match, or the code was already used.',
    'Hindi tugma ang username o recovery code, o nagamit na ang code.',
  ),
  history_full: entry(
    'Your reading history is full. Download it from My account. Ask the organizer about extending your account.',
    'Puno na ang tala ng pagbasa. I-download ito sa Aking account. Magtanong sa tagapag-ayos tungkol sa iyong account.',
  ),
  crash_title: entry('Let’s try that again.', 'Subukan nating muli.'),
  crash_body: entry(
    'Something stopped this page from loading. Reload to return to your saved progress.',
    'Hindi nag-load ang pahina. I-reload para bumalik sa naitalang pag-unlad.',
  ),
  reload: entry('Reload the app', 'I-reload ang app'),
  items_one: entry('1 answer', '1 sagot'),
  answer_right: entry('Correct', 'Tama'),
  answer_wrong: entry('Not quite', 'Hindi pa tama'),
  answer_time: entry('{seconds} seconds', '{seconds} segundo'),
  reduced_evidence: entry(
    'Answered quickly; counted with less weight.',
    'Mabilis na nasagot; mas mababa ang bigat sa pagtataya.',
  ),
  normal_evidence: entry('Counted with standard weight.', 'Karaniwang bigat sa pagtataya.'),
  no_support: entry('No reading supports used.', 'Walang ginamit na tulong sa pagbasa.'),
  brand: entry('Basa', 'Basa'),
  tagline: entry('Read a little. Understand more.', 'Magbasa nang kaunti. Umunawa nang higit.'),
  home: entry('Home', 'Simula'),
  learn: entry('Learn', 'Matuto'),
  progress: entry('My progress', 'Aking pag-unlad'),
  account: entry('My account', 'Aking account'),
  help: entry('Reading help', 'Tulong sa pagbasa'),
  skip: entry('Skip to content', 'Dumiretso sa nilalaman'),
  nav: entry('Main navigation', 'Pangunahing menu'),
  sign_in: entry('Sign in', 'Mag-sign in'),
  sign_up: entry('Create account', 'Gumawa ng account'),
  sign_out: entry('Sign out', 'Mag-sign out'),
  welcome: entry(
    'Every story is a small step forward.',
    'Bawat kuwento ay isang hakbang pasulong.',
    'Let’s read a story.',
    'Magbasa tayo ng kuwento.',
  ),
  welcome_body: entry(
    'Read at your own pace. Find the clues. Build your understanding, one story at a time.',
    'Magbasa sa sarili mong bilis. Hanapin ang mga pahiwatig. Dagdagan ang iyong pag-unawa sa bawat kuwento.',
  ),
  auth_intro: entry(
    'Your own space to practise reading.',
    'Sarili mong lugar para magsanay sa pagbasa.',
  ),
  username: entry('Username', 'Username'),
  password: entry('Password', 'Password'),
  username_hint: entry(
    'Use 3–24 letters, numbers or underscores. Start with a letter. Avoid your real name.',
    'Gumamit ng 3–24 titik, numero o underscore. Magsimula sa titik. Iwasan ang tunay mong pangalan.',
  ),
  password_hint: entry('Use at least 10 characters.', 'Gumamit ng hindi bababa sa 10 karakter.'),
  student: entry('Student', 'Mag-aaral'),
  parent: entry('Parent or guardian', 'Magulang o tagapag-alaga'),
  role: entry('I am a', 'Ako ay'),
  age: entry('Age group', 'Pangkat ng edad'),
  under13: entry('Under 13', 'Wala pang 13'),
  age13: entry('13 or older', '13 o mas matanda'),
  ready: entry(
    'Ready for your next story?',
    'Handa ka na ba sa susunod na kuwento?',
    'Let’s read.',
    'Magbasa tayo.',
  ),
  ready_body: entry(
    'Take your time with the story. Then answer a few questions with the story put away.',
    'Basahin nang mabuti ang kuwento. Pagkatapos, sagutin ang mga tanong nang nakatago ang kuwento.',
  ),
  start: entry('Make my story', 'Gumawa ng kuwento'),
  bank: entry('Read an included story', 'Magbasa ng kasamang kuwento'),
  resume: entry('Continue my story', 'Ituloy ang kuwento'),
  making: entry('Making and checking your story…', 'Ginagawa at sinusuri ang kuwento…'),
  working: entry('One moment…', 'Sandali lang…'),
  loading: entry('Opening your reading space…', 'Binubuksan ang iyong pahina…'),
  ai_missing: entry(
    'AI stories are not connected yet. You can try an included story.',
    'Hindi pa nakakonekta ang mga kuwentong AI. Subukan ang kasamang kuwento.',
  ),
  refresh: entry('Refresh', 'I-refresh'),
  level: entry('Level {level}', 'Antas {level}'),
  level_note: entry(
    'This is a temporary starting level. We have not measured your reading level yet.',
    'Pansamantalang antas ito. Hindi pa nasusukat ang iyong antas sa pagbasa.',
  ),
  recent: entry('Your latest reading', 'Huli mong binasa'),
  no_activity: entry(
    'Your progress starts with your first story.',
    'Magsisimula ang iyong pag-unlad sa unang kuwento.',
  ),
  empty_body: entry(
    'Finished stories and answers will appear here.',
    'Dito makikita ang natapos mong mga kuwento at sagot.',
  ),
  placement_title: entry('Let’s find a starting point.', 'Humanap tayo ng panimulang antas.'),
  placement_body: entry(
    'A few reviewed passages help estimate a starting point. You can pause and return.',
    'Makakatulong ang ilang sinuring teksto upang matayâ ang panimulang antas. Maaaring huminto at bumalik.',
  ),
  placement_skip: entry('Start at the temporary level', 'Magsimula sa pansamantalang antas'),
  placement_reminder: entry(
    'Placement is still to do. You can use the temporary level for now.',
    'Kailangan pa ang placement test. Maaari munang gamitin ang pansamantalang antas.',
  ),
  read_instruction: entry(
    'Read the story. When you’re ready, put it away and answer the questions.',
    'Basahin ang kuwento. Kapag handa ka na, itago ito at sagutin ang mga tanong.',
    'Read first. Then answer.',
    'Magbasa muna. Pagkatapos, sumagot.',
  ),
  silent: entry('Silent reading', 'Tahimik na pagbasa'),
  silent_note: entry(
    'You can read silently. Read-aloud needs microphone consent and, for accounts under 13, verified guardian approval.',
    'Maaari kang magbasa nang tahimik. Kailangan ng pahintulot sa mikropono at, para sa wala pang 13, beripikadong pahintulot ng tagapag-alaga.',
  ),
  authored: entry('Included walkthrough story', 'Kasamang kuwento para sa pagsubok'),
  generated: entry('AI story, checked before reading', 'Kuwentong AI, sinuri bago basahin'),
  answer_questions: entry('Continue to questions', 'Magpatuloy sa mga tanong'),
  reading_steps: entry('Reading session steps', 'Mga hakbang sa pagbasa'),
  step_read: entry('Read', 'Bumasa'),
  step_answer: entry('Answer', 'Sumagot'),
  step_results: entry('Results', 'Resulta'),
  ready_questions: entry('Finished reading?', 'Tapos nang bumasa?'),
  questions_hint: entry(
    'The story will be hidden while you answer.',
    'Itatago ang kuwento habang sumasagot ka.',
  ),
  read_aloud_optional: entry('Read aloud (optional)', 'Magbasa nang malakas (opsyonal)'),
  read_aloud_required: entry('Read aloud (required)', 'Magbasa nang malakas (kailangan)'),
  voice_required: entry(
    'Read the story aloud once before the questions.',
    'Basahin muna nang malakas ang kuwento bago ang mga tanong.',
  ),
  read_aloud_hint: entry(
    'Use your microphone to check your reading.',
    'Gamitin ang mikropono para suriin ang pagbasa mo.',
  ),
  question_count: entry('Question {current} of {total}', 'Tanong {current} sa {total}'),
  story_hidden: entry(
    'The story is put away. Think about what you read.',
    'Nakatago ang kuwento. Isipin ang binasa mo.',
  ),
  choose_one: entry('Choose one answer.', 'Pumili ng isang sagot.'),
  choose_all: entry('Choose every correct answer.', 'Piliin lahat ng tamang sagot.'),
  order_events: entry(
    'Tap the events in the order they happened.',
    'Pindutin ang mga pangyayari ayon sa pagkakasunod.',
  ),
  check_answer: entry('Check my answer', 'Suriin ang sagot'),
  clear_order: entry('Start the order again', 'Ulitin ang pagkakasunod'),
  correct: entry('You found the clue.', 'Nahanap mo ang pahiwatig.'),
  incorrect: entry('Let’s look at the clue.', 'Tingnan natin ang pahiwatig.'),
  answer_label: entry('The answer', 'Ang sagot'),
  clue: entry('The clue in the story', 'Pahiwatig sa kuwento'),
  next: entry('Next question', 'Susunod na tanong'),
  see_result: entry('See my result', 'Tingnan ang resulta'),
  result_title: entry('One more story read.', 'Isa pang kuwento ang nabasa.'),
  score: entry('{correct} of {total} answers correct', '{correct} sa {total} sagot ang tama'),
  teacher: entry('Your reading note', 'Paalala sa pagbasa'),
  standard_note: entry(
    'Keep looking for clues. The words in the story can help you explain your answer.',
    'Patuloy na maghanap ng mga pahiwatig. Makakatulong ang mga salita sa kuwento para ipaliwanag ang sagot.',
    'Look for clues in the story.',
    'Hanapin ang pahiwatig sa kuwento.',
  ),
  no_voice_pass: entry(
    'Your answers are saved. A full story pass and a level increase also need a checked read-aloud.',
    'Nai-save ang mga sagot mo. Kailangan din ng nasuring pagbasa nang malakas para pumasa sa kuwento at tumaas ang antas.',
  ),
  another: entry('Read another story', 'Magbasa ng isa pang kuwento'),
  back_home: entry('Back to home', 'Bumalik sa simula'),
  progress_title: entry('See your reading grow.', 'Tingnan ang iyong pag-unlad sa pagbasa.'),
  stories_finished: entry('Stories finished', 'Natapos na kuwento'),
  questions_answered: entry('Questions answered', 'Nasagot na tanong'),
  answers_correct: entry('Correct answers', 'Tamang sagot'),
  skill_title: entry('What your answers tell us', 'Ano ang sinasabi ng mga sagot mo'),
  vocabulary: entry('Word meanings', 'Kahulugan ng salita'),
  literal: entry('Finding details', 'Paghahanap ng detalye'),
  inferential: entry('Using clues', 'Paggamit ng pahiwatig'),
  none: entry('Not measured yet', 'Hindi pa nasusukat'),
  early: entry('Early estimate', 'Paunang pagtataya'),
  building: entry('Building confidence', 'Lumalakas ang katiyakan'),
  steady: entry('Steadier estimate', 'Mas tiyak na pagtataya'),
  items: entry('{count} answers', '{count} sagot'),
  focus: entry('Next practice focus', 'Susunod na pagsasanayan'),
  history: entry('Reading history', 'Mga nabasang kuwento'),
  history_title: entry('Story', 'Kuwento'),
  history_score: entry('Answers', 'Mga sagot'),
  history_date: entry('Finished', 'Natapos'),
  learn_title: entry('A little help for your next step.', 'Kaunting tulong sa susunod na hakbang.'),
  learn_empty: entry('Lessons are being prepared.', 'Inihahanda pa ang mga aralin.'),
  learn_body: entry(
    'Only lessons reviewed by a reading specialist appear here. For now, keep practising with stories.',
    'Mga araling sinuri lamang ng espesyalista sa pagbasa ang lalabas dito. Sa ngayon, magpatuloy sa pagbabasa ng mga kuwento.',
  ),
  focus_tip: entry(
    'Your answers suggest practising this next. This is an early estimate, not a diagnosis.',
    'Iminumungkahi ng mga sagot mo na ito ang susunod na sanayin. Paunang pagtataya ito, hindi pagsusuri ng kondisyon.',
  ),
  help_title: entry('Make reading comfortable.', 'Gawing komportable ang pagbasa.'),
  help_body: entry(
    'Choose how instructions and stories look. Stories stay in English.',
    'Piliin ang anyo ng mga panuto at kuwento. Mananatiling Ingles ang mga kuwento.',
  ),
  language: entry('Instruction language', 'Wika ng panuto'),
  english: entry('English', 'English'),
  filipino: entry('Filipino', 'Filipino'),
  simple: entry('Use simple words', 'Gumamit ng simpleng salita'),
  text_size: entry('Text size', 'Laki ng teksto'),
  small: entry('Small', 'Maliit'),
  medium: entry('Medium', 'Katamtaman'),
  large: entry('Large', 'Malaki'),
  spacing: entry('Line spacing', 'Pagitan ng mga linya'),
  normal: entry('Standard', 'Karaniwan'),
  wide: entry('Wide', 'Maluwag'),
  ruler: entry('Reading guide', 'Gabay sa pagbasa'),
  ruler_body: entry(
    'Highlight one sentence at a time.',
    'I-highlight ang isang pangungusap sa bawat pagkakataon.',
  ),
  previous_sentence: entry('Previous sentence', 'Naunang pangungusap'),
  next_sentence: entry('Next sentence', 'Susunod na pangungusap'),
  save: entry('Save changes', 'I-save ang pagbabago'),
  saved: entry('Changes saved.', 'Nai-save ang pagbabago.'),
  account_title: entry('Your account, your choice.', 'Account mo, pasya mo.'),
  sharing_title: entry('Share with a parent', 'Ibahagi sa magulang'),
  sharing_body: entry(
    'Give a parent this one-time code. After they link, choose what they can see. Nothing is shared automatically.',
    'Ibigay sa magulang ang code na ito na isang beses lang magagamit. Pagkatapos nilang mag-link, piliin ang makikita nila. Walang awtomatikong ibabahagi.',
  ),
  create_code: entry('Create a linking code', 'Gumawa ng linking code'),
  expires: entry(
    'Valid for 24 hours. Only share it with your parent or guardian.',
    'May bisa nang 24 oras. Ibahagi lamang sa magulang o tagapag-alaga.',
  ),
  no_links: entry('No parent is linked yet.', 'Wala pang naka-link na magulang.'),
  share_progress: entry('Share progress', 'Ibahagi ang pag-unlad'),
  share_analysis: entry('Share answer details', 'Ibahagi ang detalye ng sagot'),
  revoke: entry('Remove link', 'Alisin ang link'),
  data_title: entry('Your saved data', 'Nai-save mong datos'),
  export: entry('Download my data', 'I-download ang aking datos'),
  delete_title: entry('Delete my account', 'Burahin ang aking account'),
  delete_body: entry(
    'This removes your account, reading history, and links from this app. Enter your password to confirm.',
    'Buburahin nito ang account, kasaysayan ng pagbasa, at mga link sa app. Ilagay ang password upang kumpirmahin.',
  ),
  delete: entry('Permanently delete my account', 'Tuluyang burahin ang aking account'),
  parent_title: entry('Support their next step.', 'Suportahan ang susunod nilang hakbang.'),
  parent_body: entry(
    'Link with a code from your learner. They choose what to share with you.',
    'Mag-link gamit ang code mula sa mag-aaral. Siya ang pipili ng ibabahagi sa iyo.',
  ),
  link_code: entry('Linking code', 'Linking code'),
  link: entry('Link learner', 'I-link ang mag-aaral'),
  no_children: entry(
    'Your linked learners will appear here.',
    'Dito makikita ang mga naka-link mong mag-aaral.',
  ),
  not_shared: entry(
    'Your learner has not shared progress yet.',
    'Hindi pa ibinabahagi ng mag-aaral ang kanyang pag-unlad.',
  ),
  details: entry('Shared answer details', 'Ibinahaging detalye ng sagot'),
  details_count: entry(
    '{count} answers recorded with timing and support details.',
    '{count} sagot ang naitala kasama ang oras at tulong na ginamit.',
  ),
  footer: entry('Small steps. More understanding.', 'Maliit na hakbang. Mas malalim na pag-unawa.'),
  unavailable: entry(
    'We couldn’t finish that. Please try again.',
    'Hindi ito natapos. Subukan muli.',
  ),
  invalid_request: entry(
    'Check your entries and try again.',
    'Suriin ang inilagay mo at subukan muli.',
  ),
  credentials: entry(
    'The username or password did not match. Try again.',
    'Hindi tugma ang username o password. Subukan muli.',
  ),
  username_taken: entry(
    'That username is already in use. Choose another.',
    'Ginagamit na ang username na iyan. Pumili ng iba.',
  ),
  signed_out: entry('Please sign in again to continue.', 'Mag-sign in muli para magpatuloy.'),
  forbidden: entry(
    'This action is not available for your account.',
    'Hindi magagamit ng account mo ang aksiyong ito.',
  ),
  changed: entry(
    'Your progress changed in another tab. Refresh and continue.',
    'Nagbago ang datos mo sa ibang tab. I-refresh at magpatuloy.',
  ),
  choose_answer: entry('Choose an answer first.', 'Pumili muna ng sagot.'),
  not_found: entry('That reading is not available.', 'Hindi makita ang babasahing iyon.'),
  too_many: entry(
    'Too many tries. Wait a few minutes, then try again.',
    'Masyadong maraming pagsubok. Maghintay ng ilang minuto at subukan muli.',
  ),
  daily_limit: entry(
    'Today’s AI story limit is reached. Try an included story or come back tomorrow.',
    'Naabot na ang limitasyon ng kuwentong AI ngayon. Subukan ang kasamang kuwento o bumalik bukas.',
  ),
  ai_setup: entry(
    'AI stories are not connected yet. Try an included story.',
    'Hindi pa nakakonekta ang kuwentong AI. Subukan ang kasamang kuwento.',
  ),
  ai_busy: entry(
    'The story maker is busy. Wait a minute, then try again.',
    'Abala ang gumagawa ng kuwento. Maghintay ng isang minuto at subukan muli.',
  ),
  ai_invalid: entry(
    'This story did not pass our checks. Please try making another.',
    'Hindi pumasa ang kuwento sa pagsusuri. Subukang gumawa ng iba.',
  ),
  ai_unavailable: entry(
    'We could not reach the story maker. Try again or read an included story.',
    'Hindi maabot ang gumagawa ng kuwento. Subukan muli o basahin ang kasamang kuwento.',
  ),
  bank_empty: entry(
    'You have read the included stories for this level. Make an AI story to continue.',
    'Nabasa mo na ang mga kasamang kuwento sa antas na ito. Gumawa ng kuwentong AI para magpatuloy.',
  ),
  invalid_code: entry(
    'That code is invalid, expired, or already used. Ask for a new code.',
    'Hindi wasto, paso, o nagamit na ang code. Humingi ng bagong code.',
  ),
  placement_required: entry(
    'Choose your starting point first.',
    'Piliin muna ang panimulang antas.',
  ),
  voice_unavailable: entry(
    'The microphone is not available in this walkthrough.',
    'Hindi magagamit ang mikropono sa pagsubok na ito.',
  ),
  local_only: entry(
    'Open this walkthrough on the local computer.',
    'Buksan ang pagsubok na ito sa lokal na computer.',
  ),
  preview: entry(
    'Read at your own pace. Look for a clue.',
    'Magbasa sa sarili mong bilis. Humanap ng pahiwatig.',
  ),
  score_hint: entry(
    'Silent answers measure understanding. They do not measure reading aloud.',
    'Sinusukat ng mga sagot ang pag-unawa. Hindi nito sinusukat ang pagbasa nang malakas.',
  ),
} satisfies Record<string, Entry>;
export function lessonText(
  subject: LessonSubject,
  part: keyof LessonCopy,
  language: Language,
  simple = false,
) {
  return LESSON_COPY[subject][part][language][simple ? 'simple' : 'standard'];
}
export type MessageKey = keyof typeof catalog;
export function translate(
  key: MessageKey,
  language: Language = 'en',
  simple = false,
  values: Record<string, string | number> = {},
): string {
  if (key === 'items' && values.count === 1) key = 'items_one';
  return catalog[key][language][simple ? 'simple' : 'standard'].replace(
    /\{(\w+)\}/g,
    (_, k: string) => String(values[k] ?? `{${k}}`),
  );
}
