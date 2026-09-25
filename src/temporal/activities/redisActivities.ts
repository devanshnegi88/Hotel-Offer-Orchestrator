import { HotelOfferRepository } from "../../repositories/hotelOfferRepository";
import { MergedHotelOffer } from "../../models/hotel";
import { logger } from "../../utils/logger";

const repository = new HotelOfferRepository();

/**
 * Persists the final deduplicated offer list for a city to Redis.
 * Kept as an activity (not called from the workflow directly) because
 * Redis I/O is a side effect, and workflow code must stay deterministic —
 * all persistence goes through activities, same as the supplier HTTP calls.
 */
export async function saveHotelOffersActivity(
  city: string,
  offers: MergedHotelOffer[]
): Promise<void> {
  try {
    await repository.saveCityOffers(city, offers);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("saveHotelOffersActivity failed", { city, message });
    throw new Error(`Failed to save hotel offers to Redis: ${message}`);
  }
}
