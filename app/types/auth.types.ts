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

// Backend AppleAuthRequest. The identity token is verified server-side; the
// name is only present on the user's first Apple authorization.
export interface AppleSignInPayload {
  identityToken: string;
  authorizationCode?: string | null;
  domain: string;
  givenName?: string | null;
  familyName?: string | null;
}

// Mobile login (no domain required)
export interface MobileLoginPayload {
  userName: string;
  password: string;
}

export interface MobileSelectTenantPayload {
  userName: string;
  password: string;
  tenantId: string;
}

export interface TenantInfo {
  tenantId: string;
  tenantName: string;
  logoUrl: string;
  roles: TRole[];
  domain?: string | null;
  primaryColor?: string | null;
}

export interface MobileLoginResponse {
  requiresTenantSelection: boolean;
  authResponse: LoginResponse | null;
  tenants: TenantInfo[] | null;
  message: string | null;
  // Tenant domain lives at the top level, not inside authResponse.
  domain?: string | null;
}
