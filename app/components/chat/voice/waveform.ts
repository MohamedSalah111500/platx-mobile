export const WAVEFORM_SIZE = 48;
export const MIN_VOICE_MS = 1000;
export const MAX_VOICE_MS = 15 * 60 * 1000;

const SILENCE_DB = -50;
const FLAT_LEVEL = 0.12;

export function meterToLevel(db?: number): number {
  if (db == null || !Number.isFinite(db)) return 0;
  return Math.min(1, Math.max(0, (db - SILENCE_DB) / -SILENCE_DB));
}

export function resampleLevels(levels: number[], count: number): number[] {
  if (!levels.length) return new Array(count).fill(0);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const from = Math.floor((i * levels.length) / count);
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / count));
    let peak = 0;
    for (let j = from; j < to && j < levels.length; j++) peak = Math.max(peak, levels[j]);
    out.push(peak);
  }
  return out;
}

export function encodeWaveform(levels: number[]): string {
  const bars = resampleLevels(levels, WAVEFORM_SIZE);
  const peak = Math.max(...bars, 0.0001);
  const bytes = bars.map((value) => Math.round((value / peak) * 255));
  return btoa(String.fromCharCode(...bytes));
}

export function decodeWaveform(base64: string | null | undefined, count: number): number[] {
  if (!base64) return new Array(count).fill(FLAT_LEVEL);
  try {
    const raw = atob(base64);
    const levels = Array.from(raw, (char) => char.charCodeAt(0) / 255);
    return levels.length ? resampleLevels(levels, count) : new Array(count).fill(FLAT_LEVEL);
  } catch {
    return new Array(count).fill(FLAT_LEVEL);
  }
}

export function formatVoiceTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
