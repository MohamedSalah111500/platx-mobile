import type { ThemeColors } from '../../theme/themes';
import { ATTENDANCE_STATUS, asUtcDate, type AttendanceStatus } from '../../services/api/sessions.api';

const localeTag = (locale: string): string => (locale === 'ar' ? 'ar-EG' : 'en-GB');

export function formatSessionDate(startsAt: string, locale: string): string {
  return new Date(startsAt).toLocaleString(localeTag(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRecordedTime(recordedAt: string, locale: string): string {
  return asUtcDate(recordedAt).toLocaleTimeString(localeTag(locale), { hour: 'numeric', minute: '2-digit' });
}

export function attendanceColor(status: AttendanceStatus, colors: ThemeColors): string {
  switch (status) {
    case ATTENDANCE_STATUS.Present:
      return colors.success;
    case ATTENDANCE_STATUS.Late:
      return colors.warning;
    case ATTENDANCE_STATUS.Absent:
      return colors.danger;
    default:
      return colors.info;
  }
}
