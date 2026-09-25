import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

/**
 * Assigns a unique id to every request, exposed via res.locals.requestId
 * and echoed back as the X-Request-Id header. Downstream logging
 * (requestLogger, errorHandler, hotelController) includes it so a single
 * request's logs — including the workflow/activity logs it triggers — can
 * be correlated together.
 */
export function requestId(_req: Request, res: Response, next: NextFunction): void {
  const id = randomUUID();
  res.locals.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
}
