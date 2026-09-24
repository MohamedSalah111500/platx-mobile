import { Platform } from 'react-native';
// Font families — Cairo loaded in App.tsx from assets/fonts (metrics re-centred)
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
// Cairo's glyphs are tall (Arabic ascenders/descenders), so "tight" can't go
// much below 1.4 without clipping.
export const lineHeightMultiplier = {
  tight: 1.4,
  normal: 1.5,
  relaxed: 1.75,
} as const;

// A button label is one line inside a fixed-height pill. Android needs an explicit
// line height or Cairo's Arabic glyphs clip; iOS centres the glyphs on its own and
// pushes the label upwards when it is given one.
export function buttonLineHeight(size: number): number | undefined {
  return Platform.OS === 'ios' ? undefined : Math.round(size * lineHeightMultiplier.tight);
}

// Typography presets
// Note: React Native requires lineHeight as absolute pixel values, not multipliers
// On Android, custom fonts need fontFamily to set weight — fontWeight alone won't work
export const typography = {
  // Page titles — use these instead of ad-hoc sizes so every screen matches.
  // screenTitle: large title at the top of a main/list screen.
  screenTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['2xl'],
    lineHeight: 34,
  },
  // headerTitle: centred title in a header bar with a back button.
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: 28,
  },
  // sectionTitle: heading of a section inside a screen.
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.lg,
    lineHeight: 28,
  },
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
  // Button labels: centred in the button and allowed to shrink, so a long Arabic
  // label never spills past the button or pushes its icon out. `includeFontPadding`
  // is Android-only and keeps Cairo vertically centred there; `buttonLineHeight`
  // leaves the line box to iOS, which otherwise sits the label high.
  button: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    lineHeight: buttonLineHeight(fontSize.base),
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    flexShrink: 1,
  },
  buttonSmall: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    lineHeight: buttonLineHeight(fontSize.sm),
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    flexShrink: 1,
  },
} as const;

export type Typography = typeof typography;
export default typography;
