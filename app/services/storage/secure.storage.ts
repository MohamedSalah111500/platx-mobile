import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../config';

// Storage abstraction layer
// Uses AsyncStorage by default. When expo-secure-store is installed,
// replace with SecureStore for sensitive data (tokens).
export const secureStorage = {
  async saveToken(token: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  },

  async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  },

  async saveUserData(user: object): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  },

  async getUserData<T>(): Promise<T | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  async removeUserData(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.CURRENT_USER,
      STORAGE_KEYS.USER_ROLES,
    ]);
  },
};

export default secureStorage;
