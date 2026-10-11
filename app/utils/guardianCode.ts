export const GUARDIAN_CODE_LENGTH = 10;

export function normalizeGuardianCode(input: string | null | undefined): string {
  const value = input ?? '';
  const marker = value.toLowerCase().lastIndexOf('code=');
  const raw = marker >= 0 ? value.slice(marker + 5).split(/[&#]/)[0] : value;
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, GUARDIAN_CODE_LENGTH);
}

export function guardianCodeFromUrl(url: string | null | undefined): string | null {
  const match = (url ?? '').trim().match(/^platx:\/\/\/?guardian\/?(\?.*)?$/i);
  if (!match?.[1]) return null;
  const param = match[1].match(/[?&]code=([^&#]*)/i);
  if (!param) return null;
  let decoded = param[1];
  try {
    decoded = decodeURIComponent(decoded);
  } catch {}
  const code = normalizeGuardianCode(decoded);
  return code || null;
}
