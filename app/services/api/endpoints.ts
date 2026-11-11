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
  APPLE_SIGNIN: `${BASE}api/Auth/apple-signin`,
  DELETE_ACCOUNT: `${BASE}api/Auth/me`,
  MOBILE_LOGIN: `${BASE}api/auth/mobile-login`,
  MOBILE_SELECT_TENANT: `${BASE}api/auth/mobile-select-tenant`,
  EXTERNAL_SIGNUP: `${BASE}api/Auth/external-signup`,
  EXTERNAL_SELECT_TENANT: `${BASE}api/Auth/external-select-tenant`,
  EXTERNAL_HANDOFF_REDEEM: `${BASE}api/Auth/external-handoff/redeem`,
};

export const REGISTRATION_SETTINGS_URLS = {
  PUBLIC: (domain: string) =>
    `${BASE}api/tenant/registration-settings?domain=${encodeURIComponent(domain)}`,
};

export const ACCOUNTING_URLS = {
  SUMMARY: `${BASE}api/accounting/summary`,
  ENTRIES: `${BASE}api/accounting/entries`,
  ENTRY: (id: number) => `${BASE}api/accounting/entries/${id}`,
  CATEGORIES: `${BASE}api/accounting/categories`,
};

export const WALLET_URLS = {
  ME: `${BASE}api/wallet/me`,
  MY_TRANSACTIONS: `${BASE}api/wallet/me/transactions`,
  REDEEM: `${BASE}api/wallet/redeem`,
  PAY_COURSE: (courseId: number) => `${BASE}api/wallet/pay/course/${courseId}`,
  PAY_LIVE: (liveClassroomId: number) => `${BASE}api/wallet/pay/live/${liveClassroomId}`,
  PAY_SECTION: (sectionId: number) => `${BASE}api/wallet/pay/section/${sectionId}`,
  PAY_LESSON: (lessonId: number) => `${BASE}api/wallet/pay/lesson/${lessonId}`,
  STUDENT: (studentId: number) => `${BASE}api/wallet/students/${studentId}`,
  STUDENT_TRANSACTIONS: (studentId: number) => `${BASE}api/wallet/students/${studentId}/transactions`,
  ADJUST: (studentId: number) => `${BASE}api/wallet/students/${studentId}/adjust`,
};

export const ENROLLMENT_CODE_URLS = {
  REDEEM: `${BASE}api/CourseEnrollmentToken/redeem`,
};

export const PROFILE_URLS = {
  PHOTO: `${BASE}api/profile/photo`,
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
  ALL: `${BASE}api/Groups/all`,
  MOVE_STUDENT: (groupId: number, studentId: number, targetGroupId: number) =>
    `${BASE}api/Groups/move-student/${groupId}/${studentId}/${targetGroupId}`,
  MOVE_STUDENT_TO_SUBGROUP: (groupId: number, studentId: number, targetSubGroupId: number) =>
    `${BASE}api/Groups/move-student-to-subgroup/${groupId}/${studentId}/${targetSubGroupId}`,
  ADD_STAFF: (groupId: number, staffId: number) => `${BASE}api/Groups/add-staff/${groupId}/${staffId}`,
  REMOVE_STAFF: (groupId: number, staffId: number) => `${BASE}api/Groups/remove-staff/${groupId}/${staffId}`,
  ASSIGN_FILES: (groupId: number) => `${BASE}api/Groups/assign-file/${groupId}`,
  UNASSIGN_FILE: (groupId: number, fileId: number) => `${BASE}api/Groups/delete-file/${groupId}/${fileId}`,
};

export const GROUP_ASSIGNMENT_URLS = {
  GRADES_WITH_PROGRESS: (groupId: number, subGroupId?: number) =>
    `${BASE}api/GroupAssignment/AllGradesWithAssignment/${groupId}${subGroupId ? `?subGroupId=${subGroupId}` : ''}`,
  PROGRESS: `${BASE}api/GroupAssignment/GradeProgress`,
  ASSIGN_GRADE: `${BASE}api/GroupAssignment/AssignGradeToGroup`,
  REMOVE: (groupId: number, subGroupId?: number) =>
    `${BASE}api/GroupAssignment/${groupId}${subGroupId ? `?subGroupId=${subGroupId}` : ''}`,
};

