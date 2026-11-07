export const LESSON_REVIEW_SORT = {
  Newest: 0,
  Highest: 1,
  Lowest: 2,
} as const;
export type LessonReviewSort = (typeof LESSON_REVIEW_SORT)[keyof typeof LESSON_REVIEW_SORT];

export interface LessonRatingSummary {
  average: number;
  count: number;
  distribution: number[];
}

export interface LessonReviewItem {
  id: number;
  studentName: string;
  studentPhoto: string | null;
  rating: number;
  comment: string;
  createdAt: string;
  isMine: boolean;
}

export interface LessonReviews {
  summary: LessonRatingSummary;
  mine: { rating: number; comment: string | null } | null;
  canReview: boolean;
  canModerate: boolean;
  items: LessonReviewItem[];
  totalComments: number;
}

export interface SaveLessonReview {
  rating: number;
  comment: string | null;
}
