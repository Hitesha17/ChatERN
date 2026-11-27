import { Server } from "socket.io";
import http from "http";
import express from "express";
import jwt from "jsonwebtoken";
import { getAllowedOrigins, isOriginAllowedForRequest } from "./env.js";

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

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      // Actual host/origin enforcement runs in allowRequest with full req headers
      return callback(null, true);
    },
    credentials: true,
  },
  allowRequest: (req, callback) => {
    if (!isOriginAllowedForRequest(req, allowedOrigins)) {
      console.warn(
        `[socket] Blocked connection from origin="${req.headers.origin}" host="${req.headers.host}" forwardedHost="${req.headers["x-forwarded-host"] || ""}"`
      );
      return callback("Origin not allowed", false);
    }
    return callback(null, true);
  },
});

io.use((socket, next) => {
  const cookies = parseCookies(socket.handshake.headers.cookie);
  const token = cookies.jwt || socket.handshake.auth?.token;

  if (!token) {
    console.warn("[socket] Rejected unauthenticated connection (no jwt cookie)");
    return next(new Error("Unauthorized - No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.userId) {
      return next(new Error("Unauthorized - Invalid token"));
    }
    socket.userId = String(decoded.userId);
    return next();
  } catch (error) {
    console.warn("[socket] Rejected connection (invalid jwt):", error.message);
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
