import path from "node:path";

import cors from "cors";
import express from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import "./config/prisma"; // initialize PrismaClient singleton early
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";
import { requestLogger } from "./middleware/requestLogger";
import { alertsRouter } from "./modules/alerts/alerts.routes";
import { categoriesRouter } from "./modules/categories/categories.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { recallChecksRouter } from "./modules/recallChecks/recallChecks.routes";
import { pantryItemsRouter } from "./modules/pantryItems/pantryItems.routes";
import { recallsRouter } from "./modules/recalls/recalls.routes";
import { usersRouter } from "./modules/users/users.routes";
import { healthRoutes } from "./routes/health.routes";

const openapiPath = path.join(__dirname, "docs/openapi.yaml");
const openapiDocument = YAML.load(openapiPath);

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  app.use("/api/health", healthRoutes);
  app.use("/api/users", usersRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/pantry-items", pantryItemsRouter);
  app.use("/api/alerts", alertsRouter);
  app.use("/api", recallChecksRouter);
  app.use("/api/recalls", recallsRouter);
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openapiDocument, { explorer: true }),
  );

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