export const GRADES_URLS = {
  GET: `${BASE}api/Grades`,
};

export const LIBRARY_URLS = {
  ATTACHMENTS: `${BASE}api/Attachements`,
  ATTACHMENT_LOOKUP: (search: string, size: number, includeIds: number[] = []) =>
    `${BASE}api/Attachements/lookup?search=${encodeURIComponent(search)}&size=${size}` +
    includeIds.map((id) => `&includeIds=${id}`).join(''),
  GENERAL_FILE: `${BASE}api/Files`,
  VIDEO_UPLOAD: (title: string) => `${BASE}api/Media/upload?title=${encodeURIComponent(title)}`,
  MY_USAGE: `${BASE}api/SubscriptionLimits/my-usage`,
  EXAM_LOOKUP: (search: string, size: number, includeId?: number | null) =>
    `${BASE}api/ExamTemplate/lookup?search=${encodeURIComponent(search)}&size=${size}${includeId ? `&includeId=${includeId}` : ''}`,
};

// News endpoints
export const NEWS_URLS = {
  GET_ALL: (domain: string) => domain
    ? `${BASE}api/News/GetNewsListAsync?domain=${encodeURIComponent(domain)}`
    : `${BASE}api/News/GetNewsListAsync`,
  GET_SINGLE: (id: number | string, domain: string) => domain
    ? `${BASE}api/News/${id}?domain=${encodeURIComponent(domain)}`
    : `${BASE}api/News/${id}`,
  CREATE: `${BASE}api/News`,
  UPDATE: `${BASE}api/News`,
  DELETE: (id: number | string) => `${BASE}api/News/${id}`,
};

export const NEWS_COMMENTS_URLS = {
  GET_ALL: (newsId: number | string) => `${BASE}api/NewsComments/news/${newsId}`,
  CREATE: `${BASE}api/NewsComments`,
  DELETE: (commentId: number | string) => `${BASE}api/NewsComments/${commentId}`,
};

// Notifications endpoints
export const NOTIFICATIONS_URLS = {
  GET_ADMIN: `${BASE}api/Notification/GetNotificationListAsync`,
  GET_STAFF: `${BASE}api/Notification/GetStaffNotificationListAsync`,
  GET_STUDENT: `${BASE}api/Notification/GetNotificationStudentListAsync`,
  CREATE: `${BASE}api/Notification`,
  DELETE: (id: number) => `${BASE}api/Notification/${id}`,
  MARK_READ: `${BASE}api/Notification/MarkNotificationAsReadAsync`,
  MARK_ALL_READ: `${BASE}api/Notification/MarkAllNotificationsAsReadAsync`,
  UNREAD_COUNT: `${BASE}api/Notification/UnreadCount`,
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
  DELETE_MY_MESSAGE: (messageId: number) => `${BASE}api/Messages/DeleteMyMessage/${messageId}`,
  GET_STAFF_HAS_MESSAGES: `${BASE}api/Messages/GetStaffHasMessages`,
  GET_CHAT_CONTACTS: `${BASE}api/Messages/GetChatContacts`,
  GET_STUDENTS_HAVE_MESSAGES: `${BASE}api/Messages/GetStudentsHaveMessages`,
  GET_MESSAGES_WITH_STAFF: (groupId: number, staffId: number) =>
    `${BASE}api/Messages/GetMessagesWithStaff?groupId=${groupId}&staffId=${staffId}`,
  GET_MESSAGES_FOR_TEACHER_SUBGROUP: (subGroupId: number) =>
    `${BASE}api/Messages/GetMessagesForTeacherInSubGroup?subGroupId=${subGroupId}`,
  GET_MESSAGES_FOR_STUDENT_SUBGROUP: (subGroupId: number) =>
    `${BASE}api/Messages/GetMessagesForStudentInSubGroup/${subGroupId}`,
  SEND_TO_SUBGROUP: `${BASE}api/Messages/SendMessageToSubGroup`,
  SEND_TO_SUBGROUP_FROM_STUDENT: `${BASE}api/Messages/SendMessageToSubGroupFromStudent`,
  SEND_VOICE_TO_STUDENT: `${BASE}api/Messages/SendVoiceToStudent`,
  SEND_VOICE_TO_STAFF_FROM_STUDENT: `${BASE}api/Messages/SendVoiceToStaffFromStudent`,
  SEND_VOICE_TO_GROUP: `${BASE}api/Messages/SendVoiceToGroup`,
  SEND_VOICE_TO_GROUP_FROM_STUDENT: `${BASE}api/Messages/SendVoiceToGroupFromStudent`,
  SEND_VOICE_TO_SUBGROUP: `${BASE}api/Messages/SendVoiceToSubGroup`,
  SEND_VOICE_TO_SUBGROUP_FROM_STUDENT: `${BASE}api/Messages/SendVoiceToSubGroupFromStudent`,
  GET_VOICE: (messageId: number) => `${BASE}api/Messages/Voice/${messageId}`,
};

