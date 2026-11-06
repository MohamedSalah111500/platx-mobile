import { API_CONFIG } from '../config';

export const absUrl = (url?: string | null): string => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_CONFIG.BASE_URL}${url.replace(/^\//, '')}`;
};
