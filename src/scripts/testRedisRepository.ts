/* eslint-disable no-console */
import { pingRedis, closeRedisClient } from "../services/redisClient";
import { HotelOfferRepository } from "../repositories/hotelOfferRepository";
import { MergedHotelOffer } from "../models/hotel";

const sampleDelhiOffers: MergedHotelOffer[] = [
  { name: "Holtin", price: 5340, supplier: "Supplier B", commissionPct: 20 },
  { name: "Radison", price: 5900, supplier: "Supplier A", commissionPct: 13 },
  { name: "Taj Continental", price: 8200, supplier: "Supplier A", commissionPct: 15 },
  { name: "Lemon Tree", price: 3400, supplier: "Supplier A", commissionPct: 8 },
  { name: "Clarks Inn", price: 2950, supplier: "Supplier B", commissionPct: 14 },
  { name: "Hyatt Place", price: 9400, supplier: "Supplier B", commissionPct: 18 },
];

async function main(): Promise<void> {
  console.log("1) Testing Redis connection...");
  const alive = await pingRedis();
  console.log(`   ping() -> ${alive ? "PONG (connected)" : "FAILED"}`);
  if (!alive) {
    process.exitCode = 1;
    return;
  }

  const repo = new HotelOfferRepository();

  console.log("\n2) Storing deduplicated Delhi offers in Redis...");
  await repo.saveCityOffers("delhi", sampleDelhiOffers);
  const count = await repo.countByCity("delhi");
  console.log(`   Stored ${count} hotels for delhi`);

  console.log("\n3) Retrieving ALL Delhi hotels (no price filter)...");
  const all = await repo.getHotelsByCity("delhi");
  console.log(`   Retrieved ${all.length} hotels:`);
  all.forEach((h) => console.log(`     - ${h.name}: Rs.${h.price} (${h.supplier})`));

  console.log("\n4) Retrieving Delhi hotels with Redis-side price range (3000-6000)...");
  const ranged = await repo.getHotelsByCity("delhi", 3000, 6000);
  console.log(`   Retrieved ${ranged.length} hotels:`);
  ranged.forEach((h) => console.log(`     - ${h.name}: Rs.${h.price} (${h.supplier})`));

  console.log("\n5) Retrieving Delhi hotels with only a minPrice (>= 8000)...");
  const minOnly = await repo.getHotelsByCity("delhi", 8000);
  minOnly.forEach((h) => console.log(`     - ${h.name}: Rs.${h.price}`));

  console.log("\n6) Re-saving Delhi with a smaller set (simulates a hotel disappearing)...");
  await repo.saveCityOffers("delhi", sampleDelhiOffers.slice(0, 2));
  const afterReplace = await repo.getHotelsByCity("delhi");
  console.log(`   Now storing ${afterReplace.length} hotels (stale entries were cleared):`);
  afterReplace.forEach((h) => console.log(`     - ${h.name}: Rs.${h.price}`));

  console.log("\n7) Retrieving a city with nothing stored (goa)...");
  const empty = await repo.getHotelsByCity("goa");
  console.log(`   Retrieved ${empty.length} hotels (expected 0)`);

  await closeRedisClient();
  console.log("\nDone. Connection closed.");
}

main().catch((err) => {
  console.error("Demo script failed:", err);
  process.exitCode = 1;
});
