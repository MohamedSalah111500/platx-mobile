import { useCallback } from 'react';
import { useAuthStore } from '../store/auth.store';
import { getUserRole, hasPermission } from '../utils/permissions';
import type { Permission } from '../utils/permissions';
import { hasModulePermission } from '../utils/modulePermissions';
import type { TRole } from '../types/auth.types';
import type { ModuleAction, PermissionModule } from '../types/people.types';

export function useAuth() {
  const store = useAuthStore();

  const role: TRole = store.user?.roles
    ? getUserRole(store.user.roles)
    : 'Student';

  const can = useCallback(
    (permission: Permission) => hasPermission(role, permission),
    [role]
  );

  const modulePermissions = store.user?.modulePermissions;
  const canModule = useCallback(
    (module: PermissionModule, action: ModuleAction) => hasModulePermission(role, modulePermissions, module, action),
    [role, modulePermissions]
  );

  const isAdmin = role === 'SuperAdmin' || role === 'Admin';
  const isStaff = role === 'Staff';
  const isStudent = role === 'Student';

  return {
    ...store,
    role,
    can,
    canModule,
    isAdmin,
    isStaff,
    isStudent,
  };
}
