import express from "express";
import cors from "cors";
import { Client } from "@opensearch-project/opensearch";

// ---- config
const OPENSEARCH_URL = process.env.OPENSEARCH_URL || "http://opensearch:9200";
const ALERTS_INDEX = process.env.ALERTS_INDEX || "suricata-logs";
const BLOCK_INDEX = process.env.BLOCK_INDEX || "blocked-ips";
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("Missing API_KEY env");
  process.exit(1);
}
const PORT = Number(process.env.PORT) || 3001;

// ---- app
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// ---- OpenSearch
const client = new Client({ node: OPENSEARCH_URL });

// ---- helpers
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function withRetry(fn, attempts = 6, delayMs = 800) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      await wait(delayMs);
    }
  }
  throw lastErr;
}

// rate limit for writes
const writeLimiter = new Map();
const WRITE_LIMIT = 30;
const WRITE_WINDOW_MS = 60_000;
function rateLimitMiddleware(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || "unknown";
  const now = Date.now();
  const state = writeLimiter.get(ip) || {
    count: 0,
    resetTS: now + WRITE_WINDOW_MS,
  };
  if (now > state.resetTS) {
    state.count = 0;
    state.resetTS = now + WRITE_WINDOW_MS;
  }
  state.count++;
  writeLimiter.set(ip, state);
  if (state.count > WRITE_LIMIT)
    return res.status(429).json({ error: "rate_limit_exceeded" });
  next();
}

// API key guard for writes
function requireKey(req, res, next) {
  const key = req.headers["x-api-key"] || req.query.api_key;
  if (!key || key !== API_KEY)
    return res.status(401).json({ error: "unauthorized" });
  next();
}

const sseClients = new Set();
function sseBroadcast(obj) {
  const data = `data: ${JSON.stringify(obj)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(data);
    } catch {}
  }
}

// ---- routes
app.get("/healthz", (_req, res) => res.json({ ok: true }));

app.get("/alerts", async (req, res) => {
  try {
    const q = (req.query.q || "").trim().toLowerCase();
    const size = Math.min(
      500,
      Math.max(1, parseInt(req.query.size || "50", 10))
    );
    const from = Math.max(0, parseInt(req.query.from || "0", 10));
    const [sortField, sortOrderRaw] = (
      req.query.sort || "timestamp:desc"
    ).split(":");
    const sortOrder = (sortOrderRaw || "desc").toLowerCase();

    let bodyQuery = { match_all: {} };
    if (q) {
      const should = [
        {
          wildcard: {
            "alert.signature": { value: `*${q}*`, case_insensitive: true },
          },
        },
        { wildcard: { proto: { value: `*${q}*`, case_insensitive: true } } },
        {
          wildcard: { app_proto: { value: `*${q}*`, case_insensitive: true } },
        },
      ];
      if (/^[\d.]+$/.test(q)) {
        should.push({ prefix: { src_ip: q } }, { prefix: { dest_ip: q } });
      }
      bodyQuery = { bool: { should, minimum_should_match: 1 } };
    }

    const resp = await withRetry(() =>
      client.search({
        index: ALERTS_INDEX,
        size,
        from,
        track_total_hits: true,
        body: {
          sort: [{ [sortField || "timestamp"]: { order: sortOrder } }],
          query: bodyQuery,
        },
      })
    );

    const hits = (resp.body?.hits?.hits || []).map((h) => ({
      id: h._id,
      ...h._source,
    }));
    res.json({ total: resp.body?.hits?.total?.value || 0, hits });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/block-ip", requireKey, rateLimitMiddleware, async (req, res) => {
  try {
    const { ip, reason } = req.body || {};
    if (!ip || typeof ip !== "string")
      return res.status(400).json({ error: "invalid ip" });
    const now = new Date().toISOString();
    const resp = await client.update({
      index: BLOCK_INDEX,
      id: ip,
      body: {
        doc: { ip, reason: reason || "manual via UI", blocked_at: now },
        doc_as_upsert: true,
      },
      refresh: "wait_for",
    });
    res.json({ ok: true, result: resp.body?.result || "updated" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/blocked", async (_req, res) => {
  try {
    const resp = await client.search({
      index: BLOCK_INDEX,
      size: 500,
      body: {
        sort: [{ blocked_at: { order: "desc" } }],
        query: { match_all: {} },
      },
    });
    const hits = (resp.body?.hits?.hits || []).map((h) => ({
      id: h._id,
      ...h._source,
    }));
    res.json(hits);
  } catch (e) {
    if (e?.meta?.body?.error?.type === "index_not_found_exception")
      return res.json([]);
    res.status(500).json({ error: e.message });
  }
});

app.get("/stream", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write("retry: 2000\n\n");
  sseClients.add(res);
  req.on("close", () => sseClients.delete(res));
});

app.post("/alert", requireKey, rateLimitMiddleware, (req, res) => {
  const obj = req.body || {};
  if (obj?.event_type === "alert") {
    sseBroadcast(obj);
    return res.json({ ok: true });
  }
  res.status(400).json({ error: "not an alert" });
});

app.listen(PORT, () =>
  console.log(`API :${PORT} (OpenSearch: ${OPENSEARCH_URL})`)
);
