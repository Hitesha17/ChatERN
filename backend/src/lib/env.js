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
    return ["https://chatern.aditechsystems.com/"];
  }

  return [];
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
