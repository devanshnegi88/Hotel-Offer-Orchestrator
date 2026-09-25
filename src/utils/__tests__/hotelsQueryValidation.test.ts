import { parseHotelsQuery } from "../hotelsQueryValidation";
import { AppError } from "../AppError";

describe("parseHotelsQuery", () => {
  it("accepts city only", () => {
    const result = parseHotelsQuery({ city: "delhi" });
    expect(result).toEqual({ city: "delhi", minPrice: undefined, maxPrice: undefined });
  });

  it("accepts city with minPrice only", () => {
    const result = parseHotelsQuery({ city: "delhi", minPrice: "3000" });
    expect(result).toEqual({ city: "delhi", minPrice: 3000, maxPrice: undefined });
  });

  it("accepts city with maxPrice only", () => {
    const result = parseHotelsQuery({ city: "delhi", maxPrice: "6000" });
    expect(result).toEqual({ city: "delhi", minPrice: undefined, maxPrice: 6000 });
  });

  it("accepts city with both minPrice and maxPrice", () => {
    const result = parseHotelsQuery({ city: "delhi", minPrice: "3000", maxPrice: "6000" });
    expect(result).toEqual({ city: "delhi", minPrice: 3000, maxPrice: 6000 });
  });

  it("trims and lowercases-preserves the city as given (trim only)", () => {
    const result = parseHotelsQuery({ city: "  Delhi  " });
    expect(result.city).toBe("Delhi");
  });

  it("rejects a missing city", () => {
    expect(() => parseHotelsQuery({})).toThrow(AppError);
    expect(() => parseHotelsQuery({})).toThrow("Query parameter 'city' is required");
  });

  it("rejects a blank city", () => {
    expect(() => parseHotelsQuery({ city: "   " })).toThrow(AppError);
  });

  it("rejects a non-numeric minPrice", () => {
    expect(() => parseHotelsQuery({ city: "delhi", minPrice: "abc" })).toThrow(
      "Query parameter 'minPrice' must be a valid number"
    );
  });

  it("rejects a non-numeric maxPrice", () => {
    expect(() => parseHotelsQuery({ city: "delhi", maxPrice: "xyz" })).toThrow(
      "Query parameter 'maxPrice' must be a valid number"
    );
  });

  it("rejects a negative minPrice", () => {
    expect(() => parseHotelsQuery({ city: "delhi", minPrice: "-100" })).toThrow(
      "Query parameter 'minPrice' must not be negative"
    );
  });

  it("rejects a negative maxPrice", () => {
    expect(() => parseHotelsQuery({ city: "delhi", maxPrice: "-1" })).toThrow(
      "Query parameter 'maxPrice' must not be negative"
    );
  });

  it("rejects minPrice greater than maxPrice", () => {
    expect(() => parseHotelsQuery({ city: "delhi", minPrice: "9000", maxPrice: "1000" })).toThrow(
      "Query parameter 'minPrice' cannot be greater than 'maxPrice'"
    );
  });

  it("accepts minPrice equal to maxPrice", () => {
    const result = parseHotelsQuery({ city: "delhi", minPrice: "5000", maxPrice: "5000" });
    expect(result).toEqual({ city: "delhi", minPrice: 5000, maxPrice: 5000 });
  });

  it("rejects a city passed as an array (repeated query param)", () => {
    expect(() => parseHotelsQuery({ city: ["delhi", "mumbai"] })).toThrow(AppError);
  });
});
