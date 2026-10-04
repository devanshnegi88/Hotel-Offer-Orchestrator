import dotenv from "dotenv";

dotenv.config();

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFormat = "json" | "text";

export interface EnvConfig {
  port: number;
  nodeEnv: "development" | "production" | "test";
  logLevel: LogLevel;
  logFormat: LogFormat;
  corsOrigin: string;
  rateLimitWindowMs: number;
  rateLimitMax: number;
  redisUrl: string;
  appBaseUrl: string;
  supplierAUrl: string;
  supplierBUrl: string;
  temporalAddress: string;
  temporalNamespace: string;
}

function readNodeEnv(value: string | undefined): EnvConfig["nodeEnv"] {
  if (value === "production" || value === "test") {
    return value;
  }
  return "development";
}

function readLogLevel(value: string | undefined): LogLevel {
  if (value === "debug" || value === "warn" || value === "error") {
    return value;
  }
  return "info";
}

function readLogFormat(value: string | undefined, nodeEnv: EnvConfig["nodeEnv"]): LogFormat {
  if (value === "json" || value === "text") {
    return value;
  }
  return nodeEnv === "production" ? "json" : "text";
}

function validatePort(value: string | undefined): number {
  const parsed = Number(value) || 3000;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid PORT environment variable: ${value}. Must be a valid port number (1-65535).`);
  }
  return parsed;
}

const nodeEnv = readNodeEnv(process.env.NODE_ENV);
const port = validatePort(process.env.PORT);
const appBaseUrl = process.env.APP_BASE_URL || `http://localhost:${port}`;

export const env: EnvConfig = {
  port,
  nodeEnv,
  logLevel: readLogLevel(process.env.LOG_LEVEL),
  logFormat: readLogFormat(process.env.LOG_FORMAT, nodeEnv),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 100,
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  appBaseUrl,
  supplierAUrl: process.env.SUPPLIER_A_URL || `${appBaseUrl}/supplierA/hotels`,
  supplierBUrl: process.env.SUPPLIER_B_URL || `${appBaseUrl}/supplierB/hotels`,
  temporalAddress: process.env.TEMPORAL_ADDRESS || "localhost:7233",
  temporalNamespace: process.env.TEMPORAL_NAMESPACE || "default",
};
