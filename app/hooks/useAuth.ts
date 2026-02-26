import { useCallback } from 'react';
import { useAuthStore } from '../store/auth.store';
import { getUserRole, hasPermission } from '../utils/permissions';
import type { Permission } from '../utils/permissions';
import type { TRole } from '../types/auth.types';

export function useAuth() {
  const store = useAuthStore();

  const role: TRole = store.user?.roles
    ? getUserRole(store.user.roles)
    : 'Student';

  const can = useCallback(
    (permission: Permission) => hasPermission(role, permission),
    [role]
  );

  const isAdmin = role === 'SuperAdmin' || role === 'Admin';
  const isStaff = role === 'Staff';
  const isStudent = role === 'Student';

  return {
    ...store,
    role,
    can,
    isAdmin,
    isStaff,
    isStudent,
  };
}