// Courses endpoints
export const COURSES_URLS = {
  GET_ALL: `${BASE}api/Course/`,
  GET_SINGLE: (id: number) => `${BASE}api/Course/${id}`,
  GET_PUBLIC: (domain: string, page: number, size: number, search?: string) => {
    const params = [`page=${page}`, `size=${size}`];
    if (domain) params.unshift(`domain=${encodeURIComponent(domain)}`);
    if (search) params.push(`search=${encodeURIComponent(search)}`);
    return `${BASE}api/Course/GetCourseForStudent?${params.join('&')}`;
  },
  SET_ACTIVE: (id: number, isActive: boolean) =>
    `${BASE}api/Course/ActiveCourse/${id}?IsActive=${isActive}`,
  UPDATE_SCHEDULE: (id: number) => `${BASE}api/Course/${id}/schedule`,
  ENROLLMENT_HISTORY: `${BASE}api/Learning/enrollment-history`,
  GET_STUDENT_COURSES: (studentId: number) => `${BASE}api/Learning/students/${studentId}/courses`,
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
  // Lesson attachments live on AttachementsController (there is no api/FileManager route).
  DOWNLOAD_FILE: (id: number) => `${BASE}api/Attachements/DownloadFile/${id}`,
  PREVIEW_FILE: (id: number) => `${BASE}api/Attachements/PreviewFile/${id}`,
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
  CREATE: `${BASE}api/CourseSection`,
  SINGLE: (id: number) => `${BASE}api/CourseSection/${id}`,
  REORDER: (id: number, newOrderIndex: number) => `${BASE}api/CourseSection/reorder/${id}?newOrderIndex=${newOrderIndex}`,
};

// Course lesson endpoints
export const COURSE_LESSON_URLS = {
  GET_LESSON_VIDEO: (lessonId: number) => `${BASE}api/CourseLesson/CheckForStudent/${lessonId}`,
  ADMIN_SINGLE: (id: number) => `${BASE}api/CourseLesson/Admin/Lesson/${id}`,
  CREATE: `${BASE}api/CourseLesson`,
  SINGLE: (id: number) => `${BASE}api/CourseLesson/${id}`,
  REORDER: (id: number, newOrderIndex: number) => `${BASE}api/CourseLesson/reorder/${id}?newOrderIndex=${newOrderIndex}`,
};

export const HOME_SETTING_URL = `${BASE}api/HomeEditor/GetHomeSetting`;

export const ENROLLMENT_TOKEN_URLS = {
  GENERATE: (courseId: number) => `${BASE}api/CourseEnrollmentToken/course/${courseId}/generate`,
  BY_COURSE: (courseId: number) => `${BASE}api/CourseEnrollmentToken/course/${courseId}`,
  STATS: (courseId: number) => `${BASE}api/CourseEnrollmentToken/course/${courseId}/stats`,
  DEACTIVATE: (id: number) => `${BASE}api/CourseEnrollmentToken/${id}/deactivate`,
  SINGLE: (id: number) => `${BASE}api/CourseEnrollmentToken/${id}`,
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
  // Agora app id, for servers whose token response does not include it.
  CONFIG: `${BASE}api/liveclassroom/config`,
  GET_ROOM: (roomId: number) => `${BASE}api/liveclassroom/${roomId}`,
  GET_PARTICIPANTS: (roomId: number) => `${BASE}api/liveclassroom/${roomId}/participants`,
  APPROVE: `${BASE}api/liveclassroom/approve`,
  REMOVE_PARTICIPANT: (id: number, studentId: number) =>
    `${BASE}api/liveclassroom/${id}/participant/${studentId}`,
  END_LIVE: `${BASE}api/liveclassroom/end`,
  // Zoom/Meet link for External live sessions (gated by approval for students).
  EXTERNAL_LINK: (id: number) => `${BASE}api/liveclassroom/${id}/external-link`,
};

