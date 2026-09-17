// Mirrors platx-frontend/src/app/shared/currencies.ts so prices render exactly
// like the web (Arabic glyph in AR, Latin symbol / ISO code in EN).

export interface CurrencyOption {
  code: string;
  /** Arabic-friendly glyph (e.g. "ر.س"). */
  symbol: string;
  /** English representation (Latin symbol or the ISO code, e.g. "SAR"). */
  symbolEn: string;
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'SAR', symbol: 'ر.س', symbolEn: 'SAR' },
  { code: 'EGP', symbol: 'ج.م', symbolEn: 'EGP' },
  { code: 'AED', symbol: 'د.إ', symbolEn: 'AED' },
  { code: 'KWD', symbol: 'د.ك', symbolEn: 'KWD' },
  { code: 'QAR', symbol: 'ر.ق', symbolEn: 'QAR' },
  { code: 'USD', symbol: '$', symbolEn: '$' },
  { code: 'EUR', symbol: '€', symbolEn: '€' },
];

export const DEFAULT_CURRENCY_CODE = 'EGP';

export function getCurrencySymbol(code: string | null | undefined, lang: string = 'ar'): string {
  const fallback = CURRENCIES.find((c) => c.code === DEFAULT_CURRENCY_CODE)!;
  const cur = code
    ? CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase())
    : fallback;
  if (!cur) return String(code);
  return lang === 'en' ? cur.symbolEn : cur.symbol;
}

/** "1566" → "1,566", "968.5" → "968.5" (max 2 decimals, no trailing zeros). */
export function formatAmount(amount: number | null | undefined): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return '0';
  const fixed = Math.round(n * 100) / 100;
  const [int, dec] = String(fixed).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec ? `${grouped}.${dec}` : grouped;
}

/** Full price string, e.g. "968 ر.س" (ar) / "$968" or "968 SAR" (en). */
export function formatPrice(
  amount: number | null | undefined,
  currencyCode: string | null | undefined,
  lang: string = 'ar'
): string {
  const symbol = getCurrencySymbol(currencyCode, lang);
  const value = formatAmount(amount);
  // Single-glyph Latin symbols read best as a prefix ($968); everything else as a suffix.
  if (lang === 'en' && /^[^A-Za-z؀-ۿ]$/.test(symbol)) return `${symbol}${value}`;
  return `${value} ${symbol}`;
}

/** Effective price after discount (discount only counts when it is lower). */
export function effectivePrice(price?: number | null, discountPrice?: number | null): number {
  const p = Number(price ?? 0);
  const d = discountPrice == null ? null : Number(discountPrice);
  return d != null && d < p ? d : p;
}

/** Whole-number discount percentage, or null when there is no real discount. */
export function discountPercent(price?: number | null, discountPrice?: number | null): number | null {
  const p = Number(price ?? 0);
  const d = discountPrice == null ? null : Number(discountPrice);
  if (!p || d == null || d >= p) return null;
  const pct = Math.round((1 - d / p) * 100);
  return pct > 0 ? pct : null;
}
