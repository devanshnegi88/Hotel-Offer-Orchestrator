import { NativeConnection, Worker } from "@temporalio/worker";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { retryAsync } from "../utils/retryAsync";
import { HOTEL_OFFERS_TASK_QUEUE } from "./taskQueue";
import * as supplierActivities from "./activities/supplierActivities";
import * as redisActivities from "./activities/redisActivities";

async function run(): Promise<void> {
  // In Docker Compose, `depends_on` only guarantees the Temporal container
  // has started, not that its gRPC server is ready yet — retry the initial
  // connect rather than crashing on a cold-start race.
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

  const shutdown = async (signal: string): Promise<void> => {
    logger.info("Temporal worker shutting down", { signal });
    worker.shutdown();
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  await worker.run();
}

run().catch((err) => {
  logger.error("Temporal worker crashed", { message: (err as Error).message });
  process.exit(1);
});
