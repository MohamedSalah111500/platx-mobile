import apiClient from './client';
import { COURSES_URLS, ONLINE_COURSE_URLS, COURSE_SECTION_URLS, COURSE_LESSON_URLS, withPagination } from './endpoints';
import type { Course, Enrollment, Lesson, Section } from '../../types/course.types';
import type { PaginatedResponse } from '../../types/api.types';

export const coursesApi = {
  getAll: async (
    page = 1,
    size = 10,
    search?: string
  ): Promise<PaginatedResponse<Course>> => {
    const { data } = await apiClient.get<any>(
      withPagination(COURSES_URLS.GET_ALL, page, size, search)
    );
    if (Array.isArray(data)) {
      return { items: data, totalCount: data.length };
    }
    return data;
  },

  getSingle: async (id: number): Promise<Course> => {
    const { data } = await apiClient.get<Course>(COURSES_URLS.GET_SINGLE(id));
    return data;
  },

  getPublic: async (
    domain: string,
    page = 1,
    size = 10
  ): Promise<PaginatedResponse<Course>> => {
    const { data } = await apiClient.get<PaginatedResponse<Course>>(
      COURSES_URLS.GET_PUBLIC(domain, page, size)
    );
    return data;
  },

  getStudentEnrollments: async (studentId: number): Promise<Enrollment[]> => {
    if (studentId == null || studentId <= 0) {
      throw new Error('studentId is required');
    }
    const { data } = await apiClient.get<Enrollment[]>(
      COURSES_URLS.GET_STUDENT_ENROLLMENTS(studentId)
    );
    return data;
  },


  enrollFree: async (courseId: number, studentId: number): Promise<void> => {
    if (studentId == null || studentId <= 0) {
      throw new Error('studentId is required to enroll');
    }
    await apiClient.post(COURSES_URLS.ENROLL_FREE(courseId, studentId));
  },

  completeLesson: async (lessonId: number): Promise<void> => {
    await apiClient.post(COURSES_URLS.COMPLETE_LESSON(lessonId));
  },

  // Online courses
  getOnlineCourses: async (
    page = 1,
    size = 10,
    search?: string
  ): Promise<PaginatedResponse<Course>> => {
    const { data } = await apiClient.get<PaginatedResponse<Course>>(
      withPagination(ONLINE_COURSE_URLS.GET_ALL, page, size, search)
    );
    // Handle both array and paginated response formats
    if (Array.isArray(data)) {
      return { items: data, totalCount: data.length };
    }
    return data;
  },

  getOnlineCourseSingle: async (id: number): Promise<Course> => {
    const { data } = await apiClient.get<Course>(ONLINE_COURSE_URLS.GET_SINGLE(id));
    return data;
  },

  getOnlineCourseLessons: async (courseId: number): Promise<Lesson[]> => {
    const { data } = await apiClient.get<Lesson[]>(
      ONLINE_COURSE_URLS.GET_LESSONS(courseId)
    );
    return data;
  },

  getCourseSections: async (courseId: number): Promise<Section[]> => {
    const { data } = await apiClient.get<any>(COURSE_SECTION_URLS.GET_BY_COURSE(courseId));
    if (Array.isArray(data)) return data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    if (data?.result && Array.isArray(data.result)) return data.result;
    if (data?.data && Array.isArray(data.data)) return data.data;
    return [];
  },

  getLessonVideo: async (lessonId: number): Promise<Lesson> => {
    const { data } = await apiClient.get<Lesson>(
      COURSE_LESSON_URLS.GET_LESSON_VIDEO(lessonId)
    );
    return data;
  },
};
