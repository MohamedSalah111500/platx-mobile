import type { TRole } from '../types/auth.types';

// Permission matrix matching the web project's role-based access
export const PERMISSIONS = {
  DASHBOARD: ['SuperAdmin', 'Admin', 'Staff', 'Student'] as TRole[],
  NEWS: ['SuperAdmin', 'Admin', 'Staff', 'Student'] as TRole[],
  MANAGE_NEWS: ['SuperAdmin', 'Admin', 'Staff'] as TRole[],
  EVENTS: ['SuperAdmin', 'Admin', 'Staff', 'Student'] as TRole[],
  MANAGE_EVENTS: ['SuperAdmin', 'Admin', 'Staff'] as TRole[],
  GROUPS: ['SuperAdmin', 'Admin', 'Staff'] as TRole[],
  MY_GROUP: ['Student'] as TRole[],
  CHAT: ['SuperAdmin', 'Admin', 'Staff', 'Student'] as TRole[],
  COURSES: ['SuperAdmin', 'Admin', 'Staff'] as TRole[],
  ONLINE_COURSES: ['SuperAdmin', 'Admin', 'Staff', 'Student'] as TRole[],
  MANAGE_COURSES: ['SuperAdmin', 'Admin', 'Staff'] as TRole[],
  NOTIFICATIONS: ['SuperAdmin', 'Admin', 'Staff', 'Student'] as TRole[],
  NOTIFICATIONS_CREATE: ['SuperAdmin', 'Admin', 'Staff'] as TRole[],
  LIVE_CLASSROOM: ['SuperAdmin', 'Admin', 'Staff', 'Student'] as TRole[],
  LIVE_CREATE: ['SuperAdmin', 'Admin', 'Staff'] as TRole[],
  STUDENTS_MANAGE: ['SuperAdmin', 'Admin', 'Staff'] as TRole[],
  STAFF_MANAGE: ['SuperAdmin', 'Admin'] as TRole[],
  ADMIN_PANEL: ['SuperAdmin', 'Admin'] as TRole[],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(userRole: TRole, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(userRole);
}

export function getUserRole(roles: TRole[]): TRole {
  // Return the highest priority role
  const priority: TRole[] = ['SuperAdmin', 'Admin', 'Staff', 'Student'];
  for (const role of priority) {
    if (roles.includes(role)) return role;
  }
  return 'Student';
}
