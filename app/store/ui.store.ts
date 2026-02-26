import { create } from 'zustand';

interface UIState {
  isGlobalLoading: boolean;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info' | 'warning' | null;
}

interface UIActions {
  setGlobalLoading: (loading: boolean) => void;
  showToast: (
    message: string,
    type?: 'success' | 'error' | 'info' | 'warning'
  ) => void;
  clearToast: () => void;
}

type UIStore = UIState & UIActions;

export const useUIStore = create<UIStore>((set) => ({
  isGlobalLoading: false,
  toastMessage: null,
  toastType: null,

  setGlobalLoading: (loading: boolean) => set({ isGlobalLoading: loading }),

  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    set({ toastMessage: message, toastType: type });
  },

  clearToast: () => set({ toastMessage: null, toastType: null }),
}));
