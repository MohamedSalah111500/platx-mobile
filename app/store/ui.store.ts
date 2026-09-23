import { create } from 'zustand';

export interface UpdateRequiredInfo {
  storeUrl: string;
  latestVersion: string;
  currentVersion: string;
}

interface UIState {
  updateRequired: UpdateRequiredInfo | null;
  /** A newer store version exists but the current one still works. */
  updateAvailable: UpdateRequiredInfo | null;
  isGlobalLoading: boolean;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info' | 'warning' | null;
}

interface UIActions {
  setUpdateRequired: (info: UpdateRequiredInfo | null) => void;
  setUpdateAvailable: (info: UpdateRequiredInfo | null) => void;
  dismissUpdateAvailable: () => void;
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
  updateAvailable: null,
  isGlobalLoading: false,
  toastMessage: null,
  toastType: null,

  setUpdateRequired: (info: UpdateRequiredInfo | null) => set({ updateRequired: info }),

  setUpdateAvailable: (info: UpdateRequiredInfo | null) => set({ updateAvailable: info }),

  // Dismissed for this launch only: the reminder comes back next time the app starts.
  dismissUpdateAvailable: () => set({ updateAvailable: null }),

  setGlobalLoading: (loading: boolean) => set({ isGlobalLoading: loading }),

  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    set({ toastMessage: message, toastType: type });
  },

  clearToast: () => set({ toastMessage: null, toastType: null }),
}));
