import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_ACADEMY_KEY = 'platx.lastAcademy';

export interface SavedAcademy {
  domain: string;
  name?: string;
  logoUrl?: string;
}

export const academyStorage = {
  async get(): Promise<SavedAcademy | null> {
    try {
      const raw = await AsyncStorage.getItem(LAST_ACADEMY_KEY);
      const value = raw ? (JSON.parse(raw) as SavedAcademy) : null;
      return value?.domain ? value : null;
    } catch {
      return null;
    }
  },

  async save(academy: SavedAcademy): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_ACADEMY_KEY, JSON.stringify(academy));
    } catch {}
  },
};
