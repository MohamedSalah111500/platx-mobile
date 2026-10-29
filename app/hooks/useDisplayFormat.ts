import { useCallback } from 'react';
import { useRTL } from '../i18n/RTLProvider';
import type { Course } from '../types/course.types';

const LTR_ISOLATE = '⁦';
const POP_ISOLATE = '⁩';

export function isolate(text: string): string {
  return `${LTR_ISOLATE}${text}${POP_ISOLATE}`;
}

export function useDisplayFormat() {
  const { t, locale } = useRTL();
  const dateLocale = locale.startsWith('ar') ? 'ar-EG-u-ca-gregory-nu-latn' : 'en';

  const percent = useCallback((value: number) => isolate(`${Math.round(value)}%`), []);

  const courseMeta = useCallback(
    (course: Pick<Course, 'totalLessons' | 'totalHours'>) => {
      const parts: string[] = [];
      if (course.totalLessons) parts.push(t('home.lessonsCount', { count: course.totalLessons }));
      const hours = Math.round(course.totalHours || 0);
      if (hours > 0) parts.push(t('home.hoursCount', { count: hours }));
      return parts.join('  ·  ');
    },
    [t],
  );

  const date = useCallback(
    (value: string | Date, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) =>
      new Date(value).toLocaleDateString(dateLocale, options),
    [dateLocale],
  );

  const time = useCallback(
    (value: string | Date) => new Date(value).toLocaleTimeString(dateLocale, { hour: 'numeric', minute: '2-digit' }),
    [dateLocale],
  );

  const month = useCallback(
    (value: string | Date) => new Date(value).toLocaleString(dateLocale, { month: 'short' }),
    [dateLocale],
  );

  const language = useCallback(
    (name: string) => {
      const key = `languages.${name.trim().toLowerCase()}`;
      const label = t(key);
      return label === key ? name : label;
    },
    [t],
  );

  return { percent, courseMeta, date, time, month, language, dateLocale };
}
