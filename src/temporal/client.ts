import { Client, Connection } from "@temporalio/client";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { retryAsync } from "../utils/retryAsync";
import { HOTEL_OFFERS_TASK_QUEUE } from "./taskQueue";
import { getHotelOffersWorkflow } from "./workflows/getHotelOffersWorkflow";
import { MergedHotelOffer } from "../models/hotel";

let client: Client | null = null;

async function getClient(): Promise<Client> {
  if (!client) {
    // Retries here cover the case where the API container's first request
    // lands before Temporal's gRPC server is actually ready to accept
    // connections (a Docker Compose cold-start race, not a real outage).
    const connection = await retryAsync(
      () => Connection.connect({ address: env.temporalAddress }),
      { attempts: 5, delayMs: 2000, label: "Temporal client: connect to server" }
    );
    client = new Client({ connection, namespace: env.temporalNamespace });
  }
  return client;
}

/**
 * Starts the getHotelOffersWorkflow for a city and waits for its result.
 * Each call gets a unique workflow id (city + timestamp) so repeated
 * requests for the same city don't collide with an in-flight execution.
 */
export async function runGetHotelOffersWorkflow(city: string): Promise<MergedHotelOffer[]> {
  const c = await getClient();
  const workflowId = `get-hotel-offers-${city.trim().toLowerCase()}-${Date.now()}`;

  logger.info("Starting getHotelOffersWorkflow", { city, workflowId });

  return c.workflow.execute(getHotelOffersWorkflow, {
    taskQueue: HOTEL_OFFERS_TASK_QUEUE,
    workflowId,
    args: [city],
  });
}
