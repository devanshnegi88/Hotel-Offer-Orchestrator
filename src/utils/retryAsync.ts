import { logger } from "./logger";

interface RetryOptions {
  attempts: number;
  delayMs: number;
  label: string;
}

/**
 * Retries an async operation with a fixed delay between attempts, logging
 * each failure. Used for connecting to Temporal on process startup: in
 * Docker Compose, `depends_on` only guarantees a container has *started*,
 * not that its gRPC server is accepting connections yet, so the first
 * connect attempt racing that isn't an error condition — it's expected
 * and should be retried rather than crashing the process.
 */
export async function retryAsync<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { attempts, delayMs, label } = options;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`${label} attempt ${attempt}/${attempts} failed`, { message });

      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
