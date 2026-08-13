import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildTheme, Theme } from './themes';
import { STORAGE_KEYS } from '@config/constants';
import { logger } from '../services/logger';
import { useAuthStore } from '../store/auth.store';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  // Always start with a valid theme — never block render waiting for storage.
  // We hydrate the preference asynchronously and update if it differs.
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE);
        if (cancelled) return;
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setThemeMode(saved);
        }
      } catch (err) {
        logger.recordError(err, 'ThemeProvider:load');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isDark =
    themeMode === 'system' ? systemColorScheme === 'dark' : themeMode === 'dark';
  const tenantColor = useAuthStore((s) => s.tenantColor);
  const theme = useMemo(() => buildTheme(isDark, tenantColor), [isDark, tenantColor]);

  const persist = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
    } catch (err) {
      logger.recordError(err, 'ThemeProvider:save');
    }
  };

  const toggleTheme = () => {
    const next: ThemeMode = isDark ? 'light' : 'dark';
    setThemeMode(next);
    persist(next);
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    persist(mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, themeMode, toggleTheme, setTheme }}>
      <StatusBar
        barStyle={theme.colors.statusBar}
        backgroundColor={theme.colors.headerBackground}
      />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeProvider;
