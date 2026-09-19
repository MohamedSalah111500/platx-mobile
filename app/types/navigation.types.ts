export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  LiveClassroom: { roomId: number; isTeacher: boolean };
  LessonPlayer: {
    lessonId: number;
    courseId: number;
    isCompleted?: boolean;
    isEnrolled?: boolean;
  };
};

export type AuthStackParamList = {
  Login: undefined;
  Register: { domain?: string } | undefined;
  TenantSelection: undefined;
  ForgotPassword: undefined;
  OTPVerification: {
    email: string;
    domain: string;
    type: 'email_confirm' | 'reset_password';
    password?: string;
  };
  ResetPassword: { token: string };
};

export type MainTabParamList = {
  HomeTab: undefined;
  ExamsTab: undefined;
  ChatTab: undefined;
  ProfileTab: undefined;
};

// Stack param lists for each tab
export type CheckoutParams = {
  courseId: number;
  title?: string;
  price?: number;
  discountPrice?: number;
  currencyCode?: string;
  image?: string;
};

export type HomeStackParamList = {
  Home: undefined;
  NewsDetail: { newsId: number; newsItem?: import('./news.types').NewsItem };
  EventDetail: { eventId: number };
  CoursesList: { search?: string } | undefined;
  CourseDetail: { courseId: number };
  Checkout: CheckoutParams;
  LessonPlayer: {
    lessonId: number;
    courseId: number;
    isCompleted?: boolean;
    isEnrolled?: boolean;
  };
  Homework: undefined;
  NotificationsList: undefined;
  EnrollStudent: { courseId: number; courseName?: string };
  CourseSettings: { courseId: number; courseName?: string };
  CourseStudents: { courseId: number; courseName?: string };
  EnrollmentRequests: { courseId?: number; courseName?: string } | undefined;
  SendNotification: undefined;
};

export type CoursesStackParamList = {
  CoursesList: { search?: string } | undefined;
  CourseDetail: { courseId: number };
  Checkout: CheckoutParams;
  MyCourses: undefined;
  LessonPlayer: {
    lessonId: number;
    courseId: number;
    isCompleted?: boolean;
    isEnrolled?: boolean;
  };
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: {
    groupId: number;
    groupName: string;
    membersCount?: number;
    studentId?: number;
    staffId?: number;
    staffName?: string;
    subGroupId?: number;
    chatType?: 'group' | 'staff' | 'subgroup';
  };
};

export type NotificationsStackParamList = {
  NotificationsList: undefined;
  NotificationDetail: { notificationId: number };
};

export type ExamsStackParamList = {
  ExamsList: undefined;
  ExamTaking: { examId: number };
  ExamResult: { examId: number };
};

export type HomeworkStackParamList = {
  HomeworkList: undefined;
  HomeworkDetail: { homeworkId: number };
  HomeworkSubmissions: { homeworkId: number; homeworkName?: string };
  HomeworkReview: { submissionId: number; studentName?: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  Settings: undefined;
  ChangePassword: undefined;
  DeleteAccount: undefined;
  Groups: undefined;
  GroupDetail: { groupId: number };
  SubGroupDetail: { subGroupId: number; subGroupName?: string; groupId: number };
  LiveSessions: undefined;
  CreateLive: undefined;
  HonorBoard: undefined;
  Homework: undefined;
  Reports: undefined;
  AttendanceDetail: { groupId: number; groupName: string };
  ExamReportDetail: { examId: number; examName: string };
};
