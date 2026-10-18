import type {
  Accommodation,
  ComprehensionSkill,
  LearningStory,
  ReadingHelp,
  ReadingNote,
  TryAnalysis,
  PlacementResult,
} from '@basabridge/contracts';
import type { PlacementState } from '@basabridge/mastery';
import type { LessonSubject } from '@basabridge/learn';
import type { AbilitySummary } from '@basabridge/mastery';

export interface RecordedAnswer {
  questionIndex: number;
  chosen: number[];
  correct: boolean;
  responseMs: number;
  rushed: boolean;
  weight: number;
  accommodations: Accommodation[];
}
export interface ReadingSession {
  correctionAudit?: {
    at: string;
    wordIndex: number;
    marked: boolean;
    actorRole: 'student' | 'parent';
  }[];
  voice?: {
    attempts: { id: string; analysis: TryAnalysis; supported?: boolean }[];
    pending?: { id: string; at: number };
  };
  id: string;
  level: number;
  story: LearningStory;
  source: 'groq' | 'walkthrough' | 'reviewed' | 'placement';
  contentId?: string;
  supports?: Record<string, Accommodation[]>;
  supportedVoice?: boolean;
  phase: 'reading' | 'answering' | 'feedback' | 'done';
  questionIndex: number;
  issuedAt: number;
  startedAt: string;
  completedAt: string | null;
  answers: RecordedAnswer[];
  note: ReadingNote | null;
  levelAfter: number | null;
}
export interface LearnerState {
  microphoneConsent?: { version: 'groq-speech-v1'; at: string } | null;
  level: number;
  placement: 'pending' | 'skipped' | 'complete';
  placementRun?: PlacementState & {
    id: string;
    grade: number | null;
    completedAt: string | null;
    result: PlacementResult | null;
    sessionIds: string[];
  };
  lessons?: Record<string, LessonWork>;
  guardian?: GuardianRequest[];
  decisions?: DecisionRecord[];
  wordPractice?: { id: string; word: string; analysis: TryAnalysis; at: string }[];
  settings: ReadingHelp;
  sessions: ReadingSession[];
  aiCalls: { day: string; count: number };
}
export interface LessonWork {
  retention?: {
    stage: number;
    dueAt: string | null;
    correct: number;
    total: number;
    lastCheckedAt: string;
  };
  id: string;
  hash: string;
  phase: 'explain' | 'practice' | 'check' | 'done';
  index: number;
  answers: { item: number; chosen: number[]; correct: boolean }[];
  completedAt: string | null;
  recheckCorrect: number;
  recheckTotal: number;
}
export interface GuardianRequest {
  id: string;
  parentId: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  requestedAt: string;
  reviewedAt: string | null;
  reviewer: string | null;
  method: 'video_call' | 'signed_form' | null;
  version: 'groq-guardian-v1';
}
export interface DecisionRecord {
  id: string;
  at: string;
  kind: 'placement' | 'level' | 'lesson' | 'support' | 'consent';
  detail: string;
  values: Record<string, number | string>;
}
export interface PublicLesson {
  reviewDue?: boolean;
  nextReviewAt?: string | null;
  id: string;
  subject: LessonSubject;
  band: 'early' | 'middle' | 'advanced';
  phase: LessonWork['phase'] | 'not_started';
  index: number;
  total: number;
  learned: boolean;
  recheckCorrect: number;
  recheckTotal: number;
  item: {
    id: string;
    passage: string;
    question: Pick<LearningStory['questions'][number], 'type' | 'question' | 'options'>;
  } | null;
  feedback: { correct: boolean; evidence: string; correctOptions: string[] } | null;
  example: { passage: string; question: string; answer: string } | null;
}
export interface LearningSnapshot {
  lessons: PublicLesson[];
  recommendedIds: string[];
  flaggedWords: string[];
  reviewedLessonCount: number;
  reviewedPlacementCount: number;
  reviewedStoryCount: number;
  placement: {
    ready: boolean;
    active: boolean;
    count: number;
    maximum: number;
    nextLevel: number | null;
    canRetake: boolean;
    result: PlacementResult | null;
    provisional: true;
  };
  guardian: {
    approved: boolean;
    requests: Pick<GuardianRequest, 'id' | 'status' | 'requestedAt' | 'reviewedAt'>[];
  };
  decisions: DecisionRecord[];
  wordPractice: { sessionId: string | null; attempts: { word: string; analysis: TryAnalysis }[] };
}
export interface PublicSession {
  voice: {
    used: number;
    allowed: number | null;
    latest: TryAnalysis | null;
    pending: boolean;
    review?: {
      flaggedWords: number;
      originalWordsRight: number;
      possibleWordsRight: number;
      referenceWords: number;
      verified: false;
    } | null;
  };
  id: string;
  level: number;
  title: string;
  source: ReadingSession['source'];
  phase: ReadingSession['phase'];
  text: string | null;
  questionIndex: number;
  total: number;
  question: { type: string; question: string; options: string[] } | null;
  feedback: { correct: boolean; correctOptions: string[]; evidence: string } | null;
  result: { correct: number; total: number; note: ReadingNote | null; levelAfter: number } | null;
}
export interface Progress {
  completed: number;
  answered: number;
  correct: number;
  focus: ComprehensionSkill | null;
  skills: Record<ComprehensionSkill, AbilitySummary>;
  history: {
    id: string;
    title: string;
    level: number;
    correct: number;
    total: number;
    at: string;
  }[];
}
export interface Snapshot {
  account: { id: string; username: string; role: 'student' | 'parent'; ageBand: string } | null;
  aiConfigured: boolean;
  learner?: {
    generation?: { status: string; retryAt: number; error: string | null } | null;
    level: number;
    placement: LearnerState['placement'];
    settings: ReadingHelp;
    microphoneConsent: boolean;
    progress: Progress;
    session: PublicSession | null;
    learning?: LearningSnapshot;
  };
  links?: { id: string; username: string; progress: boolean; analysis: boolean }[];
  children?: {
    id: string;
    username: string;
    level: number | null;
    progress: Progress | null;
    analysis:
      | {
          id: string;
          title: string;
          answers: (RecordedAnswer & { question: string })[];
          voice: TryAnalysis | null;
        }[]
      | null;
    guardian?: {
      status: GuardianRequest['status'] | 'none';
      requestId: string | null;
      under13: boolean;
    };
    decisions?: DecisionRecord[] | null;
  }[];
}
