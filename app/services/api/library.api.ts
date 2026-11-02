import apiClient from './client';
import { LIBRARY_URLS, withPagination } from './endpoints';
import { appendFile } from './students.api';
import type { LibraryItem } from '../../types/group.types';
import type { PhotoAsset } from '../../types/people.types';

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };
const BYTES_PER_GB = 1024 * 1024 * 1024;

export const VIDEO_STORAGE_KEY = 'video_upload_gb';
export const FILE_STORAGE_KEY = 'file_storage_gb';

export type StorageKey = typeof VIDEO_STORAGE_KEY | typeof FILE_STORAGE_KEY;

export interface UploadAsset extends PhotoAsset {
  size?: number | null;
}

export interface StorageRoom {
  hasRoom: boolean;
  remainingBytes: number;
}

function attachmentType(file: UploadAsset): number {
  if (file.type?.startsWith('image/')) return 3;
  if (file.name.toLowerCase().endsWith('.pdf')) return 2;
  return 1;
}

export const libraryApi = {
  searchAttachments: async (search: string, includeIds: number[] = [], size = 20): Promise<LibraryItem[]> => {
    const { data } = await apiClient.get<any>(LIBRARY_URLS.ATTACHMENT_LOOKUP(search, size, includeIds));
    return (Array.isArray(data) ? data : []).map((x: any) => ({ id: Number(x.id), name: x.name ?? '' }));
  },

  getLibraryPage: async (search: string, page = 1, size = 20): Promise<LibraryItem[]> => {
    const { data } = await apiClient.get<any>(withPagination(LIBRARY_URLS.ATTACHMENTS, page, size, search));
    return (data?.items ?? []).map((x: any) => ({ id: Number(x.id), name: x.name ?? x.fileName ?? '' }));
  },

  searchExams: async (search: string, includeId?: number | null, size = 20): Promise<LibraryItem[]> => {
    const { data } = await apiClient.get<any>(LIBRARY_URLS.EXAM_LOOKUP(search, size, includeId));
    return (Array.isArray(data) ? data : []).map((x: any) => ({ id: Number(x.id), name: x.name ?? x.title ?? '' }));
  },

  uploadAttachment: async (file: UploadAsset): Promise<LibraryItem> => {
    const form = new FormData();
    form.append('name', file.name.replace(/\.[^/.]+$/, ''));
    form.append('attachementType', String(attachmentType(file)));
    form.append('link', '');
    appendFile(form, 'fileContent', file);
    const { data } = await apiClient.post<any>(LIBRARY_URLS.ATTACHMENTS, form, { ...MULTIPART, timeout: 0 });
    return { id: Number(data?.id), name: data?.name ?? file.name };
  },

  uploadImage: async (file: PhotoAsset): Promise<string> => {
    const form = new FormData();
    appendFile(form, 'file', file);
    const { data } = await apiClient.post<any>(LIBRARY_URLS.GENERAL_FILE, form, { ...MULTIPART, timeout: 0 });
    return data?.url ?? '';
  },

  uploadVideo: async (file: UploadAsset, title: string, onProgress: (percent: number) => void): Promise<string> => {
    const form = new FormData();
    appendFile(form, 'file', file);
    const { data } = await apiClient.post<any>(LIBRARY_URLS.VIDEO_UPLOAD(title), form, {
      ...MULTIPART,
      timeout: 0,
      onUploadProgress: (event) => {
        if (event.total) onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
      },
    });
    onProgress(100);
    return data?.videoId ?? '';
  },

  checkStorage: async (key: StorageKey, bytes: number): Promise<StorageRoom> => {
    try {
      const { data } = await apiClient.get<any>(LIBRARY_URLS.MY_USAGE);
      const item = (data?.items ?? []).find((i: any) => i.key === key);
      if (!item || item.isUnlimited) return { hasRoom: true, remainingBytes: Infinity };
      const remainingBytes = Math.max(0, Math.round(((item.limit || 0) - (item.used || 0)) * BYTES_PER_GB));
      return { hasRoom: bytes <= remainingBytes, remainingBytes };
    } catch {
      return { hasRoom: true, remainingBytes: Infinity };
    }
  },
};
