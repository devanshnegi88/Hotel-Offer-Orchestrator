import { MergedHotelOffer, SupplierHotel, SupplierName } from "../models/hotel";

function normalizeHotelName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Merges two suppliers' hotel lists into a single deduplicated list.
 *
 * Dedup key: hotel name, normalized (trimmed + lowercased) so casing
 * differences don't produce duplicate entries.
 *
 * Rules:
 * - If a hotel name appears in both suppliers, the cheaper offer wins.
 * - If it appears in only one supplier, that offer is kept as-is.
 * - On an exact price tie, whichever offer is processed first wins.
 *   Supplier A's list is always processed before Supplier B's, so a
 *   true A-vs-B tie resolves to Supplier A. This also means duplicate
 *   entries for the same name *within* a single supplier's own list are
 *   collapsed the same way — the cheaper one wins, ties keep the first
 *   one encountered.
 *
 * Pure and side-effect free by design: no I/O, no Date/Math.random use,
 * so it's safe to call both from a Temporal workflow (deterministic) and
 * from plain unit tests.
 */
export function mergeHotelOffers(
  supplierAHotels: SupplierHotel[],
  supplierBHotels: SupplierHotel[]
): MergedHotelOffer[] {
  const bestByName = new Map<string, MergedHotelOffer>();

  function consider(hotel: SupplierHotel, supplier: SupplierName): void {
    const key = normalizeHotelName(hotel.name);
    const existing = bestByName.get(key);

    if (!existing || hotel.price < existing.price) {
      bestByName.set(key, {
        name: hotel.name,
        price: hotel.price,
        supplier,
        commissionPct: hotel.commissionPct,
      });
    }
  }

  supplierAHotels.forEach((hotel) => consider(hotel, "Supplier A"));
  supplierBHotels.forEach((hotel) => consider(hotel, "Supplier B"));

  return Array.from(bestByName.values());
}
