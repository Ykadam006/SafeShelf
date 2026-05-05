import { config } from "dotenv";
import { z } from "zod";

// Load .env into process.env.
config();

// Required runtime env vars validated at startup.
const coreEnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof coreEnvSchema> & {
  OPENFDA_API_KEY?: string;
};

// openFDA works anonymously, so the API key is optional. Empty strings count as unset.
function readOpenfdaApiKey(): string | undefined {
  const raw = process.env.OPENFDA_API_KEY;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const env: Env = {
  ...coreEnvSchema.parse(process.env),
  OPENFDA_API_KEY: readOpenfdaApiKey(),
};
