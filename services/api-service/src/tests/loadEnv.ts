// Loads .env / .env.test before Jest imports any module that reads env vars.
// This file must not import anything from src/config/* (which reads env eagerly).
import path from "node:path";

import { config as loadDotenv } from "dotenv";

const rootDir = path.resolve(__dirname, "../..");

// .env.test wins over .env when both are present.
loadDotenv({ path: path.join(rootDir, ".env.test"), quiet: true });
loadDotenv({ path: path.join(rootDir, ".env"), quiet: true });

process.env.NODE_ENV ??= "test";

// recall-service is mocked in tests, so any URL passes the env validator.
if (!(process.env.RECALL_SERVICE_URL ?? "").trim()) {
  process.env.RECALL_SERVICE_URL = "http://127.0.0.1:59999";
}
