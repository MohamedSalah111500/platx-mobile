import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { API_CONFIG } from '../../config';
import type { LoginResponse } from '../../types/auth.types';

const GOOGLE_WEB_CLIENT_ID = '997004801769-ni3d4vb3d1g551vrj4ku9fsr99k1mhr6.apps.googleusercontent.com';

export type GoogleSignInResult =
  | { type: 'success'; response: LoginResponse }
  | { type: 'cancel' }
  | { type: 'error' };

/**
 * Google rejects custom-scheme redirect URIs (platx://) for our OAuth client,
 * so the app reuses the web's sign-in bridge, whose https redirect URI is
 * already registered: `${CLIENT_URL}/auth/google-bridge`. The bridge
 * exchanges the code through the API, then hands the session back to
 * `state.returnOrigin` — here the app's deep link:
 *   success -> `${returnOrigin}/auth/callback#data=<json>&returnPath=`
 *   failure -> the bridge's error page, whose back link is `${returnOrigin}/auth/login`
 * Because the bridge calls its own environment's API, CLIENT_URL must be the
 * frontend of the same environment as API_CONFIG.BASE_URL.
 */
export async function signInWithGoogle(domain: string): Promise<GoogleSignInResult> {
  const returnOrigin = AuthSession.makeRedirectUri({ path: 'google-auth' }).replace(/\/+$/, '');
  const state = JSON.stringify({ domain, returnOrigin, returnPath: '' });

  const params = new URLSearchParams({
    client_id: GOOGLE_WEB_CLIENT_ID,
    redirect_uri: `${API_CONFIG.CLIENT_URL}/auth/google-bridge`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    state,
  });

  const result = await WebBrowser.openAuthSessionAsync(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    returnOrigin,
  );
  if (result.type !== 'success') return { type: 'cancel' };

  const [path, fragment = ''] = result.url.slice(returnOrigin.length).split('#');
  if (!path.startsWith('/auth/callback')) return { type: 'error' };

  const data = readFragmentParam(fragment, 'data');
  const response = data ? parseSession(data) : null;
  return response?.token ? { type: 'success', response } : { type: 'error' };
}

// React Native's URLSearchParams splits values on every '=', so parse by hand.
function readFragmentParam(fragment: string, name: string): string | null {
  for (const pair of fragment.split('&')) {
    const separator = pair.indexOf('=');
    if (separator > 0 && pair.slice(0, separator) === name) {
      return pair.slice(separator + 1);
    }
  }
  return null;
}

function parseSession(raw: string): LoginResponse | null {
  for (const candidate of [safeDecode(raw), raw]) {
    try {
      return JSON.parse(candidate);
    } catch {
      // try the next form
    }
  }
  return null;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
