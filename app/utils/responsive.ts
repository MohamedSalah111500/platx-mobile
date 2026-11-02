import { createContext, useContext } from 'react';
import { useWindowDimensions, type ViewStyle } from 'react-native';

export const TABLET_MIN_WIDTH = 768;
export const CONTENT_MAX_WIDTH = 960;
export const FORM_MAX_WIDTH = 600;
export const SHEET_MAX_WIDTH = 600;
export const DIALOG_MAX_WIDTH = 480;
export const TAB_BAR_MAX_WIDTH = 520;

export type FrameKind = 'content' | 'form' | 'full';

export const FRAME_MAX_WIDTH: Record<FrameKind, number> = {
  content: CONTENT_MAX_WIDTH,
  form: FORM_MAX_WIDTH,
  full: Number.POSITIVE_INFINITY,
};

const ContentWidthContext = createContext<number | null>(null);

export const ContentWidthProvider = ContentWidthContext.Provider;

export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  const frameWidth = useContext(ContentWidthContext);
  return frameWidth == null ? width : Math.min(width, frameWidth);
}

export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= TABLET_MIN_WIDTH;
}

export const sheetFrame: ViewStyle = {
  width: '100%',
  maxWidth: SHEET_MAX_WIDTH,
  alignSelf: 'center',
};

export const dialogFrame: ViewStyle = {
  width: '100%',
  maxWidth: DIALOG_MAX_WIDTH,
  alignSelf: 'center',
};

export const contentFrame: ViewStyle = {
  width: '100%',
  maxWidth: CONTENT_MAX_WIDTH,
  alignSelf: 'center',
};

export const formFrame: ViewStyle = {
  width: '100%',
  maxWidth: FORM_MAX_WIDTH,
  alignSelf: 'center',
};
