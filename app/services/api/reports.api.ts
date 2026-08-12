import apiClient from './client';
import { REPORTS_URLS } from './endpoints';
import type {
  AttendanceReportRow,
  AttendanceStudentRow,
  ExamReportRow,
  ExamStudentRow,
} from '../../types/reports.types';

export const reportsApi = {
  getAttendanceReports: async (): Promise<AttendanceReportRow[]> => {
    const { data } = await apiClient.get<AttendanceReportRow[]>(REPORTS_URLS.ATTENDANCE);
    return Array.isArray(data) ? data : [];
  },

  getGroupAttendanceReports: async (groupId: number): Promise<AttendanceStudentRow[]> => {
    const { data } = await apiClient.get<AttendanceStudentRow[]>(REPORTS_URLS.ATTENDANCE_STUDENTS(groupId));
    return Array.isArray(data) ? data : [];
  },

  getExamReports: async (): Promise<ExamReportRow[]> => {
    const { data } = await apiClient.get<ExamReportRow[]>(REPORTS_URLS.EXAMS);
    return Array.isArray(data) ? data : [];
  },

  getExamStudentReports: async (examId: number): Promise<ExamStudentRow[]> => {
    const { data } = await apiClient.get<ExamStudentRow[]>(REPORTS_URLS.EXAM_STUDENTS(examId));
    return Array.isArray(data) ? data : [];
  },
};
