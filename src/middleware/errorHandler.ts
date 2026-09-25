import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { logger } from "../utils/logger";

/**
 * Catches any error thrown or forwarded via next(err) in the app,
 * logs it, and returns a consistent JSON error response.
 * Must be registered last, after all routes.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = res.locals.requestId as string | undefined;

  if (err instanceof AppError) {
    logger.warn(err.message, { path: req.originalUrl, statusCode: err.statusCode, requestId });
    res.status(err.statusCode).json({ error: err.message, requestId });
    return;
  }

  logger.error("Unexpected error", {
    path: req.originalUrl,
    message: err.message,
    stack: err.stack,
    requestId,
  });
  res.status(500).json({ error: "Internal server error", requestId });
}

/** 404 handler for unmatched routes. Registered after all routes, before errorHandler. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    requestId: res.locals.requestId,
  });
}
