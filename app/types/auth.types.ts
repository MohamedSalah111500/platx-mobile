import type { ModulePermission } from './people.types';

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
  studentCode?: string;
  staffId?: number;
  modulePermissions?: ModulePermission[];
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  educationStage?: string;
  guardianPhoneNumber?: string;
  fields?: Record<string, string>;
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
  intent: ExternalIntent;
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

export type ExternalIntent = 'login' | 'signup';

export const EXTERNAL_OUTCOME = {
  SelectTenant: 'SelectTenant',
  NotRegistered: 'NotRegistered',
} as const;

export interface ExternalSelectTenantOutcome {
  outcome: typeof EXTERNAL_OUTCOME.SelectTenant;
  tenants: TenantInfo[];
  selectionToken: string;
}

export interface ExternalNotRegisteredOutcome {
  outcome: typeof EXTERNAL_OUTCOME.NotRegistered;
  email: string | null;
  accountExists: boolean;
  signupToken: string;
}

export type ExternalOutcome = ExternalSelectTenantOutcome | ExternalNotRegisteredOutcome;

export type ExternalSignInResponse = LoginResponse | ExternalOutcome;

export function isExternalOutcome(response: ExternalSignInResponse): response is ExternalOutcome {
  const outcome = (response as ExternalOutcome | null)?.outcome;
  return outcome === EXTERNAL_OUTCOME.SelectTenant || outcome === EXTERNAL_OUTCOME.NotRegistered;
}

export interface ExternalSignupPayload {
  signupToken: string;
  domain: string;
}

export interface ExternalSelectTenantPayload {
  selectionToken: string;
  tenantId: string;
}

export interface ExternalHandoffPayload {
  code: string;
  codeVerifier: string;
}
export const EXTERNAL_ERROR_CODE = {
  TokenExpired: 'TOKEN_EXPIRED',
} as const;
