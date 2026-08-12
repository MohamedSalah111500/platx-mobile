import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, API_CONFIG } from '../config';
import { authApi } from '../services/api/auth.api';
import { setInMemoryToken, setOnUnauthorized } from '../services/api/client';
import { signalRService } from '../services/realtime/signalr.service';
import { extractNumericId, extractTenantDomain } from '../utils/jwt';
import { logger } from '../services/logger';
import type {
  User,
  LoginResponse,
  MobileLoginPayload,
  RegisterPayload,
  EmailConfirmPayload,
  GoogleSignInPayload,
  TenantInfo,
} from '../types/auth.types';

interface AuthState {
  user: User | null;
  token: string | null;
  domain: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  pendingTenants: TenantInfo[] | null;
  pendingCredentials: { userName: string; password: string } | null;
  tenantName: string | null;
  tenantLogo: string | null;
  showWelcome: boolean;
}

interface AuthActions {
  login: (payload: MobileLoginPayload) => Promise<void>;
  selectTenant: (tenantId: string) => Promise<void>;
  clearPendingTenants: () => void;
  googleLogin: (payload: GoogleSignInPayload, domain: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  confirmEmail: (payload: EmailConfirmPayload) => Promise<void>;
  forgotPassword: (username: string, domain: string) => Promise<void>;
  verifyOtpResetPassword: (
    payload: EmailConfirmPayload
  ) => Promise<{ token: string }>;
  resetPassword: (
    password: string,
    confirmPassword: string,
    token: string
  ) => Promise<void>;
  restoreSession: () => Promise<void>;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  dismissWelcome: () => void;
}

type AuthStore = AuthState & AuthActions;

function processAuthResponse(response: LoginResponse): { user: User; domain: string | null } {
  const jwtNumericId = extractNumericId(response.token);
  const _resp: any = response;
  const numericId =
    jwtNumericId ??
    _resp.student?.id ??
    _resp.staff?.id ??
    (typeof response.userId === 'number'
      ? response.userId
      : typeof response.userId === 'string' && /^\d+$/.test(response.userId)
      ? Number(response.userId)
      : undefined) ??
    response.id;

  const domain =
    _resp.domain ||
    _resp.tenantDomain ||
    extractTenantDomain(response.token) ||
    null;

  return {
    user: {
      userId: response.userId,
      userName: response.userName,
      email: response.email,
      firstName: response.firstName,
      lastName: response.lastName,
      roles: response.roles,
      isEmailConfirmed: response.isEmailConfirmed,
      tenantActive: response.tenantActive,
      token: response.token,
      studentId: numericId,
      profileImage: _resp.student?.profileImage ?? _resp.staff?.profileImage ?? undefined,
    },
    domain,
  };
}

function resolveLogoUrl(logoUrl?: string | null): string | null {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('http')) return logoUrl;
  return `${API_CONFIG.BASE_URL}${logoUrl.startsWith('/') ? logoUrl.slice(1) : logoUrl}`;
}

