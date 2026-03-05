import { create } from 'zustand';

interface Question {
  id: string;
  question: string;
  options: string[];
  difficulty: string;
}

interface TheoryQuestion {
  id: string;
  question: string;
}

interface ExamState {
  sessionId: string | null;
  techStackId: string | null;
  techStackName: string | null;
  currentDifficulty: string;
  currentBatch: Question[];
  currentQuestionIndex: number;
  questionsAnswered: number;
  totalMcqQuestions: number;
  timeRemaining: number;
  startTime: number | null;
  violations: number;
  isFinished: boolean;
  theoryQuestions: TheoryQuestion[];
  theoryAnswers: Record<string, string>;
  answeredQuestionIds: string[];
  mcqResponses: Array<{ questionId: string; selectedOption: string; isCorrect: boolean }>;

  setSession: (sessionId: string, techStackId: string, techStackName: string) => void;
  setCurrentBatch: (batch: Question[], difficulty: string) => void;
  setCurrentQuestionIndex: (index: number) => void;
  incrementQuestionsAnswered: () => void;
  setTimeRemaining: (time: number) => void;
  setStartTime: (time: number) => void;
  incrementViolations: () => number;
  setFinished: () => void;
  setTheoryQuestions: (questions: TheoryQuestion[]) => void;
  setTheoryAnswer: (questionId: string, answer: string) => void;
  addAnsweredQuestionId: (id: string) => void;
  addMcqResponse: (response: { questionId: string; selectedOption: string; isCorrect: boolean }) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  techStackId: null,
  techStackName: null,
  currentDifficulty: 'Easy',
  currentBatch: [],
  currentQuestionIndex: 0,
  questionsAnswered: 0,
  totalMcqQuestions: 15,
  timeRemaining: 20 * 60,
  startTime: null,
  violations: 0,
  isFinished: false,
  theoryQuestions: [],
  theoryAnswers: {},
  answeredQuestionIds: [],
  mcqResponses: [],
};

export const useExamStore = create<ExamState>()((set, get) => ({
  ...initialState,
  setSession: (sessionId, techStackId, techStackName) =>
    set({ sessionId, techStackId, techStackName }),
  setCurrentBatch: (batch, difficulty) =>
    set({ currentBatch: batch, currentDifficulty: difficulty, currentQuestionIndex: 0 }),
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
  incrementQuestionsAnswered: () =>
    set((s) => ({ questionsAnswered: s.questionsAnswered + 1 })),
  setTimeRemaining: (time) => set({ timeRemaining: time }),
  setStartTime: (time) => set({ startTime: time }),
  incrementViolations: () => {
    const newCount = get().violations + 1;
    set({ violations: newCount });
    return newCount;
  },
  setFinished: () => set({ isFinished: true }),
  setTheoryQuestions: (questions) => set({ theoryQuestions: questions }),
  setTheoryAnswer: (questionId, answer) =>
    set((s) => ({ theoryAnswers: { ...s.theoryAnswers, [questionId]: answer } })),
  addAnsweredQuestionId: (id) =>
    set((s) => ({ answeredQuestionIds: [...s.answeredQuestionIds, id] })),
  addMcqResponse: (response) =>
    set((s) => ({ mcqResponses: [...s.mcqResponses, response] })),
  reset: () => set(initialState),
}));
