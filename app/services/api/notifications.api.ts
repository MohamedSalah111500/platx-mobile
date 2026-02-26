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
  getByRole: async (
    role: TRole,
    page = 1,
    size = 10,
    studentId?: number,
  ): Promise<NotificationResponse> => {
    // Build URL with query params
    const buildUrl = (endpoint: string, includeStudentId: boolean) => {
      const params: string[] = [];
      if (includeStudentId && studentId) {
        params.push(`studentId=${studentId}`);
      }
      params.push(`page=${page}`);
      params.push(`size=${size}`);
      const separator = endpoint.includes('?') ? '&' : '?';
      return `${endpoint}${separator}${params.join('&')}`;
    };

    let url: string;
    switch (role) {
      case 'SuperAdmin':
      case 'Admin':
        url = NOTIFICATIONS_URLS.GET_ADMIN;
        break;
      case 'Staff':
        url = NOTIFICATIONS_URLS.GET_STAFF;
        break;
      case 'Student':
      default:
        url = NOTIFICATIONS_URLS.GET_STUDENT;
        break;
    }

    if (role === 'Student' && (studentId == null || studentId <= 0)) {
      // fail fast so callers can see the problem instead of getting empty data
      const err = new Error('studentId is required for student notifications');
      // @ts-ignore
      err.status = 400;
      throw err;
    }

    const fullUrl = buildUrl(url, role === 'Student');
    console.log('[Notifications API] Fetching:', fullUrl);

    try {
      const { data } = await apiClient.get<any>(fullUrl);
      const result = extractItems(data);
      console.log('[Notifications API] Extracted', result.items.length, 'items, totalCount:', result.totalCount);

      // If we got results or this isn't a student, return as-is
      if (result.items.length > 0 || role !== 'Student') {
        return result;
      }

      // Student endpoint returned empty — try admin endpoint as fallback
      console.log('[Notifications API] Student endpoint returned empty, trying admin fallback');
      const fallbackUrl = buildUrl(NOTIFICATIONS_URLS.GET_ADMIN, false);
      const { data: fbData } = await apiClient.get<any>(fallbackUrl);
      const fbResult = extractItems(fbData);
      console.log('[Notifications API] Admin fallback got', fbResult.items.length, 'items');
      return fbResult;
    } catch (err: any) {
      // If student endpoint errored, try admin endpoint as fallback
      if (role === 'Student') {
        console.warn('[Notifications API] Student endpoint failed:', err?.message, '— trying admin fallback');
        try {
          const fallbackUrl = buildUrl(NOTIFICATIONS_URLS.GET_ADMIN, false);
          const { data: fbData } = await apiClient.get<any>(fallbackUrl);
          const fbResult = extractItems(fbData);
          console.log('[Notifications API] Admin fallback got', fbResult.items.length, 'items');
          return fbResult;
        } catch {
          // admin fallback also failed, throw original error
        }
      }
      throw err;
    }
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

  markAsRead: async (notificationId: number): Promise<void> => {
    await apiClient.post(NOTIFICATIONS_URLS.MARK_READ, { notificationId });
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(NOTIFICATIONS_URLS.DELETE(id));
  },
};
