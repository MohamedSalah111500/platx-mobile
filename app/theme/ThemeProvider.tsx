import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme, Theme } from './themes';
import { STORAGE_KEYS } from '@config/constants';

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
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEYS.THEME_MODE);
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
        setThemeMode(saved as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const isDark =
    themeMode === 'system'
      ? systemColorScheme === 'dark'
      : themeMode === 'dark';

  const theme = isDark ? darkTheme : lightTheme;

  const toggleTheme = async () => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, newMode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const setTheme = async (mode: ThemeMode) => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  if (!isLoaded) {
    return null; // Or a loading indicator
  }

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
