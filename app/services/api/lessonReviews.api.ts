import apiClient from './client';
import { API_CONFIG } from '../../config';
import type { LessonReviewSort, LessonReviews, SaveLessonReview } from '../../types/lessonReview.types';

const reviewsUrl = (lessonId: number) => `${API_CONFIG.BASE_URL}api/lessons/${lessonId}/reviews`;

export const lessonReviewsApi = {
  get: async (lessonId: number, sort: LessonReviewSort, page: number, size: number): Promise<LessonReviews> =>
    (await apiClient.get<LessonReviews>(reviewsUrl(lessonId), { params: { sort, page, size } })).data,
  save: async (lessonId: number, review: SaveLessonReview): Promise<LessonReviews> =>
    (await apiClient.put<LessonReviews>(`${reviewsUrl(lessonId)}/mine`, review)).data,
  deleteMine: async (lessonId: number): Promise<void> => {
    await apiClient.delete(`${reviewsUrl(lessonId)}/mine`);
  },
  removeComment: async (lessonId: number, reviewId: number): Promise<void> => {
    await apiClient.delete(`${reviewsUrl(lessonId)}/${reviewId}/comment`);
  },
};
