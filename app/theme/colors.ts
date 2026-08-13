// PLATX Color Palette — neutral gray/white/black base, one dynamic tenant
// accent color layered on top at runtime (see theme/themes.ts buildTheme()).
export const colors = {
  // Default accent — used only as a fallback until a tenant's brand color
  // (HomeSetting.PrimaryColor, from the backend) is loaded.
  primary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#7c63fd', // Default accent color
    600: '#6d52e8',
    700: '#5b3fd4',
    800: '#4c2db8',
    900: '#3d2196',
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
