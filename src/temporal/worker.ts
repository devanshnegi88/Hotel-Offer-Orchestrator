import { NativeConnection, Worker } from "@temporalio/worker";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { retryAsync } from "../utils/retryAsync";
import { closeRedisClient } from "../services/redisClient";
import { HOTEL_OFFERS_TASK_QUEUE } from "./taskQueue";
import * as supplierActivities from "./activities/supplierActivities";
import * as redisActivities from "./activities/redisActivities";

async function run(): Promise<void> {
  const connection = await retryAsync(
    () => NativeConnection.connect({ address: env.temporalAddress }),
    { attempts: 10, delayMs: 3000, label: "Temporal worker: connect to server" }
  );

  const worker = await Worker.create({
    connection,
    namespace: env.temporalNamespace,
    taskQueue: HOTEL_OFFERS_TASK_QUEUE,
    workflowsPath: require.resolve("./workflows/getHotelOffersWorkflow"),
    activities: { ...supplierActivities, ...redisActivities },
  });

  logger.info("Temporal worker starting", {
    taskQueue: HOTEL_OFFERS_TASK_QUEUE,
    address: env.temporalAddress,
    namespace: env.temporalNamespace,
  });

  let isShuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info("Temporal worker shutting down", { signal });
    worker.shutdown();
    try {
      await closeRedisClient();
    } catch (err) {
      logger.error("Error closing Redis client in worker", { message: (err as Error).message });
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  process.on("uncaughtException", (error: Error) => {
    logger.error("Worker Uncaught Exception", { message: error.message, stack: error.stack });
    void shutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    logger.error("Worker Unhandled Promise Rejection", { message });
    void shutdown("unhandledRejection");
  });

  await worker.run();
}

run().catch((err) => {
  logger.error("Temporal worker crashed", { message: (err as Error).message });
  process.exit(1);
});
