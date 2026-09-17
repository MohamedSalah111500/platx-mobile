import { COURSE_AVAILABILITY, type Course, type CourseAvailability } from '../types/course.types';

type CourseWindow = Pick<Course, 'availability' | 'startDate' | 'endDate'> | null | undefined;

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function resolveCourseAvailability(course: CourseWindow, now: Date = new Date()): CourseAvailability {
  if (!course) return COURSE_AVAILABILITY.Available;
  if (course.availability) return course.availability;

  const start = parseDate(course.startDate);
  if (start && now < start) return COURSE_AVAILABILITY.Upcoming;

  const end = parseDate(course.endDate);
  if (end && now > end) return COURSE_AVAILABILITY.Expired;

  return COURSE_AVAILABILITY.Available;
}

export function isCourseLocked(course: CourseWindow, now: Date = new Date()): boolean {
  const availability = resolveCourseAvailability(course, now);
  return availability === COURSE_AVAILABILITY.Upcoming || availability === COURSE_AVAILABILITY.Expired;
}

export function toDateInputValue(value?: string | null): string {
  if (!value) return '';
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = parseDate(value);
  if (!parsed) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

export function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}
