export interface Course {
  id: number;
  title?: string;
  name?: string;
  description?: string;
  previewImageUrl?: string;
  price?: number;
  discountPrice?: number;
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
  sections?: Section[];
  createdAt?: string;
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
  type?: number; // 1=Video, 2=Document, 3=Exam
  duration?: number;
  order: number;
  isFree?: boolean;
  isCompleted?: boolean;
  sectionId: number;
}

export interface Enrollment {
  id: number;
  courseId: number;
  studentId: number;
  enrolledAt: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  course?: Course;
}
