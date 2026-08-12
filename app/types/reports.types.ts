export interface AttendanceReportRow {
  groupId: number;
  groupName: string;
  sessionsCount: number;
  attendancePercentage: number;
}

export interface AttendanceStudentRow {
  studentId: number;
  studentName: string;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
}

export interface ExamReportRow {
  examId: number;
  examName: string;
  attemptsCount: number;
  successRate: number;
  averageScore: number;
}

export interface ExamStudentRow {
  studentId: number;
  studentName: string;
  score: number;
  passed: boolean;
}
