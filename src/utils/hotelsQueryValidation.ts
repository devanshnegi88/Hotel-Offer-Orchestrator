import { AppError } from "./AppError";

export interface HotelsQueryParams {
  city: string;
  minPrice?: number;
  maxPrice?: number;
}

function parseCity(raw: unknown): string {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new AppError("Query parameter 'city' is required", 400);
  }
  return raw.trim();
}

function parsePriceParam(raw: unknown, paramName: "minPrice" | "maxPrice"): number | undefined {
  if (raw === undefined) {
    return undefined;
  }

  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new AppError(`Query parameter '${paramName}' must be a single numeric value`, 400);
  }

  const value = Number(raw.trim());

  if (!Number.isFinite(value)) {
    throw new AppError(`Query parameter '${paramName}' must be a valid number`, 400);
  }

  if (value < 0) {
    throw new AppError(`Query parameter '${paramName}' must not be negative`, 400);
  }

  return value;
}

/**
 * Validates and normalizes the query params for GET /api/hotels.
 * Throws AppError (400) on any invalid input; the shared error middleware
 * turns that into the JSON error response.
 */
export function parseHotelsQuery(query: Record<string, unknown>): HotelsQueryParams {
  const city = parseCity(query.city);
  const minPrice = parsePriceParam(query.minPrice, "minPrice");
  const maxPrice = parsePriceParam(query.maxPrice, "maxPrice");

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new AppError("Query parameter 'minPrice' cannot be greater than 'maxPrice'", 400);
  }

  return { city, minPrice, maxPrice };
}
