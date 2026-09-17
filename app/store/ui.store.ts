import { create } from 'zustand';

export interface UpdateRequiredInfo {
  storeUrl: string;
  latestVersion: string;
  currentVersion: string;
}

interface UIState {
  updateRequired: UpdateRequiredInfo | null;
  isGlobalLoading: boolean;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info' | 'warning' | null;
}

interface UIActions {
  setUpdateRequired: (info: UpdateRequiredInfo | null) => void;
  setGlobalLoading: (loading: boolean) => void;
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning'
  ) => void;
  clearToast: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set) => ({
  updateRequired: null,
  isGlobalLoading: false,
  toastMessage: null,
  toastType: null,

  setUpdateRequired: (info: UpdateRequiredInfo | null) => set({ updateRequired: info }),

  setGlobalLoading: (loading: boolean) => set({ isGlobalLoading: loading }),

  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    set({ toastMessage: message, toastType: type });
  },

  clearToast: () => set({ toastMessage: null, toastType: null }),
}));
