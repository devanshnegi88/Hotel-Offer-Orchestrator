import request from "supertest";

jest.mock("../temporal/client", () => ({
  runGetHotelOffersWorkflow: jest.fn(),
}));

import { runGetHotelOffersWorkflow } from "../temporal/client";
import { createApp } from "../app";
import { HotelOfferRepository } from "../repositories/hotelOfferRepository";
import { closeRedisClient } from "../services/redisClient";
import { MergedHotelOffer } from "../models/hotel";

const mockedRunWorkflow = runGetHotelOffersWorkflow as jest.MockedFunction<
  typeof runGetHotelOffersWorkflow
>;

/**
 * The Temporal workflow is mocked here (spinning up a real Temporal
 * server for every test run is heavy and not what this phase asks for —
 * the workflow itself is already covered end-to-end in Phases 3/4).
 * Redis is real: since the workflow is mocked and won't actually persist
 * anything, each test seeds Redis directly via the repository first,
 * simulating "the workflow already ran" — this still exercises the real
 * ZRANGEBYSCORE-based filtering through the full HTTP stack.
 */
const app = createApp();
const repository = new HotelOfferRepository();

const TEST_CITY = "jest-api-test-city";
const TEST_CITY_EMPTY = "jest-api-test-city-empty";

const seedOffers: MergedHotelOffer[] = [
  { name: "Clarks Inn", price: 2950, supplier: "Supplier B", commissionPct: 14 },
  { name: "Holtin", price: 5340, supplier: "Supplier B", commissionPct: 20 },
  { name: "Radison", price: 5900, supplier: "Supplier A", commissionPct: 13 },
  { name: "Hyatt Place", price: 9400, supplier: "Supplier B", commissionPct: 18 },
];

describe("GET /api/hotels", () => {
  beforeAll(async () => {
    await repository.saveCityOffers(TEST_CITY, seedOffers);
    await repository.saveCityOffers(TEST_CITY_EMPTY, []);
  });

  afterAll(async () => {
    await repository.saveCityOffers(TEST_CITY, []);
    await repository.saveCityOffers(TEST_CITY_EMPTY, []);
    await closeRedisClient();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedRunWorkflow.mockResolvedValue(seedOffers);
  });

  it("returns the full seeded list for city only", async () => {
    const res = await request(app).get("/api/hotels").query({ city: TEST_CITY });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(seedOffers.length);
    expect(mockedRunWorkflow).toHaveBeenCalledWith(TEST_CITY);
  });

  it("filters by minPrice only", async () => {
    const res = await request(app).get("/api/hotels").query({ city: TEST_CITY, minPrice: "5000" });

    expect(res.status).toBe(200);
    expect(res.body.map((h: MergedHotelOffer) => h.name).sort()).toEqual(
      ["Holtin", "Radison", "Hyatt Place"].sort()
    );
  });

  it("filters by maxPrice only", async () => {
    const res = await request(app).get("/api/hotels").query({ city: TEST_CITY, maxPrice: "5000" });

    expect(res.status).toBe(200);
    expect(res.body.map((h: MergedHotelOffer) => h.name)).toEqual(["Clarks Inn"]);
  });

  it("filters by minPrice and maxPrice together", async () => {
    const res = await request(app)
      .get("/api/hotels")
      .query({ city: TEST_CITY, minPrice: "3000", maxPrice: "6000" });

    expect(res.status).toBe(200);
    expect(res.body.map((h: MergedHotelOffer) => h.name).sort()).toEqual(["Holtin", "Radison"].sort());
  });

  it("returns an empty array for a city with no stored results", async () => {
    const res = await request(app).get("/api/hotels").query({ city: TEST_CITY_EMPTY });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 400 when city is missing", async () => {
    const res = await request(app).get("/api/hotels");
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/city/i);
    expect(mockedRunWorkflow).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-numeric minPrice", async () => {
    const res = await request(app).get("/api/hotels").query({ city: TEST_CITY, minPrice: "abc" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/minPrice/);
  });

  it("returns 400 for a non-numeric maxPrice", async () => {
    const res = await request(app).get("/api/hotels").query({ city: TEST_CITY, maxPrice: "xyz" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/maxPrice/);
  });

  it("returns 400 for a negative minPrice", async () => {
    const res = await request(app).get("/api/hotels").query({ city: TEST_CITY, minPrice: "-50" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/negative/);
  });

  it("returns 400 when minPrice is greater than maxPrice", async () => {
    const res = await request(app)
      .get("/api/hotels")
      .query({ city: TEST_CITY, minPrice: "9000", maxPrice: "1000" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot be greater than/);
  });

  it("returns 502 when the Temporal workflow fails", async () => {
    mockedRunWorkflow.mockRejectedValue(new Error("activity failed after retries"));

    const res = await request(app).get("/api/hotels").query({ city: TEST_CITY });

    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/aggregation/i);
  });

  it("returns 503 when the Redis read fails", async () => {
    const spy = jest
      .spyOn(HotelOfferRepository.prototype, "getHotelsByCity")
      .mockRejectedValueOnce(new Error("connection lost"));

    const res = await request(app).get("/api/hotels").query({ city: TEST_CITY });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/data store/i);

    spy.mockRestore();
  });

  it("includes a requestId in every response for traceability", async () => {
    const res = await request(app).get("/api/hotels").query({ city: TEST_CITY });
    expect(res.headers["x-request-id"]).toBeDefined();
  });
});
