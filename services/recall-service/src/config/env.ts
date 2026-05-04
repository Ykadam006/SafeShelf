import { config } from "dotenv";
import { z } from "zod";

config();

const coreEnvSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof coreEnvSchema> & {
  /** Included on requests only when configured in `.env`. */
  OPENFDA_API_KEY?: string;
};

/** Non-empty trimmed API key, or omitted when unset/blank (openFDA still works anonymously). */
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
