import apiClient from './client';
import { APP_VERSION_URLS } from './endpoints';

export interface AppVersionCheck {
  platform: string;
  currentVersion: string;
  minVersion: string;
  latestVersion: string;
  storeUrl: string;
  updateRequired: boolean;
  updateAvailable: boolean;
}

export const appVersionApi = {
  check: async (platform: 'android' | 'ios', version: string): Promise<AppVersionCheck> => {
    const { data } = await apiClient.get<AppVersionCheck>(APP_VERSION_URLS.CHECK(platform, version));
    return data;
  },
};
