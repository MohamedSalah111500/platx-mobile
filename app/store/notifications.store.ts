import { create } from 'zustand';
import { notificationsApi } from '../services/api/notifications.api';
import type { NotificationItem } from '../types/notification.types';
import type { TRole, User } from '../types/auth.types';

// The id the role's notification endpoint filters on: Student.Id for students,
// Staff.Id for staff, nothing for admins.
export function getNotificationOwnerId(role: TRole, user: User | null | undefined): number | undefined {
  if (!user) return undefined;
  if (role === 'Student') return user.studentId;
  if (role === 'Staff') return user.staffId;
  return undefined;
}

interface NotificationsState {
  notifications: NotificationItem[];
  unreadCount: number;
  totalCount: number;
  isLoading: boolean;
  page: number;
  hasMore: boolean;
}

interface NotificationsActions {
  fetch: (role: TRole, page?: number, size?: number, ownerId?: number) => Promise<void>;
  loadMore: (role: TRole, ownerId?: number) => Promise<void>;
  addNotification: (notification: NotificationItem, countAsUnread?: boolean) => void;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
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

  fetch: async (role: TRole, page = 1, size = PAGE_SIZE, ownerId?: number) => {
    set({ isLoading: true });
    try {
      const response = await notificationsApi.getByRole(role, page, size, ownerId);
      const allItems = page === 1 ? response.items : [...get().notifications, ...response.items];
      // Only the student DTO carries IsReaded; the student count comes from
      // UnreadCount. Admin/staff notifications have no read state -> no badge.
      const unread = role === 'Student' ? get().unreadCount : 0;
      set({
        notifications: allItems,
        unreadCount: unread,
        totalCount: response.totalCount,
        page,
        hasMore: response.items.length === size,
        isLoading: false,
      });
    } catch {
      // Don't keep showing a previous (possibly other user's) list on refresh failure.
      set(page === 1
        ? { notifications: [], totalCount: 0, isLoading: false, hasMore: false }
        : { isLoading: false, hasMore: false });
    }
  },

  loadMore: async (role: TRole, ownerId?: number) => {
    const { page, hasMore, isLoading } = get();
    if (!hasMore || isLoading) return;
    await get().fetch(role, page + 1, PAGE_SIZE, ownerId);
  },

  addNotification: (notification: NotificationItem, countAsUnread = true) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: countAsUnread ? state.unreadCount + 1 : state.unreadCount,
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

  markAllAsRead: async () => {
    try {
      await notificationsApi.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isReaded: true })),
        unreadCount: 0,
      }));
    } catch {
      // silently fail
    }
  },

  fetchUnreadCount: async () => {
    try {
      const unreadCount = await notificationsApi.getUnreadCount();
      set({ unreadCount });
    } catch {
      // keep the last known count
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
      isLoading: false,
      page: 1,
      hasMore: true,
    });
  },
}));
