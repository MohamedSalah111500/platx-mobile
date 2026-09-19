import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, API_CONFIG } from '../config';
import { authApi } from '../services/api/auth.api';
import { studentsApi } from '../services/api/students.api';
import { setInMemoryToken, setOnUnauthorized } from '../services/api/client';
import { signalRService } from '../services/realtime/signalr.service';
import { unregisterPushNotifications } from '../services/realtime/pushNotifications';
import { extractNumericId, extractTenantDomain } from '../utils/jwt';
import { logger } from '../services/logger';
import { signInWithGoogle } from '../services/auth/googleAuth';
import { signInWithApple } from '../services/auth/appleAuth';
import i18n from '../i18n/i18n.config';
import { useNotificationsStore } from './notifications.store';
import type {
  User,
  LoginResponse,
  MobileLoginPayload,
  RegisterPayload,
  EmailConfirmPayload,
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
  tenantColor: string | null;
  showWelcome: boolean;
  // Set when login succeeded credential-wise but the email isn't confirmed yet
  // (backend returns token null + isEmailConfirmed false). LoginScreen routes to OTP.
  pendingEmailConfirmation: { email: string; domain: string; password: string } | null;
}

interface AuthActions {
  login: (payload: MobileLoginPayload) => Promise<void>;
  selectTenant: (tenantId: string) => Promise<void>;
  clearPendingTenants: () => void;
  clearPendingEmailConfirmation: () => void;
  googleLogin: (domain: string) => Promise<void>;
  appleLogin: (domain: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
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

// `fallbackDomain` is the tenant domain from the outer mobile-login response
// (MobileLoginResponse.Domain / Tenants[i].Domain) — AuthResponse itself has none.
function processAuthResponse(
  response: LoginResponse,
  fallbackDomain?: string | null
): { user: User; domain: string | null } {
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
    fallbackDomain ||
    _resp.domain ||
    _resp.tenantDomain ||
    extractTenantDomain(response.token) ||
    null;
  const staffId = Number(_resp.staff?.id);

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
      // Staff.Id (AuthResponse.Staff) — needed by staff-scoped endpoints such as
      // GetStaffNotificationListAsync. There is no api/Staffs/me to resolve it later.
      staffId: Number.isFinite(staffId) && staffId > 0 ? staffId : undefined,
      profileImage: _resp.student?.profileImage ?? _resp.staff?.profileImage ?? undefined,
    },
    domain,
  };
}

// Backend returns AuthResponse with Token = null and IsEmailConfirmed = false when
// the password is right but the email (per tenant) isn't confirmed yet.
function isUnconfirmedEmail(authResponse: LoginResponse | null | undefined): boolean {
  return !!authResponse && !authResponse.token && authResponse.isEmailConfirmed === false;
}

async function startEmailConfirmation(
  set: (state: Partial<AuthState>) => void,
  credentials: { userName: string; password: string },
  domain: string | null
) {
  const resolvedDomain = domain ?? '';
  // Login doesn't send an OTP by itself — request one so the user has a code to enter.
  await authApi.sendConfirmationEmail(credentials.userName, resolvedDomain).catch(() => {});
  set({
    isLoading: false,
    error: null,
    pendingEmailConfirmation: {
      email: credentials.userName,
      domain: resolvedDomain,
      password: credentials.password,
    },
  });
}

function hasStudentRole(roles?: unknown): boolean {
  return Array.isArray(roles) && roles.some((r) => String(r).toLowerCase() === 'student');
}

// The JWT only carries the Identity user GUID (no StudentId claim), so the id we
// derive at login can be wrong or missing. For student accounts ask the backend
// for the real Student.Id — it's what enrollments/reservations endpoints key on.
// Requires the in-memory token to be set already.
async function resolveStudentId(user: User): Promise<User> {
  if (!hasStudentRole(user.roles)) return user;
  try {
    const me = await studentsApi.getMe();
    if (me?.id && me.id !== user.studentId) {
      return {
        ...user,
        studentId: me.id,
        profileImage: user.profileImage ?? me.profileImage ?? undefined,
      };
    }
  } catch {
    // Keep whatever we had; screens surface a "missing student id" message.
  }
  return user;
}

function resolveLogoUrl(logoUrl?: string | null): string | null {
  if (!logoUrl) return null;
  if (logoUrl.startsWith('http')) return logoUrl;
  return `${API_CONFIG.BASE_URL}${logoUrl.startsWith('/') ? logoUrl.slice(1) : logoUrl}`;
}

