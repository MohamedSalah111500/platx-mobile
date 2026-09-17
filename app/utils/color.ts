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

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors (1-21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Lightens `hex` until it reaches `minRatio` contrast against `background`. */
export function ensureContrastOn(hex: string, background: string, minRatio = 4.5): string {
  let color = hex;
  for (let amount = 0; amount <= 100 && contrastRatio(color, background) < minRatio; amount += 4) {
    color = lighten(hex, amount);
  }
  return color;
}
