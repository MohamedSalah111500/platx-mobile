export type TRole = 'SuperAdmin' | 'Admin' | 'Staff' | 'Student';

export interface LoginPayload {
  userName: string;
  password: string;
  domain: string;
}

export interface LoginResponse {
  token: string;
  expiryDateTime: string;
  userId: string;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailConfirmed: boolean;
  roles: TRole[];
  tenantActive: boolean;
  // Numeric IDs - backend may return these under different keys
  id?: number;
  studentId?: number;
  staffId?: number;
  [key: string]: unknown;
}

export interface User {
  userId: string;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: TRole[];
  isEmailConfirmed: boolean;
  tenantActive: boolean;
  token?: string;
  profileImage?: string;
  // Numeric student/staff ID from backend
  studentId?: number;
  staffId?: number;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  password: string;
  confirmPassword: string;
  dateOfBirth?: string;
  domain: string;
}

export interface EmailConfirmPayload {
  email: string;
  code: string;
  domain: string;
}

export interface ForgotPasswordPayload {
  username: string;
  domain: string;
}

export interface ResetPasswordPayload {
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}

export interface GoogleSignInPayload {
  id: string;
  email: string;
  name: string;
  givenName: string;
  familyName: string;
  picture: string;
  accessToken: string;
  returnUrl: string;
  Domain: string;
}
