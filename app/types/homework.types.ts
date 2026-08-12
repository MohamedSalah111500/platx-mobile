// Mirrors the backend Homework DTOs (PlatX.Application.Contracts.Models.Homework).

export enum HomeworkType {
  SolveInPlatform = 1,
  UploadFiles = 2,
  Mixed = 3,
}

export enum HomeworkGradingMode {
  TeacherOnly = 1,
  AiSuggestion = 2,
  AiOnly = 3,
}

export enum HomeworkSubmissionStatus {
  Draft = 1,
  Submitted = 2,
  Graded = 3,
}

// Shared question engine (same as exams).
export enum HomeworkQuestionType {
  SingleChoice = 1,
  MultiChoice = 2,
  TrueFalse = 3,
  Essay = 4,
}

export interface HomeworkUploadedFile {
  id: number;
  name: string;
  size: number;
  url: string;
  fileType: number;
}

export interface HomeworkAnswerOption {
  id: number;
  answerBody: string;
  isCorrect?: boolean;
  uploadedFile?: { url: string } | null;
}

export interface HomeworkQuestion {
  id: number;
  questionBody: string;
  typeId: HomeworkQuestionType;
  maxScore: number;
  answers: HomeworkAnswerOption[];
  uploadedFile?: { url: string } | null;
}

export interface HomeworkSubmissionAnswer {
  questionId: number;
  textAnswer?: string | null;
  selectedAnswerIds: number[];
  score?: number | null;
  isReviewed: boolean;
}

export interface HomeworkSubmission {
  id: number;
  homeworkId: number;
  studentId: number;
  studentName?: string | null;
  status: HomeworkSubmissionStatus;
  submittedAt?: string | null;
  aiScore?: number | null;
  aiFeedback?: string | null;
  teacherFeedbackText?: string | null;
  teacherFeedbackAudio?: HomeworkUploadedFile | null;
  finalGrade?: number | null;
  gradedAt?: string | null;
  answers: HomeworkSubmissionAnswer[];
  files: HomeworkUploadedFile[];
}

// GetHomeworkForStudent
export interface StudentHomework {
  id: number;
  name: string;
  totalScore: number;
  homeworkType: HomeworkType;
  gradingMode: HomeworkGradingMode;
  instructions?: string | null;
  isAlwaysOpen: boolean;
  dueDate?: string | null;
  isClosed: boolean;
  questions: HomeworkQuestion[];
  submission?: HomeworkSubmission | null;
}

// GetMyHomeworkPaged row
export interface StudentHomeworkListItem {
  id: number;
  name: string;
  totalScore: number;
  homeworkType: HomeworkType;
  isAlwaysOpen: boolean;
  dueDate?: string | null;
  creationTime: string;
  submissionStatus?: HomeworkSubmissionStatus | null;
  finalGrade?: number | null;
}

// SaveSubmission payload
export interface SubmitHomeworkPayload {
  homeworkId: number;
  isDraft: boolean;
  answers: {
    questionId: number;
    answerIds: number[];
    textAnswer?: string | null;
  }[];
  uploadedFileIds: number[];
}

// ---- Teacher: homework list (GetHomeworkPaged) ----
export interface HomeworkListItem {
  id: number;
  name: string;
  totalScore: number;
  homeworkType: HomeworkType;
  gradingMode: HomeworkGradingMode;
  isAlwaysOpen: boolean;
  dueDate?: string | null;
  isPublished: boolean;
  creationTime: string;
  questionsCount: number;
}

// ---- Teacher: submissions to review (GetSubmissionsForReview) ----
export interface HomeworkSubmissionListItem {
  submissionId: number;
  studentId: number;
  studentName: string;
  status: HomeworkSubmissionStatus;
  submittedAt?: string | null;
  finalGrade?: number | null;
  hasAiSuggestion: boolean;
}

// ---- Teacher: full submission review (GetSubmissionForReview) ----
export interface HomeworkReview {
  homeworkId: number;
  homeworkName: string;
  totalScore: number;
  homeworkType: HomeworkType;
  gradingMode: HomeworkGradingMode;
  instructions?: string | null;
  questions: HomeworkQuestion[];
  submission: HomeworkSubmission;
}

// ---- Teacher: grade a submission (GradeSubmission) ----
export interface GradeHomeworkPayload {
  submissionId: number;
  finalGrade: number;
  teacherFeedbackText?: string | null;
  teacherFeedbackAudioFileId?: number | null;
  questionScores: { questionId: number; score: number }[];
}
