export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  LiveClassroom: { roomId: number; isTeacher: boolean };
  LessonPlayer: { lessonId: number; courseId: number };
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
  image?: string;
};

export type HomeStackParamList = {
  Home: undefined;
  NewsDetail: { newsId: number; newsItem?: import('./news.types').NewsItem };
  EventDetail: { eventId: number };
  CoursesList: { search?: string } | undefined;
  CourseDetail: { courseId: number };
  Checkout: CheckoutParams;
  LessonPlayer: { lessonId: number; courseId: number };
  Homework: undefined;
  NotificationsList: undefined;
};

export type CoursesStackParamList = {
  CoursesList: { search?: string } | undefined;
  CourseDetail: { courseId: number };
  Checkout: CheckoutParams;
  MyCourses: undefined;
  LessonPlayer: { lessonId: number; courseId: number };
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: {
    groupId: number;
    groupName: string;
    studentId?: number;
    staffId?: number;
    staffName?: string;
    chatType?: 'group' | 'staff';
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
  Groups: undefined;
  GroupDetail: { groupId: number };
  LiveSessions: undefined;
  CreateLive: undefined;
  HonorBoard: undefined;
  Homework: undefined;
};