export const LIVE_REALTIME_URLS = {
  SESSION: (liveId: number) => `${BASE}api/live-realtime/${liveId}/session`,
  PUBLISH: (liveId: number) => `${BASE}api/live-realtime/${liveId}/publish`,
  SUBSCRIBE: (liveId: number) => `${BASE}api/live-realtime/${liveId}/subscribe`,
  RENEGOTIATE: (liveId: number) => `${BASE}api/live-realtime/${liveId}/renegotiate`,
  CLOSE: (liveId: number) => `${BASE}api/live-realtime/${liveId}/close`,
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
  // Logged-in student's own profile — the only reliable source of Student.Id
  // (the JWT carries the Identity user GUID, not the student id).
  ME: `${BASE}api/Students/me`,
  GET_BY_ID: (id: number) => `${BASE}api/Students/${id}`,
  CREATE: `${BASE}api/Students`,
  UPDATE: `${BASE}api/Students`,
  DELETE: (id: number) => `${BASE}api/Students/${id}`,
};

export const BULK_STUDENT_IMPORT_URLS = {
  TEMPLATE: `${BASE}api/BulkStudentImport/template`,
  UPLOAD: `${BASE}api/BulkStudentImport/upload`,
  JOBS: `${BASE}api/BulkStudentImport/jobs`,
  JOB_DETAILS: (id: number) => `${BASE}api/BulkStudentImport/jobs/${id}`,
};

export const JOB_TITLES_URLS = {
  GET_ALL: `${BASE}api/JobTitles`,
};

export const DEVICE_PROTECTION_URLS = {
  STUDENT_DEVICES: (studentId: number) => `${BASE}api/device-protection/students/${studentId}/devices`,
  REMOVE_DEVICE: (studentId: number, deviceId: number) =>
    `${BASE}api/device-protection/students/${studentId}/devices/${deviceId}`,
  REVOKE_SESSIONS: (studentId: number) => `${BASE}api/device-protection/students/${studentId}/sessions/revoke`,
  BLOCK: (studentId: number) => `${BASE}api/device-protection/students/${studentId}/block`,
  UNBLOCK: (studentId: number) => `${BASE}api/device-protection/students/${studentId}/unblock`,
  ACTIVITY: (studentId: number) => `${BASE}api/device-protection/students/${studentId}/activity`,
};

export const WHATSAPP_URLS = {
  STUDENT: (studentId: number) => `${BASE}api/whatsapp/students/${studentId}`,
  STUDENT_REPORT: (studentId: number) => `${BASE}api/whatsapp/students/${studentId}/report`,
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
  GET_MY_EXAMS_PAGED: (page: number, size: number, search = '') =>
    `${BASE}api/OnlineExam/GetMyOnlineExamsPaged?search=${encodeURIComponent(search)}&page=${page}&size=${size}`,
  GET_BY_ID: (id: number) =>
    `${BASE}api/OnlineExam/GetOnlineExamById/${id}`,
  GET_FOR_STUDENT: (id: number) =>
    `${BASE}api/OnlineExam/GetOnlineExamByIdForStuden/${id}`,
  DELETE: (id: number) => `${BASE}api/OnlineExam/${id}`,
  CREATE: `${BASE}api/OnlineExam`,
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
  PERMISSIONS: (id: number) => `${BASE}api/Staffs/${id}/permissions`,
  MY_PERMISSIONS: `${BASE}api/Staffs/my-permissions`,
};

export const PLATFORM_ACCESS_URLS = {
  MY_FEATURES: `${BASE}api/SubscriptionLimits/my-features`,
  MENU_VISIBILITY: `${BASE}api/menu-visibility`,
};

// Dashboard endpoints
export const DASHBOARD_URLS = {
  GET_STATS: `${BASE}api/Dashboard/GetDashboardStats`,
};

