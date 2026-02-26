import { create } from 'zustand';
import { notificationsApi } from '../services/api/notifications.api';
import type { NotificationItem } from '../types/notification.types';
import type { TRole } from '../types/auth.types';

interface NotificationsState {
  notifications: NotificationItem[];
  unreadCount: number;
  totalCount: number;
  isLoading: boolean;
  page: number;
  hasMore: boolean;
}

interface NotificationsActions {
  fetch: (role: TRole, page?: number, size?: number, studentId?: number) => Promise<void>;
  loadMore: (role: TRole, studentId?: number) => Promise<void>;
  addNotification: (notification: NotificationItem) => void;
  markAsRead: (id: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
  clear: () => void;
}

type NotificationsStore = NotificationsState & NotificationsActions;

const PAGE_SIZE = 15;

export const useNotificationsStore = create<NotificationsStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  totalCount: 0,
  isLoading: false,
  page: 1,
  hasMore: true,

  fetch: async (role: TRole, page = 1, size = PAGE_SIZE, studentId?: number) => {
    set({ isLoading: true });
    if (role === 'Student' && !studentId) {
      console.warn('[NotificationsStore] called fetch for student without studentId');
    }
    try {
      console.log('[NotificationsStore] Fetching for role:', role, 'page:', page, 'studentId:', studentId);
      const response = await notificationsApi.getByRole(role, page, size, studentId);
      console.log('[NotificationsStore] Got', response.items.length, 'items, total:', response.totalCount);
      const allItems = page === 1 ? response.items : [...get().notifications, ...response.items];
      const unread = allItems.filter((n) => !n.isReaded).length;
      set({
        notifications: allItems,
        unreadCount: unread,
        totalCount: response.totalCount,
        page,
        hasMore: response.items.length === size,
        isLoading: false,
      });
    } catch (err: any) {
      console.error('[NotificationsStore] Fetch error:', err?.message || err, 'status:', err?.status);
      set({ isLoading: false, hasMore: false });
    }
  },

  loadMore: async (role: TRole, studentId?: number) => {
    const { page, hasMore, isLoading } = get();
    if (!hasMore || isLoading) return;
    await get().fetch(role, page + 1, PAGE_SIZE, studentId);
  },

  addNotification: (notification: NotificationItem) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
      totalCount: state.totalCount + 1,
    }));
  },

  markAsRead: async (id: number) => {
    try {
      await notificationsApi.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isReaded: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {
      // silently fail
    }
  },

  remove: async (id: number) => {
    try {
      await notificationsApi.delete(id);
      set((state) => ({
        notifications: state.notifications.filter((n) => n.id !== id),
        totalCount: state.totalCount - 1,
      }));
    } catch {
      // silently fail
    }
  },

  clear: () => {
    set({
      notifications: [],
      unreadCount: 0,
      totalCount: 0,
      page: 1,
      hasMore: true,
    });
  },
}));
