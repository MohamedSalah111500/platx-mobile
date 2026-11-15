import { useCallback } from 'react';
import { create } from 'zustand';
import { platformAccessApi } from '../services/api/platformAccess.api';

interface AreaRule {
  menu?: string;
  feature?: string;
}

export const PLATFORM_AREA = {
  Courses: { menu: 'online-courses' },
  Live: { menu: 'live' },
  Groups: { menu: 'groups', feature: 'student_groups' },
  Sessions: { menu: 'sessions', feature: 'attendance' },
  Exams: { menu: 'exams', feature: 'quizzes' },
  Homework: { menu: 'homework', feature: 'quizzes' },
  HonorBoard: { menu: 'honor-board', feature: 'leaderboard' },
  Events: { menu: 'events' },
  News: { menu: 'news' },
  Chat: { menu: 'chat', feature: 'chat' },
  Wallet: { menu: 'wallet' },
  Reports: { menu: 'reports', feature: 'advanced_reports' },
  Accounting: { menu: 'accounting' },
  Store: { menu: 'store', feature: 'store_enabled' },
} satisfies Record<string, AreaRule>;
export type PlatformArea = keyof typeof PLATFORM_AREA;

interface PlatformAccessState {
  features: Record<string, boolean>;
  hiddenMenuItems: string[];
  load: () => Promise<void>;
  clear: () => void;
}

const EMPTY = { features: {}, hiddenMenuItems: [] };

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export const usePlatformAccessStore = create<PlatformAccessState>((set, get) => ({
  ...EMPTY,
  load: async () => {
    const [features, hidden] = await Promise.allSettled([
      platformAccessApi.getFeatures(),
      platformAccessApi.getHiddenMenuItems(),
    ]);
    const current = get();
    const next: Partial<PlatformAccessState> = {};
    if (features.status === 'fulfilled' && !sameValue(features.value, current.features)) next.features = features.value;
    if (hidden.status === 'fulfilled' && !sameValue(hidden.value, current.hiddenMenuItems)) {
      next.hiddenMenuItems = hidden.value;
    }
    if (Object.keys(next).length) set(next);
  },
  clear: () => set(EMPTY),
}));

export function usePlatformAccess() {
  const features = usePlatformAccessStore((s) => s.features);
  const hiddenMenuItems = usePlatformAccessStore((s) => s.hiddenMenuItems);
  return useCallback(
    (area: PlatformArea) => {
      const rule: AreaRule = PLATFORM_AREA[area];
      if (rule.feature && features[rule.feature] === false) return false;
      return !rule.menu || !hiddenMenuItems.includes(rule.menu);
    },
    [features, hiddenMenuItems],
  );
}
