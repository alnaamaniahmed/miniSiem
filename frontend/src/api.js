const BASE = import.meta.env.VITE_API_URL || "/api";
const API_KEY = import.meta.env.VITE_API_KEY || ""; 

async function jfetch(path, opts = {}) {
  const headers = {
    ...(opts.headers || {}),
    "x-api-key": API_KEY,
  };
  const r = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

export const api = {
  health: () => jfetch("/healthz"),
  alerts: ({ q = "", size = 50, from = 0, sort = "timestamp:desc" } = {}) =>
    jfetch(`/alerts?` + new URLSearchParams({ q, size, from, sort })),
  blocked: () => jfetch("/blocked"),
  blockIp: async ({ ip, reason }) =>
    jfetch("/block-ip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, reason }),
    }),
  sse: (onMsg) => {
    const ev = new EventSource(`${BASE}/stream`);
    ev.onmessage = (e) => {
      try {
        onMsg(JSON.parse(e.data));
      } catch {}
    };
    return () => ev.close();
  },
};
