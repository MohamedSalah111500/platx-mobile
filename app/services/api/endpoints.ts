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
  MOBILE_LOGIN: `${BASE}api/auth/mobile-login`,
  MOBILE_SELECT_TENANT: `${BASE}api/auth/mobile-select-tenant`,
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
  GET_ALL: (domain: string) => domain
    ? `${BASE}api/News/GetNewsListAsync?domain=${encodeURIComponent(domain)}`
    : `${BASE}api/News/GetNewsListAsync`,
  GET_SINGLE: (id: number | string, domain: string) => domain
    ? `${BASE}api/News/${id}?domain=${encodeURIComponent(domain)}`
    : `${BASE}api/News/${id}`,
  GET_SINGLE_STUDENT: (id: number | string, domain: string) => domain
    ? `${BASE}api/News/GetNewsByIdForStudent/${id}?domain=${encodeURIComponent(domain)}`
    : `${BASE}api/News/GetNewsByIdForStudent/${id}`,
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
  GET_PUBLIC: (domain: string, page: number, size: number) => {
    const params = [`page=${page}`, `size=${size}`];
    if (domain) params.unshift(`domain=${encodeURIComponent(domain)}`);
    return `${BASE}api/Course/GetCourseForStudent?${params.join('&')}`;
  },
  GET_STUDENT_ENROLLMENTS: (studentId: number) =>
    `${BASE}api/Learning/student/${studentId}/enrollments`,
  GET_ENROLLMENT: (studentId: number, courseId: number) =>
    `${BASE}api/Learning/student/${studentId}/courses/${courseId}/enrollment`,
  ENROLL_FREE: (courseId: number, studentId: number) =>
    `${BASE}api/Course/EnrollFreeCourse?courseId=${courseId}&studentId=${studentId}`,
  COMPLETE_LESSON: (lessonId: number) =>
    `${BASE}api/Learning/lessons/${lessonId}/complete`,
};

export const EXAM_ONLINE_URLS = {
  GET_QUIZ_FOR_STUDENT: (examId: number) =>
    `${BASE}api/OnlineExam/GetQuizForStudent/${examId}`,
};

export const CERTIFICATE_URLS = {
  VERIFY: (code: string) => `${BASE}api/certificates/verify/${code}`,
  PDF: (code: string) => `${BASE}api/certificates/${code}/pdf`,
  // Public web page for viewing/sharing a certificate.
  WEB_VERIFY: (code: string) => `https://platx.net/verify/${code}`,
};

export const FILE_MANAGER_URLS = {
  DOWNLOAD_FILE: (id: number) => `${BASE}api/FileManager/DownloadFile/${id}`,
};

// Online course endpoints.
// NOTE: there is no `api/OnlineCourse` controller on the backend — online courses
// are served by the Course/CourseSection/CourseLesson controllers (same as web).
export const ONLINE_COURSE_URLS = {
  GET_ALL: `${BASE}api/Course`,
  GET_SINGLE: (id: number) => `${BASE}api/Course/${id}`,
  CREATE: `${BASE}api/Course`,
  UPDATE: `${BASE}api/Course`,
  DELETE: (id: number) => `${BASE}api/Course/${id}`,
  // Lessons come nested inside sections (CourseSectionDto.Lessons) via COURSE_SECTION_URLS.
  GET_LESSONS: (courseId: number) => `${BASE}api/CourseSection/course/${courseId}`,
};

// Course section endpoints (sections with lessons)
export const COURSE_SECTION_URLS = {
  GET_BY_COURSE: (courseId: number) => `${BASE}api/CourseSection/course/${courseId}`,
};

// Course lesson endpoints
export const COURSE_LESSON_URLS = {
  GET_LESSON_VIDEO: (lessonId: number) => `${BASE}api/CourseLesson/CheckForStudent/${lessonId}`,
};

// Bunny video streaming endpoints
export const BUNNY_URLS = {
  // Short-lived signed embed URL so token-protected videos don't 403.
  PLAYBACK_TOKEN: (videoId: string) => `${BASE}api/Bunny/playback-token/${videoId}`,
};

// Homework endpoints
export const HOMEWORK_URLS = {
  // Student
  GET_MY_PAGED: (search: string, page: number, size: number) =>
    `${BASE}api/Homework/GetMyHomeworkPaged?search=${encodeURIComponent(search)}&page=${page}&size=${size}`,
  GET_FOR_STUDENT: (id: number) => `${BASE}api/Homework/GetHomeworkForStudent/${id}`,
  SAVE_SUBMISSION: `${BASE}api/Homework/SaveSubmission`,
  // Teacher / Admin
  GET_PAGED: (search: string, page: number, size: number) =>
    `${BASE}api/Homework/GetHomeworkPaged?search=${encodeURIComponent(search)}&page=${page}&size=${size}`,
  GET_SUBMISSIONS_FOR_REVIEW: (homeworkId: number) =>
    `${BASE}api/Homework/GetSubmissionsForReview/${homeworkId}`,
  GET_SUBMISSION_FOR_REVIEW: (submissionId: number) =>
    `${BASE}api/Homework/GetSubmissionForReview/${submissionId}`,
  GRADE_SUBMISSION: `${BASE}api/Homework/GradeSubmission`,
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
  // Zoom/Meet link for External live sessions (gated by approval for students).
  EXTERNAL_LINK: (id: number) => `${BASE}api/liveclassroom/${id}/external-link`,
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

// Exam endpoints
export const EXAM_URLS = {
  GET_PAGED: (page: number, size: number) =>
    `${BASE}api/OnlineExam/GetOnlineExamsPaged?page=${page}&size=${size}`,
  GET_BY_ID: (id: number) =>
    `${BASE}api/OnlineExam/GetOnlineExamById/${id}`,
  GET_FOR_STUDENT: (id: number) =>
    `${BASE}api/OnlineExam/GetOnlineExamByIdForStuden/${id}`,
  DELETE: (id: number) => `${BASE}api/OnlineExam/${id}`,
  SUBMIT: `${BASE}api/OnlineExam/SubmitOnlineExamAsync`,
  GET_RESULTS: (examId: number, studentId: number) =>
    `${BASE}api/OnlineExam/GetExamResultsForStudent?examId=${examId}&studentId=${studentId}`,
  GET_ALL_RESULTS: (examId: number) =>
    `${BASE}api/OnlineExam/GetExamResultsAllStudents/${examId}?studentName=&submissionDateFrom=&submissionDateTo=`,
  // Student-accessible list: the student's own exam history (GetOnlineExamsPaged is Admin/Staff only).
  GET_HISTORY: (studentId: number, page: number, size: number) =>
    `${BASE}api/ExamHistory?studentId=${studentId}&page=${page}&size=${size}`,
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

// Payment methods endpoints
export const PAYMENT_METHODS_URLS = {
  GET: `${BASE}api/PaymentDetails`,
};

// File upload
export const FILE_URLS = {
  UPLOAD: `${BASE}api/Files/upload`,
  // Backend FilesController is POST api/Files, returns { id, url }.
  CREATE: `${BASE}api/Files`,
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
