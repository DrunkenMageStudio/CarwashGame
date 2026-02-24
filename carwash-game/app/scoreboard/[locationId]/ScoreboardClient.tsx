"use client";

import { useEffect, useMemo, useState } from "react";

type Entry = {
  id: number;
  locationId: string;
  value: number;
  nickname: string | null;
  createdAt: string;
};

type ApiResp =
  | { ok: true; locationId: string; range: string; limit: number; entries: Entry[] }
  | { ok: false; error: string };

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ScoreboardClient({ locationId }: { locationId: string }) {
  const [range, setRange] = useState<"daily" | "weekly" | "all">("daily");
  const [limit, setLimit] = useState<number>(10);

  const [data, setData] = useState<ApiResp | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ No window. Just build a relative URL.
  const endpoint = useMemo(() => {
    const qs = new URLSearchParams({
      locationId,
      range,
      limit: String(limit),
    });
    return `/api/leaderboard?${qs.toString()}`;
  }, [locationId, range, limit]);

  useEffect(() => {
    let alive = true;

    async function fetchBoard() {
      try {
        setError(null);
        const res = await fetch(endpoint, { cache: "no-store" });
        const json = (await res.json()) as ApiResp;

        if (!alive) return;

        setData(json);
        setLastUpdated(new Date());

        if (!res.ok || (json as any).ok === false) {
          setError((json as any).error ?? `HTTP ${res.status}`);
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Network error");
      }
    }

    fetchBoard();
    const id = window.setInterval(fetchBoard, 5000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [endpoint]);

  const entries = data && data.ok ? data.entries : [];

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 40 }}>Scoreboard</h1>
        <div style={{ fontSize: 18, opacity: 0.8 }}>
          Location: <strong>{locationId}</strong>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Range
          <select value={range} onChange={(e) => setRange(e.target.value as any)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="all">All-time</option>
          </select>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          Rows
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </label>

        <div style={{ marginLeft: "auto", opacity: 0.75 }}>
          {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Loading..."}
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            border: "1px solid #ccc",
            borderRadius: 8,
            background: "#fff8f8",
          }}
        >
          <strong>API error:</strong> {error}
        </div>
      ) : null}

      <div style={{ marginTop: 18, border: "1px solid #ddd", borderRadius: 12, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "80px 1fr 160px 140px",
            padding: "12px 16px",
            background: "#f5f5f5",
            fontWeight: 700,
          }}
        >
          <div>Rank</div>
          <div>Player</div>
          <div style={{ textAlign: "right" }}>Score</div>
          <div style={{ textAlign: "right" }}>Time</div>
        </div>

        {entries.length === 0 ? (
          <div style={{ padding: 16, opacity: 0.75 }}>No scores yet.</div>
        ) : (
          entries.map((e, idx) => (
            <div
              key={e.id}
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr 160px 140px",
                padding: "12px 16px",
                borderTop: "1px solid #eee",
                alignItems: "center",
                fontSize: 18,
              }}
            >
              <div style={{ fontWeight: 700 }}>#{idx + 1}</div>
              <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {e.nickname ?? "Anonymous"}
              </div>
              <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                {e.value}
              </div>
              <div style={{ textAlign: "right", opacity: 0.75 }}>{formatTime(e.createdAt)}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 14, opacity: 0.7, fontSize: 14 }}>
        Endpoint: <code>{endpoint}</code>
      </div>
    </main>
  );
}