const LOGGED_OUT_STATE: Partial<AuthState> = {
  user: null,
  token: null,
  domain: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  pendingTenants: null,
  pendingCredentials: null,
  pendingEmailConfirmation: null,
  tenantName: null,
  tenantLogo: null,
  tenantColor: null,
  showWelcome: false,
};

// Shared by normal logout and the forced (401) logout so both leave the device clean
// for the next user.
async function clearSession(options: { removePushToken: boolean }) {
  signalRService.stopConnection().catch(() => {});
  setInMemoryToken(null);
  useNotificationsStore.getState().clear();
  const keys: string[] = [
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.CURRENT_USER,
    STORAGE_KEYS.USER_ROLES,
    STORAGE_KEYS.DOMAIN,
    STORAGE_KEYS.TENANT_NAME,
    STORAGE_KEYS.TENANT_LOGO,
    STORAGE_KEYS.TENANT_COLOR,
  ];
  // Normal logout lets unregisterPushNotifications() read + remove it itself.
  // A forced logout can't unregister (token is dead), but the stored push token
  // must go or the next user's login skips backend registration.
  if (options.removePushToken) keys.push(STORAGE_KEYS.PUSH_TOKEN);
  // Reset state synchronously (like the old 401 handler) so a login that is
  // persisting concurrently still ends up as the final state.
  useAuthStore.setState(LOGGED_OUT_STATE);
  try {
    await AsyncStorage.multiRemove(keys);
  } catch {}
}

