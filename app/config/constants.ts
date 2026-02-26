// Agora App ID for live streaming
export const AGORA_APP_ID = 'fd628544a0454696ba4e66ad6ebc3edc';

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  CURRENT_USER: 'currentUser',
  USER_ROLES: 'roles',
  USER_TYPE: 'userType',
  THEME_MODE: 'theme_mode',
  LOCALE: 'app_locale',
  DOMAIN: 'user_domain',
} as const;

// API request timeout
export const API_TIMEOUT = 30000;

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 10;

// RTL languages
export const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'];

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
];

export default {
  AGORA_APP_ID,
  STORAGE_KEYS,
  API_TIMEOUT,
  DEFAULT_PAGE_SIZE,
  RTL_LANGUAGES,
  SUPPORTED_LANGUAGES,
};
