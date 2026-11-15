import type { EducationStage } from '../utils/educationStages';

export const PERMISSION_MODULES = [
  'Groups',
  'Chat',
  'OnlineCourses',
  'News',
  'Notifications',
  'Exams',
  'Assignments',
  'Live',
  'Booking',
  'Reports',
  'Wallet',
  'Sessions',
  'WhatsApp',
  'ContactMessages',
  'Accounting',
  'Store',
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number];

export type ModuleAction = 'view' | 'create' | 'edit' | 'delete';

export interface ModulePermission {
  module: PermissionModule;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface GroupSummary {
  id: number;
  name: string;
}

export interface ManagedStudent {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string | null;
  address: string | null;
  phoneNumber: string | null;
  guardianPhoneNumber: string | null;
  userId: string | null;
  profileImage: string | null;
  groups: GroupSummary[];
  code: string | null;
  educationStage: EducationStage | null;
}

export interface ManagedStaff {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string | null;
  address: string | null;
  phoneNumber: string | null;
  userId: string | null;
  profileImage: string | null;
  subjectsTaught: string | null;
  groups: GroupSummary[];
  permissions: ModulePermission[];
  jobTitleId: number | null;
  jobTitleName: string | null;
}

export interface JobTitle {
  id: number;
  name: string;
}

export interface PhotoAsset {
  uri: string;
  name: string;
  type: string;
}

export interface StudentFormValues {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string | null;
  address: string;
  phoneNumber: string;
  guardianPhoneNumber: string | null;
  groupId: number | null;
  code: string | null;
  educationStage: EducationStage | null;
  photo: PhotoAsset | null;
}

export interface StaffFormValues {
  id?: number;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  address: string;
  phoneNumber: string;
  groupIds: number[];
  jobTitleId: number | null;
  photo: PhotoAsset | null;
}

export interface Paged<T> {
  items: T[];
  totalCount: number;
}

export type DeviceStatus = 'Active' | 'Removed';
export type DevicePlatform = 'Unknown' | 'Web' | 'Android' | 'IOS';

export interface UserDevice {
  id: number;
  platform: DevicePlatform;
  deviceName: string | null;
  clientInfo: string | null;
  appVersion: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  status: DeviceStatus;
}

export interface StudentDevices {
  studentId: number;
  studentName: string;
  deviceProtectionEnabled: boolean;
  maxDevices: number;
  activeDeviceCount: number;
  isBlocked: boolean;
  devices: UserDevice[];
}

export interface DeviceSecurityEvent {
  id: number;
  eventType: string;
  reason: string;
  platform: DevicePlatform;
  clientInfo: string | null;
  occurredAt: string;
}

export interface GuardianLinkCode {
  code: string;
  expiresAt: string;
  link: string;
}

export interface GuardianLink {
  id: number;
  linkedAt: string;
  lastSeenAt: string | null;
}

export const BULK_IMPORT_STATUS = {
  Queued: 1,
  Processing: 2,
  Completed: 3,
} as const;

export type BulkImportStatus = (typeof BULK_IMPORT_STATUS)[keyof typeof BULK_IMPORT_STATUS];

export interface BulkImportJob {
  id: number;
  fileName: string;
  status: BulkImportStatus;
  totalRows: number;
  succeededRows: number;
  failedRows: number;
  uploadedByName: string | null;
  creationTime: string;
  completedAt: string | null;
}

export interface BulkImportRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  studentCode: string | null;
  isSuccess: boolean;
  errorMessage: string | null;
}

export interface BulkImportJobDetail extends BulkImportJob {
  rows: BulkImportRow[];
}

export type WhatsAppDeliveryMode = 'Instant' | 'DailyDigest' | 'WeeklyDigest';
export type WhatsAppTopic = 'sendAttendance' | 'sendExamResults' | 'sendHomeworkGrades';
export const WHATSAPP_TOPICS: WhatsAppTopic[] = ['sendAttendance', 'sendExamResults', 'sendHomeworkGrades'];

export interface WhatsAppAcademySettings {
  isEnabled: boolean;
  deliveryMode: WhatsAppDeliveryMode;
  sendAttendance: boolean;
  sendExamResults: boolean;
  sendHomeworkGrades: boolean;
  countryCode: string;
}

export interface WhatsAppStudent {
  featureEnabled: boolean;
  academy: WhatsAppAcademySettings;
  studentId: number;
  guardianPhoneNumber: string | null;
  whatsAppNumber: string | null;
  isOptedOut: boolean;
  isCountryAllowed: boolean;
  isMuted: boolean;
  sendAttendance: boolean | null;
  sendExamResults: boolean | null;
  sendHomeworkGrades: boolean | null;
  deliveryMode: WhatsAppDeliveryMode | null;
}

export interface WhatsAppStudentUpdate {
  guardianPhoneNumber: string | null;
  isMuted: boolean;
  sendAttendance: boolean | null;
  sendExamResults: boolean | null;
  sendHomeworkGrades: boolean | null;
  deliveryMode: WhatsAppDeliveryMode | null;
}
