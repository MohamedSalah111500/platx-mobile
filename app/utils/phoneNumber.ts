import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/mobile';

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'EG';

const EXCLUDED_PHONE_COUNTRIES: CountryCode[] = ['IL'];

function toAsciiDigits(input: string): string {
  let result = '';
  for (const char of input) {
    const code = char.charCodeAt(0);
    if (code >= 0x0660 && code <= 0x0669) result += String(code - 0x0660);
    else if (code >= 0x06f0 && code <= 0x06f9) result += String(code - 0x06f0);
    else result += char;
  }
  return result;
}

export function toE164Phone(input: string | null | undefined, country: CountryCode): string | null {
  const value = toAsciiDigits((input ?? '').trim());
  if (!value) return null;
  const phone = parsePhoneNumberFromString(value, country);
  if (!phone?.isValid()) return null;
  if (phone.country && EXCLUDED_PHONE_COUNTRIES.includes(phone.country)) return null;
  return phone.number;
}

export function flagEmoji(country: string): string {
  return country
    .toUpperCase()
    .split('')
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join('');
}

export function normalizeSearch(value: string): string {
  return toAsciiDigits(value)
    .toLocaleLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[+\s]/g, '');
}
