import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { closeRedisClient } from "./services/redisClient";

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info(`Server listening on port ${env.port}`, { nodeEnv: env.nodeEnv });
});

async function shutdown(signal: string): Promise<void> {
  logger.info("Server shutting down", { signal });
  server.close(() => {
    logger.info("HTTP server closed");
  });
  await closeRedisClient();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
