import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './locales/en.json';
import ar from './locales/ar.json';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

// Get device locale (expo-localization v16+ API)
const deviceLocale = getLocales()[0]?.languageCode || 'en';
const supportedLocales = ['en', 'ar'];
const defaultLocale = supportedLocales.includes(deviceLocale) ? deviceLocale : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLocale,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v3',
});

export default i18n;
