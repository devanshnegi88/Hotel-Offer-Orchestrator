import request from "supertest";

jest.mock("../services/redisClient", () => ({
  pingRedis: jest.fn(),
}));
jest.mock("axios");

import axios from "axios";
import { pingRedis } from "../services/redisClient";
import { createApp } from "../app";

const mockedPingRedis = pingRedis as jest.MockedFunction<typeof pingRedis>;
const mockedAxiosGet = axios.get as jest.MockedFunction<typeof axios.get>;

const app = createApp();

describe("GET /health", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reports status ok when Redis and both suppliers are reachable", async () => {
    mockedPingRedis.mockResolvedValue(true);
    mockedAxiosGet.mockResolvedValue({ data: [] });

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.dependencies).toEqual({ redis: "up", supplierA: "up", supplierB: "up" });
    expect(typeof res.body.uptimeSeconds).toBe("number");
  });

  it("reports status degraded when Redis is unreachable", async () => {
    mockedPingRedis.mockResolvedValue(false);
    mockedAxiosGet.mockResolvedValue({ data: [] });

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("degraded");
    expect(res.body.dependencies.redis).toBe("down");
  });

  it("reports status degraded when Supplier A is unreachable", async () => {
    mockedPingRedis.mockResolvedValue(true);
    mockedAxiosGet.mockImplementation((url: string) => {
      if (typeof url === "string" && url.includes("supplierA")) {
        return Promise.reject(new Error("connect ECONNREFUSED"));
      }
      return Promise.resolve({ data: [] });
    });

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("degraded");
    expect(res.body.dependencies.supplierA).toBe("down");
    expect(res.body.dependencies.supplierB).toBe("up");
  });

  it("reports status degraded when everything is unreachable", async () => {
    mockedPingRedis.mockResolvedValue(false);
    mockedAxiosGet.mockRejectedValue(new Error("timeout of 3000ms exceeded"));

    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("degraded");
    expect(res.body.dependencies).toEqual({ redis: "down", supplierA: "down", supplierB: "down" });
  });
});
