import { Request, Response } from "express";
import { parseHotelsQuery } from "../utils/hotelsQueryValidation";
import { runGetHotelOffersWorkflow } from "../temporal/client";
import { HotelOfferRepository } from "../repositories/hotelOfferRepository";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

const repository = new HotelOfferRepository();

/**
 * GET /api/hotels?city=delhi[&minPrice=&maxPrice=]
 *
 * Flow:
 * 1. Validate query params (throws AppError on bad input).
 * 2. Run the Temporal workflow: fetches Supplier A + B in parallel,
 *    dedups/merges (cheapest offer wins), and persists the result to Redis.
 * 3. Read the response back from Redis with the price range applied via
 *    ZRANGEBYSCORE — filtering happens inside Redis, never in JS here.
 *
 * The two remote-dependency calls (Temporal workflow, Redis read) are
 * wrapped separately so a failure in either produces a specific, honest
 * status code instead of a generic 500. Note the workflow itself both
 * calls the suppliers AND persists to Redis (Phase 4), so a Redis outage
 * can surface as a workflow failure (502) rather than the read-side
 * failure (503) below — the 502 message is worded generically for that
 * reason rather than pinning the cause on "suppliers".
 */
export async function getHotels(req: Request, res: Response): Promise<void> {
  const { city, minPrice, maxPrice } = parseHotelsQuery(req.query as Record<string, unknown>);
  const requestId = res.locals.requestId as string | undefined;

  logger.info("GET /api/hotels started", { city, minPrice, maxPrice, requestId });

  try {
    await runGetHotelOffersWorkflow(city);
  } catch (err) {
    logger.error("Hotel offers workflow failed", {
      city,
      requestId,
      message: err instanceof Error ? err.message : String(err),
    });
    throw new AppError(
      "Unable to complete hotel offer aggregation right now. Please try again shortly.",
      502
    );
  }

  let hotels;
  try {
    hotels = await repository.getHotelsByCity(city, minPrice, maxPrice);
  } catch (err) {
    logger.error("Redis read failed for /api/hotels", {
      city,
      requestId,
      message: err instanceof Error ? err.message : String(err),
    });
    throw new AppError("Hotel data store is temporarily unavailable. Please try again shortly.", 503);
  }

  logger.info("GET /api/hotels completed", { city, requestId, resultCount: hotels.length });

  res.status(200).json(hotels);
}
