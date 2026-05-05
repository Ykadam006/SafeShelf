import { randomUUID } from "node:crypto";

import request from "supertest";

import { createApp } from "../app";
import { prisma } from "../config/prisma";
import * as recallsSvc from "../modules/recalls/recalls.service";

// End-to-end integration tests: real Express app + real Prisma + real Postgres.
// The only thing mocked is the recall-service HTTP call (no live openFDA traffic).
describe("SafeShelf REST integration", () => {
  const app = createApp();

  // Per-run identifiers so concurrent CI runs don't collide on unique fields.
  const runId = randomUUID().slice(0, 8);
  const email = `it-user-${runId}@safeshelf.test`;
  let userId = "";
  let categoryId = "";
  let pantryItemId = "";

  // Always clean up the test user (cascade removes pantry items + alerts).
  afterAll(async () => {
    if (userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
    }
  });

  // User CRUD basics.
  describe("Users", () => {
    it("POST /api/users creates a user", async () => {
      const res = await request(app)
        .post("/api/users")
        .send({ name: `IT User ${runId}`, email, role: "USER" })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        email,
        name: expect.any(String),
        role: "USER",
      });
      userId = res.body.data.id;
    });

    it("GET /api/users lists users containing the fixture", async () => {
      const res = await request(app).get("/api/users").expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((u: { id: string }) => u.id === userId)).toBe(
        true,
      );
    });

    it("GET /api/users/:id retrieves the fixture", async () => {
      const res = await request(app).get(`/api/users/${userId}`).expect(200);

      expect(res.body.data.id).toBe(userId);
      expect(res.body.data.email).toBe(email);
    });

    it("PATCH /api/users/:id updates profile fields", async () => {
      const res = await request(app)
        .patch(`/api/users/${userId}`)
        .send({ name: `IT User renamed ${runId}` })
        .expect(200);

      expect(res.body.data.name).toContain("renamed");
    });
  });

  // Category CRUD with the per-category pantry-count aggregate.
  describe("Categories", () => {
    const categoryName = `IT-Cat-${runId}`;

    it("POST /api/categories creates a category", async () => {
      const res = await request(app)
        .post("/api/categories")
        .send({
          name: categoryName,
          description: "integration fixture",
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(categoryName);
      categoryId = res.body.data.id;
    });

    it("GET /api/categories includes the fixture with counts", async () => {
      const res = await request(app).get("/api/categories").expect(200);

      expect(res.body.success).toBe(true);
      const rows = res.body.data as Array<{ id: string; name: string }>;
      expect(Array.isArray(rows)).toBe(true);
      expect(rows.some((c) => c.id === categoryId)).toBe(true);
    });
  });

  // Pantry-item CRUD plus the userId filter on the list endpoint.
  describe("Pantry items", () => {
    it("POST /api/pantry-items creates a SKU", async () => {
      expect(userId && categoryId).toBeTruthy();
      const res = await request(app)
        .post("/api/pantry-items")
        .send({
          userId,
          categoryId,
          name: `Test SKU ${runId}`,
          brand: `Brand-${runId}`,
          quantity: 2,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      pantryItemId = res.body.data.id;
      expect(res.body.data.userId).toBe(userId);
      expect(res.body.data.categoryId).toBe(categoryId);
    });

    it("GET /api/pantry-items returns items", async () => {
      const res = await request(app).get("/api/pantry-items").expect(200);

      expect(res.body.success).toBe(true);
      expect(
        Array.isArray(res.body.data) &&
          res.body.data.some((p: { id: string }) => p.id === pantryItemId),
      ).toBe(true);
    });

    it("filters by userId query", async () => {
      const res = await request(app)
        .get("/api/pantry-items")
        .query({ userId })
        .expect(200);

      expect(res.body.success).toBe(true);
      const rows = res.body.data as Array<{ id: string; userId: string }>;
      expect(rows.some((p) => p.id === pantryItemId)).toBe(true);
      expect(rows.every((p) => p.userId === userId)).toBe(true);
    });

    it("PATCH /api/pantry-items/:id updates fields", async () => {
      const res = await request(app)
        .patch(`/api/pantry-items/${pantryItemId}`)
        .send({ quantity: 5, notes: `note-${runId}` })
        .expect(200);

      expect(res.body.data.quantity).toBe(5);
      expect(res.body.data.notes).toContain(runId);
    });
  });

  // Dashboard rollup contract — just keys + types.
  describe("Dashboard", () => {
    it("GET /api/dashboard/summary returns expected rollup keys scoped to user", async () => {
      const res = await request(app)
        .get("/api/dashboard/summary")
        .query({ userId })
        .expect(200);

      expect(res.body.success).toBe(true);
      const d = res.body.data;

      [
        "totalPantryItems",
        "totalCategories",
        "totalRecallAlerts",
        "activeAlerts",
        "highRiskAlerts",
        "expiringSoonItems",
        "recentRecallChecks",
        "itemsByCategory",
        "alertsByRiskLevel",
        "latestAlerts",
      ].forEach((k) => expect(d).toHaveProperty(k));

      expect(typeof d.totalPantryItems).toBe("number");
      expect(Array.isArray(d.recentRecallChecks)).toBe(true);
      expect(Array.isArray(d.latestAlerts)).toBe(true);
    });
  });

  // The full recall-check pipeline with recall-service stubbed at module level.
  describe("Recall check (mocked recall-service)", () => {
    const eventKey = `OPENFDA-${runId}`;
    let recallPantryId = "";

    beforeAll(() => {
      // Capture the pantry id now in case later tests delete it.
      recallPantryId = pantryItemId;
      jest
        .spyOn(recallsSvc, "invokeRecallMicroserviceSearch")
        .mockImplementation(async (_query: string) => ({
          recalls: [
            {
              eventId: eventKey,
              productDescription: `Mock canned good ${runId}`,
              recallingFirm: "Mock Firm",
              reasonForRecall: "Test-only mock",
              classification: "Class I",
              status: "Ongoing",
              distributionPattern: "Nationwide",
              recallInitiationDate: "2024-01-15",
            },
          ],
          query: _query,
          count: 1,
        }));
    });

    // Restore the mock and tear down recall-related rows for this run.
    afterAll(async () => {
      jest.restoreAllMocks();
      if (recallPantryId) {
        await prisma.recallAlert.deleteMany({
          where: { pantryItemId: recallPantryId },
        });
        await prisma.recallCheck.deleteMany({
          where: { pantryItemId: recallPantryId },
        });
      }
      await prisma.recall.deleteMany({ where: { openfdaEventId: eventKey } });
    });

    it("POST /api/pantry-items/:id/check-recall writes RecallCheck & RecallAlert rows", async () => {
      expect(pantryItemId).toBeTruthy();

      const res = await request(app)
        .post(`/api/pantry-items/${pantryItemId}/check-recall`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        matchesFound: expect.any(Number),
        alertsCreated: expect.any(Number),
      });
      expect(res.body.data.alertsCreated).toBeGreaterThanOrEqual(1);

      // Verify the audit row was actually persisted.
      const checks = await prisma.recallCheck.findMany({
        where: { pantryItemId: pantryItemId },
        orderBy: { checkedAt: "desc" },
        take: 1,
      });
      expect(checks.length).toBe(1);
      expect(checks[0].externalApiStatus).toBe("SUCCESS");

      // Verify the recall snapshot was upserted.
      const recall = await prisma.recall.findUnique({
        where: { openfdaEventId: eventKey },
      });
      expect(recall).not.toBeNull();

      // Verify the join-table alert was created.
      const alerts = await prisma.recallAlert.findMany({
        where: { pantryItemId: pantryItemId, recallId: recall!.id },
      });
      expect(alerts.length).toBeGreaterThanOrEqual(1);
    });

    it("DELETE /api/pantry-items/:id removes the SKU", async () => {
      await request(app).delete(`/api/pantry-items/${pantryItemId}`).expect(200);
      pantryItemId = "";
      await request(app).get(`/api/users/${userId}`).expect(200);
    });
  });

  // Tear-down in dependency order: category → user.
  describe("Categories cleanup & user removal", () => {
    it("DELETE /api/categories/:id drops the taxonomy bucket", async () => {
      await request(app).delete(`/api/categories/${categoryId}`).expect(200);
      categoryId = "";
    });

    it("DELETE /api/users/:id deletes the fixture", async () => {
      await request(app).delete(`/api/users/${userId}`).expect(200);
      userId = "";
    });
  });
});
