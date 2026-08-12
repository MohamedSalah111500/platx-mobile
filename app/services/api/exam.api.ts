import apiClient from './client';
import { EXAM_URLS } from './endpoints';
import type {
  OnlineExam,
  OnlineExamListItem,
  StudentExamSubmissionPayload,
  ExamResult,
  ExamHistoryItem,
} from '../../types/exam.types';

export const examApi = {
  getExamsPaged: async (page: number, size: number): Promise<{ items: OnlineExamListItem[]; totalCount: number }> => {
    const { data } = await apiClient.get<any>(EXAM_URLS.GET_PAGED(page, size));
    const items = Array.isArray(data) ? data : data?.items || data?.data || [];
    const totalCount = data?.totalCount ?? data?.total ?? items.length;
    return { items, totalCount };
  },

  getMyExamsPaged: async (page: number, size: number, search = ''): Promise<{ items: OnlineExamListItem[]; totalCount: number }> => {
    const { data } = await apiClient.get<any>(EXAM_URLS.GET_MY_EXAMS_PAGED(page, size, search));
    const items = Array.isArray(data) ? data : data?.items || data?.data || [];
    const totalCount = data?.totalCount ?? data?.total ?? items.length;
    return { items, totalCount };
  },

  // Student-side list = the student's own exam history (Admin/Staff use getExamsPaged).
  getExamHistory: async (
    studentId: number,
    page: number,
    size: number
  ): Promise<{ items: ExamHistoryItem[]; totalCount: number }> => {
    const { data } = await apiClient.get<any>(EXAM_URLS.GET_HISTORY(studentId, page, size));
    const items = Array.isArray(data) ? data : data?.items || data?.data || [];
    const totalCount = data?.totalCount ?? data?.total ?? items.length;
    return { items, totalCount };
  },

  getExamById: async (examId: number, isStudent: boolean): Promise<OnlineExam> => {
    const url = isStudent
      ? EXAM_URLS.GET_FOR_STUDENT(examId)
      : EXAM_URLS.GET_BY_ID(examId);
    const { data } = await apiClient.get<any>(url);
    return data;
  },

  deleteExam: async (examId: number): Promise<void> => {
    await apiClient.delete(EXAM_URLS.DELETE(examId));
  },

  submitExam: async (payload: StudentExamSubmissionPayload): Promise<void> => {
    await apiClient.post(EXAM_URLS.SUBMIT, payload);
  },

  getResults: async (examId: number, studentId: number): Promise<ExamResult> => {
    const { data } = await apiClient.get<any>(EXAM_URLS.GET_RESULTS(examId, studentId));
    return data;
  },
};
