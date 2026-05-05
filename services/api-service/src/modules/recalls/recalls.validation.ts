import { z } from "zod";

// `?query=...` for the search endpoint.
export const recallSearchQuerySchema = z.object({
  query: z
    .string({ required_error: "query parameter is required" })
    .trim()
    .min(1, "query parameter is required")
    .max(200),
});

// Path param for the lookup endpoint (UUID or FDA event id).
export const recallLookupParamsSchema = z.object({
  id: z.string().trim().min(1, "Recall id is required").max(200),
});

export type RecallSearchQuery = z.output<typeof recallSearchQuerySchema>;
export type RecallLookupParams = z.output<typeof recallLookupParamsSchema>;
