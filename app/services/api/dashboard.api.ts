import apiClient from './client';
import { DASHBOARD_URLS } from './endpoints';

export interface DashboardStats {
  totalStudents: number;
  totalLecturers: number;
  totalOnlineCourses: number;
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const { data } = await apiClient.get<DashboardStats>(DASHBOARD_URLS.GET_STATS);
    return data;
  },
};
