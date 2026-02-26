import apiClient from './client';
import { NEWS_URLS, withPagination } from './endpoints';
import type { NewsItem } from '../../types/news.types';
import type { PaginatedResponse } from '../../types/api.types';

export const newsApi = {
  getAll: async (
    page = 1,
    size = 10,
    search?: string,
    domain?: string
  ): Promise<PaginatedResponse<NewsItem>> => {
    const { data } = await apiClient.get<any>(
      withPagination(NEWS_URLS.GET_ALL(domain || ''), page, size, search)
    );
    // reuse same extraction logic as notifications to handle nonstandard shapes
    function extractItems(data: any): { items: NewsItem[]; totalCount: number } {
      if (!data) return { items: [], totalCount: 0 };
      if (Array.isArray(data)) {
        return { items: data, totalCount: data.length };
      }
      if (Array.isArray(data.items)) {
        return { items: data.items, totalCount: data.totalCount ?? data.items.length };
      }
      if (data.data != null) {
        if (Array.isArray(data.data)) {
          return { items: data.data, totalCount: data.totalCount ?? data.data.length };
        }
        if (Array.isArray(data.data.items)) {
          return { items: data.data.items, totalCount: data.data.totalCount ?? data.data.items.length };
        }
      }
      if (data.result != null) {
        if (Array.isArray(data.result)) {
          return { items: data.result, totalCount: data.result.length };
        }
        if (Array.isArray(data.result.items)) {
          return { items: data.result.items, totalCount: data.result.totalCount ?? data.result.items.length };
        }
      }
      if (Array.isArray(data.value)) {
        return { items: data.value, totalCount: data['@odata.count'] ?? data.value.length };
      }
      return { items: [], totalCount: 0 };
    }
    const result = extractItems(data);
    console.log('[News API] got', result.items.length, 'items total', result.totalCount);
    return { items: result.items, totalCount: result.totalCount };
  },

  getSingle: async (id: number | string, domain?: string): Promise<NewsItem> => {
    try {
      const { data } = await apiClient.get<NewsItem>(NEWS_URLS.GET_SINGLE_STUDENT(id, domain || ''));
      return data;
    } catch {
      const { data } = await apiClient.get<NewsItem>(NEWS_URLS.GET_SINGLE(id, domain || ''));
      return data;
    }
  },

  create: async (formData: FormData): Promise<NewsItem> => {
    const { data } = await apiClient.post<NewsItem>(NEWS_URLS.CREATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  update: async (formData: FormData): Promise<NewsItem> => {
    const { data } = await apiClient.put<NewsItem>(NEWS_URLS.UPDATE, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  delete: async (id: number | string): Promise<void> => {
    await apiClient.delete(NEWS_URLS.DELETE(id));
  },
};
