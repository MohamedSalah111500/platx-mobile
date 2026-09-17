import * as Application from 'expo-application';
import Constants from 'expo-constants';

export function getAppVersion(): string {
  return Application.nativeApplicationVersion || Constants.expoConfig?.version || '0.0.0';
}

export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    (v || '0')
      .split('.')
      .map((part) => parseInt(part.replace(/\D.*$/, ''), 10) || 0);
  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  return 0;
}
