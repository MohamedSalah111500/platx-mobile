import apiClient from './client';
import { CLASS_SESSION_URLS } from './endpoints';

export const SESSION_STATUS = { Scheduled: 0, Completed: 1, Cancelled: 2 } as const;
export const ATTENDANCE_STATUS = { Present: 1, Late: 2, Absent: 3, Excused: 4 } as const;
export const ATTENDANCE_STATUSES = [1, 2, 3, 4] as const;

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[keyof typeof ATTENDANCE_STATUS];

export interface AttendanceCounts {
  present: number;
  late: number;
  absent: number;
  excused: number;
}

export interface SessionContent {
  courseId: number;
  courseName: string;
  courseSectionId: number | null;
  sectionTitle: string | null;
  courseLessonId: number | null;
  lessonTitle: string | null;
}

export interface SessionListItem {
  id: number;
  title: string;
  startsAt: string;
  durationMinutes: number;
  location: string | null;
  audience: number;
  status: SessionStatus;
  targetNames: string[];
  contentCount: number;
  counts: AttendanceCounts;
}

export interface ClassSession {
  id: number;
  title: string;
  startsAt: string;
  durationMinutes: number;
  location: string | null;
  audience: number;
  status: SessionStatus;
  contents: SessionContent[];
  counts: AttendanceCounts;
}

export interface RosterItem {
  studentId: number;
  studentName: string;
  studentCode: string | null;
  phoneNumber: string | null;
  isGuest: boolean;
  status: AttendanceStatus | null;
  method: number | null;
  recordedAt: string | null;
  note: string | null;
  history: AttendanceCounts;
}

export interface ScanResult {
  student: RosterItem;
  alreadyMarked: boolean;
}

export interface MySession {
  id: number;
  title: string;
  startsAt: string;
  durationMinutes: number;
  location: string | null;
  status: SessionStatus;
  myStatus: AttendanceStatus | null;
  contents: SessionContent[];
  contentViewLimit: number | null;
}

export interface Page<T> {
  items: T[];
  totalCount: number;
}

export const sessionsApi = {
  list: async (page: number, size: number, from: string | null): Promise<Page<SessionListItem>> =>
    (await apiClient.get<Page<SessionListItem>>(CLASS_SESSION_URLS.LIST, { params: { page, size, ...(from ? { from } : {}) } })).data,
  get: async (id: number): Promise<ClassSession> => (await apiClient.get<ClassSession>(CLASS_SESSION_URLS.ONE(id))).data,
  roster: async (id: number): Promise<RosterItem[]> => (await apiClient.get<RosterItem[]>(CLASS_SESSION_URLS.ROSTER(id))).data,
  mark: async (id: number, studentId: number, status: AttendanceStatus): Promise<RosterItem[]> =>
    (await apiClient.put<RosterItem[]>(CLASS_SESSION_URLS.ATTENDANCE(id), { items: [{ studentId, status, note: null }] })).data,
  scan: async (id: number, code: string): Promise<ScanResult> =>
    (await apiClient.post<ScanResult>(CLASS_SESSION_URLS.SCAN(id), { code, status: null })).data,
  complete: async (id: number): Promise<ClassSession> =>
    (await apiClient.put<ClassSession>(CLASS_SESSION_URLS.STATUS(id), { status: SESSION_STATUS.Completed })).data,
  mine: async (page: number, size: number): Promise<Page<MySession>> =>
    (await apiClient.get<Page<MySession>>(CLASS_SESSION_URLS.MINE, { params: { page, size } })).data,
};

export const isUnlocked = (session: MySession): boolean =>
  session.status !== SESSION_STATUS.Cancelled &&
  (session.myStatus === ATTENDANCE_STATUS.Present || session.myStatus === ATTENDANCE_STATUS.Late);

export const asUtcDate = (value: string): Date => new Date(/[zZ]|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`);
