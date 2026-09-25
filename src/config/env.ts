import dotenv from "dotenv";

dotenv.config();

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface EnvConfig {
  port: number;
  nodeEnv: "development" | "production" | "test";
  logLevel: LogLevel;
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

const port = Number(process.env.PORT) || 3000;
const appBaseUrl = process.env.APP_BASE_URL || `http://localhost:${port}`;

export const env: EnvConfig = {
  port,
  nodeEnv: readNodeEnv(process.env.NODE_ENV),
  logLevel: readLogLevel(process.env.LOG_LEVEL),
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  appBaseUrl,
  supplierAUrl: process.env.SUPPLIER_A_URL || `${appBaseUrl}/supplierA/hotels`,
  supplierBUrl: process.env.SUPPLIER_B_URL || `${appBaseUrl}/supplierB/hotels`,
  temporalAddress: process.env.TEMPORAL_ADDRESS || "localhost:7233",
  temporalNamespace: process.env.TEMPORAL_NAMESPACE || "default",
};
