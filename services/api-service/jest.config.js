/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["<rootDir>/src/tests/**/*.test.ts"],
  preset: "ts-jest",
  clearMocks: true,
  /** Env must hydrate before `./config/env` parses `DATABASE_URL` / `RECALL_SERVICE_URL`. */
  setupFiles: ["<rootDir>/src/tests/loadEnv.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/tests/setupTests.ts"],
  testTimeout: 30_000,
};
