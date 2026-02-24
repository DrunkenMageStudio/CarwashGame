"use client";

import { useEffect, useState } from "react";
import GameCanvas from "./GameCanvas";

type SessionResp =
  | { ok: true; token: string; expiresAt: string }
  | { ok: false; error: string };

export default function PlayClient({ locationId }: { locationId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function createSession() {
      try {
        setErr(null);
        const res = await fetch("/api/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locationId }),
        });
        const json = (await res.json()) as SessionResp;
        if (!alive) return;

        if (!res.ok || (json as any).ok === false) {
          setErr((json as any).error ?? `HTTP ${res.status}`);
          return;
        }
        setToken((json as any).token);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Network error");
      }
    }

    createSession();
    return () => {
      alive = false;
    };
  }, [locationId]);

  if (err) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h1>Play</h1>
        <p style={{ color: "crimson" }}>Session error: {err}</p>
      </main>
    );
  }

  if (!token) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
        <h1>Play</h1>
        <p>Preparing game session…</p>
      </main>
    );
  }

  return <GameCanvas locationId={locationId} token={token} />;
}