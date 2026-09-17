import { colors } from './colors';
import { isValidHexColor, lighten, darken, ensureContrastOn } from '../utils/color';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  background: string;
  backgroundGradientFrom: string;
  backgroundGradientTo: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  tabBarBackground: string;
  tabBarActive: string;
  tabBarInactive: string;
  headerBackground: string;
  headerText: string;
  statusBar: 'dark-content' | 'light-content';
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

const DEFAULT_ACCENT = colors.primary[500];

/**
 * Builds a theme from the app's fixed neutral gray palette plus a single
 * dynamic accent color (a tenant's brand color, from HomeSetting.PrimaryColor
 * on the backend). Falls back to the default accent when none is set/valid.
 */
export function buildTheme(dark: boolean, accentColor?: string | null): Theme {
  const accent = isValidHexColor(accentColor) ? accentColor : DEFAULT_ACCENT;
  // Dark backgrounds need a lighter tint of the accent to stay legible. Muted
  // tenant colours need more than the base 18%, so keep lightening until the
  // accent reaches AA text contrast on the card colour (icons, links, tints).
  const primary = dark ? ensureContrastOn(lighten(accent, 18), colors.secondary[800]) : accent;
  // Only ever used as a soft fill behind primary-coloured icons/text, so it has
  // to stay close to the surface: a dark brand colour lightened by 38% is still
  // mid-grey and reads as a solid button.
  const primaryLight = dark ? darken(primary, 55) : lighten(primary, 88);
  const primaryDark = dark ? lighten(primary, 25) : darken(primary, 15);

  if (dark) {
    return {
      dark: true,
      colors: {
        primary,
        primaryLight,
        primaryDark,

        background: colors.secondary[900],
        backgroundGradientFrom: colors.secondary[800],
        backgroundGradientTo: colors.secondary[900],
        surface: colors.secondary[800],
        card: colors.secondary[800],

        text: colors.secondary[50],
        textSecondary: colors.secondary[300],
        textMuted: colors.secondary[500],

        border: colors.secondary[700],
        // Between card (800) and border (700): same as card was invisible on cards.
        divider: '#323238',

        // Mid tones, not the pastel ".light" ones: these are also used as solid
        // fills behind white text (danger buttons, badges), where pastels are
        // unreadable. They still have enough contrast on the dark background.
        success: colors.success.main,
        warning: colors.warning.main,
        danger: colors.danger.main,
        info: colors.info.main,

        inputBackground: colors.secondary[800],
        inputBorder: colors.secondary[600],
        inputText: colors.secondary[50],
        inputPlaceholder: colors.secondary[500],

        tabBarBackground: colors.secondary[900],
        tabBarActive: primary,
        tabBarInactive: colors.secondary[500],

        headerBackground: colors.secondary[900],
        headerText: colors.secondary[50],

        statusBar: 'light-content',
      },
    };
  }

  return {
    dark: false,
    colors: {
      primary,
      primaryLight,
      primaryDark,

      // Cards are white, so the page behind them can't also be pure white or
      // every card loses its edges (nothing here carries a shadow).
      background: colors.secondary[100],
      backgroundGradientFrom: colors.secondary[100],
      backgroundGradientTo: colors.white,
      surface: colors.secondary[50],
      card: colors.white,

      text: colors.secondary[900],
      textSecondary: colors.secondary[500],
      textMuted: colors.secondary[400],

      border: colors.secondary[200],
      divider: colors.secondary[100],

      success: colors.success.main,
      warning: colors.warning.main,
      danger: colors.danger.main,
      info: colors.info.main,

      inputBackground: colors.secondary[50],
      inputBorder: colors.secondary[300],
      inputText: colors.secondary[900],
      inputPlaceholder: colors.secondary[400],

      tabBarBackground: colors.white,
      tabBarActive: primary,
      tabBarInactive: colors.secondary[400],

      headerBackground: colors.white,
      headerText: colors.secondary[900],

      statusBar: 'dark-content',
    },
  };
}

export const lightTheme: Theme = buildTheme(false);
export const darkTheme: Theme = buildTheme(true);

export default { lightTheme, darkTheme, buildTheme };
