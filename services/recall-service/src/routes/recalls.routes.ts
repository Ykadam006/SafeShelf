import { Router } from "express";
import { z } from "zod";

import { validateRequest } from "../middleware/validateRequest";
import { searchRecallsByProductDescription } from "../services/openFda.service";
import { sendSuccess } from "../utils/httpResponse";

// GET /api/recalls/search?query=<phrase>
// Thin wrapper over the openFDA Food Enforcement adapter.
export const recallsRoutes = Router();

const recallsSearchSchema = z.object({
  query: z
    .string({ required_error: "query parameter is required" })
    .trim()
    .min(1, "query parameter is required"),
});

recallsRoutes.get(
  "/search",
  validateRequest({ query: recallsSearchSchema }),
  async (req, res, next) => {
    try {
      const { query } = req.query as z.infer<typeof recallsSearchSchema>;
      const { recalls } = await searchRecallsByProductDescription(query);
      const count = recalls.length;

      sendSuccess(res, 200, "Recall search finished successfully.", {
        query,
        count,
        recalls,
        // Surface a friendly note when openFDA returned zero hits.
        ...(count === 0
          ? {
              info: "No recalls matched that product description in OpenFDA enforcement data.",
            }
          : {}),
      });
    } catch (err) {
      next(err);
    }
  },
);
