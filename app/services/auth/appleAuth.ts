import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { authApi } from '../api/auth.api';
import type { LoginResponse } from '../../types/auth.types';

export type AppleSignInResult =
  | { type: 'success'; response: LoginResponse }
  | { type: 'cancel' };

/** Sign in with Apple is offered on iOS only (native AuthenticationServices sheet). */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Runs the native Apple sheet, then exchanges Apple's identity token for a
 * PlatX session in the given academy. Only the name and email scopes are
 * requested, and the user may hide their email (Apple then gives a private
 * relay address). Throws on API errors so the store can surface the message.
 */
export async function signInWithApple(domain: string): Promise<AppleSignInResult> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error: any) {
    if (error?.code === 'ERR_REQUEST_CANCELED') return { type: 'cancel' };
    throw error;
  }

  if (!credential.identityToken) {
    throw new Error('Apple did not return an identity token');
  }

  const response = await authApi.appleSignIn({
    identityToken: credential.identityToken,
    authorizationCode: credential.authorizationCode,
    domain,
    givenName: credential.fullName?.givenName,
    familyName: credential.fullName?.familyName,
  });
  return { type: 'success', response };
}
