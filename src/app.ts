import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import healthRoutes from "./routes/healthRoutes";
import { supplierARouter, supplierBRouter } from "./routes/supplierRoutes";
import hotelRoutes from "./routes/hotelRoutes";

export function createApp(): Application {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: "1mb" }));

  const limiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.nodeEnv === "test",
    message: { error: "Too many requests from this IP, please try again later." },
  });

  app.use(limiter);
  app.use(requestId);
  app.use(requestLogger);

  app.use(healthRoutes);
  app.use(supplierARouter);
  app.use(supplierBRouter);
  app.use(hotelRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
