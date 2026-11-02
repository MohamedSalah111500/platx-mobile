import { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { staffApi } from '../services/api/staff.api';
import { getUserRole } from '../utils/permissions';

let refreshed = false;

export function useOwnModulePermissions() {
  const user = useAuthStore((state) => state.user);
  const setModulePermissions = useAuthStore((state) => state.setModulePermissions);
  const isStaff = !!user?.roles && getUserRole(user.roles) === 'Staff';
  const staffId = user?.staffId;

  useEffect(() => {
    if (!isStaff || !staffId || refreshed) return;
    refreshed = true;
    staffApi
      .getById(staffId)
      .then((staff) => setModulePermissions(staff.permissions))
      .catch(() => {
        refreshed = false;
      });
  }, [isStaff, staffId, setModulePermissions]);
}
