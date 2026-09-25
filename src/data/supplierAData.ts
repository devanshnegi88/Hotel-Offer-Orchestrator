import { SupplierHotel } from "../models/hotel";

/**
 * Static mock inventory for Supplier A.
 * "Holtin" and "Radison" intentionally overlap with Supplier B (different
 * prices) to exercise the dedup/merge logic in later phases.
 * "Taj Continental" and "Lemon Tree" are unique to Supplier A.
 */
export const supplierAData: SupplierHotel[] = [
  { hotelId: "a1", name: "Holtin", price: 6000, city: "delhi", commissionPct: 10 },
  { hotelId: "a2", name: "Radison", price: 5900, city: "delhi", commissionPct: 13 },
  { hotelId: "a3", name: "Taj Continental", price: 8200, city: "delhi", commissionPct: 15 },
  { hotelId: "a4", name: "Lemon Tree", price: 3400, city: "delhi", commissionPct: 8 },
  { hotelId: "a5", name: "Novotel", price: 7100, city: "mumbai", commissionPct: 12 },
  { hotelId: "a6", name: "The Orchid", price: 4600, city: "mumbai", commissionPct: 9 },
];
