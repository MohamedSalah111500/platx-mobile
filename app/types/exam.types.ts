export interface ExamAnswer {
  id: number;
  answerBody: string;
  isCorrect?: boolean;
}

export interface ExamUploadedFile {
  url: string;
  fileName?: string;
}

export interface StudentExamQuestion {
  id: number;
  questionBody: string;
  typeId: number; // 1 = Single Choice, 2 = Multiple Choice
  questionScore?: number;
  uploadedFile?: ExamUploadedFile | null;
  answers: ExamAnswer[];
}

export interface OnlineExam {
  id: number;
  name: string;
  onlineType: number; // 1 = Scheduled, 2 = Dynamic
  startDate?: string;
  endDate?: string;
  durationInMin?: number;
  isAnswered?: boolean;
  isShowCorrectAnswers?: boolean;
  questions: StudentExamQuestion[];
  createdAt?: string;
}

export interface ExamHistoryItem {
  studentExamId: number;
  examName: string;
  courseName?: string;
  examDate: string;
  studentScore: number;
  totalMarks: number;
  percentage: number;
  resultStatus: string;
  attemptNumber: number;
  numberOfQuestions: number;
  correctAnswersCount: number;
}

export interface OnlineExamListItem {
  id: number;
  name: string;
  onlineType?: number;
  durationInMin?: number;
  startDate?: string;
  endDate?: string;
  isAnswered?: boolean;
  isShowCorrectAnswers?: boolean;
  createdAt?: string;
}

// ── Creating an exam (staff) ──────────────────────────────────────────────
export const QUESTION_TYPE = {
  SingleChoice: 1,
  MultiChoice: 2,
  TrueFalse: 3,
  Essay: 4,
} as const;

export const EXAM_ONLINE_TYPE = {
  /** Opens at a set date and time. */
  Scheduled: 1,
  /** Available as soon as it is created. */
  Dynamic: 2,
} as const;

export interface ExamAnswerInput {
  answerBody: string;
  isCorrect: boolean;
  orderNumber: number;
}

export interface ExamQuestionInput {
  questionBody: string;
  typeId: number;
  maxScore: number;
  answers: ExamAnswerInput[];
}

export interface CreateOnlineExamPayload {
  name: string;
  /** Only multiple-choice style exams can be graded without a teacher. */
  isAutoCorrect: boolean;
  isShowCorrectAnswers: boolean;
  passMark?: number | null;
  onlineType: number;
  startDate?: string | null;
  endDate?: string | null;
  durationInMin?: number | null;
  sendToAll: boolean;
  /** Staff id of the teacher creating it, for attribution. */
  createdBy?: number | null;
  groupIds: number[];
  subGroupIds: number[];
  studentIds: number[];
  questions: ExamQuestionInput[];
}

export interface StudentExamSubmissionPayload {
  examId: number;
  studentId: number;
  startDate: string;
  questionAnswers: {
    questionId: number;
    answersId: number[];
    // Essay questions (type 4) send free text instead of answer ids.
    textAnswer?: string | null;
  }[];
}

export interface ExamAnswerResult {
  id: number;
  answerBody: string;
  isCorrect: boolean;
  isSubmittedAnswer: boolean;
  isSubmittedAnswerCorrect: boolean;
}

export interface ExamQuestionResult {
  questionId: number;
  questionText: string;
  typeId: number;
  questionScore: number;
  earnedScore: number;
  isCorrect: boolean;
  answers: ExamAnswerResult[];
  // Essay questions only: the student's text and whether the teacher still has
  // to grade it (until then isCorrect is false and earnedScore 0).
  textAnswer?: string | null;
  isPendingReview?: boolean;
}

export interface ExamResult {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  correctAnswers: number;
  incorrectAnswers: number;
  startTime?: string;
  endTime?: string;
  showCorrectAnswers?: boolean;
  questionResults: ExamQuestionResult[];
}
