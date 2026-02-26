import apiClient from './client';
import { STUDENTS_URLS } from './endpoints';

export interface TopStudent {
  id: number;
  firstName: string;
  lastName: string;
  profileImage?: string;
  email?: string;
  totalPoints?: number;
  completedCourses?: number;
  completedLessons?: number;
  rank?: number;
}

export const studentsApi = {
  getTopStudents: async (): Promise<TopStudent[]> => {
    const { data } = await apiClient.get<any>(STUDENTS_URLS.GET_TOP_STUDENTS);
    return Array.isArray(data) ? data : data?.data || data?.items || [];
  },
};
