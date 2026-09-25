import Redis from "ioredis";
import { env } from "../config/env";
import { logger } from "../utils/logger";

let client: Redis | null = null;

/**
 * Returns the shared Redis client, creating it on first use.
 * Kept as a lazy singleton so the connection is established once per
 * process and reused by every repository, rather than each repository
 * opening its own connection.
 */
export function getRedisClient(): Redis {
  if (!client) {
    client = new Redis(env.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (attempt: number) => Math.min(attempt * 200, 2000),
    });

    client.on("connect", () => {
      logger.info("Redis connected", { url: env.redisUrl });
    });

    client.on("error", (err: Error) => {
      logger.error("Redis client error", { message: err.message });
    });
  }

  return client;
}

/** Health check helper — used by tests and (later) the /health endpoint. */
export async function pingRedis(): Promise<boolean> {
  try {
    const pong = await getRedisClient().ping();
    return pong === "PONG";
  } catch (err) {
    logger.error("Redis ping failed", { message: (err as Error).message });
    return false;
  }
}

/** Gracefully closes the shared connection. Used on shutdown and in tests. */
export async function closeRedisClient(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}
