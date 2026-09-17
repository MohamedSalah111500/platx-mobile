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

// Only allow RTL here. Which direction to use depends on the saved locale, which
// is read asynchronously in RTLProvider — forcing RTL at module load put an
// English user back into an RTL layout on every launch.
try {
  I18nManager.allowRTL(true);
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
