import { MeshBuilder, Vector3, Color3, StandardMaterial } from "@babylonjs/core";
import type { Theme } from "../../core/types";
import { TargetFactory } from "./TargetFactory";

let factory: TargetFactory | null = null;
let loading: Promise<void> | null = null;

export const ConcreteBayTheme: Theme = {
  id: "concrete-bay",
  name: "Concrete Bay",

  setupEnvironment({ scene }) {
    const BAY_WIDTH = 18;
    const BAY_HEIGHT = 10;
    const BAY_LENGTH = 80;

    const concreteMat = new StandardMaterial("concreteMat", scene);
    concreteMat.diffuseColor = new Color3(0.55, 0.55, 0.55);
    concreteMat.specularColor = new Color3(0.05, 0.05, 0.05);
    concreteMat.emissiveColor = new Color3(0.02, 0.02, 0.02);

    const floor = MeshBuilder.CreateGround("floor", { width: BAY_WIDTH, height: BAY_LENGTH }, scene);
    floor.position = new Vector3(0, 0, BAY_LENGTH / 2);
    floor.material = concreteMat;

    const ceiling = MeshBuilder.CreateGround("ceiling", { width: BAY_WIDTH, height: BAY_LENGTH }, scene);
    ceiling.position = new Vector3(0, BAY_HEIGHT, BAY_LENGTH / 2);
    ceiling.rotation.x = Math.PI;
    ceiling.material = concreteMat;

    const leftWall = MeshBuilder.CreatePlane("leftWall", { width: BAY_LENGTH, height: BAY_HEIGHT }, scene);
    leftWall.position = new Vector3(-BAY_WIDTH / 2, BAY_HEIGHT / 2, BAY_LENGTH / 2);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.material = concreteMat;

    const rightWall = MeshBuilder.CreatePlane("rightWall", { width: BAY_LENGTH, height: BAY_HEIGHT }, scene);
    rightWall.position = new Vector3(BAY_WIDTH / 2, BAY_HEIGHT / 2, BAY_LENGTH / 2);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.material = concreteMat;

    // Init factory and kick off async load (non-blocking)
    factory = new TargetFactory(scene, { glbUrl: "/models/target.glb" });
    loading = factory.ensureLoaded().catch((e) => {
      console.error("Target GLB load failed:", e);
    });
  },

  spawnTarget({ scene }) {
    const BAY_WIDTH = 18;
    const BAY_HEIGHT = 10;
    const BAY_LENGTH = 80;

    const pos = new Vector3(
      (Math.random() - 0.5) * (BAY_WIDTH - 2),
      1 + Math.random() * (BAY_HEIGHT - 2),
      8 + Math.random() * (BAY_LENGTH - 12)
    );

    // If factory not ready yet, fallback will spawn (sphere)
    if (!factory) {
      // extremely unlikely, but safe
      const t = MeshBuilder.CreateSphere(`t_${Date.now()}`, { diameter: 0.8 }, scene);
      t.position.copyFrom(pos);
      t.metadata = { isTarget: true, points: 100 };
      return;
    }

    factory.spawn({ position: pos, points: 100 });
  },
};