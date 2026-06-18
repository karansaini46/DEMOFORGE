import { spawn } from 'node:child_process';

import { logger } from './logger';

const EDGE_TTS_CHECK_TIMEOUT_MS = 10_000;

/**
 * Verifies the `edge-tts` CLI is installed and runnable by invoking
 * `edge-tts --version`. The TTS pipeline shells out to this binary, so we check
 * it once at startup to fail fast with a clear message instead of letting jobs
 * blow up mid-run with an opaque error.
 *
 * @throws Error if the binary is missing, errors, or doesn't respond in time.
 */
export function assertEdgeTts(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('edge-tts', ['--version']);

    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    const fail = (detail: string) =>
      reject(
        new Error(
          `edge-tts CLI is not available (${detail}). ` +
            'Install it with `pipx install edge-tts` (or `pip install edge-tts`) ' +
            'and ensure it is on PATH.',
        ),
      );

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(() => fail(`no response within ${EDGE_TTS_CHECK_TIMEOUT_MS}ms`));
    }, EDGE_TTS_CHECK_TIMEOUT_MS);

    child.on('error', (err) =>
      finish(() =>
        fail(err && (err as NodeJS.ErrnoException).code === 'ENOENT'
          ? 'not found on PATH'
          : err.message),
      ),
    );

    child.on('close', (code) => {
      if (code === 0) {
        finish(resolve);
      } else {
        finish(() => fail(`exited with code ${code}`));
      }
    });
  });
}

/**
 * Runs all startup preflight checks. Logs and rethrows on the first failure so
 * the process refuses to start in a broken configuration.
 */
export async function runPreflightChecks(): Promise<void> {
  await assertEdgeTts();
  logger.info('Preflight checks passed (edge-tts available)');
}
