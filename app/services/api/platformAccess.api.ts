import apiClient from './client';
import { PLATFORM_ACCESS_URLS } from './endpoints';

export const platformAccessApi = {
  getFeatures: async (): Promise<Record<string, boolean>> =>
    (await apiClient.get<Record<string, boolean>>(PLATFORM_ACCESS_URLS.MY_FEATURES)).data ?? {},
  getHiddenMenuItems: async (): Promise<string[]> =>
    (await apiClient.get<{ hiddenItems?: string[] }>(PLATFORM_ACCESS_URLS.MENU_VISIBILITY)).data?.hiddenItems ?? [],
};
