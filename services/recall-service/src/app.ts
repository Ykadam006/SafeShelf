import cors from "cors";
import express from "express";
import helmet from "helmet";

import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { requestLogger } from "./middleware/requestLogger";
import { healthRoutes } from "./routes/health.routes";
import { recallsRoutes } from "./routes/recalls.routes";

// Build the recall-service Express app (used by both server.ts and Vercel).
export function createApp() {
  const app = express();

  // Security + parsing middleware.
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  // Public routes.
  app.use("/api/health", healthRoutes);
  app.use("/api/recalls", recallsRoutes);

  // 404 + central error formatter.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
