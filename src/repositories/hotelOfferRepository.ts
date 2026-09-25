import { getRedisClient } from "../services/redisClient";
import { MergedHotelOffer, SupplierName } from "../models/hotel";
import { cityIndexKey, hotelHashKey } from "./redisKeys";
import { logger } from "../utils/logger";

interface HotelHashFields {
  name: string;
  price: string;
  supplier: string;
  commissionPct: string;
}

/**
 * Data-access layer for hotel offers. This is the only module in the
 * codebase that knows the Redis key layout — callers work with
 * MergedHotelOffer objects and city/price-range parameters, nothing else.
 */
export class HotelOfferRepository {
  private get redis() {
    return getRedisClient();
  }

  /**
   * Replaces the stored offer set for a city with `offers`.
   * Full-replace (rather than incremental upsert) so a hotel that no
   * longer appears in either supplier's response doesn't linger as
   * stale data after a re-fetch.
   */
  async saveCityOffers(city: string, offers: MergedHotelOffer[]): Promise<void> {
    const indexKey = cityIndexKey(city);
    const existingNames = await this.redis.zrange(indexKey, 0, -1);

    const pipeline = this.redis.pipeline();

    for (const name of existingNames) {
      pipeline.del(hotelHashKey(city, name));
    }
    pipeline.del(indexKey);

    for (const offer of offers) {
      pipeline.zadd(indexKey, offer.price, offer.name);
      pipeline.hset(
        hotelHashKey(city, offer.name),
        "name",
        offer.name,
        "price",
        String(offer.price),
        "supplier",
        offer.supplier,
        "commissionPct",
        String(offer.commissionPct)
      );
    }

    await pipeline.exec();
    logger.info("Saved city offers to Redis", { city, count: offers.length });
  }

  /**
   * Retrieves hotels for a city, optionally restricted to a price range.
   * The range filtering happens inside Redis via ZRANGEBYSCORE — the
   * app never loads the full set and filters it in JavaScript.
   */
  async getHotelsByCity(
    city: string,
    minPrice?: number,
    maxPrice?: number
  ): Promise<MergedHotelOffer[]> {
    const indexKey = cityIndexKey(city);
    const min = minPrice ?? Number.NEGATIVE_INFINITY;
    const max = maxPrice ?? Number.POSITIVE_INFINITY;

    const names = await this.redis.zrangebyscore(indexKey, min, max);
    if (names.length === 0) {
      return [];
    }

    const pipeline = this.redis.pipeline();
    for (const name of names) {
      pipeline.hgetall(hotelHashKey(city, name));
    }
    const results = await pipeline.exec();

    if (!results) {
      return [];
    }

    return results
      .map(([err, hash]) => (err ? null : (hash as HotelHashFields)))
      .filter((hash): hash is HotelHashFields => !!hash && Object.keys(hash).length > 0)
      .map((hash) => ({
        name: hash.name,
        price: Number(hash.price),
        supplier: hash.supplier as SupplierName,
        commissionPct: Number(hash.commissionPct),
      }));
  }

  /** Number of distinct hotels currently stored for a city. */
  async countByCity(city: string): Promise<number> {
    return this.redis.zcard(cityIndexKey(city));
  }
}
