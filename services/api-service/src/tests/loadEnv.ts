/**
 * Loads env **before** Jest pulls in modules that evaluate `src/config/env.ts`.
 * Keep this file free of `@/config/*` imports.
 */
import path from "node:path";

import { config as loadDotenv } from "dotenv";

const rootDir = path.resolve(__dirname, "../..");

loadDotenv({ path: path.join(rootDir, ".env.test"), quiet: true });
loadDotenv({ path: path.join(rootDir, ".env"), quiet: true });

process.env.NODE_ENV ??= "test";

if (!(process.env.RECALL_SERVICE_URL ?? "").trim()) {
  /** Placeholder URL — recall HTTP is mocked in tests that exercise recall checks */
  process.env.RECALL_SERVICE_URL = "http://127.0.0.1:59999";
}
