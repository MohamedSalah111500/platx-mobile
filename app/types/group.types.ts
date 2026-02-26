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

export interface CreateGroupPayload {
  name: string;
  description?: string;
  gradeId?: number;
}
