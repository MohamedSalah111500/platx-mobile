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

export interface StudentExamSubmissionPayload {
  examId: number;
  studentId: number;
  startDate: string;
  questionAnswers: {
    questionId: number;
    answersId: number[];
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
  questionBody: string;
  typeId: number;
  questionScore: number;
  earnedScore: number;
  isCorrect: boolean;
  answers: ExamAnswerResult[];
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
