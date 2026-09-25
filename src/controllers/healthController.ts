import { Request, Response } from "express";
import axios from "axios";
import { env } from "../config/env";
import { pingRedis } from "../services/redisClient";
import { logger } from "../utils/logger";

const DEPENDENCY_CHECK_TIMEOUT_MS = 3000;
/** Any city works for a reachability check; the mock endpoints always accept it. */
const HEALTH_CHECK_CITY = "delhi";

type DependencyStatus = "up" | "down";

async function checkSupplier(label: string, url: string): Promise<DependencyStatus> {
  try {
    await axios.get(url, {
      params: { city: HEALTH_CHECK_CITY },
      timeout: DEPENDENCY_CHECK_TIMEOUT_MS,
    });
    return "up";
  } catch (err) {
    logger.warn(`${label} health check failed`, {
      url,
      message: err instanceof Error ? err.message : String(err),
    });
    return "down";
  }
}

/**
 * Reports overall service health plus the reachability of each dependency
 * (Redis, Supplier A, Supplier B), checked in parallel. Always responds
 * 200 — the body's `status` field distinguishes "ok" from "degraded" so
 * callers/monitors can inspect which dependency is failing without the
 * health check itself being treated as a hard failure.
 */
export async function getHealth(_req: Request, res: Response): Promise<void> {
  const [redisUp, supplierAStatus, supplierBStatus] = await Promise.all([
    pingRedis(),
    checkSupplier("Supplier A", env.supplierAUrl),
    checkSupplier("Supplier B", env.supplierBUrl),
  ]);

  const dependencies: Record<string, DependencyStatus> = {
    redis: redisUp ? "up" : "down",
    supplierA: supplierAStatus,
    supplierB: supplierBStatus,
  };

  const allUp = Object.values(dependencies).every((status) => status === "up");

  res.status(200).json({
    status: allUp ? "ok" : "degraded",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    dependencies,
  });
}
