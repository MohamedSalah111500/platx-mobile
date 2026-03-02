import { API_CONFIG } from '../../config';

const BASE = API_CONFIG.BASE_URL;

// Authentication endpoints
export const AUTH_URLS = {
  LOGIN: `${BASE}api/Auth/login`,
  REGISTRATION: `${BASE}api/Auth/register-student`,
  FORGOT_PASSWORD: `${BASE}api/Auth/forgot-password`,
  RESET_PASSWORD: `${BASE}api/Auth/reset-password`,
  CONFIRM_EMAIL: `${BASE}api/Auth/confirm-email`,
  SEND_CONFIRM_EMAIL: `${BASE}api/Auth/send-confirmation-email`,
  VERIFY_OTP_RESET_PASSWORD: `${BASE}api/Auth/verify-otp-reset-password`,
  CHANGE_PASSWORD: `${BASE}api/Auth/change-password`,
  GOOGLE_SIGNIN: `${BASE}api/Auth/google-signin`,
};

// Groups endpoints
export const GROUPS_URLS = {
  BASE: `${BASE}api/Groups/`,
  GET_GROUP: (groupId: number) => `${BASE}api/Groups/${groupId}`,
  GET_GROUP_STUDENTS: (groupId: number) => `${BASE}api/Groups/${groupId}/students`,
  GET_GROUP_STAFF: (groupId: number) => `${BASE}api/Groups/${groupId}/staff`,
  GET_GROUP_FILES: (groupId: number) => `${BASE}api/Groups/${groupId}/files`,
  REMOVE_STUDENT: (groupId: string, studentId: number) =>
    `${BASE}api/Groups/remove-student/${groupId}/${studentId}`,
  ADD_STUDENT: (groupId: string, studentId: number) =>
    `${BASE}api/Groups/add-student/${groupId}/${studentId}`,
  GET_STUDENT_GROUPS: (studentId: number | string) =>
    `${BASE}api/Groups/student/${studentId}/groups`,
};

// News endpoints
export const NEWS_URLS = {
  GET_ALL: (domain: string) => `${BASE}api/News/GetNewsListAsync?domain=${encodeURIComponent(domain)}`,
  GET_SINGLE: (id: number | string, domain: string) => `${BASE}api/News/${id}?domain=${encodeURIComponent(domain)}`,
  GET_SINGLE_STUDENT: (id: number | string, domain: string) => `${BASE}api/News/GetNewsByIdForStudent/${id}?domain=${encodeURIComponent(domain)}`,
  CREATE: `${BASE}api/News`,
  UPDATE: `${BASE}api/News`,
  DELETE: (id: number | string) => `${BASE}api/News/${id}`,
};

// Notifications endpoints
export const NOTIFICATIONS_URLS = {
  GET_ADMIN: `${BASE}api/Notification/GetNotificationListAsync`,
  GET_STAFF: `${BASE}api/Notification/GetStaffNotificationListAsync`,
  GET_STUDENT: `${BASE}api/Notification/GetNotificationStudentListAsync`,
  CREATE: `${BASE}api/Notification`,
  DELETE: (id: number) => `${BASE}api/Notification/${id}`,
  MARK_READ: `${BASE}api/Notification/MarkNotificationAsReadAsync`,
};

// Chat endpoints
export const CHAT_URLS = {
  GET_MESSAGES_WITH_STUDENT: (studentId: number, groupId: number) =>
    `${BASE}api/Messages/GetMessagesWithStudent?studentId=${studentId}&groupId=${groupId}`,
  GET_MESSAGES_FOR_TEACHER: (groupId: number) =>
    `${BASE}api/Messages/GetMessagesForTeacherInGroup?groupId=${groupId}`,
  GET_MESSAGES_FOR_STUDENT: (groupId: number) =>
    `${BASE}api/Messages/GetMessagesForStudentInGroup/${groupId}`,
  SEND_TO_GROUP: `${BASE}api/Messages/SendMessageToGroup`,
  SEND_TO_STUDENT: `${BASE}api/Messages/SendMessageToStudent`,
  SEND_TO_GROUP_FROM_STUDENT: `${BASE}api/Messages/SendMessageToGroupFromStudent`,
  SEND_TO_STAFF_FROM_STUDENT: `${BASE}api/Messages/SendMessageToStaffFromStudent`,
  DELETE_MESSAGE: (messageId: number) => `${BASE}api/Messages/DeleteMessage/${messageId}`,
  GET_STAFF_HAS_MESSAGES: `${BASE}api/Messages/GetStaffHasMessages`,
  GET_MESSAGES_WITH_STAFF: (groupId: number, staffId: number) =>
    `${BASE}api/Messages/GetMessagesWithStaff?groupId=${groupId}&staffId=${staffId}`,
};

// Courses endpoints
export const COURSES_URLS = {
  GET_ALL: `${BASE}api/Course/`,
  GET_SINGLE: (id: number) => `${BASE}api/Course/${id}`,
  GET_PUBLIC: (domain: string, page: number, size: number) =>
    `${BASE}api/Course/GetCourseForStudent?domain=${domain}&page=${page}&size=${size}`,
  GET_STUDENT_ENROLLMENTS: (studentId: number) =>
    `${BASE}api/Learning/student/${studentId}/enrollments`,
  ENROLL_FREE: (courseId: number, studentId: number) =>
    `${BASE}api/Course/EnrollFreeCourse?courseId=${courseId}&studentId=${studentId}`,
  COMPLETE_LESSON: (lessonId: number) =>
    `${BASE}api/Learning/lessons/${lessonId}/complete`,
};

