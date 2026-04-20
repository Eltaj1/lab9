"use strict";

const express = require("express");
const Redis   = require("ioredis");
const { v4: uuidv4 } = require("uuid");

const app  = express();
const PORT = process.env.PORT || 5000;
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// ── Redis client ──────────────────────────────────────────────────────────────
const redis = new Redis(REDIS_URL, {
  lazyConnect: true,           // don't crash on startup if Redis is absent
  enableOfflineQueue: false,
  connectTimeout: 2000,
  maxRetriesPerRequest: 1,
});

redis.on("error", () => {}); // swallow noise; we handle errors in /ready

// ── Structured JSON logger middleware ─────────────────────────────────────────
app.use((req, res, next) => {
  req.requestId = uuidv4();
  req.startTime = Date.now();

  res.on("finish", () => {
    const log = {
      timestamp:  new Date().toISOString(),
      requestId:  req.requestId,
      method:     req.method,
      path:       req.path,
      status:     res.statusCode,
      latency_ms: Date.now() - req.startTime,
    };
    process.stdout.write(JSON.stringify(log) + "\n");
  });

  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────

// Simple demo endpoint
app.get(["/", "/ping"], (req, res) => {
  res.json({ message: "pong", student: "Eltaj Sarizada", id: 70453 });
});

// Health – always 200 if the process is alive
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Readiness – 200 only when Redis is reachable
app.get("/ready", async (req, res) => {
  try {
    // ioredis connect() resolves quickly if already connected
    await redis.connect().catch(() => {}); // ignore "already connecting" error
    const pong = await redis.ping();       // throws if unreachable
    if (pong === "PONG") {
      return res.status(200).json({ status: "ready", redis: "reachable" });
    }
    throw new Error("unexpected ping response");
  } catch (err) {
    return res.status(503).json({
      status: "unavailable",
      redis:  "unreachable",
      detail: err.message,
    });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  process.stdout.write(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event:     "server_started",
      port:      PORT,
      redis_url: REDIS_URL,
    }) + "\n"
  );
});

module.exports = app; // exported for tests
