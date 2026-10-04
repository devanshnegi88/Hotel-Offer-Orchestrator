import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { closeRedisClient } from "./services/redisClient";

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`Server listening on port ${env.port}`, { nodeEnv: env.nodeEnv, logFormat: env.logFormat });
});

let isShuttingDown = false;

async function shutdown(signal: string, exitCode = 0): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info("Server graceful shutdown initiated", { signal });

  const forceExitTimeout = setTimeout(() => {
    logger.error("Forcefully shutting down server due to timeout");
    process.exit(1);
  }, 10000);
  forceExitTimeout.unref();

  server.close(async () => {
    logger.info("HTTP server closed");
    try {
      await closeRedisClient();
      logger.info("Redis client closed");
    } catch (err) {
      logger.error("Error closing Redis client on shutdown", { message: (err as Error).message });
    }
    process.exit(exitCode);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception detected", { message: error.message, stack: error.stack });
  void shutdown("uncaughtException", 1);
});

process.on("unhandledRejection", (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  logger.error("Unhandled Promise Rejection detected", { message, stack });
  void shutdown("unhandledRejection", 1);
});
