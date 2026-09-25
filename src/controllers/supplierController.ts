import { Request, Response } from "express";
import { SupplierHotel } from "../models/hotel";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

/**
 * Builds a request handler for a mock supplier endpoint, filtering its
 * static dataset by the required `city` query parameter (case-insensitive).
 *
 * Kept as a factory so both /supplierA/hotels and /supplierB/hotels reuse
 * identical validation/filtering logic instead of duplicating it.
 */
export function createSupplierHandler(supplierLabel: string, dataset: SupplierHotel[]) {
  return function handleGetHotels(req: Request, res: Response): void {
    const city = req.query.city;

    if (typeof city !== "string" || city.trim().length === 0) {
      throw new AppError("Query parameter 'city' is required", 400);
    }

    const normalizedCity = city.trim().toLowerCase();
    const results = dataset.filter((hotel) => hotel.city.toLowerCase() === normalizedCity);

    logger.debug(`${supplierLabel} hotel lookup`, { city: normalizedCity, resultCount: results.length });

    res.status(200).json(results);
  };
}
