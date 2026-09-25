import axios from "axios";
import { env } from "../../config/env";
import { SupplierHotel } from "../../models/hotel";
import { logger } from "../../utils/logger";

const HTTP_TIMEOUT_MS = 5000;

/**
 * Shared HTTP-fetch logic for a single supplier. Runs inside a Temporal
 * activity (never inside the workflow function itself) because activities
 * are where non-deterministic, side-effecting work like HTTP calls belongs.
 * Throwing here is intentional — it lets Temporal's retry policy
 * (configured on the workflow's proxyActivities call) take over.
 */
async function fetchSupplierHotels(
  supplierLabel: string,
  url: string,
  city: string
): Promise<SupplierHotel[]> {
  try {
    const response = await axios.get<SupplierHotel[]>(url, {
      params: { city },
      timeout: HTTP_TIMEOUT_MS,
    });
    logger.info(`${supplierLabel} activity succeeded`, { city, count: response.data.length });
    return response.data;
  } catch (err) {
    const message = axios.isAxiosError(err) ? err.message : String(err);
    logger.error(`${supplierLabel} activity failed`, { city, url, message });
    throw new Error(`${supplierLabel} request failed: ${message}`);
  }
}

export async function fetchSupplierAHotels(city: string): Promise<SupplierHotel[]> {
  return fetchSupplierHotels("Supplier A", env.supplierAUrl, city);
}

export async function fetchSupplierBHotels(city: string): Promise<SupplierHotel[]> {
  return fetchSupplierHotels("Supplier B", env.supplierBUrl, city);
}