// Reservations endpoints
export const RESERVATIONS_URLS = {
  CREATE: `${BASE}api/Reservations`,
  MY: (studentId: number) => `${BASE}api/Reservations/student/${studentId}`,
  PENDING: `${BASE}api/admin/AdminReservations/pending`,
  PROCESSED: `${BASE}api/admin/AdminReservations/processed`,
  APPROVE: (id: number | string) => `${BASE}api/admin/AdminReservations/${id}/approve`,
  REJECT: (id: number | string) => `${BASE}api/admin/AdminReservations/${id}/reject`,
  ENROLL_STUDENT: `${BASE}api/admin/AdminReservations/enroll-student`,
};

// Payment methods endpoints
export const PAYMENT_METHODS_URLS = {
  GET: `${BASE}api/PaymentDetails`,
};

// File upload
export const FILE_URLS = {
  // Backend FilesController is POST api/Files, returns { id, url }.
  CREATE: `${BASE}api/Files`,
  GET: (fileName: string) => `${BASE}api/Files/${fileName}`,
};

// Sub-group endpoints
export const SUBGROUPS_URLS = {
  LIST: (groupId: number) => `${BASE}api/SubGroups?groupId=${groupId}`,
  GET: (id: number) => `${BASE}api/SubGroups/${id}`,
  GET_STUDENTS: (subGroupId: number) => `${BASE}api/SubGroups/${subGroupId}/students`,
  ADD_STUDENT: (subGroupId: number, studentId: number) =>
    `${BASE}api/SubGroups/add-student/${subGroupId}/${studentId}`,
  REMOVE_STUDENT: (subGroupId: number, studentId: number) =>
    `${BASE}api/SubGroups/remove-student/${subGroupId}/${studentId}`,
  GET_STUDENT_SUBGROUPS: (studentId: number) =>
    `${BASE}api/SubGroups/student/${studentId}/sub-groups`,
  GET_ALL: `${BASE}api/SubGroups/all`,
  BASE: `${BASE}api/SubGroups`,
  MOVE_TO_GROUP: (subGroupId: number, studentId: number, targetGroupId: number) =>
    `${BASE}api/SubGroups/move-student-to-group/${subGroupId}/${studentId}/${targetGroupId}`,
  MOVE_TO_SUBGROUP: (subGroupId: number, studentId: number, targetSubGroupId: number) =>
    `${BASE}api/SubGroups/move-student-to-sub-group/${subGroupId}/${studentId}/${targetSubGroupId}`,
};

export const DEVICE_TOKEN_URLS = {
  REGISTER: `${BASE}api/DeviceToken/register`,
  UNREGISTER: `${BASE}api/DeviceToken/unregister`,
};

export const GUARDIAN_URLS = {
  STUDENT_CODE: (studentId: number) => `${BASE}api/guardian/students/${studentId}/code`,
  STUDENT_LINKS: (studentId: number) => `${BASE}api/guardian/students/${studentId}/links`,
  STUDENT_LINK: (studentId: number, linkId: number) => `${BASE}api/guardian/students/${studentId}/links/${linkId}`,
  REDEEM: `${BASE}api/guardian/redeem`,
  CHILDREN: `${BASE}api/guardian/children`,
  ATTENDANCE: (studentId: number) => `${BASE}api/guardian/children/${studentId}/attendance`,
  EXAMS: (studentId: number) => `${BASE}api/guardian/children/${studentId}/exams`,
  HOMEWORK: (studentId: number) => `${BASE}api/guardian/children/${studentId}/homework`,
  EXAM_RESULT: (studentId: number, examId: number) => `${BASE}api/guardian/children/${studentId}/exams/${examId}`,
  HOMEWORK_DETAIL: (studentId: number, homeworkId: number) => `${BASE}api/guardian/children/${studentId}/homework/${homeworkId}`,
  WALLET: (studentId: number) => `${BASE}api/guardian/children/${studentId}/wallet`,
  NOTIFICATIONS: `${BASE}api/guardian/notifications`,
  UNREAD_COUNT: `${BASE}api/guardian/notifications/unread-count`,
  MARK_READ: (id: number) => `${BASE}api/guardian/notifications/${id}/read`,
  MARK_ALL_READ: `${BASE}api/guardian/notifications/read-all`,
  LOGOUT: `${BASE}api/guardian/logout`,
};

