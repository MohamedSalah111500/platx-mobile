import type { PhotoAsset } from './people.types';

export interface Group {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  gradeId?: number;
  gradeName?: string;
  studentsCount?: number;
  staffCount?: number;
  studentsIcons?: string[];
  isActive?: boolean;
  status?: number;
  nextDueDate?: string;
  nextDueTime?: string;
  createdAt?: string;
}

export interface StudentGroupsResponse {
  studentId: number;
  groupIds: number[];
  isAssigned: boolean;
  message: string;
}

export interface GroupMember {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  profileImage?: string;
  role?: string;
}

export interface GroupFile {
  id: number;
  name: string;
  url?: string;
  size?: number;
  type?: number;
  attachmentType?: string;
  attachementType?: number;
}

export interface SubGroup {
  id: number;
  name: string;
  icon?: string;
  groupId: number;
  studentsCount?: number;
  status?: number;
  creationTime?: string;
  nextDueDate?: string;
  nextDueTime?: string;
}

export interface StudentSubGroupsResponse {
  studentId: number;
  subGroupIds: number[];
  isAssigned: boolean;
}

export interface SubGroupLookup {
  id: number;
  name: string;
  groupId: number;
  groupName: string;
}

export const GROUP_STATUS = { Active: 0, Inactive: 1 } as const;
export type GroupStatus = (typeof GROUP_STATUS)[keyof typeof GROUP_STATUS];

export interface GroupFormValues {
  id?: number;
  name: string;
  description: string;
  status: GroupStatus;
  icon: PhotoAsset | null;
}

export interface SubGroupFormValues {
  id?: number;
  groupId: number;
  name: string;
  status: GroupStatus;
  icon: PhotoAsset | null;
}

export type MoveTarget = { kind: 'group' | 'subgroup'; id: number; label: string };

export interface CurriculumSubject {
  id: number;
  name: string;
  isCompleted: boolean;
}

export interface CurriculumUnit {
  id: number;
  name: string;
  isCompleted: boolean;
  subjects: CurriculumSubject[];
}

export interface CurriculumGrade {
  id: number;
  name: string;
  description?: string;
  isAssignedToGroup?: boolean;
  units: CurriculumUnit[];
}

export interface LibraryItem {
  id: number;
  name: string;
}
