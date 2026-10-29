import i18n from '../i18n/i18n.config';

export function appDateLocale(): string {
  return i18n.language?.startsWith('ar') ? 'ar-EG-u-ca-gregory-nu-latn' : 'en';
}
