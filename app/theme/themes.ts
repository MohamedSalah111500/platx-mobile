import { colors } from './colors';

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  background: string;
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

export const lightTheme: Theme = {
  dark: false,
  colors: {
    primary: colors.primary[500],
    primaryLight: colors.primary[100],
    primaryDark: colors.primary[700],

    background: colors.white,
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
    tabBarActive: colors.primary[500],
    tabBarInactive: colors.secondary[400],

    headerBackground: colors.white,
    headerText: colors.secondary[900],

    statusBar: 'dark-content',
  },
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    primary: colors.primary[400],
    primaryLight: colors.primary[800],
    primaryDark: colors.primary[300],

    background: colors.secondary[900],
    surface: colors.secondary[800],
    card: colors.secondary[800],

    text: colors.secondary[50],
    textSecondary: colors.secondary[300],
    textMuted: colors.secondary[500],

    border: colors.secondary[700],
    divider: colors.secondary[800],

    success: colors.success.light,
    warning: colors.warning.light,
    danger: colors.danger.light,
    info: colors.info.light,

    inputBackground: colors.secondary[800],
    inputBorder: colors.secondary[600],
    inputText: colors.secondary[50],
    inputPlaceholder: colors.secondary[500],

    tabBarBackground: colors.secondary[900],
    tabBarActive: colors.primary[400],
    tabBarInactive: colors.secondary[500],

    headerBackground: colors.secondary[900],
    headerText: colors.secondary[50],

    statusBar: 'light-content',
  },
};

export default { lightTheme, darkTheme };
