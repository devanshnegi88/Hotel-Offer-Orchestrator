import { mergeHotelOffers } from "../hotelAggregationService";
import { SupplierHotel } from "../../models/hotel";

function makeHotel(overrides: Partial<SupplierHotel> = {}): SupplierHotel {
  return {
    hotelId: "x1",
    name: "Test Hotel",
    price: 1000,
    city: "delhi",
    commissionPct: 10,
    ...overrides,
  };
}

describe("mergeHotelOffers", () => {
  it("keeps Supplier A's offer when Supplier A is cheaper", () => {
    const supplierA = [makeHotel({ hotelId: "a1", name: "Holtin", price: 5000, commissionPct: 10 })];
    const supplierB = [makeHotel({ hotelId: "b1", name: "Holtin", price: 6000, commissionPct: 20 })];

    const result = mergeHotelOffers(supplierA, supplierB);

    expect(result).toEqual([
      { name: "Holtin", price: 5000, supplier: "Supplier A", commissionPct: 10 },
    ]);
  });

  it("keeps Supplier B's offer when Supplier B is cheaper", () => {
    const supplierA = [makeHotel({ hotelId: "a1", name: "Radison", price: 6150, commissionPct: 11 })];
    const supplierB = [makeHotel({ hotelId: "b1", name: "Radison", price: 5900, commissionPct: 13 })];

    const result = mergeHotelOffers(supplierA, supplierB);

    expect(result).toEqual([
      { name: "Radison", price: 5900, supplier: "Supplier B", commissionPct: 13 },
    ]);
  });

  it("keeps the offer as-is when a hotel exists only in Supplier A", () => {
    const supplierA = [makeHotel({ hotelId: "a1", name: "Lemon Tree", price: 3400, commissionPct: 8 })];
    const supplierB: SupplierHotel[] = [];

    const result = mergeHotelOffers(supplierA, supplierB);

    expect(result).toEqual([
      { name: "Lemon Tree", price: 3400, supplier: "Supplier A", commissionPct: 8 },
    ]);
  });

  it("keeps the offer as-is when a hotel exists only in Supplier B", () => {
    const supplierA: SupplierHotel[] = [];
    const supplierB = [makeHotel({ hotelId: "b1", name: "Clarks Inn", price: 2950, commissionPct: 14 })];

    const result = mergeHotelOffers(supplierA, supplierB);

    expect(result).toEqual([
      { name: "Clarks Inn", price: 2950, supplier: "Supplier B", commissionPct: 14 },
    ]);
  });

  it("resolves an exact price tie in favor of Supplier A", () => {
    const supplierA = [makeHotel({ hotelId: "a1", name: "Novotel", price: 7000, commissionPct: 12 })];
    const supplierB = [makeHotel({ hotelId: "b1", name: "Novotel", price: 7000, commissionPct: 9 })];

    const result = mergeHotelOffers(supplierA, supplierB);

    expect(result).toEqual([
      { name: "Novotel", price: 7000, supplier: "Supplier A", commissionPct: 12 },
    ]);
  });

  it("returns an empty list when both suppliers return no hotels", () => {
    expect(mergeHotelOffers([], [])).toEqual([]);
  });

  it("collapses duplicate hotel names within the same supplier, keeping the cheaper one", () => {
    const supplierA = [
      makeHotel({ hotelId: "a1", name: "Trident", price: 8900, commissionPct: 16 }),
      makeHotel({ hotelId: "a2", name: "Trident", price: 7200, commissionPct: 16 }),
    ];
    const supplierB: SupplierHotel[] = [];

    const result = mergeHotelOffers(supplierA, supplierB);

    expect(result).toEqual([
      { name: "Trident", price: 7200, supplier: "Supplier A", commissionPct: 16 },
    ]);
  });

  it("treats hotel names as case-insensitive when deduplicating", () => {
    const supplierA = [makeHotel({ hotelId: "a1", name: "holtin", price: 6100, commissionPct: 10 })];
    const supplierB = [makeHotel({ hotelId: "b1", name: "Holtin", price: 5340, commissionPct: 20 })];

    const result = mergeHotelOffers(supplierA, supplierB);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ name: "Holtin", price: 5340, supplier: "Supplier B", commissionPct: 20 });
  });
});
