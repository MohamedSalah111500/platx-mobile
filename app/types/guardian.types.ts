import type { AttendanceCounts, AttendanceStatus, SessionStatus } from '../services/api/sessions.api';
import type { HomeworkSubmissionStatus, HomeworkType } from './homework.types';

export interface GuardianChild {
  studentId: number;
  fullName: string;
  code: string | null;
  profileImageUrl: string | null;
  educationStage: string | null;
  academyTitle: string | null;
}

export interface GuardianRedeemResponse {
  token: string;
  expiresAt: string;
  children: GuardianChild[];
}

export interface GuardianAttendanceItem {
  sessionId: number;
  title: string;
  startsAt: string;
  sessionStatus: SessionStatus;
  status: AttendanceStatus | null;
  method: number | null;
}

export interface GuardianAttendance {
  studentId: number;
  studentName: string;
  studentCode: string | null;
  counts: AttendanceCounts;
  items: GuardianAttendanceItem[];
}

export interface GuardianExamItem {
  studentExamId: number;
  examName: string;
  courseName: string | null;
  examDate: string;
  studentScore: number;
  totalMarks: number;
  percentage: number;
  resultStatus: string;
  attemptNumber: number;
  numberOfQuestions: number;
  correctAnswersCount: number;
}

export interface GuardianHomeworkItem {
  id: number;
  name: string;
  totalScore: number;
  homeworkType: HomeworkType;
  isAlwaysOpen: boolean;
  dueDate: string | null;
  creationTime: string;
  submissionStatus: HomeworkSubmissionStatus | null;
  finalGrade: number | null;
}

export interface GuardianWallet {
  studentId: number;
  studentName: string;
  studentCode: string | null;
  balance: number;
  currencyCode: string;
}

export interface GuardianNotification {
  id: number;
  studentId: number;
  studentFirstName: string;
  type: number;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface GuardianPage<T> {
  items: T[];
  totalCount: number;
}
