const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const LENGTH = 12;

export function normalizeVoucherCode(input: string | null | undefined): string | null {
  let value = (input ?? '').trim();
  if (!value) return null;
  const trimmed = value.replace(/\/+$/, '');
  const slash = trimmed.lastIndexOf('/');
  if (slash >= 0) value = trimmed.slice(slash + 1);
  const code = value.replace(/[\s-]/g, '').toUpperCase();
  return code.length === LENGTH && [...code].every((c) => ALPHABET.includes(c)) ? code : null;
}

export function courseCodeFrom(input: string | null | undefined): string | null {
  const match = (input ?? '').trim().match(/\/redeem\/([A-Za-z0-9_-]{40,})\/?$/i);
  return match && !/\/wallet\/redeem\//i.test(input ?? '') ? match[1] : null;
}

export function signedPoints(amount: number, format: (value: number) => string): string {
  return `\u2066${amount > 0 ? '+' : '−'}${format(Math.abs(amount))}\u2069`;
}
