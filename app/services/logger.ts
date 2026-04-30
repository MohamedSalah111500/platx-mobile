/**
 * Production logger with Crashlytics integration.
 *
 * All methods are no-throw. If Crashlytics isn't available (web, Expo Go,
 * native module not linked), calls are silently dropped.
 */
import { Platform } from 'react-native';

type CrashlyticsLike = {
  log: (msg: string) => void;
  recordError: (err: Error) => void;
  setAttribute: (k: string, v: string) => void;
  setAttributes: (a: Record<string, string>) => void;
  setUserId: (id: string) => void;
  crash: () => void;
};

let crashlyticsRef: CrashlyticsLike | null = null;

// Lazy-load Crashlytics so it never blocks module evaluation
function getCrashlytics(): CrashlyticsLike | null {
  if (crashlyticsRef) return crashlyticsRef;
  if (Platform.OS === 'web') return null;

  try {
    const crashlyticsModule = require('@react-native-firebase/crashlytics').default;
    crashlyticsRef = crashlyticsModule();
    return crashlyticsRef;
  } catch {
    return null;
  }
}

class Logger {
  /** In-memory ring buffer of recent log messages — useful when Crashlytics not available */
  private buffer: string[] = [];
  private readonly MAX_BUFFER = 50;

  log(message: string) {
    const stamped = `[${new Date().toISOString()}] ${message}`;
    this.buffer.push(stamped);
    if (this.buffer.length > this.MAX_BUFFER) this.buffer.shift();

    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log(stamped);
    }

    try {
      getCrashlytics()?.log(stamped);
    } catch {}
  }

  recordError(error: unknown, context?: string) {
    try {
      const err = error instanceof Error ? error : new Error(String(error));
      const c = getCrashlytics();
      if (context && c) c.log(`Context: ${context}`);
      c?.recordError(err);

      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.error(`[Logger] ${context || 'error'}:`, err);
      }
    } catch {}
  }

  setAttribute(key: string, value: string) {
    try {
      getCrashlytics()?.setAttribute(key, value);
    } catch {}
  }

  setUserId(userId: string) {
    try {
      getCrashlytics()?.setUserId(userId);
    } catch {}
  }

  /** Get the in-memory log buffer — surfaced to the error UI for support */
  getBuffer(): string[] {
    return [...this.buffer];
  }

  /** For testing the Crashlytics integration */
  forceCrash() {
    getCrashlytics()?.crash();
  }
}

export const logger = new Logger();
export default logger;