// SignalR Hub URLs
export const HUB_URLS = {
  NOTIFICATIONS: `${BASE}hubs/notification`,
  LIVE_CLASSROOM: `${BASE}hubs/live-classroom`,
};

export const REPORTS_URLS = {
  ATTENDANCE: `${BASE}api/Reports/attendance`,
  ATTENDANCE_STUDENTS: (groupId: number) => `${BASE}api/Reports/attendance/${groupId}/students`,
  EXAMS: `${BASE}api/Reports/exams`,
  EXAM_STUDENTS: (examId: number) => `${BASE}api/Reports/exams/${examId}/students`,
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

export const APP_VERSION_URLS = {
  CHECK: (platform: 'android' | 'ios', version: string) =>
    `${BASE}api/AppVersion?platform=${platform}&version=${encodeURIComponent(version)}`,
};

export const CLASS_SESSION_URLS = {
  LIST: `${BASE}api/class-sessions`,
  MINE: `${BASE}api/class-sessions/mine`,
  ONE: (id: number) => `${BASE}api/class-sessions/${id}`,
  STATUS: (id: number) => `${BASE}api/class-sessions/${id}/status`,
  ROSTER: (id: number) => `${BASE}api/class-sessions/${id}/roster`,
  ATTENDANCE: (id: number) => `${BASE}api/class-sessions/${id}/attendance`,
  SCAN: (id: number) => `${BASE}api/class-sessions/${id}/attendance/scan`,
};

const STORE_BASE = `${BASE}api/store`;

export const STORE_URLS = {
  PUBLIC_STATUS: `${STORE_BASE}/public/status`,
  PUBLIC_CATEGORIES: `${STORE_BASE}/public/categories`,
  PUBLIC_PRODUCTS: `${STORE_BASE}/public/products`,
  PUBLIC_PRODUCT: (id: number) => `${STORE_BASE}/public/products/${id}`,
  PUBLIC_PRODUCTS_LOOKUP: `${STORE_BASE}/public/products/lookup`,
  ME: `${STORE_BASE}/me`,
  ORDERS: `${STORE_BASE}/orders`,
  MY_ORDERS: `${STORE_BASE}/orders/mine`,
  MY_ORDER: (id: number) => `${STORE_BASE}/orders/mine/${id}`,
  CANCEL_MY_ORDER: (id: number) => `${STORE_BASE}/orders/mine/${id}/cancel`,
  MY_ORDER_RECEIPT: (id: number) => `${STORE_BASE}/orders/mine/${id}/receipt`,
  TRANSFER_ORDERS: `${STORE_BASE}/orders/transfer`,
  ORDER: (id: number) => `${STORE_BASE}/orders/${id}`,
  ORDER_STATUS: (id: number) => `${STORE_BASE}/orders/${id}/status`,
  ORDER_RECEIPT: (id: number) => `${STORE_BASE}/orders/${id}/receipt`,
  APPROVE_PAYMENT: (id: number) => `${STORE_BASE}/orders/${id}/payment/approve`,
  REJECT_PAYMENT: (id: number) => `${STORE_BASE}/orders/${id}/payment/reject`,
  SETTINGS: `${STORE_BASE}/settings`,
  SHOW_ON_LANDING: `${STORE_BASE}/settings/show-on-landing`,
  CATEGORIES: `${STORE_BASE}/categories`,
  CATEGORY: (id: number) => `${STORE_BASE}/categories/${id}`,
  PRODUCTS: `${STORE_BASE}/products`,
  PRODUCT: (id: number) => `${STORE_BASE}/products/${id}`,
  PRODUCT_IMAGES: (id: number) => `${STORE_BASE}/products/${id}/images`,
  PRODUCT_IMAGE: (id: number, imageId: number) => `${STORE_BASE}/products/${id}/images/${imageId}`,
  PRODUCT_COVER: (id: number, imageId: number) => `${STORE_BASE}/products/${id}/images/${imageId}/cover`,
  PRODUCT_VISIBILITY: (id: number) => `${STORE_BASE}/products/${id}/visibility`,
};
