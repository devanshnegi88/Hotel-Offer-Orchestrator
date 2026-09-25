/**
 * Raw hotel record as returned by a mock supplier endpoint.
 * Matches the shape specified in the assessment PDF.
 */
export interface SupplierHotel {
  hotelId: string;
  name: string;
  price: number;
  city: string;
  commissionPct: number;
}

/** Identifies which mock supplier a hotel offer came from. */
export type SupplierName = "Supplier A" | "Supplier B";

/**
 * Hotel offer shape returned by the final /api/hotels endpoint
 * (post dedup/merge). Not used until Phase 4/6, defined now so
 * later phases can import a stable type.
 */
export interface MergedHotelOffer {
  name: string;
  price: number;
  supplier: SupplierName;
  commissionPct: number;
}
