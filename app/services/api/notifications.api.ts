import apiClient from './client';
import { NOTIFICATIONS_URLS } from './endpoints';
import type { NotificationResponse, NotificationItem } from '../../types/notification.types';
import type { TRole } from '../../types/auth.types';

// Extract an array of notification items from any response shape
function extractItems(data: any): { items: NotificationItem[]; totalCount: number } {
  if (!data) return { items: [], totalCount: 0 };

  // Direct array
  if (Array.isArray(data)) {
    return { items: data, totalCount: data.length };
  }

  // { items: [...], totalCount } (most common .NET paged response)
  if (Array.isArray(data.items)) {
    return { items: data.items, totalCount: data.totalCount ?? data.items.length };
  }

  // { data: [...] } or { data: { items: [...] } }
  if (data.data != null) {
    if (Array.isArray(data.data)) {
      return { items: data.data, totalCount: data.totalCount ?? data.data.length };
    }
    if (Array.isArray(data.data.items)) {
      return { items: data.data.items, totalCount: data.data.totalCount ?? data.data.items.length };
    }
  }

  // { result: [...] } or { result: { items: [...] } }
  if (data.result != null) {
    if (Array.isArray(data.result)) {
      return { items: data.result, totalCount: data.result.length };
    }
    if (Array.isArray(data.result.items)) {
      return { items: data.result.items, totalCount: data.result.totalCount ?? data.result.items.length };
    }
    // { result: { data: [...] } }
    if (Array.isArray(data.result.data)) {
      return { items: data.result.data, totalCount: data.result.totalCount ?? data.result.data.length };
    }
  }

  // { value: [...] } (OData style)
  if (Array.isArray(data.value)) {
    return { items: data.value, totalCount: data['@odata.count'] ?? data.value.length };
  }

  return { items: [], totalCount: 0 };
}

export const notificationsApi = {
  // `userId` is Student.Id for students and Staff.Id for staff (the backend binds
  // `studentId` / `staffId` as non-nullable ints, so omitting it filters on 0).
  getByRole: async (
    role: TRole,
    page = 1,
    size = 10,
    userId?: number,
  ): Promise<NotificationResponse> => {
    const params: string[] = [];
    let url: string;
    switch (role) {
      case 'SuperAdmin':
      case 'Admin':
        url = NOTIFICATIONS_URLS.GET_ADMIN;
        break;
      case 'Staff':
        url = NOTIFICATIONS_URLS.GET_STAFF;
        if (userId) params.push(`staffId=${userId}`);
        break;
      case 'Student':
      default:
        url = NOTIFICATIONS_URLS.GET_STUDENT;
        if (userId) params.push(`studentId=${userId}`);
        break;
    }
    params.push(`page=${page}`);
    params.push(`size=${size}`);
    const separator = url.includes('?') ? '&' : '?';

    // No admin-endpoint fallback: GetNotificationListAsync is Admin-only (403 for
    // students) and would show tenant-wide notifications.
    const { data } = await apiClient.get<any>(`${url}${separator}${params.join('&')}`);
    return extractItems(data);
  },

  create: async (payload: {
    title: string;
    body: string;
    sendToAll: boolean;
    groupIds?: number[];
    studentIds?: number[];
  }): Promise<void> => {
    await apiClient.post(NOTIFICATIONS_URLS.CREATE, payload);
  },

  markAsRead: async (id: number): Promise<void> => {
    await apiClient.post(NOTIFICATIONS_URLS.MARK_READ, { id });
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.post(NOTIFICATIONS_URLS.MARK_ALL_READ, {});
  },

  getUnreadCount: async (): Promise<number> => {
    const { data } = await apiClient.get<number>(NOTIFICATIONS_URLS.UNREAD_COUNT);
    return typeof data === 'number' ? data : Number(data) || 0;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(NOTIFICATIONS_URLS.DELETE(id));
  },
};
