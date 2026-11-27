import "./lib/node26-compat.js";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

import { getAllowedOrigins, normalizeOrigin, validateEnv } from "./lib/env.js";
import { connectDB, disconnectDB } from "./lib/db.js";
import { app, io, server } from "./lib/socket.js";
import { createRateLimiter, securityHeaders } from "./middleware/security.middleware.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 5001;
const allowedOrigins = getAllowedOrigins();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(securityHeaders);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

app.use(
  cors((req, callback) => {
    const origin = req.headers.origin;
    if (!origin) {
      return callback(null, { origin: false, credentials: true });
    }

    const normalized = normalizeOrigin(origin);
    if (allowedOrigins.includes("*")) {
      return callback(null, { origin: true, credentials: true });
    }

    if (allowedOrigins.length > 0) {
      const allowed = allowedOrigins.includes(normalized);
      return callback(null, { origin: allowed, credentials: true });
    }

    // Single-container fallback when CORS_ORIGIN is not configured: allow same-host origin
    try {
      const originHost = new URL(normalized).host;
      const requestHost = (
        req.headers["x-forwarded-host"] ||
        req.headers.host ||
        ""
      )
        .split(",")[0]
        .trim();
      return callback(null, {
        origin: Boolean(requestHost) && originHost === requestHost,
        credentials: true,
      });
    } catch {
      return callback(null, { origin: false, credentials: true });
    }
  })
);

const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 300,
  message: "Too many requests, please slow down",
});

app.get("/api/health", (req, res) => {
  const dbReady = mongoose.connection.readyState === 1;
  const statusCode = dbReady ? 200 : 503;

  res.status(statusCode).json({
    status: dbReady ? "ok" : "degraded",
    uptime: Math.round(process.uptime()),
    database: dbReady ? "connected" : "disconnected",
  });
});

app.use("/api", apiRateLimiter);
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);

app.use("/api/*", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

if (process.env.NODE_ENV === "production") {
  const frontendDistPath = path.resolve(__dirname, "../../frontend/dist");
  if (fs.existsSync(frontendDistPath)) {
    app.use(
      express.static(frontendDistPath, {
        maxAge: "1y",
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache");
          }
        },
      })
    );

    app.get("*", (req, res) => {
      res.sendFile(path.join(frontendDistPath, "index.html"));
    });
  } else {
    console.warn(
      `[config] Frontend dist directory not found at ${frontendDistPath}; running in API-only mode.`
    );
  }
}

// Central error handler (catches oversized payloads, malformed JSON, etc.)
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err?.type === "entity.too.large") {
    return res.status(413).json({ message: "Payload too large (max 10MB)" });
  }

  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ message: "Invalid JSON payload" });
  }

  console.error("Unhandled server error:", err?.message || err);
  return res.status(500).json({ message: "Internal server error" });
});

const startServer = async () => {
  try {
    validateEnv();
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Server running on PORT: ${PORT} (${process.env.NODE_ENV || "development"})`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

let isShuttingDown = false;
const shutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received, shutting down gracefully...`);

  const forceExitTimer = setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
  forceExitTimer.unref();

  try {
    await new Promise((resolve) => io.close(() => resolve()));
    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error.message);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});

startServer();
