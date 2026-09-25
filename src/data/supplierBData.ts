import { SupplierHotel } from "../models/hotel";

/**
 * Static mock inventory for Supplier B.
 * "Holtin" and "Radison" overlap with Supplier A at different prices.
 * "Clarks Inn" and "Hyatt Place" are unique to Supplier B.
 */
export const supplierBData: SupplierHotel[] = [
  { hotelId: "b1", name: "Holtin", price: 5340, city: "delhi", commissionPct: 20 },
  { hotelId: "b2", name: "Radison", price: 6150, city: "delhi", commissionPct: 11 },
  { hotelId: "b3", name: "Clarks Inn", price: 2950, city: "delhi", commissionPct: 14 },
  { hotelId: "b4", name: "Hyatt Place", price: 9400, city: "delhi", commissionPct: 18 },
  { hotelId: "b5", name: "Novotel", price: 6800, city: "mumbai", commissionPct: 12 },
  { hotelId: "b6", name: "Trident", price: 8900, city: "mumbai", commissionPct: 16 },
];
