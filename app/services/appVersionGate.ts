import { Platform } from 'react-native';
import { appVersionApi } from './api/appVersion.api';
import { useUIStore } from '../store/ui.store';
import { getAppVersion } from '../utils/version';
import { logger } from './logger';

const RECHECK_INTERVAL_MS = 60 * 60 * 1000;
let lastCheckedAt = 0;

export async function checkAppVersion(force = false): Promise<void> {
  if (!force && Date.now() - lastCheckedAt < RECHECK_INTERVAL_MS) return;

  const currentVersion = getAppVersion();
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  try {
    const result = await appVersionApi.check(platform, currentVersion);
    lastCheckedAt = Date.now();
    const info = { storeUrl: result.storeUrl, latestVersion: result.latestVersion, currentVersion };
    const ui = useUIStore.getState();
    const required = result.updateRequired && !__DEV__;
    ui.setUpdateRequired(required ? info : null);
    ui.setUpdateAvailable(!required && result.updateAvailable ? info : null);
  } catch (err) {
    logger.log(`[AppVersion] check skipped: ${(err as any)?.message ?? err}`);
  }
}
