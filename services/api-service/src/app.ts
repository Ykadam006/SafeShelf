import fs from "node:fs";
import path from "node:path";

import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";

import "./config/prisma";
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

// Locate the OpenAPI YAML so Swagger UI works in dev, prod build, and Vercel.
function loadOpenapiDocument(): unknown | null {
  const candidates = [
    path.join(__dirname, "docs/openapi.yaml"),
    path.join(__dirname, "../docs/openapi.yaml"),
    path.join(process.cwd(), "src/docs/openapi.yaml"),
    path.join(process.cwd(), "dist/docs/openapi.yaml"),
    path.join(process.cwd(), "services/api-service/src/docs/openapi.yaml"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return YAML.load(candidate);
    }
  }
  return null;
}

const openapiDocument = loadOpenapiDocument();

// Build and configure the Express application (called by both server.ts and Vercel).
export function createApp() {
  const app = express();

  // Security + parsing middleware.
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  // Public health probe.
  app.use("/api/health", healthRoutes);

  // Domain routes.
  app.use("/api/users", usersRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/pantry-items", pantryItemsRouter);
  app.use("/api/alerts", alertsRouter);
  app.use("/api", recallChecksRouter);
  app.use("/api/recalls", recallsRouter);

  // Interactive API docs (Swagger UI). CSP headers are dropped here only,
  // because Helmet's default policy blocks the inline scripts Swagger needs.
  if (openapiDocument) {
    app.use(
      "/api/docs",
      (_req: Request, res: Response, next: NextFunction) => {
        res.removeHeader("Content-Security-Policy");
        res.removeHeader("Cross-Origin-Embedder-Policy");
        res.removeHeader("Cross-Origin-Opener-Policy");
        res.removeHeader("Cross-Origin-Resource-Policy");
        next();
      },
      swaggerUi.serve,
      swaggerUi.setup(openapiDocument, {
        explorer: true,
        customSiteTitle: "SafeShelf API Docs",
      }),
    );
  }

  // 404 handler followed by the centralised error formatter.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
