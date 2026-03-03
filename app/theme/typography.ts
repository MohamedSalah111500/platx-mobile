// Font families — Cairo loaded in App.tsx via @expo-google-fonts/cairo
export const fontFamily = {
  regular: 'Cairo_400Regular',
  medium: 'Cairo_500Medium',
  semibold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
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
// On Android, custom fonts need fontFamily to set weight — fontWeight alone won't work
export const typography = {
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['4xl'],
    lineHeight: Math.round(fontSize['4xl'] * lineHeightMultiplier.tight),
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    lineHeight: Math.round(fontSize['3xl'] * lineHeightMultiplier.tight),
  },
  h3: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize['2xl'],
    lineHeight: Math.round(fontSize['2xl'] * lineHeightMultiplier.tight),
  },
  h4: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xl,
    lineHeight: Math.round(fontSize.xl * lineHeightMultiplier.normal),
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: Math.round(fontSize.base * lineHeightMultiplier.normal),
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: Math.round(fontSize.sm * lineHeightMultiplier.normal),
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: Math.round(fontSize.xs * lineHeightMultiplier.normal),
  },
  button: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    lineHeight: Math.round(fontSize.base * lineHeightMultiplier.tight),
  },
  buttonSmall: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    lineHeight: Math.round(fontSize.sm * lineHeightMultiplier.tight),
  },
} as const;

export type Typography = typeof typography;
export default typography;
