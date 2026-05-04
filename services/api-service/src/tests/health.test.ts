import request from "supertest";

import { createApp } from "../app";

describe("GET /api/health", () => {
  const app = createApp();

  it("returns 200 with success envelope", async () => {
    const res = await request(app).get("/api/health").expect(200);

    expect(res.body).toMatchObject({
      success: true,
      message: expect.any(String),
    });
    expect(res.body.data).toMatchObject({
      status: "ok",
      service: "api-service",
      timestamp: expect.any(String),
    });
  });
});
