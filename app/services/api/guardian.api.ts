import apiClient from './client';
import { GUARDIAN_URLS } from './endpoints';
import type {
  GuardianAttendance,
  GuardianChild,
  GuardianExamItem,
  GuardianHomeworkItem,
  GuardianNotification,
  GuardianPage,
  GuardianRedeemResponse,
  GuardianWallet,
} from '../../types/guardian.types';
import type { ExamResult } from '../../types/exam.types';
import type { StudentHomework } from '../../types/homework.types';

export const guardianApi = {
  redeem: async (code: string): Promise<GuardianRedeemResponse> =>
    (await apiClient.post<GuardianRedeemResponse>(GUARDIAN_URLS.REDEEM, { code })).data,
  children: async (): Promise<GuardianChild[]> => (await apiClient.get<GuardianChild[]>(GUARDIAN_URLS.CHILDREN)).data,
  attendance: async (studentId: number): Promise<GuardianAttendance> =>
    (await apiClient.get<GuardianAttendance>(GUARDIAN_URLS.ATTENDANCE(studentId))).data,
  exams: async (studentId: number, page: number, size: number): Promise<GuardianPage<GuardianExamItem>> =>
    (await apiClient.get<GuardianPage<GuardianExamItem>>(GUARDIAN_URLS.EXAMS(studentId), { params: { page, size } })).data,
  homework: async (studentId: number, page: number, size: number): Promise<GuardianPage<GuardianHomeworkItem>> =>
    (await apiClient.get<GuardianPage<GuardianHomeworkItem>>(GUARDIAN_URLS.HOMEWORK(studentId), { params: { page, size } })).data,
  examResult: async (studentId: number, examId: number): Promise<ExamResult> =>
    (await apiClient.get<ExamResult>(GUARDIAN_URLS.EXAM_RESULT(studentId, examId))).data,
  homeworkDetail: async (studentId: number, homeworkId: number): Promise<StudentHomework> =>
    (await apiClient.get<StudentHomework>(GUARDIAN_URLS.HOMEWORK_DETAIL(studentId, homeworkId))).data,
  wallet: async (studentId: number): Promise<GuardianWallet> =>
    (await apiClient.get<GuardianWallet>(GUARDIAN_URLS.WALLET(studentId))).data,
  notifications: async (page: number, size: number): Promise<GuardianPage<GuardianNotification>> =>
    (await apiClient.get<GuardianPage<GuardianNotification>>(GUARDIAN_URLS.NOTIFICATIONS, { params: { page, size } })).data,
  unreadCount: async (): Promise<number> => (await apiClient.get<number>(GUARDIAN_URLS.UNREAD_COUNT)).data,
  markRead: async (id: number): Promise<void> => {
    await apiClient.post(GUARDIAN_URLS.MARK_READ(id), {});
  },
  markAllRead: async (): Promise<void> => {
    await apiClient.post(GUARDIAN_URLS.MARK_ALL_READ, {});
  },
  logout: async (deviceToken: string | null): Promise<void> => {
    await apiClient.post(GUARDIAN_URLS.LOGOUT, deviceToken ? { deviceToken } : {});
  },
};
