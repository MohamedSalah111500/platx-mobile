import apiClient from './client';
import { HOMEWORK_URLS, FILE_URLS } from './endpoints';
import type {
  StudentHomework,
  StudentHomeworkListItem,
  SubmitHomeworkPayload,
  HomeworkListItem,
  HomeworkSubmissionListItem,
  HomeworkReview,
  GradeHomeworkPayload,
} from '../../types/homework.types';

export const homeworkApi = {
  getMyHomeworkPaged: async (
    page = 1,
    size = 20,
    search = ''
  ): Promise<{ items: StudentHomeworkListItem[]; totalCount: number }> => {
    const { data } = await apiClient.get<any>(
      HOMEWORK_URLS.GET_MY_PAGED(search, page, size)
    );
    const items = Array.isArray(data) ? data : data?.items || data?.data || [];
    const totalCount = data?.totalCount ?? data?.total ?? items.length;
    return { items, totalCount };
  },

  getHomeworkForStudent: async (id: number): Promise<StudentHomework> => {
    const { data } = await apiClient.get<StudentHomework>(
      HOMEWORK_URLS.GET_FOR_STUDENT(id)
    );
    return data;
  },

  saveSubmission: async (payload: SubmitHomeworkPayload): Promise<void> => {
    await apiClient.post(HOMEWORK_URLS.SAVE_SUBMISSION, payload);
  },

  // ---- Teacher / Admin ----

  getHomeworkPaged: async (
    page = 1,
    size = 20,
    search = ''
  ): Promise<{ items: HomeworkListItem[]; totalCount: number }> => {
    const { data } = await apiClient.get<any>(HOMEWORK_URLS.GET_PAGED(search, page, size));
    const items = Array.isArray(data) ? data : data?.items || data?.data || [];
    const totalCount = data?.totalCount ?? data?.total ?? items.length;
    return { items, totalCount };
  },

  getSubmissionsForReview: async (homeworkId: number): Promise<HomeworkSubmissionListItem[]> => {
    const { data } = await apiClient.get<any>(HOMEWORK_URLS.GET_SUBMISSIONS_FOR_REVIEW(homeworkId));
    return Array.isArray(data) ? data : data?.items || [];
  },

  getSubmissionForReview: async (submissionId: number): Promise<HomeworkReview> => {
    const { data } = await apiClient.get<HomeworkReview>(
      HOMEWORK_URLS.GET_SUBMISSION_FOR_REVIEW(submissionId)
    );
    return data;
  },

  gradeSubmission: async (payload: GradeHomeworkPayload): Promise<void> => {
    await apiClient.post(HOMEWORK_URLS.GRADE_SUBMISSION, payload);
  },

  // Uploads one file and returns its id (for SubmitHomeworkPayload.uploadedFileIds).
  uploadFile: async (file: {
    uri: string;
    name: string;
    type: string;
  }): Promise<{ id: number; url: string }> => {
    const form = new FormData();
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
    const { data } = await apiClient.post<{ id: number; url: string }>(
      FILE_URLS.CREATE,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },
};
