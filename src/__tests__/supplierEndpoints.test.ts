import request from "supertest";
import { createApp } from "../app";

const app = createApp();

describe("GET /supplierA/hotels", () => {
  it("returns Delhi hotels for Supplier A", async () => {
    const res = await request(app).get("/supplierA/hotels").query({ city: "delhi" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((h: { city: string }) => h.city.toLowerCase() === "delhi")).toBe(true);

    const holtin = res.body.find((h: { name: string }) => h.name === "Holtin");
    expect(holtin).toMatchObject({ name: "Holtin", price: 6000 });
  });

  it("is case-insensitive on the city parameter", async () => {
    const res = await request(app).get("/supplierA/hotels").query({ city: "DELHI" });
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("returns 400 when city is missing", async () => {
    const res = await request(app).get("/supplierA/hotels");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/city/i);
  });

  it("returns an empty array for a valid but unknown city", async () => {
    const res = await request(app).get("/supplierA/hotels").query({ city: "goa" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /supplierB/hotels", () => {
  it("returns Delhi hotels for Supplier B", async () => {
    const res = await request(app).get("/supplierB/hotels").query({ city: "delhi" });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const holtin = res.body.find((h: { name: string }) => h.name === "Holtin");
    expect(holtin).toMatchObject({ name: "Holtin", price: 5340 });
  });

  it("returns 400 when city is missing", async () => {
    const res = await request(app).get("/supplierB/hotels");
    expect(res.status).toBe(400);
  });

  it("returns an empty array for a valid but unknown city", async () => {
    const res = await request(app).get("/supplierB/hotels").query({ city: "goa" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("GET /health basics and unknown routes", () => {
  it("returns 404 with a descriptive body for an unknown route", async () => {
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
    expect(res.body.error).toContain("/nope");
  });
});
