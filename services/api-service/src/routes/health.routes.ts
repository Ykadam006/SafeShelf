import { Router } from "express";

import { sendSuccess } from "../utils/httpResponse";

export const healthRoutes = Router();

healthRoutes.get("/", (_req, res) => {
  sendSuccess(res, 200, "Healthy.", {
    status: "ok",
    service: "api-service",
    timestamp: new Date().toISOString(),
  });
});
