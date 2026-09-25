import { HotelOfferRepository } from "../hotelOfferRepository";
import { closeRedisClient } from "../../services/redisClient";
import { MergedHotelOffer } from "../../models/hotel";

/**
 * These tests exercise Redis persistence and Redis-side price filtering
 * for real — they require a running Redis instance reachable at
 * REDIS_URL (defaults to redis://localhost:6379), same as the app itself.
 * A dedicated test-only city name is used so this suite never touches
 * data written by the app during manual testing.
 */
const TEST_CITY = "jest-test-city";
const TEST_CITY_EMPTY = "jest-test-city-empty";

const sampleOffers: MergedHotelOffer[] = [
  { name: "Clarks Inn", price: 2950, supplier: "Supplier B", commissionPct: 14 },
  { name: "Lemon Tree", price: 3400, supplier: "Supplier A", commissionPct: 8 },
  { name: "Holtin", price: 5340, supplier: "Supplier B", commissionPct: 20 },
  { name: "Radison", price: 5900, supplier: "Supplier A", commissionPct: 13 },
  { name: "Taj Continental", price: 8200, supplier: "Supplier A", commissionPct: 15 },
];

describe("HotelOfferRepository (Redis integration)", () => {
  const repository = new HotelOfferRepository();

  afterAll(async () => {
    // Leave Redis clean and release the connection so Jest can exit.
    await repository.saveCityOffers(TEST_CITY, []);
    await repository.saveCityOffers(TEST_CITY_EMPTY, []);
    await closeRedisClient();
  });

  it("persists a deduplicated offer list and reads it back in full", async () => {
    await repository.saveCityOffers(TEST_CITY, sampleOffers);

    const all = await repository.getHotelsByCity(TEST_CITY);

    expect(all).toHaveLength(sampleOffers.length);
    expect(new Set(all.map((h) => h.name))).toEqual(new Set(sampleOffers.map((h) => h.name)));

    const holtin = all.find((h) => h.name === "Holtin");
    expect(holtin).toEqual({ name: "Holtin", price: 5340, supplier: "Supplier B", commissionPct: 20 });
  });

  it("reports the correct count via countByCity", async () => {
    const count = await repository.countByCity(TEST_CITY);
    expect(count).toBe(sampleOffers.length);
  });

  it("filters by minPrice using Redis ZRANGEBYSCORE", async () => {
    const result = await repository.getHotelsByCity(TEST_CITY, 5000);

    expect(result.map((h) => h.name).sort()).toEqual(["Holtin", "Radison", "Taj Continental"].sort());
    result.forEach((h) => expect(h.price).toBeGreaterThanOrEqual(5000));
  });

  it("filters by maxPrice using Redis ZRANGEBYSCORE", async () => {
    const result = await repository.getHotelsByCity(TEST_CITY, undefined, 4000);

    expect(result.map((h) => h.name).sort()).toEqual(["Clarks Inn", "Lemon Tree"].sort());
    result.forEach((h) => expect(h.price).toBeLessThanOrEqual(4000));
  });

  it("filters by minPrice and maxPrice together", async () => {
    const result = await repository.getHotelsByCity(TEST_CITY, 3000, 6000);

    expect(result.map((h) => h.name).sort()).toEqual(["Holtin", "Lemon Tree", "Radison"].sort());
  });

  it("returns an empty array for a price range matching nothing", async () => {
    const result = await repository.getHotelsByCity(TEST_CITY, 100000, 200000);
    expect(result).toEqual([]);
  });

  it("returns an empty array for a city with no stored offers", async () => {
    const result = await repository.getHotelsByCity(TEST_CITY_EMPTY);
    expect(result).toEqual([]);
    expect(await repository.countByCity(TEST_CITY_EMPTY)).toBe(0);
  });

  it("replaces the stored set on re-save, clearing stale hotels", async () => {
    await repository.saveCityOffers(TEST_CITY, sampleOffers);
    expect(await repository.countByCity(TEST_CITY)).toBe(sampleOffers.length);

    const reducedSet = sampleOffers.slice(0, 2);
    await repository.saveCityOffers(TEST_CITY, reducedSet);

    const afterReplace = await repository.getHotelsByCity(TEST_CITY);
    expect(afterReplace).toHaveLength(2);
    expect(afterReplace.map((h) => h.name).sort()).toEqual(
      reducedSet.map((h) => h.name).sort()
    );
    expect(await repository.countByCity(TEST_CITY)).toBe(2);
  });
});
