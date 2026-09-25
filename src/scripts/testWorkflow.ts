/* eslint-disable no-console */
import { runGetHotelOffersWorkflow } from "../temporal/client";

async function main(): Promise<void> {
  const city = process.argv[2] || "delhi";

  console.log(`Starting getHotelOffersWorkflow for city="${city}"...`);
  const start = Date.now();

  const mergedOffers = await runGetHotelOffersWorkflow(city);

  console.log(`\nWorkflow completed in ${Date.now() - start}ms\n`);
  console.log(`Final deduplicated list (${mergedOffers.length} hotels), saved to Redis:`);
  mergedOffers
    .slice()
    .sort((a, b) => a.price - b.price)
    .forEach((h) => console.log(`  - ${h.name}: Rs.${h.price} (${h.supplier}, commission ${h.commissionPct}%)`));

  console.log("\nRaw result:");
  console.log(JSON.stringify(mergedOffers, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error("Workflow test failed:", err);
  process.exit(1);
});