async function persistAndSetAuth(
  set: (state: Partial<AuthState>) => void,
  user: User,
  token: string,
  domain?: string,
  branding?: { tenantName?: string | null; tenantLogo?: string | null; primaryColor?: string | null }
) {
  const tenantName = branding?.tenantName ?? null;
  const tenantLogo = resolveLogoUrl(branding?.tenantLogo);
  const tenantColor = branding?.primaryColor ?? null;

  // Token must be usable by the API client before we ask for the student profile.
  setInMemoryToken(token);
  user = await resolveStudentId(user);
  // If that request happened to 401, the client's interceptor cleared the
  // in-memory token; restore it so expiry handling keeps working.
  setInMemoryToken(token);

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
  if (tenantColor) {
    await AsyncStorage.setItem(STORAGE_KEYS.TENANT_COLOR, tenantColor);
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.TENANT_COLOR);
  }
  set({
    user,
    token,
    domain: domain || null,
    isAuthenticated: true,
    isLoading: false,
    pendingTenants: null,
    pendingCredentials: null,
    pendingEmailConfirmation: null,
    tenantName,
    tenantLogo,
    tenantColor,
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
  tenantColor: null,
  showWelcome: false,
  pendingEmailConfirmation: null,

  login: async (payload: MobileLoginPayload) => {
    try {
      set({ isLoading: true, error: null, pendingEmailConfirmation: null });
      const response = await authApi.mobileLogin(payload);
      // Single-tenant login returns the tenant (with logo) in tenants[0].
      const branding = response.tenants?.[0];
      const responseDomain = response.domain ?? branding?.domain ?? null;

      if (!response.requiresTenantSelection && isUnconfirmedEmail(response.authResponse)) {
        await startEmailConfirmation(set, payload, responseDomain);
      } else if (!response.requiresTenantSelection && response.authResponse) {
        const { user, domain } = processAuthResponse(response.authResponse, responseDomain);
        await persistAndSetAuth(set, user, response.authResponse.token, domain || undefined, {
          tenantName: branding?.tenantName,
          tenantLogo: branding?.logoUrl,
          primaryColor: branding?.primaryColor,
        });
      } else if (response.requiresTenantSelection && response.tenants) {
        set({
          isLoading: false,
          pendingTenants: response.tenants,
          pendingCredentials: { userName: payload.userName, password: payload.password },
        });
      } else {
        set({
          error: response.message || i18n.t('auth.loginFailed'),
          isLoading: false,
        });
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.userMessage ||
        i18n.t('auth.loginFailedCheckCredentials');
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

      const selected = get().pendingTenants?.find((t) => t.tenantId === tenantId);
      if (isUnconfirmedEmail(response.authResponse)) {
        await startEmailConfirmation(set, pendingCredentials, response.domain ?? selected?.domain ?? null);
      } else if (response.authResponse) {
        const { user, domain } = processAuthResponse(
          response.authResponse,
          response.domain ?? selected?.domain ?? null
        );
        await persistAndSetAuth(set, user, response.authResponse.token, domain || undefined, {
          tenantName: selected?.tenantName,
          tenantLogo: selected?.logoUrl,
          primaryColor: selected?.primaryColor,
        });
      } else {
        set({
          error: response.message || i18n.t('auth.tenantSelectionFailed'),
          isLoading: false,
        });
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.userMessage ||
        i18n.t('auth.tenantSelectionFailed');
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  clearPendingTenants: () => {
    set({ pendingTenants: null, pendingCredentials: null, error: null });
  },

  clearPendingEmailConfirmation: () => {
    set({ pendingEmailConfirmation: null });
  },

  googleLogin: async (domain: string) => {
    set({ error: null });
    const failedMessage = i18n.t('auth.googleSignInFailed');
    try {
      const result = await signInWithGoogle(domain);
      if (result.type === 'cancel') return;
      if (result.type === 'error') {
        set({ error: failedMessage });
        return;
      }

      set({ isLoading: true });
      const { user, domain: resDomain } = processAuthResponse(result.response);
      await persistAndSetAuth(set, user, result.response.token, resDomain || domain);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.userMessage ||
        failedMessage;
      set({ error: message, isLoading: false });
    }
  },

  appleLogin: async (domain: string) => {
    set({ error: null });
    try {
      const result = await signInWithApple(domain);
      if (result.type === 'cancel') return;

      set({ isLoading: true });
      const { user, domain: resDomain } = processAuthResponse(result.response);
      await persistAndSetAuth(set, user, result.response.token, resDomain || domain);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.userMessage ||
        i18n.t('auth.appleSignInFailed');
      set({ error: message, isLoading: false });
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
        i18n.t('auth.registrationFailed');
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    // Kicked off first so it reads the stored push token before the cleanup runs.
    unregisterPushNotifications(get().token).catch(() => {});
    await clearSession({ removePushToken: false });
  },

  // Permanently deletes the account server-side, then clears everything stored
  // on the device. Throws (keeping the session) if the server did not confirm.
  deleteAccount: async () => {
    try {
      await authApi.deleteAccount();
    } catch (error: any) {
      // 401: the token no longer maps to an account — a previous delete request
      // succeeded even though its response never arrived.
      if ((error?.status ?? error?.response?.status) !== 401) throw error;
    }
    // The server already dropped the push token registration.
    await clearSession({ removePushToken: true });
  },

  confirmEmail: async (payload: EmailConfirmPayload) => {
    try {
      set({ isLoading: true, error: null });
      await authApi.confirmEmail(payload);
      set({ isLoading: false });
    } catch (error: any) {
      const message =
        error?.response?.data?.message || i18n.t('auth.emailConfirmationFailed');
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
        error?.response?.data?.message || i18n.t('auth.sendResetCodeFailed');
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
        error?.response?.data?.message || i18n.t('auth.invalidVerificationCode');
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
        error?.response?.data?.message || i18n.t('auth.passwordResetFailed');
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  restoreSession: async () => {
    try {
      const [tokenStr, userStr, domainStr, tenantNameStr, tenantLogoStr, tenantColorStr] = await AsyncStorage.multiGet([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.CURRENT_USER,
        STORAGE_KEYS.DOMAIN,
        STORAGE_KEYS.TENANT_NAME,
        STORAGE_KEYS.TENANT_LOGO,
        STORAGE_KEYS.TENANT_COLOR,
      ]);

      const token = tokenStr[1];
      const userData = userStr[1];
      const domain = domainStr[1];
      const tenantName = tenantNameStr[1];
      const tenantLogo = tenantLogoStr[1];
      const tenantColor = tenantColorStr[1];

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
          tenantColor: tenantColor || null,
          showWelcome: false,
        });
        // Fire-and-forget: correct a stale/missing studentId from the server
        // without blocking startup (see resolveStudentId).
        const restoredUser = user;
        resolveStudentId(restoredUser)
          .then((fixed) => {
            // The user may have logged out (or switched account) while this was in
            // flight — never write the old profile back over a cleared session.
            if (get().token !== token) return;
            if (fixed.studentId !== restoredUser.studentId) {
              set({ user: fixed });
              AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(fixed)).catch(() => {});
            }
          })
          .catch(() => {});
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
  clearSession({ removePushToken: true }).catch(() => {});
});
