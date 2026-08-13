const HEX_PATTERN = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export function isValidHexColor(value?: string | null): value is string {
  return !!value && HEX_PATTERN.test(value.trim());
}

function normalizeHex(hex: string): string {
  const h = hex.trim();
  if (h.length === 4) {
    return '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  return h;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = normalizeHex(hex);
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Mixes a color toward white by `amount` (0-100). */
export function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = Math.max(0, Math.min(100, amount)) / 100;
  return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
}

/** Mixes a color toward black by `amount` (0-100). */
export function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const t = Math.max(0, Math.min(100, amount)) / 100;
  return rgbToHex(r * (1 - t), g * (1 - t), b * (1 - t));
}
