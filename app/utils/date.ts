/**
 * The backend serializes UTC DateTimes without an offset ("2026-01-01T10:00:00"),
 * which JS would parse as local time. Treat such values as UTC.
 */
export function parseServerDate(value?: string | null): Date {
  if (!value) return new Date(NaN);
  // .NET round-trips DateTime with up to 7 fractional digits ("…:30.1234567");
  // only 3 are portable, and Hermes rejects the longer form.
  const raw = value.trim().replace(/(\.\d{3})\d+/, '$1');
  const hasTime = /T|\d\s\d/.test(raw);
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  if (hasTime && !hasOffset) {
    return new Date(`${raw.replace(' ', 'T')}Z`);
  }
  return new Date(raw);
}

/** YYYY-MM-DD built from local date parts (toISOString() would shift to UTC). */
export function toLocalDateString(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
