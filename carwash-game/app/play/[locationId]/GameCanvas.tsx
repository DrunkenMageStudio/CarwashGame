"use client";

import { useEffect, useRef, useState } from "react";
import { createGame } from "@/app/game/core/coreGame";
import { ConcreteBayTheme } from "@/app/game/themes/concrete-bay/theme";

type Props = { locationId: string; token: string };

type ScoreResp =
  | { ok: true; score: any }
  | { ok: false; error: string; detail?: string };

export default function GameCanvas({ locationId, token }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [status, setStatus] = useState<"loading" | "playing" | "ended">("loading");
  const [postResult, setPostResult] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    setStatus("playing");

    const game = createGame({
      canvas,
      theme: ConcreteBayTheme, // swap themes here later
      config: { durationSeconds: 90, spawnEveryMs: 1200 },
      callbacks: {
        onScore: setScore,
        onTimeLeft: setTimeLeft,
        onEnded: () => setStatus("ended"),
      },
    });

    return () => game.dispose();
  }, []);

  // Post score once at end
  useEffect(() => {
    if (status !== "ended") return;
    let alive = true;

    async function postScore() {
      try {
        setPostResult("Submitting score…");
        const res = await fetch("/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationId,
            score,
            nickname: "Boss", // TODO: prompt UI
            token,
          }),
        });

        const json = (await res.json()) as ScoreResp;
        if (!alive) return;

        if (!res.ok || (json as any).ok === false) {
          setPostResult(
            `Submit failed: ${(json as any).error ?? `HTTP ${res.status}`}${
              (json as any).detail ? ` (${(json as any).detail})` : ""
            }`
          );
          return;
        }
        setPostResult("Score submitted ✅");
      } catch (e: any) {
        if (!alive) return;
        setPostResult(`Submit failed: ${e?.message ?? "Network error"}`);
      }
    }

    postScore();
    return () => {
      alive = false;
    };
  }, [status, locationId, score, token]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", touchAction: "none" }} />

      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          padding: "10px 12px",
          borderRadius: 10,
          background: "rgba(0,0,0,0.45)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ fontWeight: 800 }}>Score: {score}</div>
          <div style={{ opacity: 0.9 }}>Time: {timeLeft}s</div>
        </div>
        <div style={{ opacity: 0.75, fontSize: 12 }}>Look: drag. Shoot: click/tap.</div>
      </div>

      {status === "ended" ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            background: "rgba(0,0,0,0.60)",
            color: "white",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 520 }}>
            <h1 style={{ margin: 0, fontSize: 48 }}>Run Complete</h1>
            <p style={{ fontSize: 22, marginTop: 12 }}>
              Final Score: <strong>{score}</strong>
            </p>
            <p style={{ opacity: 0.9 }}>{postResult ?? "Submitting…"}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}