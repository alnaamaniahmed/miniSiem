import React, { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./components/ui/dialog";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "./components/ui/table";

const SORT_OPTIONS = [
  { v: "timestamp:desc", label: "Time ↓" },
  { v: "timestamp:asc", label: "Time ↑" },
  { v: "src_ip:asc", label: "Src IP ↑" },
  { v: "src_ip:desc", label: "Src IP ↓" },
];

function Badge({ ok }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium
      ${
        ok
          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
          : "bg-red-500/15 text-red-300 ring-1 ring-red-500/30"
      }`}
    >
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          ok ? "bg-emerald-400 animate-pulse" : "bg-red-400"
        }`}
      />
      {ok ? "Live ON" : "Live OFF"}
    </span>
  );
}

function Pill({ children, className = "" }) {
  return (
    <span
      className={`rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/70 ring-1 ring-white/10 ${className}`}
    >
      {children}
    </span>
  );
}

export default function App() {
  const [apiOk, setApiOk] = useState(false);
  const [live, setLive] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("timestamp:desc");
  const [size, setSize] = useState(20);
  const [from, setFrom] = useState(0);
  const [blocked, setBlocked] = useState([]);
  const [confirm, setConfirm] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  const mounted = useRef(false);
  const closeSSE = useRef(null);

  async function refreshAlerts() {
    setLoading(true);
    try {
      const r = await api.alerts({ q, sort, size, from });
      setAlerts(r.hits || []);
      setTotal(r.total || 0);
    } catch (e) {
      console.error("Failed to fetch alerts:", e);
    } finally {
      setLoading(false);
    }
  }

  async function refreshBlocked() {
    try {
      setBlocked(await api.blocked());
    } catch (e) {
      console.error("Failed to fetch blocked IPs:", e);
    }
  }

  function showToast(text, type = "ok") {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function tryHealth() {
    try {
      await api.health();
      setApiOk(true);
    } catch {
      setApiOk(false);
    }
  }

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    tryHealth();
    refreshAlerts();
    refreshBlocked();

    if (live) {
      closeSSE.current = api.sse((msg) => {
        if (msg?.event_type === "alert" && sort === "timestamp:desc") {
          setAlerts((prev) => [msg, ...prev].slice(0, size));
          setTotal((t) => t + 1);
        }
      });
    }
    return () => {
      if (closeSSE.current) closeSSE.current();
    };
  }, []);

  useEffect(() => {
    refreshAlerts();
  }, [q, sort, size, from]);

  const page = Math.floor(from / size) + 1;
  const pages = Math.max(1, Math.ceil(total / size));
  
  function goto(p) {
    const clamped = Math.min(Math.max(1, p), pages);
    setFrom((clamped - 1) * size);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onClickBlock(ip, signature) {
    const reason = `manual via UI: ${signature || "N/A"}`;
    setConfirm({ ip, reason });
  }

  async function doBlock(ip, reason) {
    try {
      await api.blockIp({ ip, reason });
      await refreshBlocked();
      showToast(`Blocked ${ip}`);
      setConfirm(null);
    } catch (e) {
      showToast(`Block failed: ${e?.message || e}`, "err");
    }
  }

  const rows = useMemo(() => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center py-8 text-white/50">
            Loading...
          </TableCell>
        </TableRow>
      );
    }

    if (alerts.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center py-8 text-white/50">
            No alerts found
          </TableCell>
        </TableRow>
      );
    }

    return alerts.map((a) => {
      const when = new Date(a.timestamp || Date.now()).toLocaleString();
      const proto = a.app_proto || a.proto || "—";
      const sig = a.alert?.signature || "—";
      const src = `${a.src_ip}${a.src_port ? ":" + a.src_port : ""}`;
      const dst = `${a.dest_ip}${a.dest_port ? ":" + a.dest_port : ""}`;
      return (
        <TableRow key={`${a.flow_id || ""}-${a.timestamp || when}`}>
          <TableCell className="whitespace-nowrap">{when}</TableCell>
          <TableCell>
            <div className="flex flex-col md:flex-row md:items-center gap-1">
              <span className="font-medium">{src}</span>
              <span className="hidden md:inline text-white/30">→</span>
              <span className="font-medium">{dst}</span>
            </div>
          </TableCell>
          <TableCell>
            <Pill>{proto.toUpperCase()}</Pill>
          </TableCell>
          <TableCell className="truncate max-w-[36ch]" title={sig}>
            {sig}
          </TableCell>
          <TableCell className="text-right">
            <Button variant="outline" size="sm" onClick={() => onClickBlock(a.src_ip, sig)}>
              Block
            </Button>
          </TableCell>
        </TableRow>
      );
    });
  }, [alerts, loading]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-40 backdrop-blur bg-neutral-950/70 border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 md:px-6 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                Mini SIEM
              </h1>
              <span className="text-xs text-white/60">
                API {apiOk ? "OK" : "DOWN"}
              </span>
              <Badge ok={live} />
            </div>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Search signature, IP, or protocol..."
                value={q}
                onChange={(e) => {
                  setFrom(0);
                  setQ(e.target.value);
                }}
                className="w-full sm:w-80 bg-white/5 border-white/10"
              />
              <Button variant="outline" onClick={refreshAlerts} disabled={loading}>
                {loading ? "..." : "⟳"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="shadow-2xl ring-1 ring-white/10">
            <CardHeader className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
              <div>
                <CardTitle>Recent Alerts</CardTitle>
                <p className="text-sm text-white/50">
                  Showing {alerts.length} of {total}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-white/50">Sort</label>
                  <select
                    value={sort}
                    onChange={(e) => {
                      setFrom(0);
                      setSort(e.target.value);
                    }}
                    className="h-10 rounded-2xl bg-white/5 border border-white/10 px-3 text-sm"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.v} value={o.v} className="bg-neutral-900">
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-white/50">Per page</label>
                  <select
                    value={size}
                    onChange={(e) => {
                      setFrom(0);
                      setSize(parseInt(e.target.value, 10));
                    }}
                    className="h-10 rounded-2xl bg-white/5 border border-white/10 px-3 text-sm"
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n} className="bg-neutral-900">
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Src → Dst</TableHead>
                    <TableHead>Protocol</TableHead>
                    <TableHead>Signature</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{rows}</TableBody>
              </Table>

              {total > 0 && (
                <div className="mt-4 flex items-center justify-between text-sm text-white/60">
                  <div>Page {page} / {pages}</div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goto(page - 1)}
                      disabled={page <= 1}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goto(page + 1)}
                      disabled={page >= pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-20 shadow-2xl ring-1 ring-white/10">
            <CardHeader>
              <CardTitle>Blocked IPs</CardTitle>
            </CardHeader>
            <CardContent>
              {blocked.length === 0 ? (
                <p className="text-sm text-white/60">No IPs blocked yet.</p>
              ) : (
                <ul className="space-y-2">
                  {blocked.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-start justify-between rounded-md bg-white/5 p-2 ring-1 ring-white/10"
                    >
                      <div className="space-y-1">
                        <div className="font-mono text-sm">{b.ip}</div>
                        <div className="text-xs text-white/60">{b.reason}</div>
                      </div>
                      <Pill className="text-xs">{new Date(b.blocked_at).toLocaleString()}</Pill>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm block</DialogTitle>
            <DialogDescription>
              This will add the IP to the <span className="font-mono">blocked-ips</span> index.
            </DialogDescription>
          </DialogHeader>
          {confirm && (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-white/60">IP:</span>{" "}
                <span className="font-mono">{confirm.ip}</span>
              </div>
              <div className="text-white/60">Reason:</div>
              <Input
                value={confirm.reason}
                onChange={(e) =>
                  setConfirm({ ...confirm, reason: e.target.value })
                }
                className="w-full bg-white/5 border-white/10"
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button onClick={() => doBlock(confirm.ip, confirm.reason)}>
              Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 rounded-lg px-4 py-2 text-sm shadow-xl ring-1 ${
            toast.type === "ok"
              ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30"
              : "bg-red-500/15 text-red-200 ring-red-500/30"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}