async function persistAndSetAuth(
  set: (state: Partial<AuthState>) => void,
  user: User,
  token: string,
  domain?: string,
  branding?: { tenantName?: string | null; tenantLogo?: string | null }
) {
  const tenantName = branding?.tenantName ?? null;
  const tenantLogo = resolveLogoUrl(branding?.tenantLogo);

  await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  await AsyncStorage.setItem(STORAGE_KEYS.USER_ROLES, JSON.stringify(user.roles));
  if (domain) {
    await AsyncStorage.setItem(STORAGE_KEYS.DOMAIN, domain);
  }
  if (tenantName) {
    await AsyncStorage.setItem(STORAGE_KEYS.TENANT_NAME, tenantName);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.TENANT_NAME);
  }
  if (tenantLogo) {
    await AsyncStorage.setItem(STORAGE_KEYS.TENANT_LOGO, tenantLogo);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.TENANT_LOGO);
  }
  setInMemoryToken(token);
  set({
    user,
    token,
    domain: domain || null,
    isAuthenticated: true,
    isLoading: false,
    pendingTenants: null,
    pendingCredentials: null,
    tenantName,
    tenantLogo,
    showWelcome: true,
  });
  // Tag user in Crashlytics for filtering crash reports
  if (user.userId) {
    logger.setUserId(String(user.userId));
  }
  if (domain) {
    logger.setAttribute('domain', domain);
  }
  signalRService.startConnection().catch(() => {});
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,
  domain: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  pendingTenants: null,
  pendingCredentials: null,
  tenantName: null,
  tenantLogo: null,
  showWelcome: false,

  login: async (payload: MobileLoginPayload) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.mobileLogin(payload);

      if (!response.requiresTenantSelection && response.authResponse) {
        const { user, domain } = processAuthResponse(response.authResponse);
        // Single-tenant login returns the tenant (with logo) in tenants[0].
        const branding = response.tenants?.[0];
        await persistAndSetAuth(set, user, response.authResponse.token, domain || undefined, {
          tenantName: branding?.tenantName,
          tenantLogo: branding?.logoUrl,
        });
      } else if (response.requiresTenantSelection && response.tenants) {
        set({
          isLoading: false,
          pendingTenants: response.tenants,
          pendingCredentials: { userName: payload.userName, password: payload.password },
        });
      } else {
        set({
          error: response.message || 'Login failed.',
          isLoading: false,
        });
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.userMessage ||
        'Login failed. Please check your credentials.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  selectTenant: async (tenantId: string) => {
    const { pendingCredentials } = get();
    if (!pendingCredentials) return;

    try {
      set({ isLoading: true, error: null });
      const response = await authApi.mobileSelectTenant({
        userName: pendingCredentials.userName,
        password: pendingCredentials.password,
        tenantId,
      });

      if (response.authResponse) {
        const selected = get().pendingTenants?.find((t) => t.tenantId === tenantId);
        const { user, domain } = processAuthResponse(response.authResponse);
        await persistAndSetAuth(set, user, response.authResponse.token, domain || undefined, {
          tenantName: selected?.tenantName,
          tenantLogo: selected?.logoUrl,
        });
      } else {
        set({
          error: response.message || 'Tenant selection failed.',
          isLoading: false,
        });
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.userMessage ||
        'Tenant selection failed.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  clearPendingTenants: () => {
    set({ pendingTenants: null, pendingCredentials: null, error: null });
  },

  googleLogin: async (payload: GoogleSignInPayload, domain: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.googleSignIn(payload);
      const { user, domain: resDomain } = processAuthResponse(response);
      await persistAndSetAuth(set, user, response.token, resDomain || domain);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.userMessage ||
        'Google sign-in failed.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  register: async (payload: RegisterPayload) => {
    try {
      set({ isLoading: true, error: null });
      await authApi.register(payload);
      set({ isLoading: false });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.userMessage ||
        'Registration failed.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    signalRService.stopConnection().catch(() => {});
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.CURRENT_USER,
      STORAGE_KEYS.USER_ROLES,
      STORAGE_KEYS.DOMAIN,
      STORAGE_KEYS.TENANT_NAME,
      STORAGE_KEYS.TENANT_LOGO,
    ]);
    setInMemoryToken(null);
    set({
      user: null,
      token: null,
      domain: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      pendingTenants: null,
      pendingCredentials: null,
      tenantName: null,
      tenantLogo: null,
      showWelcome: false,
    });
  },

  confirmEmail: async (payload: EmailConfirmPayload) => {
    try {
      set({ isLoading: true, error: null });
      await authApi.confirmEmail(payload);
      set({ isLoading: false });
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Email confirmation failed.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  forgotPassword: async (username: string, domain: string) => {
    try {
      set({ isLoading: true, error: null });
      await authApi.forgotPassword(username, domain);
      set({ isLoading: false });
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Failed to send reset code.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  verifyOtpResetPassword: async (payload: EmailConfirmPayload) => {
    try {
      set({ isLoading: true, error: null });
      const result = await authApi.verifyOtpResetPassword(payload);
      set({ isLoading: false });
      return result;
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Invalid verification code.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  resetPassword: async (password: string, confirmPassword: string, token: string) => {
    try {
      set({ isLoading: true, error: null });
      await authApi.resetPassword({ password, confirmPassword }, token);
      set({ isLoading: false });
    } catch (error: any) {
      const message =
        error?.response?.data?.message || 'Password reset failed.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  restoreSession: async () => {
    try {
      const [tokenStr, userStr, domainStr, tenantNameStr, tenantLogoStr] = await AsyncStorage.multiGet([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.CURRENT_USER,
        STORAGE_KEYS.DOMAIN,
        STORAGE_KEYS.TENANT_NAME,
        STORAGE_KEYS.TENANT_LOGO,
      ]);

      const token = tokenStr[1];
      const userData = userStr[1];
      const domain = domainStr[1];
      const tenantName = tenantNameStr[1];
      const tenantLogo = tenantLogoStr[1];

      if (token && userData) {
        let user: User;
        try {
          user = JSON.parse(userData);
        } catch {
          // Corrupt user data — bail to logged-out state
          set({ isLoading: false });
          return;
        }

        if (!user.studentId) {
          const _u: any = user;
          const resolved =
            _u.student?.id ??
            _u.staff?.id ??
            (typeof user.userId === 'string' && /^\d+$/.test(user.userId)
              ? Number(user.userId)
              : undefined);
          if (resolved) {
            user = { ...user, studentId: resolved };
          }
        }
        setInMemoryToken(token);
        set({
          user,
          token,
          domain: domain || null,
          isAuthenticated: true,
          isLoading: false,
          tenantName: tenantName || null,
          tenantLogo: tenantLogo || null,
          showWelcome: false,
        });
        // Fire-and-forget: SignalR must NEVER block startup. Schedule it on the
        // next tick so the auth state update flushes first.
        setTimeout(() => {
          try {
            signalRService.startConnection().catch(() => {});
          } catch {}
        }, 0);
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  dismissWelcome: () => set({ showWelcome: false }),
}));

setOnUnauthorized(() => {
  useAuthStore.setState({
    user: null,
    token: null,
    domain: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    pendingTenants: null,
    pendingCredentials: null,
    tenantName: null,
    tenantLogo: null,
    showWelcome: false,
  });
});
