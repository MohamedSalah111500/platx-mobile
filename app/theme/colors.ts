// PLATX Color Palette — neutral gray/white/black base, one dynamic tenant
// accent color layered on top at runtime (see theme/themes.ts buildTheme()).
export const colors = {
  primary: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#18181b',
    600: '#111113',
    700: '#0c0c0e',
    800: '#09090b',
    900: '#000000',
  },

  // Neutral gray scale — the app's real base palette. No hue tint on
  // purpose, so it stays out of the way of whichever accent color a
  // tenant sets.
  secondary: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b', // "Black" used across the app — deliberately not pure #000
  },

  // Semantic colors
  success: {
    light: '#86efac',
    main: '#34c38f',
    dark: '#15803d',
  },

  warning: {
    light: '#fde68a',
    main: '#f1b44c',
    dark: '#b45309',
  },

  danger: {
    light: '#fca5a5',
    main: '#f46a6a',
    dark: '#dc2626',
  },

  info: {
    light: '#93c5fd',
    main: '#50a5f1',
    dark: '#1d4ed8',
  },

  // Base colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorPalette = typeof colors;
export default colors;
