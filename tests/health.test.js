/**
 * Minimal unit tests using Node.js built-in test runner (node:test).
 * No external test framework required – compatible with `npm test` in CI.
 */
"use strict";

const { test }   = require("node:test");
const assert     = require("node:assert/strict");
const http       = require("node:http");

// We import the app *without* a real Redis connection by overriding the env
// variable before the module loads – works because lazyConnect is enabled.
process.env.REDIS_URL = "redis://127.0.0.1:6399"; // nothing listening → safe
process.env.PORT      = "5099";

const app = require("../server");

/** Helper: fire a GET and return { status, body } */
function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:5099${path}`, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        let body;
        try { body = JSON.parse(raw); } catch { body = raw; }
        resolve({ status: res.statusCode, body });
      });
    });
    req.on("error", reject);
  });
}

test("/health returns 200", async () => {
  const { status, body } = await get("/health");
  assert.equal(status, 200);
  assert.equal(body.status, "ok");
});

test("/ping returns pong", async () => {
  const { status, body } = await get("/ping");
  assert.equal(status, 200);
  assert.equal(body.message, "pong");
});

test("/ready returns 503 when Redis is unreachable", async () => {
  const { status, body } = await get("/ready");
  assert.equal(status, 503);
  assert.equal(body.status, "unavailable");
});
