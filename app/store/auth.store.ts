import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config';
import { authApi } from '../services/api/auth.api';
import { setInMemoryToken, setOnUnauthorized } from '../services/api/client';
import { signalRService } from '../services/realtime/signalr.service';
import { extractNumericId } from '../utils/jwt';
import type {
  User,
  TRole,
  LoginPayload,
  RegisterPayload,
  EmailConfirmPayload,
  GoogleSignInPayload,
} from '../types/auth.types';

interface AuthState {
  user: User | null;
  token: string | null;
  domain: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (payload: LoginPayload) => Promise<void>;
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
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  // State
  user: null,
  token: null,
  domain: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Actions
  login: async (payload: LoginPayload) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.login(payload);

      // Extract numeric ID from JWT token claims, then fallback to response fields
      const jwtNumericId = extractNumericId(response.token);
      // Backend returns nested objects: response.student?.id and response.staff?.id
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

      const user: User = {
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
      };

      console.log('[Auth] Login OK: studentId from student.id =', _resp.student?.id, ', staffId =', _resp.staff?.id, ', extracted numericId =', numericId);
      if (!numericId && response.roles?.includes('Student')) {
        console.warn('[Auth] student logged in but no numeric ID found');
      }

      // Save to storage
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_ROLES,
        JSON.stringify(response.roles)
      );
      await AsyncStorage.setItem(STORAGE_KEYS.DOMAIN, payload.domain);

      // Set in-memory token for interceptor
      setInMemoryToken(response.token);

      set({
        user,
        token: response.token,
        domain: payload.domain,
        isAuthenticated: true,
        isLoading: false,
      });

      // Start SignalR connection for real-time notifications
      signalRService.startConnection().catch(() => {});
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.userMessage ||
        'Login failed. Please check your credentials.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  googleLogin: async (payload: GoogleSignInPayload, domain: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.googleSignIn(payload);

      const gJwtId = extractNumericId(response.token);
      const _gresp: any = response;
      const gNumericId =
        gJwtId ??
        _gresp.student?.id ??
        _gresp.staff?.id ??
        (typeof response.userId === 'number'
          ? response.userId
          : typeof response.userId === 'string' && /^\d+$/.test(response.userId)
          ? Number(response.userId)
          : undefined) ??
        response.id;

      const user: User = {
        userId: response.userId,
        userName: response.userName,
        email: response.email,
        firstName: response.firstName,
        lastName: response.lastName,
        roles: response.roles,
        isEmailConfirmed: response.isEmailConfirmed,
        tenantActive: response.tenantActive,
        token: response.token,
        studentId: gNumericId,
      };
      console.log('[Auth] Google login OK: studentId from student.id =', _gresp.student?.id, ', staffId =', _gresp.staff?.id, ', extracted numericId =', gNumericId);
      if (!gNumericId && response.roles?.includes('Student')) {
        console.warn('[Auth] student google login without numeric id');
      }

      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.token);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      await AsyncStorage.setItem(
        STORAGE_KEYS.USER_ROLES,
        JSON.stringify(response.roles)
      );
      await AsyncStorage.setItem(STORAGE_KEYS.DOMAIN, domain);

      setInMemoryToken(response.token);

      set({
        user,
        token: response.token,
        domain,
        isAuthenticated: true,
        isLoading: false,
      });

      signalRService.startConnection().catch(() => {});
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
    // Stop SignalR connection
    signalRService.stopConnection().catch(() => {});
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.CURRENT_USER,
      STORAGE_KEYS.USER_ROLES,
      STORAGE_KEYS.DOMAIN,
    ]);
    setInMemoryToken(null);
    set({
      user: null,
      token: null,
      domain: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
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

  resetPassword: async (
    password: string,
    confirmPassword: string,
    token: string
  ) => {
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
      const [tokenStr, userStr, domainStr] = await AsyncStorage.multiGet([
        STORAGE_KEYS.AUTH_TOKEN,
        STORAGE_KEYS.CURRENT_USER,
        STORAGE_KEYS.DOMAIN,
      ]);

      const token = tokenStr[1];
      const userData = userStr[1];
      const domain = domainStr[1];

      if (token && userData) {
        let user: User = JSON.parse(userData);
        // Ensure we have a numeric studentId from session restore. Check nested objects first.
        if (!user.studentId) {
          const _u: any = user;
          const nestedStudentId = _u.student?.id;
          const nestedStaffId = _u.staff?.id;
          const maybeUserId =
            typeof user.userId === 'number'
              ? user.userId
              : typeof user.userId === 'string' && /^\d+$/.test(user.userId)
              ? Number(user.userId)
              : undefined;

          const resolved = nestedStudentId ?? nestedStaffId ?? maybeUserId;
          if (resolved) {
            user = { ...user, studentId: resolved };
            console.log('[Auth] restored session with studentId:', resolved);
          }
        }
        setInMemoryToken(token);
        set({
          user,
          token,
          domain: domain || null,
          isAuthenticated: true,
          isLoading: false,
        });
        // Start SignalR on session restore
        signalRService.startConnection().catch(() => {});
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
}));

// Register 401 callback so expired tokens force logout to login screen
setOnUnauthorized(() => {
  useAuthStore.setState({
    user: null,
    token: null,
    domain: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });
});
