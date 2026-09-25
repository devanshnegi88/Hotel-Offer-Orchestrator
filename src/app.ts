import express, { Application } from "express";
import { requestId } from "./middleware/requestId";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import healthRoutes from "./routes/healthRoutes";
import { supplierARouter, supplierBRouter } from "./routes/supplierRoutes";
import hotelRoutes from "./routes/hotelRoutes";

export function createApp(): Application {
  const app = express();

  app.use(express.json());
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
