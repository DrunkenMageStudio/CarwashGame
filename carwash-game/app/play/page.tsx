"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  MeshBuilder,
  Vector3
} from "@babylonjs/core";

export default function PlayPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- HUD state ---
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60); // we'll use 60s for now

  // A ref to always know the latest timeLeft inside Babylon callbacks
  const timeLeftRef = useRef(timeLeft);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // --- Babylon setup ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);

    // Camera
    const camera = new ArcRotateCamera(
      "camera",
      Math.PI / 2,
      Math.PI / 3,
      5,
      Vector3.Zero(),
      scene
    );
    camera.attachControl(canvas, true);

    // Light
    new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    // Our "target" cube
    const box = MeshBuilder.CreateBox("box", { size: 1 }, scene);

    // Simple spin so it feels alive
    engine.runRenderLoop(() => {
      box.rotation.y += 0.01;
      scene.render();
    });

    // Handle resize
    const handleResize = () => engine.resize();
    window.addEventListener("resize", handleResize);

    // --- Shooting: tap/click to score if you hit the box ---
    scene.onPointerDown = (evt, pickInfo) => {
      // Don't allow scoring if time is up
      if (timeLeftRef.current <= 0) return;

      if (pickInfo.hit && pickInfo.pickedMesh === box) {
        // Use functional update so we always get the latest score value
        setScore((prev) => prev + 10);

        // Optional: move the box a bit after each hit so it feels less static
        box.position.x = (Math.random() - 0.5) * 4;
        box.position.y = (Math.random() - 0.5) * 2;
      }
    };

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      engine.dispose();
    };
  }, []);

  // --- Timer: count down once per second ---
  useEffect(() => {
    if (timeLeft <= 0) return; // stop when we hit 0

    const id = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(id);
  }, [timeLeft]);

  const isGameOver = timeLeft <= 0;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        margin: 0,
        padding: 0,
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* 3D canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />

      {/* HUD overlay */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          color: "white",
          fontFamily: "sans-serif",
          fontSize: "18px",
          textShadow: "0 0 4px black",
          userSelect: "none"
        }}
      >
        <div>Score: {score}</div>
        <div>Time: {timeLeft}s</div>
      </div>

      {/* Game over message */}
      {isGameOver && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            color: "white",
            fontFamily: "sans-serif",
            textShadow: "0 0 8px black",
            background: "rgba(0,0,0,0.4)"
          }}
        >
          <h1 style={{ marginBottom: 8 }}>Time&apos;s up!</h1>
          <p style={{ fontSize: 20 }}>Final Score: {score}</p>
        </div>
      )}
    </div>
  );
}
