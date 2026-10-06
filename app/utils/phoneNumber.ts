const MIN_DIGITS = 8;
const MAX_DIGITS = 15;
const SEPARATORS = new Set([' ', '-', '(', ')', '.', ' ']);

function toAsciiDigit(char: string): string | null {
  if (char >= '0' && char <= '9') return char;
  const code = char.charCodeAt(0);
  if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
  if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
  return null;
}

export function normalizePhoneNumber(input: string | null | undefined): string | null {
  const trimmed = (input ?? '').trim();
  if (!trimmed) return null;

  let result = '';
  let digits = 0;
  for (const char of trimmed) {
    if (char === '+' && result.length === 0) {
      result += '+';
      continue;
    }
    const digit = toAsciiDigit(char);
    if (digit !== null) {
      result += digit;
      digits++;
      continue;
    }
    if (SEPARATORS.has(char)) continue;
    return null;
  }

  return digits >= MIN_DIGITS && digits <= MAX_DIGITS ? result : null;
}