// Online course endpoints
export const ONLINE_COURSE_URLS = {
  GET_ALL: `${BASE}api/OnlineCourse`,
  GET_SINGLE: (id: number) => `${BASE}api/OnlineCourse/${id}`,
  CREATE: `${BASE}api/OnlineCourse`,
  UPDATE: `${BASE}api/OnlineCourse`,
  DELETE: (id: number) => `${BASE}api/OnlineCourse/${id}`,
  GET_LESSONS: (courseId: number) => `${BASE}api/OnlineCourse/${courseId}/lessons`,
};

// Course section endpoints (sections with lessons)
export const COURSE_SECTION_URLS = {
  GET_BY_COURSE: (courseId: number) => `${BASE}api/CourseSection/course/${courseId}`,
};

// Course lesson endpoints
export const COURSE_LESSON_URLS = {
  GET_LESSON_VIDEO: (lessonId: number) => `${BASE}api/CourseLesson/CheckForStudent/${lessonId}`,
};

// Live classroom endpoints
export const LIVE_URLS = {
  CREATE: `${BASE}api/liveclassroom/create`,
  JOIN: `${BASE}api/liveclassroom/join`,
  JOIN_STAFF: `${BASE}api/liveclassroom/join-staff`,
  ACTIVE: `${BASE}api/liveclassroom/active`,
  GET_TOKEN: `${BASE}api/liveclassroom/token`,
  GET_ROOM: (roomId: number) => `${BASE}api/liveclassroom/${roomId}`,
  GET_PARTICIPANTS: (roomId: number) => `${BASE}api/liveclassroom/${roomId}/participants`,
  APPROVE: `${BASE}api/liveclassroom/approve`,
  REMOVE_PARTICIPANT: (id: number, studentId: number) =>
    `${BASE}api/liveclassroom/${id}/participant/${studentId}`,
  END_LIVE: `${BASE}api/liveclassroom/end`,
};

// Events endpoints
export const EVENT_URLS = {
  GET_ALL: (date: string, viewType: number) =>
    `${BASE}api/EventDetails?date=${date}&viewType=${viewType}`,
  GET_ALL_STUDENT: (date: string, viewType: number) =>
    `${BASE}api/EventDetails/GetEventDetailsForStudent?date=${date}&viewType=${viewType}`,
  GET_SINGLE: (id: number) => `${BASE}api/EventDetails/${id}`,
  GET_SINGLE_STUDENT: (id: number) =>
    `${BASE}api/EventDetails/GetEventDetailsByIdForStudent/${id}`,
  CREATE: `${BASE}api/Events`,
  UPDATE: `${BASE}api/EventDetails`,
  DELETE: (mainEventId: number, eventDetailsId: number) =>
    `${BASE}api/EventDetails/${mainEventId}/${eventDetailsId}`,
};

// Students endpoints
export const STUDENTS_URLS = {
  GET_ALL: `${BASE}api/Students`,
  GET_BY_ID: (id: number) => `${BASE}api/Students/${id}`,
  GET_TOP_STUDENTS: `${BASE}api/Students/GetTopStudents`,
  UPDATE: `${BASE}api/Students`,
  DELETE: (id: number) => `${BASE}api/Students/${id}`,
};

// Honor Board endpoints
export const HONOR_BOARD_URLS = {
  GET: (month: number, year: number) =>
    `${BASE}api/HonorBoard?month=${month}&year=${year}`,
  SAVE: `${BASE}api/HonorBoard`,
};

// Staff endpoints
export const STAFF_URLS = {
  GET_ALL: `${BASE}api/Staffs`,
  GET_BY_ID: (id: number) => `${BASE}api/Staffs/${id}`,
  CREATE: `${BASE}api/Staffs`,
  UPDATE: `${BASE}api/Staffs`,
  DELETE: (id: number) => `${BASE}api/Staffs/${id}`,
};

// Dashboard endpoints
export const DASHBOARD_URLS = {
  GET_STATS: `${BASE}api/Dashboard/GetDashboardStats`,
};

// Reservations endpoints
export const RESERVATIONS_URLS = {
  CREATE: `${BASE}api/Reservations`,
  PENDING: `${BASE}api/admin/AdminReservations/pending`,
  APPROVE: (id: number | string) => `${BASE}api/admin/AdminReservations/${id}/approve`,
  REJECT: (id: number | string) => `${BASE}api/admin/AdminReservations/${id}/reject`,
};

// File upload
export const FILE_URLS = {
  UPLOAD: `${BASE}api/Files/upload`,
  GET: (fileName: string) => `${BASE}api/Files/${fileName}`,
};

// SignalR Hub URLs
export const HUB_URLS = {
  NOTIFICATIONS: `${BASE}hubs/notification`,
  LIVE_CLASSROOM: `${BASE}hubs/live-classroom`,
};

// Utility: append pagination params to URL
export function withPagination(
  url: string,
  page: number,
  size: number,
  search?: string
): string {
  const parts: string[] = [];
  parts.push(`page=${page}`);
  parts.push(`size=${size}`);
  if (search) {
    parts.push(`search=${encodeURIComponent(search)}`);
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${parts.join('&')}`;
}
