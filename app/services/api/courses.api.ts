import apiClient from './client';
import { COURSES_URLS, ONLINE_COURSE_URLS, COURSE_SECTION_URLS, COURSE_LESSON_URLS, BUNNY_URLS, EXAM_ONLINE_URLS, withPagination } from './endpoints';
import type { Course, Enrollment, Lesson, Section, Quiz } from '../../types/course.types';
import type { PaginatedResponse } from '../../types/api.types';

export interface BunnyPlaybackToken {
  libraryId: string;
  videoId: string;
  token: string;
  expires: number;
  embedUrl: string;
}

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

  getEnrollment: async (studentId: number, courseId: number): Promise<Enrollment | null> => {
    if (!studentId || !courseId) return null;
    try {
      const { data } = await apiClient.get<Enrollment>(
        COURSES_URLS.GET_ENROLLMENT(studentId, courseId)
      );
      return data;
    } catch {
      return null;
    }
  },

  getQuiz: async (examId: number): Promise<Quiz> => {
    const { data } = await apiClient.get<Quiz>(
      EXAM_ONLINE_URLS.GET_QUIZ_FOR_STUDENT(examId)
    );
    return data;
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

  // Signed, short-lived embed URL for a Bunny video. The stream library has token
  // authentication enabled, so the plain embed URL 403s without this.
  getVideoPlaybackToken: async (videoId: string): Promise<BunnyPlaybackToken> => {
    const { data } = await apiClient.get<BunnyPlaybackToken>(
      BUNNY_URLS.PLAYBACK_TOKEN(videoId)
    );
    return data;
  },
};
