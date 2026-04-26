import crashlytics from '@react-native-firebase/crashlytics';

class Logger {
  /**
   * Log a non-fatal error to Crashlytics — use for caught exceptions
   * that you want to track but don't crash the app.
   */
  recordError(error: Error | unknown, context?: string) {
    try {
      const err = error instanceof Error ? error : new Error(String(error));
      if (context) {
        crashlytics().log(`Context: ${context}`);
      }
      crashlytics().recordError(err);
    } catch {}
  }

  /**
   * Log a breadcrumb — appears in Crashlytics before the next crash.
   */
  log(message: string) {
    try {
      crashlytics().log(message);
    } catch {}
  }

  /**
   * Set a custom attribute for filtering crashes by user/state.
   */
  setAttribute(key: string, value: string) {
    try {
      crashlytics().setAttribute(key, value);
    } catch {}
  }

  /**
   * Tag the current user — appears on all crashes from this device.
   */
  setUserId(userId: string) {
    try {
      crashlytics().setUserId(userId);
    } catch {}
  }

  /**
   * Force a crash — for testing Crashlytics integration only.
   */
  crash() {
    crashlytics().crash();
  }
}

export const logger = new Logger();
export default logger;
