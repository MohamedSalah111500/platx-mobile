import i18n from '../i18n/i18n.config';

export function appDateLocale(): string {
  return i18n.language?.startsWith('ar') ? 'ar-EG-u-ca-gregory-nu-latn' : 'en';
}

export function formatClockTime(value: string | number | Date): string {
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`;
}
