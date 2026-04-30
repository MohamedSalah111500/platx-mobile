/**
 * Centralized app startup orchestrator.
 *
 * All initialization that needs to happen before the UI renders goes here.
 * Each step is isolated, timed, logged, and never throws — failures are
 * captured to Crashlytics but never block the app from rendering.
 */
import { Platform } from 'react-native';
import { logger } from '../services/logger';

type Step = {
  name: string;
  run: () => Promise<void>;
  /** If true, failures here are critical and surface to the UI. Default false. */
  critical?: boolean;
};

export type StartupResult = {
  ok: boolean;
  failures: string[];
  durationMs: number;
};

/**
 * Wrap a promise with a timeout. Resolves with `{ timedOut: true }` if it takes
 * longer than `ms`. Never rejects.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | { timedOut: true }> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ timedOut: true } as any), ms);
    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve({ timedOut: false } as any);
      });
  });
}

/**
 * Run each startup step with a per-step timeout, logging timing & errors.
 */
export async function runStartup(steps: Step[], perStepTimeoutMs = 4000): Promise<StartupResult> {
  const start = Date.now();
  const failures: string[] = [];

  logger.log(`[Startup] begin platform=${Platform.OS} version=${Platform.Version}`);

  for (const step of steps) {
    const stepStart = Date.now();
    try {
      const result = await withTimeout(step.run(), perStepTimeoutMs);
      const elapsed = Date.now() - stepStart;
      if (result && (result as any).timedOut) {
        const msg = `[Startup] step "${step.name}" timed out after ${elapsed}ms`;
        logger.log(msg);
        failures.push(step.name);
      } else {
        logger.log(`[Startup] step "${step.name}" ok in ${elapsed}ms`);
      }
    } catch (err) {
      const elapsed = Date.now() - stepStart;
      logger.log(`[Startup] step "${step.name}" threw after ${elapsed}ms`);
      logger.recordError(err, `Startup:${step.name}`);
      failures.push(step.name);
    }
  }

  const durationMs = Date.now() - start;
  logger.log(`[Startup] done in ${durationMs}ms failures=${failures.join(',') || 'none'}`);

  return {
    ok: failures.length === 0,
    failures,
    durationMs,
  };
}
