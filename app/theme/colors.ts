// PLATX Color Palette - matching the web project
export const colors = {
  // Primary palette (PLATX Purple)
  primary: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#7c63fd', // Main primary color
    600: '#6d52e8',
    700: '#5b3fd4',
    800: '#4c2db8',
    900: '#3d2196',
  },

  // Secondary (Gray)
  secondary: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#74788d', // Main secondary
    600: '#5c5f72',
    700: '#454755',
    800: '#2d2f38',
    900: '#16171c',
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
