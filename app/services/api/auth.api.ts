import apiClient from './client';
import { AUTH_URLS } from './endpoints';
import type {
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  EmailConfirmPayload,
  ResetPasswordPayload,
  ChangePasswordPayload,
  GoogleSignInPayload,
} from '../../types/auth.types';

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>(AUTH_URLS.LOGIN, payload);
    console.log('[Auth] Full login response keys:', Object.keys(data));
    console.log('[Auth] Login response:', JSON.stringify(data).substring(0, 800));
    return data;
  },

  register: async (payload: RegisterPayload): Promise<void> => {
    await apiClient.post(AUTH_URLS.REGISTRATION, payload);
  },

  forgotPassword: async (username: string, domain: string): Promise<void> => {
    await apiClient.post(AUTH_URLS.FORGOT_PASSWORD, { username, domain });
  },

  confirmEmail: async (payload: EmailConfirmPayload): Promise<void> => {
    await apiClient.post(AUTH_URLS.CONFIRM_EMAIL, payload);
  },

  sendConfirmationEmail: async (email: string, domain: string): Promise<void> => {
    await apiClient.post(AUTH_URLS.SEND_CONFIRM_EMAIL, { email, domain });
  },

  verifyOtpResetPassword: async (
    payload: EmailConfirmPayload
  ): Promise<{ token: string }> => {
    const { data } = await apiClient.post(AUTH_URLS.VERIFY_OTP_RESET_PASSWORD, payload);
    return data;
  },

  resetPassword: async (
    payload: ResetPasswordPayload,
    token: string
  ): Promise<void> => {
    await apiClient.post(AUTH_URLS.RESET_PASSWORD, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  changePassword: async (payload: ChangePasswordPayload): Promise<void> => {
    await apiClient.post(AUTH_URLS.CHANGE_PASSWORD, payload);
  },

  googleSignIn: async (payload: GoogleSignInPayload): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>(AUTH_URLS.GOOGLE_SIGNIN, payload);
    return data;
  },
};
