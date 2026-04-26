import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import { getLocales } from 'expo-localization';

import en from './locales/en.json';
import ar from './locales/ar.json';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

// Get device locale (expo-localization v16+ API) — wrapped in try/catch to avoid module-level crash
let deviceLocale = 'en';
try {
  deviceLocale = getLocales()[0]?.languageCode || 'en';
} catch {}

const supportedLocales = ['en', 'ar'];
const defaultLocale = 'ar';

// Force RTL immediately — wrapped because I18nManager calls can crash on some Android OEMs
try {
  if (defaultLocale === 'ar' && !I18nManager.isRTL) {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  }
} catch {}

try {
  i18n.use(initReactI18next).init({
    resources,
    lng: defaultLocale,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    compatibilityJSON: 'v3',
  });
} catch {}

export default i18n;
