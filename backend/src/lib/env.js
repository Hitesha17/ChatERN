import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env first if present, then root .env as fallback.
// Existing process.env values (e.g. from Docker/platform) always take precedence.
const envCandidates = [
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../../.env"),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

export const normalizeOrigin = (origin) =>
  typeof origin === "string" ? origin.trim().replace(/\/+$/, "") : "";

export const getAllowedOrigins = () => {
  const raw = process.env.CORS_ORIGIN || process.env.CLIENT_URL || "";
  const parsed = raw
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);

  if (parsed.length > 0) {
    return parsed;
  }

  if (process.env.NODE_ENV !== "production") {
    return ["http://localhost:5173", "http://127.0.0.1:5173"];
  }

  return [];
};

export const isOriginAllowedForRequest = (req, allowedOrigins = getAllowedOrigins()) => {
  const origin = req?.headers?.origin;
  if (!origin) return true;

  const normalized = normalizeOrigin(origin);
  if (allowedOrigins.includes("*")) return true;

  if (allowedOrigins.length > 0) {
    if (allowedOrigins.includes(normalized)) return true;

    // In development, allow any localhost/127.0.0.1 port (e.g., Vite fallback port 5174)
    if (process.env.NODE_ENV !== "production") {
      try {
        const { hostname } = new URL(normalized);
        if (hostname === "localhost" || hostname === "127.0.0.1") {
          return true;
        }
      } catch {
        return false;
      }
    }

    return false;
  }

  // When CORS_ORIGIN is unset in production (single-container / reverse-proxied deploy):
  // 1) Trust browser Fetch Metadata when explicitly same-origin (handles proxies rewriting Host)
  if (req.headers["sec-fetch-site"] === "same-origin") {
    return true;
  }

  // 2) Otherwise check that Origin host matches Host / X-Forwarded-Host
  try {
    const originHost = new URL(normalized).host;
    const requestHost = (
      req.headers["x-forwarded-host"] ||
      req.headers.host ||
      ""
    )
      .split(",")[0]
      .trim();
    return Boolean(requestHost) && originHost === requestHost;
  } catch {
    return false;
  }
};

export const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

export const validateEnv = () => {
  const required = ["MONGO_URI", "JWT_SECRET"];
  const missing = required.filter((key) => !process.env[key]?.trim());

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(", ")}`
    );
  }

  if (process.env.NODE_ENV === "production" && process.env.JWT_SECRET.length < 16) {
    console.warn(
      "[security] JWT_SECRET is shorter than 16 characters; use a strong random secret in production."
    );
  }

  if (!isCloudinaryConfigured()) {
    console.warn(
      "[config] Cloudinary environment variables are incomplete; image uploads will be unavailable."
    );
  }
};
