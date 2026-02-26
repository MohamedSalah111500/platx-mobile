export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  LiveClassroom: { roomId: number; isTeacher: boolean };
  LessonPlayer: { lessonId: number; courseId: number };
};

export type AuthStackParamList = {
  Login: { domain?: string } | undefined;
  Register: { domain?: string } | undefined;
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
  CoursesTab: undefined;
  ChatTab: undefined;
  NotificationsTab: undefined;
  ProfileTab: undefined;
};

// Stack param lists for each tab
export type HomeStackParamList = {
  Home: undefined;
  NewsDetail: { newsId: number; newsItem?: import('./news.types').NewsItem };
  EventDetail: { eventId: number };
};

export type CoursesStackParamList = {
  CoursesList: undefined;
  CourseDetail: { courseId: number };
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
};
