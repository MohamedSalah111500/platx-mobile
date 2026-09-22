import apiClient from './client';
import { AUTH_URLS } from './endpoints';
import type {
  LoginPayload,
  LoginResponse,
  MobileLoginPayload,
  MobileLoginResponse,
  MobileSelectTenantPayload,
  RegisterPayload,
  EmailConfirmPayload,
  ResetPasswordPayload,
  ChangePasswordPayload,
  AppleSignInPayload,
} from '../../types/auth.types';

const DELETE_ACCOUNT_TIMEOUT = 90000;

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

  appleSignIn: async (payload: AppleSignInPayload): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>(AUTH_URLS.APPLE_SIGNIN, payload);
    return data;
  },

  // The server deletes the account of the access token's owner — no id is sent.
  // The call cascades across the account's data, so it gets more room than the
  // default timeout: a slow answer must not look like a failed deletion.
  deleteAccount: async (): Promise<void> => {
    await apiClient.delete(AUTH_URLS.DELETE_ACCOUNT, { timeout: DELETE_ACCOUNT_TIMEOUT });
  },
};
