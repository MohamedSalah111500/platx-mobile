import apiClient from './client';
import { STUDENTS_URLS, withPagination } from './endpoints';

// api/Students is paged (defaults to size=5) and has no max page size server-side.
const ALL_STUDENTS_PAGE_SIZE = 200;
const ALL_STUDENTS_MAX_PAGES = 50;

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

export interface StudentProfile {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImage?: string;
}

export const studentsApi = {
  // GET api/Students/me — resolves the caller's Student.Id from the JWT user.
  getMe: async (): Promise<StudentProfile | null> => {
    const { data } = await apiClient.get<any>(STUDENTS_URLS.ME);
    const raw = data?.data ?? data;
    const id = Number(raw?.id ?? raw?.Id);
    if (!raw || !Number.isFinite(id) || id <= 0) return null;
    return { ...raw, id };
  },

  // Fetches every student of the tenant by paging through api/Students.
  getAll: async (): Promise<TopStudent[]> => {
    const all: TopStudent[] = [];
    for (let page = 1; page <= ALL_STUDENTS_MAX_PAGES; page++) {
      const { data } = await apiClient.get<any>(
        withPagination(STUDENTS_URLS.GET_ALL, page, ALL_STUDENTS_PAGE_SIZE)
      );
      // Unpaged response — the whole list came back in one go.
      if (Array.isArray(data)) {
        all.push(...data);
        break;
      }
      const items: TopStudent[] = data?.items || data?.data || [];
      all.push(...items);
      const totalCount = Number(data?.totalCount);
      if (
        items.length < ALL_STUDENTS_PAGE_SIZE ||
        (Number.isFinite(totalCount) && all.length >= totalCount)
      ) {
        break;
      }
    }
    return all;
  },
};
