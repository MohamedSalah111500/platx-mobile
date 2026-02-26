import { API_CONFIG } from '../config';

/**
 * Convert a relative image path from the API to a full URL.
 * The backend returns relative paths like "/storage/images/news/123.jpg"
 * which need the base API URL prepended.
 */
export function getFullImageUrl(path?: string | null): string | undefined {
  if (!path || !path.trim()) return undefined;
  const trimmed = path.trim();
  // Already a full URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  // Relative path: remove leading slash and append to base URL
  const base = API_CONFIG.BASE_URL;
  const relative = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  return `${base}${relative}`;
}
