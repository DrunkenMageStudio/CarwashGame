"use client";

import { useEffect, useRef, useState } from "react";
import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  MeshBuilder,
  Color3,
  StandardMaterial,
  PointerEventTypes,
  PointerInfo,
} from "@babylonjs/core";

type Props = { locationId: string; token: string };

type ScoreResp =
  | { ok: true; score: any }
  | { ok: false; error: string; detail?: string };

export default function GameCanvas({ locationId, token }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);

  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90);
  const [status, setStatus] = useState<"loading" | "playing" | "ended">("loading");
  const [postResult, setPostResult] = useState<string | null>(null);

  // Keep latest status available to timers/handlers created once
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    engineRef.current = engine;

    const scene = new Scene(engine);
    sceneRef.current = scene;

    // Camera: orbit for now. Player doesn't move; only looks.
    const cam = new ArcRotateCamera(
      "cam",
      Math.PI / 2,
      Math.PI / 2.2,
      12,
      new Vector3(0, 1, 0),
      scene
    );
    cam.attachControl(canvas, true);
    cam.lowerRadiusLimit = 12;
    cam.upperRadiusLimit = 12;
    cam.lowerBetaLimit = cam.beta;
    cam.upperBetaLimit = cam.beta;

    // Prevent right-click menu (keeps interaction clean)
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

    new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    // Simple “tunnel” backdrop
    const floor = MeshBuilder.CreateGround("floor", { width: 30, height: 60 }, scene);
    floor.position.z = 10;
    const floorMat = new StandardMaterial("floorMat", scene);
    floorMat.diffuseColor = new Color3(0.08, 0.10, 0.14);
    floor.material = floorMat;

    // Target material
    const targetMat = new StandardMaterial("targetMat", scene);
    targetMat.diffuseColor = new Color3(0.2, 0.8, 0.9);

    function spawnTarget() {
      const t = MeshBuilder.CreateSphere(`t_${Date.now()}`, { diameter: 0.8 }, scene);
      t.position = new Vector3(
        (Math.random() - 0.5) * 8,
        1 + Math.random() * 4,
        8 + Math.random() * 18
      );
      t.material = targetMat;
      t.metadata = { isTarget: true };
    }

    // Initial targets
    for (let i = 0; i < 6; i++) spawnTarget();

    // Spawn loop
    const spawnId = window.setInterval(() => {
      if (statusRef.current !== "playing") return;
      spawnTarget();
    }, 1200);

    // --- Click to fire WITHOUT breaking camera look ---
    // We treat a "shot" as a pointer down/up with minimal movement.
    // If you dragged to look around, we do NOT shoot.
    const DRAG_THRESHOLD_PX = 8;
    let downX = 0;
    let downY = 0;
    let downPointerId: number | null = null;
    let downTime = 0;
    let dragged = false;

    const obs = scene.onPointerObservable.add((pi: PointerInfo) => {
      if (statusRef.current !== "playing") return;

      if (pi.type === PointerEventTypes.POINTERDOWN) {
        const ev = pi.event as PointerEvent;
        // only left click / primary touch
        if (ev.button !== 0) return;

        downPointerId = ev.pointerId;
        downX = ev.clientX;
        downY = ev.clientY;
        downTime = performance.now();
        dragged = false;
        return;
      }

      if (pi.type === PointerEventTypes.POINTERMOVE) {
        const ev = pi.event as PointerEvent;
        if (downPointerId === null || ev.pointerId !== downPointerId) return;

        const dx = ev.clientX - downX;
        const dy = ev.clientY - downY;
        if (dx * dx + dy * dy > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
          dragged = true; // camera look gesture
        }
        return;
      }

      if (pi.type === PointerEventTypes.POINTERUP) {
        const ev = pi.event as PointerEvent;
        if (ev.button !== 0) return;
        if (downPointerId === null || ev.pointerId !== downPointerId) return;

        downPointerId = null;

        // If it was a drag (look), don't shoot
        if (dragged) return;

        // Optional: ignore long-press
        const heldMs = performance.now() - downTime;
        if (heldMs > 600) return;

        // Shoot!
        const pick = scene.pick(scene.pointerX, scene.pointerY);
        if (pick?.hit && pick.pickedMesh?.metadata?.isTarget) {
          pick.pickedMesh.dispose();
          setScore((s) => s + 100);
        } else {
          // Miss penalty optional
          // setScore((s) => Math.max(0, s - 10));
        }
      }
    });

    // Start the game
    setStatus("playing");
    setTimeLeft(90);

    engine.runRenderLoop(() => {
      scene.render();
    });

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.clearInterval(spawnId);
      scene.onPointerObservable.remove(obs);
      window.removeEventListener("resize", onResize);
      scene.dispose();
      engine.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer
  useEffect(() => {
    if (status !== "playing") return;

    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          setStatus("ended");
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [status]);

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

      {/* HUD */}
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
        <div style={{ opacity: 0.75, fontSize: 12 }}>
          Look: drag. Shoot: click/tap (quick press).
        </div>
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
            <p style={{ opacity: 0.75, fontSize: 14 }}>
              Next: crosshair + ray-from-center + gyro aiming + hit effects.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}