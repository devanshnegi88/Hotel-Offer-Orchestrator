import { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Express 4 only auto-catches synchronous throws in route handlers, not
 * rejected promises. Wrapping an async handler with this forwards any
 * rejection to next(err) so it reaches the shared errorHandler middleware
 * instead of becoming an unhandled rejection.
 */
export function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>
): RequestHandler {
  return function wrapped(req: Request, res: Response, next: NextFunction): void {
    handler(req, res).catch(next);
  };
}
