import { config } from "dotenv";
import { z } from "zod";

config({ quiet: process.env.NODE_ENV === "test" });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  RECALL_SERVICE_URL: z.string().url(),
});

const nodeEnvCandidate = process.env.NODE_ENV ?? "development";
let databaseUrl = (process.env.DATABASE_URL ?? "").trim();

if (!databaseUrl) {
  if (nodeEnvCandidate === "production") {
    throw new Error("DATABASE_URL must be set in production");
  }
  // Local scaffolding: swap for your Neon URL in `.env`; PostgreSQL optional until migrations run.
  databaseUrl =
    process.env.API_SERVICE_DEV_DATABASE_FALLBACK ??
    "postgresql://postgres:postgres@localhost:5432/safeshelf";
}

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse({
  NODE_ENV: nodeEnvCandidate,
  DATABASE_URL: databaseUrl,
  PORT: process.env.PORT,
  RECALL_SERVICE_URL: process.env.RECALL_SERVICE_URL,
});
