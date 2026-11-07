import { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { staffApi } from '../services/api/staff.api';
import { getUserRole } from '../utils/permissions';

let refreshed = false;

export function useOwnModulePermissions() {
  const user = useAuthStore((state) => state.user);
  const setModulePermissions = useAuthStore((state) => state.setModulePermissions);
  const isStaff = !!user?.roles && getUserRole(user.roles) === 'Staff';

  useEffect(() => {
    if (!isStaff || refreshed) return;
    refreshed = true;
    staffApi
      .getMyPermissions()
      .then(setModulePermissions)
      .catch(() => {
        refreshed = false;
      });
  }, [isStaff, setModulePermissions]);
}
