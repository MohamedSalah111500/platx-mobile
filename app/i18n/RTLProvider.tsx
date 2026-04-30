import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './i18n.config';
import { STORAGE_KEYS, RTL_LANGUAGES } from '@config/constants';
import { logger } from '../services/logger';

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
  // Always render with the i18n default — never block waiting for storage.
  const [locale, setLocaleState] = useState(i18n.language || 'ar');
  const [isRTL, setIsRTL] = useState(
    RTL_LANGUAGES.includes(i18n.language) || I18nManager.isRTL,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEYS.LOCALE);
        if (cancelled) return;
        if (saved && saved !== i18n.language) {
          await changeLocale(saved, false);
        }
      } catch (err) {
        logger.recordError(err, 'RTLProvider:load');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const changeLocale = async (newLocale: string, shouldRestart = true) => {
    const shouldBeRTL = RTL_LANGUAGES.includes(newLocale);
    try {
      await i18n.changeLanguage(newLocale);
      setLocaleState(newLocale);
      await AsyncStorage.setItem(STORAGE_KEYS.LOCALE, newLocale);

      if (shouldBeRTL !== isRTL) {
        try {
          I18nManager.allowRTL(shouldBeRTL);
          I18nManager.forceRTL(shouldBeRTL);
        } catch (err) {
          logger.recordError(err, 'RTLProvider:forceRTL');
        }
      }
      setIsRTL(shouldBeRTL);
    } catch (err) {
      logger.recordError(err, 'RTLProvider:changeLocale');
    }
  };

  const setLocale = async (newLocale: string) => {
    await changeLocale(newLocale, true);
  };

  const t = (key: string, options?: Record<string, unknown>) => {
    try {
      return i18n.t(key, options);
    } catch {
      return key;
    }
  };

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
