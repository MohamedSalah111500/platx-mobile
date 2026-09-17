export const COURSE_AVAILABILITY = {
  Available: 1,
  Upcoming: 2,
  Expired: 3,
} as const;
export type CourseAvailability = (typeof COURSE_AVAILABILITY)[keyof typeof COURSE_AVAILABILITY];

export const ENROLLMENT_STATUS = {
  Active: 0,
  Completed: 1,
  Suspended: 2,
  Cancelled: 3,
} as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUS)[keyof typeof ENROLLMENT_STATUS];

export interface Course {
  id: number;
  title?: string;
  name?: string;
  description?: string;
  previewImageUrl?: string;
  price?: number;
  discountPrice?: number;
  currencyCode?: string;
  language?: string;
  totalHours?: number;
  totalLessons?: number;
  totalSections?: number;
  instructorName?: string;
  instructorImage?: string;
  rating?: number;
  enrolledStudents?: number;
  isFree?: boolean;
  isPublished?: boolean;
  isEnrolled?: boolean;
  hasCertificate?: boolean;
  quizPolicy?: number; // 0 = not mandatory, 1 = solve only, 2 = solve and pass
  sections?: Section[];
  createdAt?: string;
  updateTime?: string;
  isEnabled?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  availability?: CourseAvailability;
}

export interface Section {
  id: number;
  title: string;
  order: number;
  lessons: Lesson[];
}

export interface Lesson {
  id: number;
  title: string;
  description?: string;
  videoUrl?: string;
  libraryId?: string;
  type?: number; // 1=Video, 2=Document, 3=Exam, 4=File, 5=Link
  duration?: number;
  order: number;
  isFree?: boolean;
  isCompleted?: boolean;
  isCompleated?: boolean;
  sectionId: number;
  attachementId?: number;
  examId?: number;
  isInternalExam?: boolean;
  linkUrl?: string | null;
  openInNewTab?: boolean;
  embedUrl?: string | null;
}

export interface Enrollment {
  id: number;
  courseId: number;
  studentId: number;
  enrolledAt: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  progressPercentage?: number;
  status?: number;
  certificateCode?: string | null;
  course?: Course;
}

export interface QuizAnswer {
  id: number;
  answerBody: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: number;
  questionBody: string;
  typeId: number; // 1 single, 2 multi, 3 true/false, 4 essay
  answers: QuizAnswer[];
}

export interface Quiz {
  id: number;
  name: string;
  passMark: number | null;
  questions: QuizQuestion[];
}

export interface EnrollmentHistoryItem {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail?: string | null;
  courseId: number;
  courseName: string;
  enrollmentDate: string;
  status: EnrollmentStatus;
  source?: number;
  progressPercentage: number;
  courseAvailability?: CourseAvailability;
}
