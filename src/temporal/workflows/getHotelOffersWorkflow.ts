import { proxyActivities } from "@temporalio/workflow";
import type * as supplierActivities from "../activities/supplierActivities";
import type * as redisActivities from "../activities/redisActivities";
import { mergeHotelOffers } from "../../services/hotelAggregationService";
import type { MergedHotelOffer, SupplierHotel } from "../../models/hotel";

/**
 * Activity stubs for the two supplier HTTP calls. Configured once here
 * rather than per-call so both suppliers get identical, predictable
 * failure handling.
 *
 * - startToCloseTimeout: a single activity attempt (including the HTTP
 *   call) must finish within 10s or it's considered failed and retried.
 * - retry policy: up to 3 attempts total, exponential backoff starting
 *   at 1s, capped at 10s between attempts.
 */
const { fetchSupplierAHotels, fetchSupplierBHotels } = proxyActivities<typeof supplierActivities>({
  startToCloseTimeout: "10 seconds",
  retry: {
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumInterval: "10 seconds",
    maximumAttempts: 3,
  },
});

/** Separate activity stub for the Redis write, same retry shape. */
const { saveHotelOffersActivity } = proxyActivities<typeof redisActivities>({
  startToCloseTimeout: "10 seconds",
  retry: {
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumInterval: "10 seconds",
    maximumAttempts: 3,
  },
});

/**
 * Runs one supplier's activity call and treats a total, retry-exhausted
 * failure as "this supplier returned nothing" rather than failing the
 * whole workflow. This means if Supplier A is fully down but Supplier B
 * is up (or vice versa), the workflow still succeeds with whichever
 * supplier's offers are available — the same "only one supplier has this
 * hotel, keep it" principle the merge logic already applies, extended to
 * "only one supplier responded at all."
 *
 * try/catch around an awaited activity call is standard, fully
 * deterministic Temporal workflow code: the activity's outcome (success
 * or final failure after retries) is recorded in workflow history and
 * replayed identically every time, so this isn't a determinism concern.
 */
async function fetchSupplierOrEmpty(call: () => Promise<SupplierHotel[]>): Promise<SupplierHotel[]> {
  try {
    return await call();
  } catch {
    // The activity itself already logged the detailed failure (including
    // every retry attempt) before giving up — nothing more to log here.
    // Returning [] lets mergeHotelOffers proceed with just the other
    // supplier's data instead of the whole request failing.
    return [];
  }
}

/**
 * Core hotel aggregation workflow:
 * 1. Call Supplier A and Supplier B in parallel (activities do the HTTP work).
 *    A supplier that's completely unreachable (retries exhausted) degrades
 *    to an empty list rather than failing the whole workflow.
 * 2. Deduplicate/merge by hotel name, cheaper offer wins (pure, deterministic
 *    logic - safe to run directly in the workflow, no activity needed).
 * 3. Persist the final list to Redis (activity - Redis I/O is a side effect).
 * 4. Return the final deduplicated list to the caller.
 */
export async function getHotelOffersWorkflow(city: string): Promise<MergedHotelOffer[]> {
  const supplierAPromise = fetchSupplierOrEmpty(() => fetchSupplierAHotels(city));
  const supplierBPromise = fetchSupplierOrEmpty(() => fetchSupplierBHotels(city));

  const [supplierA, supplierB] = await Promise.all([supplierAPromise, supplierBPromise]);

  const mergedOffers = mergeHotelOffers(supplierA, supplierB);

  await saveHotelOffersActivity(city, mergedOffers);

  return mergedOffers;
}
