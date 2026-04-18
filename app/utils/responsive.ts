import { Dimensions, PixelRatio } from 'react-native';

const { width, height } = Dimensions.get('window');

// Design base width (iPhone 14 = 390px)
const BASE_WIDTH = 390;
const BASE_HEIGHT = 844;

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;

// Tablet: width >= 768
export const isTablet = width >= 768;

// Scale size relative to design width
export function scale(size: number): number {
  return (width / BASE_WIDTH) * size;
}

// Scale height relative to design height
export function verticalScale(size: number): number {
  return (height / BASE_HEIGHT) * size;
}

// Moderate scale: grows slower than screen to avoid oversized UI on tablets
// factor: 0 = no scaling, 1 = full scaling. Default 0.5
export function moderateScale(size: number, factor = 0.5): number {
  return size + (scale(size) - size) * factor;
}

// Font size that scales moderately — tablets get bigger text but not double
export function rf(size: number): number {
  const scaled = moderateScale(size, isTablet ? 0.3 : 0.25);
  return Math.round(PixelRatio.roundToNearestPixel(scaled));
}

// Horizontal padding that gives more breathing room on tablets
export function hp(size: number): number {
  return isTablet ? size * 1.5 : size;
}

// Number of columns for grid layouts
export function gridColumns(base = 2): number {
  if (width >= 1024) return base + 2; // Large tablet / landscape
  if (width >= 768) return base + 1;  // Tablet
  return base;
}
