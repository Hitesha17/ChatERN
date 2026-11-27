import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import { getAllowedOrigins, normalizeOrigin } from "./env.js";

const app = express();
const server = http.createServer(app);

const allowedOrigins = getAllowedOrigins();

const parseCookies = (cookieHeader = "") => {
  const cookies = {};
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(val);
    } catch {
      cookies[key] = val;
    }
  }
  return cookies;
};

const isRequestOriginAllowed = (req) => {
  const origin = req.headers.origin;
  if (!origin) return true;

  const normalized = normalizeOrigin(origin);
  if (allowedOrigins.includes("*")) return true;
  if (allowedOrigins.length > 0) {
    return allowedOrigins.includes(normalized);
  }

  // When CORS_ORIGIN is unset in production (single-container deployment),
  // only allow same-host origins.
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

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalized = normalizeOrigin(origin);
      if (allowedOrigins.includes("*")) return callback(null, true);
      if (allowedOrigins.length > 0) {
        return allowedOrigins.includes(normalized)
          ? callback(null, true)
          : callback(new Error("Not allowed by CORS"));
      }
      // Enforced per-request by allowRequest when CORS_ORIGIN is unset
      return callback(null, true);
    },
    credentials: true,
  },
  allowRequest: (req, callback) => {
    if (!isRequestOriginAllowed(req)) {
      return callback("Origin not allowed", false);
    }
    return callback(null, true);
  },
});

io.use((socket, next) => {
  const cookies = parseCookies(socket.handshake.headers.cookie);
  const token = cookies.jwt || socket.handshake.auth?.token;

  if (!token) {
    return next(new Error("Unauthorized - No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.userId) {
      return next(new Error("Unauthorized - Invalid token"));
    }
    socket.userId = String(decoded.userId);
    return next();
  } catch {
    return next(new Error("Unauthorized - Invalid token"));
  }
});

// Map of userId -> Set of active socket IDs (supports multiple tabs/devices)
const userSocketMap = new Map();

export function getReceiverSocketIds(userId) {
  const sockets = userSocketMap.get(String(userId));
  return sockets ? Array.from(sockets) : [];
}

export function getReceiverSocketId(userId) {
  return getReceiverSocketIds(userId)[0];
}

io.on("connection", (socket) => {
  const userId = socket.userId;

  if (userId) {
    if (!userSocketMap.has(userId)) {
      userSocketMap.set(userId, new Set());
    }
    userSocketMap.get(userId).add(socket.id);
  }

  io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));

  socket.on("disconnect", () => {
    if (userId && userSocketMap.has(userId)) {
      const sockets = userSocketMap.get(userId);
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        userSocketMap.delete(userId);
      }
    }
    io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
  });
});

export { io, app, server };
