import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { requestLogger } from "./middleware/requestLogger";
import { healthRoutes } from "./routes/health.routes";
import { recallsRoutes } from "./routes/recalls.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  app.use("/api/health", healthRoutes);
  app.use("/api/recalls", recallsRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
