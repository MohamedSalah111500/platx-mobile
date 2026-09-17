import apiClient from './client';
import { AUTH_URLS } from './endpoints';
import type {
  LoginPayload,
  LoginResponse,
  MobileLoginPayload,
  MobileLoginResponse,
  MobileSelectTenantPayload,
  RegisterPayload,
  VoiceRegisterResult,
  EmailConfirmPayload,
  ResetPasswordPayload,
  ChangePasswordPayload,
} from '../../types/auth.types';

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>(AUTH_URLS.LOGIN, payload);
    return data;
  },

  mobileLogin: async (payload: MobileLoginPayload): Promise<MobileLoginResponse> => {
    const { data } = await apiClient.post<MobileLoginResponse>(AUTH_URLS.MOBILE_LOGIN, payload);
    return data;
  },

  mobileSelectTenant: async (payload: MobileSelectTenantPayload): Promise<MobileLoginResponse> => {
    const { data } = await apiClient.post<MobileLoginResponse>(AUTH_URLS.MOBILE_SELECT_TENANT, payload);
    return data;
  },

  register: async (payload: RegisterPayload): Promise<void> => {
    await apiClient.post(AUTH_URLS.REGISTRATION, payload);
  },

  voiceRegisterExtract: async (form: FormData): Promise<VoiceRegisterResult> => {
    const { data } = await apiClient.post<VoiceRegisterResult>(
      AUTH_URLS.VOICE_REGISTER_EXTRACT,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data;
  },

  forgotPassword: async (username: string, domain: string): Promise<void> => {
    await apiClient.post(AUTH_URLS.FORGOT_PASSWORD, { username, domain });
  },

  confirmEmail: async (payload: EmailConfirmPayload): Promise<void> => {
    await apiClient.post(AUTH_URLS.CONFIRM_EMAIL, payload);
  },

  // Backend SendConfirmationEmailModel binds { Username (required), Domain }.
  sendConfirmationEmail: async (email: string, domain: string): Promise<void> => {
    await apiClient.post(AUTH_URLS.SEND_CONFIRM_EMAIL, { username: email, domain });
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
};
