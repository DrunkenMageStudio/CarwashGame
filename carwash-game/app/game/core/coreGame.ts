import {
  Engine,
  Scene,
  ArcRotateCamera,
  Vector3,
  HemisphericLight,
  PointerEventTypes,
  type PointerInfo,
} from "@babylonjs/core";
import type { Theme } from "./types";

export type GameConfig = {
  durationSeconds: number;
  spawnEveryMs: number;
};

export type GameCallbacks = {
  onScore(score: number): void;
  onTimeLeft(seconds: number): void;
  onEnded(finalScore: number): void;
};

export function createGame(opts: {
  canvas: HTMLCanvasElement;
  theme: Theme;
  config: GameConfig;
  callbacks: GameCallbacks;
}) {
  const { canvas, theme, config, callbacks } = opts;

  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new Scene(engine);

  // Camera: on-rails look only (no translation), still uses ArcRotate for now
  const camera = new ArcRotateCamera(
    "cam",
    Math.PI / 2,
    Math.PI / 2.2,
    12,
    new Vector3(0, 1, 10),
    scene
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 12;
  camera.upperRadiusLimit = 12;
  camera.lowerBetaLimit = camera.beta;
  camera.upperBetaLimit = camera.beta;

  // Light (themes can add more)
  const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.9;

  // Theme setup
  theme.setupEnvironment({ scene, camera });

  // State
  let score = 0;
  let timeLeft = config.durationSeconds;
  let playing = true;

  callbacks.onScore(score);
  callbacks.onTimeLeft(timeLeft);

  // Spawn loop
  const spawnId = window.setInterval(() => {
    if (!playing) return;
    theme.spawnTarget({ scene, camera });
  }, config.spawnEveryMs);

  // Timer loop
  const timerId = window.setInterval(() => {
    if (!playing) return;
    timeLeft -= 1;
    callbacks.onTimeLeft(timeLeft);

    if (timeLeft <= 0) {
      playing = false;
      callbacks.onEnded(score);
    }
  }, 1000);

  // Click-to-fire without breaking look-drag
  const DRAG_THRESHOLD_PX = 8;
  let downX = 0;
  let downY = 0;
  let downPointerId: number | null = null;
  let downTime = 0;
  let dragged = false;

  const pointerObs = scene.onPointerObservable.add((pi: PointerInfo) => {
    if (!playing) return;

    if (pi.type === PointerEventTypes.POINTERDOWN) {
      const ev = pi.event as PointerEvent;
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
      if (dx * dx + dy * dy > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) dragged = true;
      return;
    }

    if (pi.type === PointerEventTypes.POINTERUP) {
      const ev = pi.event as PointerEvent;
      if (ev.button !== 0) return;
      if (downPointerId === null || ev.pointerId !== downPointerId) return;

      downPointerId = null;

      if (dragged) return;
      const heldMs = performance.now() - downTime;
      if (heldMs > 600) return;

      const pick = scene.pick(scene.pointerX, scene.pointerY);
      if (pick?.hit && pick.pickedMesh?.metadata?.isTarget) {
        const pts = pick.pickedMesh.metadata.points ?? 100;
        const meshName = pick.pickedMesh.name;

        pick.pickedMesh.dispose();

        score += pts;
        callbacks.onScore(score);

        theme.onHit?.({ scene, camera }, meshName, { points: pts });
      }
    }
  });

  // Render/update loop
  let lastT = performance.now();
  engine.runRenderLoop(() => {
    const now = performance.now();
    const dt = (now - lastT) / 1000;
    lastT = now;

    theme.update?.({ scene, camera }, dt);
    scene.render();
  });

  const onResize = () => engine.resize();
  window.addEventListener("resize", onResize);

  function dispose() {
    window.clearInterval(spawnId);
    window.clearInterval(timerId);
    scene.onPointerObservable.remove(pointerObs);
    window.removeEventListener("resize", onResize);
    scene.dispose();
    engine.dispose();
  }

  return { dispose };
}