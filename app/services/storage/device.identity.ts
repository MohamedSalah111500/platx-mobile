import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { getAppVersion } from '../../utils/version';

const DEVICE_ID_KEY = 'platx_device_id';

export const DEVICE_HEADERS = {
  DeviceId: 'X-Device-Id',
  DevicePlatform: 'X-Device-Platform',
  DeviceName: 'X-Device-Name',
  AppVersion: 'X-App-Version',
} as const;

export const DEVICE_ERROR_CODES = {
  DeviceLimitReached: 'DEVICE_LIMIT_REACHED',
  AccountBlocked: 'ACCOUNT_BLOCKED',
} as const;

let cachedDeviceId: string | null = null;

async function readStored(): Promise<string | null> {
  try {
    const secure = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (secure) return secure;
  } catch {
    // SecureStore is unavailable on some devices; AsyncStorage is the fallback below.
  }

  try {
    return await AsyncStorage.getItem(DEVICE_ID_KEY);
  } catch {
    return null;
  }
}

async function writeStored(deviceId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  } catch {
    // Ignored: the AsyncStorage copy below keeps the id stable for this install.
  }

  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  } catch {
    // Nothing else to fall back to; a fresh id will be minted next launch.
  }
}

function randomId(): string {
  const segment = () => Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(16)}${segment()}${segment()}`;
}

/**
 * Seeded from the platform's own install identifier where one exists, so a reinstall keeps the
 * same device on Android (ANDROID_ID survives uninstall) and on iOS while another app from the
 * same vendor remains installed. Everywhere else a random id is minted once and persisted.
 */
async function createDeviceId(): Promise<string> {
  try {
    if (Platform.OS === 'android') {
      const androidId = Application.getAndroidId();
      if (androidId) return `and_${androidId}`;
    }

    if (Platform.OS === 'ios') {
      const vendorId = await Application.getIosIdForVendorAsync();
      if (vendorId) return `ios_${vendorId.replace(/-/g, '')}`;
    }
  } catch {
    // Fall through to a random identifier.
  }

  return `gen_${randomId()}`;
}

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  const stored = await readStored();
  if (stored) {
    cachedDeviceId = stored;
    return stored;
  }

  const created = await createDeviceId();
  await writeStored(created);
  cachedDeviceId = created;
  return created;
}

export function getDevicePlatform(): string {
  if (Platform.OS === 'android') return 'Android';
  if (Platform.OS === 'ios') return 'IOS';
  return 'Unknown';
}

/**
 * Percent-encoded because a device name is whatever the owner typed — often Arabic — and a header
 * value outside the ASCII range is rejected or mangled in transit. The API decodes it back.
 */
export function getDeviceName(): string {
  const name = Constants.deviceName || getDevicePlatform();
  return encodeURIComponent(`${name} - ${getDevicePlatform()} ${Platform.Version}`);
}

export async function getDeviceHeaders(): Promise<Record<string, string>> {
  try {
    return {
      [DEVICE_HEADERS.DeviceId]: await getDeviceId(),
      [DEVICE_HEADERS.DevicePlatform]: getDevicePlatform(),
      [DEVICE_HEADERS.DeviceName]: getDeviceName(),
      [DEVICE_HEADERS.AppVersion]: getAppVersion(),
    };
  } catch {
    return {};
  }
}
