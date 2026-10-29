import type { ThemeColors } from '../../theme/themes';
import { parseServerDate } from '../../utils/date';
import { ATTENDANCE_STATUS, type AttendanceCounts, type AttendanceStatus } from '../../services/api/sessions.api';

const localeTag = (locale: string): string => (locale === 'ar' ? 'ar-EG-u-ca-gregory-nu-latn' : 'en-GB');

export const COUNT_KEYS: { status: AttendanceStatus; key: keyof AttendanceCounts }[] = [
  { status: ATTENDANCE_STATUS.Present, key: 'present' },
  { status: ATTENDANCE_STATUS.Late, key: 'late' },
  { status: ATTENDANCE_STATUS.Absent, key: 'absent' },
  { status: ATTENDANCE_STATUS.Excused, key: 'excused' },
];

const EMPTY_DATE = '—';

export function parseLocalDate(value: string | null | undefined): Date {
  return value ? new Date(value) : new Date(NaN);
}

function formatDate(date: Date, locale: string): string {
  return date.toLocaleDateString(localeTag(locale), { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDay(value: string | null | undefined, locale: string): string {
  const date = parseLocalDate(value);
  return Number.isNaN(date.getTime()) ? '' : formatDate(date, locale);
}

export function formatExamDay(value: string | null | undefined, locale: string): string {
  const date = parseLocalDate(value);
  return Number.isNaN(date.getTime()) || date.getFullYear() < 2000 ? EMPTY_DATE : formatDate(date, locale);
}

export function scoreColor(percentage: number, colors: ThemeColors): string {
  return percentage >= 50 ? colors.success : colors.danger;
}

export function formatDateTime(value: string | null | undefined, locale: string): string {
  const date = parseServerDate(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(localeTag(locale), { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
