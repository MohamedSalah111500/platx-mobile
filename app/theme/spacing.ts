// Spacing scale (4px base unit)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  '2xl': 20,
  '3xl': 26,
  '4xl': 32,
  '5xl': 40,
  '6xl': 64,
} as const;

// Border radius scale — generous/rounded by default (soft, modern card language)
export const borderRadius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  full: 9999,
} as const;

export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;

export default { spacing, borderRadius };
