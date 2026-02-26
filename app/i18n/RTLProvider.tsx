import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './i18n.config';
import { STORAGE_KEYS, RTL_LANGUAGES } from '@config/constants';

interface RTLContextType {
  isRTL: boolean;
  locale: string;
  setLocale: (locale: string) => Promise<void>;
  t: (key: string, options?: Record<string, unknown>) => string;
}

const RTLContext = createContext<RTLContextType | undefined>(undefined);

interface RTLProviderProps {
  children: ReactNode;
}

export function RTLProvider({ children }: RTLProviderProps) {
  const [locale, setLocaleState] = useState(i18n.language || 'en');
  const [isRTL, setIsRTL] = useState(I18nManager.isRTL);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadLocalePreference();
  }, []);

  const loadLocalePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.LOCALE);
      if (saved) {
        await changeLocale(saved, false);
      }
    } catch (error) {
      console.error('Failed to load locale preference:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const changeLocale = async (newLocale: string, shouldRestart = true) => {
    const shouldBeRTL = RTL_LANGUAGES.includes(newLocale);

    // Update i18n
    await i18n.changeLanguage(newLocale);
    setLocaleState(newLocale);

    // Save preference
    await AsyncStorage.setItem(STORAGE_KEYS.LOCALE, newLocale);

    // Handle RTL change
    if (shouldBeRTL !== isRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);

      if (shouldRestart) {
        // RTL changes require app restart to take effect
        // In development, user needs to manually reload
        console.log('RTL changed. Please restart the app to apply layout changes.');
      }
    }

    setIsRTL(shouldBeRTL);
  };

  const setLocale = async (newLocale: string) => {
    await changeLocale(newLocale, true);
  };

  const t = (key: string, options?: Record<string, unknown>) => {
    return i18n.t(key, options);
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <RTLContext.Provider value={{ isRTL, locale, setLocale, t }}>
      {children}
    </RTLContext.Provider>
  );
}

export function useRTL() {
  const context = useContext(RTLContext);
  if (!context) {
    throw new Error('useRTL must be used within an RTLProvider');
  }
  return context;
}

export default RTLProvider;
