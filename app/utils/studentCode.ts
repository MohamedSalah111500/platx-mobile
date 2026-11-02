export const STUDENT_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{1,19}$/;

export function normalizeStudentCode(value: string | null | undefined): string | null {
  const code = (value ?? '').trim().toUpperCase();
  return STUDENT_CODE_PATTERN.test(code) ? code : null;
}
