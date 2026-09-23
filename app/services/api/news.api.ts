import apiClient from './client';
import { NEWS_URLS, NEWS_COMMENTS_URLS, withPagination } from './endpoints';
import type { NewsItem, NewsComment, CreateNewsInput } from '../../types/news.types';
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
    return { items: result.items, totalCount: result.totalCount };
  },

  // api/News/{id} (Admin/Staff). There is no student single-news endpoint.
  getSingle: async (id: number | string, domain?: string): Promise<NewsItem> => {
    const { data } = await apiClient.get<NewsItem>(NEWS_URLS.GET_SINGLE(id, domain || ''));
    return data;
  },

  // Backend NewsCreateDto is multipart: title, subtitle, description, category
  // and an optional image.
  createNews: async (input: CreateNewsInput): Promise<NewsItem> => {
    const formData = new FormData();
    formData.append('Title', input.title);
    formData.append('SubTitle', input.subTitle);
    formData.append('Description', input.description);
    formData.append('Category', input.category);
    if (input.staffId != null) formData.append('StaffId', String(input.staffId));
    if (input.image) formData.append('Image', input.image as unknown as Blob);
    return newsApi.create(formData);
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

  getComments: async (newsId: number): Promise<NewsComment[]> => {
    const { data } = await apiClient.get<NewsComment[]>(NEWS_COMMENTS_URLS.GET_ALL(newsId));
    return Array.isArray(data) ? data : [];
  },

  addComment: async (newsId: number, content: string): Promise<NewsComment> => {
    const { data } = await apiClient.post<NewsComment>(NEWS_COMMENTS_URLS.CREATE, { newsId, content });
    return data;
  },

  deleteComment: async (commentId: number): Promise<void> => {
    await apiClient.delete(NEWS_COMMENTS_URLS.DELETE(commentId));
  },
};
