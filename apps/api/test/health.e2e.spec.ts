/**
 * Sprint 8 — каркас e2e теста. Полный happy-path с реальной БД будет в Sprint 9,
 * сейчас проверяем подъём приложения и доступность публичных эндпоинтов через supertest.
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { Test, type TestingModule } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { HealthModule } from "../src/health/health.module.js";

describe("Health e2e", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [HealthModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/health returns ok", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health");
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.service).toBe("pandaclock-api");
  });
});
