import { createApp } from "../src/app";

export const config = {
  api: {
    bodyParser: false,
  },
};

const app = createApp();

export default app;
