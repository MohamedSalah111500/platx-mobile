import { PERMISSION_MODULES, type ModuleAction, type ModulePermission, type PermissionModule } from '../types/people.types';
import type { TRole } from '../types/auth.types';

const VIEW_DENIED_BY_DEFAULT: PermissionModule[] = ['Reports', 'Wallet', 'WhatsApp', 'Accounting'];

export function toModulePermissions(raw: unknown): ModulePermission[] {
  const list: any[] = Array.isArray(raw) ? raw : [];
  return list
    .filter((p) => PERMISSION_MODULES.includes(p?.module))
    .map((p) => ({
      module: p.module,
      canView: !!p.canView,
      canCreate: !!p.canCreate,
      canEdit: !!p.canEdit,
      canDelete: !!p.canDelete,
    }));
}

export function hasModulePermission(
  role: TRole,
  permissions: ModulePermission[] | undefined,
  module: PermissionModule,
  action: ModuleAction
): boolean {
  if (role === 'SuperAdmin' || role === 'Admin') return true;
  if (role !== 'Staff') return false;

  const permission = permissions?.find((p) => p.module === module);
  if (!permission) return action === 'view' && !VIEW_DENIED_BY_DEFAULT.includes(module);

  switch (action) {
    case 'view':
      return permission.canView;
    case 'create':
      return permission.canCreate;
    case 'edit':
      return permission.canEdit;
    case 'delete':
      return permission.canDelete;
  }
}
