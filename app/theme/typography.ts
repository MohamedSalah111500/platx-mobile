import { Platform } from 'react-native';

// Font families
export const fontFamily = {
  regular: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
  medium: Platform.select({
    ios: 'System',
    android: 'Roboto-Medium',
    default: 'System',
  }),
  bold: Platform.select({
    ios: 'System',
    android: 'Roboto-Bold',
    default: 'System',
  }),
} as const;

// Font sizes
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

// Font weights
export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Line height multipliers (applied to fontSize to get absolute pixel values)
export const lineHeightMultiplier = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// Typography presets
// Note: React Native requires lineHeight as absolute pixel values, not multipliers
export const typography = {
  h1: {
    fontSize: fontSize['4xl'],
    fontWeight: fontWeight.bold,
    lineHeight: Math.round(fontSize['4xl'] * lineHeightMultiplier.tight),
  },
  h2: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    lineHeight: Math.round(fontSize['3xl'] * lineHeightMultiplier.tight),
  },
  h3: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize['2xl'] * lineHeightMultiplier.tight),
  },
  h4: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.xl * lineHeightMultiplier.normal),
  },
  body: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
    lineHeight: Math.round(fontSize.base * lineHeightMultiplier.normal),
  },
  bodySmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
    lineHeight: Math.round(fontSize.sm * lineHeightMultiplier.normal),
  },
  caption: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.normal,
    lineHeight: Math.round(fontSize.xs * lineHeightMultiplier.normal),
  },
  button: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.base * lineHeightMultiplier.tight),
  },
  buttonSmall: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    lineHeight: Math.round(fontSize.sm * lineHeightMultiplier.tight),
  },
} as const;

export type Typography = typeof typography;
export default typography;
