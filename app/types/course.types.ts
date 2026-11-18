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
  hasFullAccess?: boolean;
  sellSectionsSeparately?: boolean;
  sellLessonsSeparately?: boolean;
  quizPolicy?: number; // 0 = not mandatory, 1 = solve only, 2 = solve and pass
  quizPolicyScope?: number;
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
  price?: number | null;
  isEnrolled?: boolean;
  isSessionUnlocked?: boolean;
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
  freePreview?: boolean;
  price?: number | null;
  isEnrolled?: boolean;
  isSessionUnlocked?: boolean;
  isCompleted?: boolean;
  isCompleated?: boolean;
  sectionId: number;
  attachementId?: number;
  attachmentContentType?: string | null;
  allowDownload?: boolean;
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
  accessScope?: number;
  course?: Course;
}

export const ACCESS_SCOPE = { Full: 0, Partial: 1 } as const;

export interface EnrollmentCodeResult {
  courseId: number;
  courseName: string;
  sectionTitle?: string | null;
  lessonTitle?: string | null;
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

export const LESSON_TYPE = {
  Video: 1,
  Document: 2,
  Exam: 3,
  File: 4,
  Link: 5,
  Divider: 6,
} as const;
export type LessonType = (typeof LESSON_TYPE)[keyof typeof LESSON_TYPE];

export const QUIZ_POLICY = { NotMandatory: 0, SolveOnly: 1, SolveAndPass: 2 } as const;
export const QUIZ_POLICY_SCOPE = { EntireCourse: 0, CurrentSection: 1 } as const;

export interface CourseFormValues {
  name: string;
  shortDescription: string;
  description: string;
  whatYouWillLearn: string;
  language: string;
  price: number;
  discountPrice: number;
  currencyCode: string;
  totalHours: number;
  previewImageUrl: string;
  previewVideoUrl: string;
  showOnHomePage: boolean;
  category: string;
  subCategory: string;
  courseTags: string;
  isFree: boolean;
  hasCertificate: boolean;
  sellSectionsSeparately: boolean;
  sellLessonsSeparately: boolean;
  quizPolicy: number;
  quizPolicyScope: number;
  startDate: string | null;
  endDate: string | null;
}

export interface ManagedLesson {
  id: number;
  sectionId: number;
  title: string;
  description: string;
  type: LessonType;
  durationInSeconds: number;
  freePreview: boolean;
  price: number | null;
  coverImageUrl: string;
  videoUrl: string;
  attachementId: number | null;
  attachmentName: string | null;
  linkUrl: string;
  openInNewTab: boolean;
  isInternalExam: boolean;
  examId: number | null;
  orderIndex: number;
}

export interface ManagedSection {
  id: number;
  courseId: number;
  title: string;
  description: string;
  freePreview: boolean;
  price: number | null;
  orderIndex: number;
  lessons: ManagedLesson[];
}

export interface SectionFormValues {
  title: string;
  description: string;
  freePreview: boolean;
  price: number;
}

export interface LessonFormValues {
  title: string;
  description: string;
  type: LessonType;
  durationInSeconds: number;
  freePreview: boolean;
  price: number;
  coverImageUrl: string;
  videoUrl: string;
  attachementId: number | null;
  linkUrl: string;
  openInNewTab: boolean;
  isInternalExam: boolean;
  examId: number | null;
}

export const ENROLLMENT_TOKEN_STATUS = { Available: 0, Used: 1, Expired: 2 } as const;
export type EnrollmentTokenStatus = (typeof ENROLLMENT_TOKEN_STATUS)[keyof typeof ENROLLMENT_TOKEN_STATUS];

export interface EnrollmentToken {
  id: number;
  courseId: number;
  courseSectionId: number | null;
  courseLessonId: number | null;
  targetTitle: string | null;
  token: string;
  serial: number;
  redeemUrl: string;
  status: EnrollmentTokenStatus;
  usedByStudentName: string | null;
  usedAt: string | null;
  expireAt: string | null;
  creationTime: string;
}

export interface EnrollmentTokenStats {
  total: number;
  available: number;
  used: number;
  expired: number;
}

export interface GenerateTokensInput {
  quantity: number;
  expireAt: string | null;
  courseSectionId: number | null;
  courseLessonId: number | null;
}

export const PROCESSED_STATUS = { Approved: 1, Rejected: 2, Cancelled: 3 } as const;

export interface ProcessedReservation {
  id: number;
  studentName: string;
  studentEmail: string | null;
  courseName: string;
  status: number;
  processedDate: string;
  adminNotes: string | null;
  receiptUrl: string | null;
  daysUntilDeletion: number;
}
