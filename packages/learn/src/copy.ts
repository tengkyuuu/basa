import type { LessonSubject } from './index';
export type Wording = {
  en: { simple: string; standard: string };
  fil: { simple: string; standard: string };
};
export const wording = (en: string, fil: string, enSimple = en, filSimple = fil): Wording => ({
  en: { simple: enSimple, standard: en },
  fil: { simple: filSimple, standard: fil },
});
export type LessonCopy = { title: Wording; goal: Wording; explain: Wording; point: Wording };
export const LESSON_COPY: Record<LessonSubject, LessonCopy> = {
  word_in_context: {
    title: wording('Find a word clue', 'Humanap ng pahiwatig sa salita'),
    goal: wording(
      'Use nearby words to work out a meaning.',
      'Gamitin ang kalapit na salita upang maunawaan ang kahulugan.',
    ),
    explain: wording(
      'Read the whole sentence. Look for an action, a description or a contrast that helps explain the word. Try the meaning in the sentence.',
      'Basahin ang buong pangungusap. Humanap ng kilos, paglalarawan o paghahambing na nagpapaliwanag sa salita. Subukan ang kahulugan sa pangungusap.',
      'Read around the word. Try a meaning that fits.',
      'Basahin ang nasa paligid ng salita. Subukan ang angkop na kahulugan.',
    ),
    point: wording(
      'The action in the sentence gives a clue.',
      'Nagbibigay ng pahiwatig ang kilos sa pangungusap.',
    ),
  },
  word_parts: {
    title: wording('Look inside a word', 'Tingnan ang bahagi ng salita'),
    goal: wording(
      'Use a familiar word part to help find a meaning.',
      'Gamitin ang kilalang bahagi ng salita upang mahanap ang kahulugan.',
    ),
    explain: wording(
      'Find the base word first. A beginning such as un- can change its meaning. An ending such as -ful can add a meaning. Check your idea against the sentence.',
      'Hanapin muna ang salitang-ugat. Maaaring baguhin ng un- ang kahulugan nito. Maaaring magdagdag ng kahulugan ang -ful. Suriin ang iyong ideya sa pangungusap.',
      'Find the small word. Look at what was added.',
      'Hanapin ang salitang-ugat. Tingnan ang idinagdag.',
    ),
    point: wording(
      'The added part changes the base word.',
      'Binabago ng idinagdag na bahagi ang salitang-ugat.',
    ),
  },
  key_detail: {
    title: wording('Find the exact detail', 'Hanapin ang tiyak na detalye'),
    goal: wording(
      'Find the words that answer who, what or where.',
      'Hanapin ang sagot sa sino, ano o saan.',
    ),
    explain: wording(
      'Read what the question asks. Find the matching detail in the passage. Choose what the passage says, even if another answer sounds possible.',
      'Basahin ang hinihingi ng tanong. Hanapin ang katugmang detalye sa teksto. Piliin ang sinasabi ng teksto kahit maaaring mangyari ang ibang sagot.',
      'What does the question ask? Find that detail.',
      'Ano ang hinihingi ng tanong? Hanapin ang detalye.',
    ),
    point: wording(
      'Check the place named in the passage.',
      'Suriin ang lugar na binanggit sa teksto.',
    ),
  },
  sequence: {
    title: wording('Put events in order', 'Ayusin ang pagkakasunod ng pangyayari'),
    goal: wording(
      'Tell what happened before and after.',
      'Sabihin kung ano ang nangyari bago at pagkatapos.',
    ),
    explain: wording(
      'Picture the events one at a time. Words such as first, then and after help you follow the order. Check each event against the passage.',
      'Isipin ang bawat pangyayari. Nakakatulong ang first, then at after sa pagkakasunod. Suriin ang bawat pangyayari sa teksto.',
      'What happened first? What came next?',
      'Ano ang nauna? Ano ang sumunod?',
    ),
    point: wording(
      'Follow the actions in the order they happen.',
      'Sundan ang pagkakasunod ng mga kilos.',
    ),
  },
  main_idea: {
    title: wording('Find the main idea', 'Hanapin ang pangunahing ideya'),
    goal: wording(
      'Choose an idea that fits the whole passage.',
      'Pumili ng ideyang angkop sa buong teksto.',
    ),
    explain: wording(
      'Ask what the whole passage is mostly about. A good main idea includes the important details. It is broader than one small event, but adds nothing the passage does not say.',
      'Itanong kung tungkol saan ang buong teksto. Kasama sa pangunahing ideya ang mahahalagang detalye. Mas malawak ito sa isang maliit na pangyayari ngunit walang dagdag na wala sa teksto.',
      'What is the whole passage about?',
      'Tungkol saan ang buong teksto?',
    ),
    point: wording(
      'Look for the idea that joins the details.',
      'Hanapin ang ideyang nag-uugnay sa mga detalye.',
    ),
  },
  cause_effect: {
    title: wording('Connect a cause and a result', 'Iugnay ang sanhi at bunga'),
    goal: wording(
      'Use clues to explain why something happened.',
      'Gamitin ang pahiwatig upang ipaliwanag kung bakit nangyari ang isang bagay.',
    ),
    explain: wording(
      'Find the event first. Ask what made it happen. A cause explains why; an effect is the result. Check that the passage supports the connection.',
      'Hanapin muna ang pangyayari. Itanong kung ano ang dahilan nito. Ang sanhi ang dahilan; ang bunga ang resulta. Tiyaking may batayan sa teksto.',
      'What happened? What made it happen?',
      'Ano ang nangyari? Ano ang dahilan nito?',
    ),
    point: wording(
      'Connect the change with the event before it.',
      'Iugnay ang pagbabago sa naunang pangyayari.',
    ),
  },
  feelings: {
    title: wording('Use clues about feelings', 'Gamitin ang pahiwatig sa damdamin'),
    goal: wording(
      'Use actions and words to infer a feeling.',
      'Gamitin ang kilos at salita upang mahinuha ang damdamin.',
    ),
    explain: wording(
      'A passage may show a feeling without naming it. Look at what someone does or says. Choose the feeling that fits those clues, rather than guessing from your own day.',
      'Maaaring ipakita ang damdamin nang hindi ito pinapangalanan. Tingnan ang kilos o sinasabi ng tauhan. Piliin ang damdaming angkop sa pahiwatig, hindi sa iyong sariling araw.',
      'Look at the action. What feeling fits?',
      'Tingnan ang kilos. Anong damdamin ang angkop?',
    ),
    point: wording(
      'An expression or action can show a feeling.',
      'Maaaring ipakita ng anyo o kilos ang damdamin.',
    ),
  },
  prediction: {
    title: wording('Predict with a clue', 'Humula gamit ang pahiwatig'),
    goal: wording(
      'Use what happened to predict a likely next event.',
      'Gamitin ang nangyari upang mahulaan ang malamang na susunod.',
    ),
    explain: wording(
      'Look at the last event and the clues before it. Choose what is most likely to happen next. A prediction needs a clue; it is not just something that could happen.',
      'Tingnan ang huling pangyayari at mga naunang pahiwatig. Piliin ang pinakamalamang na susunod. Kailangan ng batayan ang hula; hindi sapat na maaari lang itong mangyari.',
      'What might happen next? Find a clue.',
      'Ano ang maaaring sumunod? Humanap ng pahiwatig.',
    ),
    point: wording(
      'Use the last action to predict the next one.',
      'Gamitin ang huling kilos upang mahulaan ang susunod.',
    ),
  },
  conclusion: {
    title: wording('Join clues for a conclusion', 'Pagsamahin ang pahiwatig para sa hinuha'),
    goal: wording(
      'Use more than one clue to work something out.',
      'Gumamit ng higit sa isang pahiwatig upang makabuo ng hinuha.',
    ),
    explain: wording(
      'Find details that fit together. Ask what they suggest, even if the passage does not say it directly. A sound conclusion is supported by the clues.',
      'Hanapin ang mga detalyeng magkakaugnay. Itanong kung ano ang ipinahihiwatig ng mga ito kahit hindi tuwirang sinabi. May batayan sa teksto ang mabuting hinuha.',
      'Join the clues. What do they suggest?',
      'Pagsamahin ang mga pahiwatig. Ano ang ibig sabihin nila?',
    ),
    point: wording(
      'Use both clues, rather than one detail alone.',
      'Gamitin ang dalawang pahiwatig, hindi isang detalye lang.',
    ),
  },
  decoding: {
    title: wording('Blend sounds into a word', 'Pagsamahin ang tunog para sa salita'),
    goal: wording(
      'Look through a word and blend its sounds.',
      'Tingnan ang buong salita at pagsamahin ang mga tunog.',
    ),
    explain: wording(
      'Look at each letter or letter group. Say the sounds slowly, then blend them. Some letters work together for one sound. Check the word in its sentence.',
      'Tingnan ang bawat titik o pangkat ng titik. Bigkasin nang dahan-dahan ang mga tunog at pagsamahin. May mga titik na magkasamang bumubuo ng isang tunog. Suriin ang salita sa pangungusap.',
      'Look at the letters. Blend the sounds.',
      'Tingnan ang mga titik. Pagsamahin ang tunog.',
    ),
    point: wording(
      'Listen to the beginning and ending sounds.',
      'Pakinggan ang una at huling tunog.',
    ),
  },
  word_practice: {
    title: wording('Practise a tricky word', 'Magsanay sa mahirap na salita'),
    goal: wording(
      'Look, listen and try a word again.',
      'Tingnan, pakinggan at subukan muli ang salita.',
    ),
    explain: wording(
      'Look at the word. Hear it, then say it yourself. Read it in the sentence again. A speech estimate can miss a word; practice here does not change your level.',
      'Tingnan ang salita. Pakinggan at bigkasin ito. Basahin itong muli sa pangungusap. Maaaring magkamali ang pagtataya ng boses; hindi binabago ng pagsasanay dito ang antas mo.',
      'Look. Listen. Say the word. Try it in a sentence.',
      'Tingnan. Pakinggan. Bigkasin ang salita. Subukan sa pangungusap.',
    ),
    point: wording(
      'Look through the whole word before you say it.',
      'Tingnan ang buong salita bago ito bigkasin.',
    ),
  },
};
