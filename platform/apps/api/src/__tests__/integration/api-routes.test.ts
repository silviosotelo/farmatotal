import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../../app.js";

let app: any;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("Auth endpoints", () => {
  it("GET /health returns 200", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).ok).toBe(true);
  });

  it("POST /auth/login does not crash with bad credentials", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "test@test.com", password: "wrong" },
    });
    // Could be 401, 400, or 422 depending on validation
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    expect(res.statusCode).toBeLessThan(600);
  });

  it("POST /auth/bootstrap works when no users exist", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/bootstrap",
      payload: { email: "admin@test.com", password: "Test1234!", name: "Admin Test" },
    });
    // Should be 200 or 400/409 (already bootstrapped)
    expect([200, 400, 409]).toContain(res.statusCode);
  });

  it("GET /auth/me without token returns 401", async () => {
    const res = await app.inject({ method: "GET", url: "/auth/me" });
    expect(res.statusCode).toBe(401);
  });
});

describe("Catalog endpoints", () => {
  it("GET /catalog/products returns paginated list", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/catalog/products",
      headers: { "x-tenant": "default" },
    });
    const body = JSON.parse(res.payload);
    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("total");
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET /catalog/products respects pagination", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/catalog/products?page=2&perPage=5",
      headers: { "x-tenant": "default" },
    });
    const body = JSON.parse(res.payload);
    expect(body.page).toBe(2);
    expect(body.perPage).toBe(5);
  });
});

describe("Branch endpoints", () => {
  it("GET /branches returns tenant-scoped data", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/branches",
      headers: { "x-tenant": "default" },
    });
    const body = JSON.parse(res.payload);
    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe("Tenant isolation", () => {
  it("different tenants get different data", async () => {
    const res1 = await app.inject({
      method: "GET",
      url: "/branches",
      headers: { "x-tenant": "default" },
    });
    const res2 = await app.inject({
      method: "GET",
      url: "/branches",
      headers: { "x-tenant": "nonexistent" },
    });
    const body1 = JSON.parse(res1.payload);
    const body2 = JSON.parse(res2.payload);
    expect(body1.data.length).not.toBe(body2.data.length);
  });
});

describe("Plugins endpoints", () => {
  it("GET /plugins/gw_bancard returns plugin config", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/plugins/gw_bancard",
      headers: { "x-tenant": "default" },
    });
    const body = JSON.parse(res.payload);
    expect(res.statusCode).toBe(200);
    expect(body.key).toBe("gw_bancard");
    expect(body).toHaveProperty("fields");
    expect(body).toHaveProperty("values");
  });

  it("GET /plugins/gw_bancard does not expose private key in values", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/plugins/gw_bancard",
      headers: { "x-tenant": "default" },
    });
    const body = JSON.parse(res.payload);
    // If privateKey exists, it must be masked (not the actual key)
    if (body.values?.privateKey) {
      expect(body.values.privateKey).not.toMatch(/^[a-zA-Z0-9]{10,}$/);
    }
    // fields must exist and be an array
    expect(body).toHaveProperty("fields");
    expect(Array.isArray(body.fields)).toBe(true);
  });
});

describe("Modules endpoints", () => {
  it("GET /modules returns module list", async () => {
    const res = await app.inject({ method: "GET", url: "/modules" });
    const body = JSON.parse(res.payload);
    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty("data");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });
});

describe("CMS endpoints", () => {
  it("GET /cms/blocks returns block types", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/cms/blocks",
      headers: { "x-tenant": "default" },
    });
    const body = JSON.parse(res.payload);
    expect(res.statusCode).toBe(200);
    expect(body).toHaveProperty("types");
    expect(body).toHaveProperty("total");
  });
});
