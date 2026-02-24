import type { Scene, ArcRotateCamera } from "@babylonjs/core";

export type TargetHit = {
  points: number;
};

export type ThemeContext = {
  scene: Scene;
  camera: ArcRotateCamera;
};

export type Theme = {
  id: string;
  name: string;

  // Build the environment (walls/floor/ceiling/lights)
  setupEnvironment(ctx: ThemeContext): void;

  // Spawn one target. Should set metadata.isTarget + metadata.points, etc.
  spawnTarget(ctx: ThemeContext): void;

  // Optional: per-frame update for moving targets/effects
  update?(ctx: ThemeContext, dt: number): void;

  // Optional: called when a target is hit (particles, sound, etc.)
  onHit?(ctx: ThemeContext, hitMeshName: string, hit: TargetHit): void;
};