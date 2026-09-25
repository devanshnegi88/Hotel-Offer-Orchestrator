import { Request, Response } from "express";
import { errorHandler, notFoundHandler } from "../errorHandler";
import { AppError } from "../../utils/AppError";

function mockResponse(): Response {
  const res: Partial<Response> = {
    locals: { requestId: "test-request-id" },
  };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("errorHandler", () => {
  it("formats an AppError with its own status code and message", () => {
    const req = { originalUrl: "/api/hotels" } as Request;
    const res = mockResponse();
    const next = jest.fn();

    errorHandler(new AppError("bad input", 400), req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "bad input", requestId: "test-request-id" });
  });

  it("formats an unexpected Error as a 500 without leaking internals", () => {
    const req = { originalUrl: "/api/hotels" } as Request;
    const res = mockResponse();
    const next = jest.fn();

    errorHandler(new Error("some internal detail"), req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: "Internal server error",
      requestId: "test-request-id",
    });
  });
});

describe("notFoundHandler", () => {
  it("returns a 404 with the method and path", () => {
    const req = { method: "GET", originalUrl: "/nope" } as Request;
    const res = mockResponse();

    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: "Route not found: GET /nope",
      requestId: "test-request-id",
    });
  });
});
