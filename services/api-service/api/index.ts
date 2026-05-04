import { createApp } from "../src/app";

/**
 * Vercel Node.js function entry point.
 *
 * `vercel.json` rewrites every incoming request to this handler so the existing
 * Express app keeps owning routing. We disable Vercel's auto body parser so
 * `express.json()` can read the raw stream.
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

const app = createApp();

export default app;
