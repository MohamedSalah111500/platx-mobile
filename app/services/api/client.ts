import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, STORAGE_KEYS, API_TIMEOUT } from '@config/index';
import { getDeviceHeaders } from '../storage/device.identity';
import i18n from '../../i18n/i18n.config';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management functions
let inMemoryToken: string | null = null;

export const setInMemoryToken = (token: string | null) => {
  inMemoryToken = token;
};

// Callback for 401 unauthorized - set by auth store to avoid circular imports
let onUnauthorizedCallback: (() => void) | null = null;
export const setOnUnauthorized = (cb: () => void) => {
  onUnauthorizedCallback = cb;
};

export const getToken = async (): Promise<string | null> => {
  if (inMemoryToken) return inMemoryToken;
  
  try {
    const userData = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (userData) {
      const user = JSON.parse(userData);
      return user?.token || null;
    }
    return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  } catch {
    return null;
  }
};

// Request interceptor - adds auth token and logs requests
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const token = await getToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const deviceHeaders = await getDeviceHeaders();
    Object.entries(deviceHeaders).forEach(([key, value]) => {
      config.headers.set(key, value);
    });

    // Server-side validation and device-protection messages are localized per request.
    config.headers.set('Accept-Language', i18n.language || 'ar');

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handles errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    const status = error.response?.status;
    const url = error.config?.url || 'unknown';
    const message = error.response?.data?.message || error.message || 'An error occurred';

    // Use warn for expected status codes (400/404 are common in fallback patterns)
    if (status === 404 || status === 400) {
      console.warn(`[API] ${status} ${url} - ${message}`);
    } else {
      console.error(`[API ERROR] ${status || 'NETWORK'} ${url} - ${message}`);
    }

    // Create enhanced error object
    const enhancedError = {
      ...error,
      userMessage: message,
      status,
    };

    // Only a 401 for the *current* token means the session expired. A late response
    // for a request sent with an older token (previous user / before re-login) must
    // not log out the session that's active now.
    // getToken(), not inMemoryToken: before restoreSession runs (and for calls
    // that read the token from storage) the in-memory copy is still null, and a
    // genuine 401 would otherwise be ignored and leave a dead session in place.
    const sentAuth = error.config?.headers?.Authorization;
    const currentToken = await getToken();
    const sentWithCurrentToken =
      currentToken !== null && sentAuth === `Bearer ${currentToken}`;

    if (status === 401 && sentWithCurrentToken) {
      // Token expired - force logout (only once). Clear the token synchronously so
      // concurrent 401s don't re-trigger; the auth store's callback does the full
      // storage/state cleanup shared with normal logout.
      setInMemoryToken(null);
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.CURRENT_USER,
        STORAGE_KEYS.USER_ROLES,
      ]);
      // Reset Zustand auth store so user is redirected to login
      onUnauthorizedCallback?.();
    }

    return Promise.reject(enhancedError);
  }
);

export default apiClient;
