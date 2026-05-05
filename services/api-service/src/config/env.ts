import { config } from "dotenv";
import { z } from "zod";

// Load .env into process.env (silent in tests).
config({ quiet: process.env.NODE_ENV === "test" });

// Runtime schema for required environment variables.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  RECALL_SERVICE_URL: z.string().url(),
});

const nodeEnvCandidate = process.env.NODE_ENV ?? "development";
let databaseUrl = (process.env.DATABASE_URL ?? "").trim();

// In production we require a real DB URL; in dev we fall back to a local default.
if (!databaseUrl) {
  if (nodeEnvCandidate === "production") {
    throw new Error("DATABASE_URL must be set in production");
  }
  databaseUrl =
    process.env.API_SERVICE_DEV_DATABASE_FALLBACK ??
    "postgresql://postgres:postgres@localhost:5432/safeshelf";
}

export type Env = z.infer<typeof envSchema>;

// Parse + validate. Throws at startup if anything is missing or wrong.
export const env: Env = envSchema.parse({
  NODE_ENV: nodeEnvCandidate,
  DATABASE_URL: databaseUrl,
  PORT: process.env.PORT,
  RECALL_SERVICE_URL: process.env.RECALL_SERVICE_URL,
});
