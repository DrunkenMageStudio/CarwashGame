import "@babylonjs/loaders/glTF";
import {
  Scene,
  TransformNode,
  Mesh,
  AbstractMesh,
  Vector3,
  Color3,
  StandardMaterial,
  MeshBuilder,
} from "@babylonjs/core";

type TargetSpawn = {
  position: Vector3;
  points?: number;
};

type FactoryOptions = {
  glbUrl: string; // e.g. "/models/target.glb"
};

export class TargetFactory {
  private scene: Scene;
  private glbUrl: string;

  private loaded = false;
  private root: TransformNode | null = null;
  private templateMeshes: Mesh[] = [];

  // Fallback: in case GLB fails, we still spawn something
  private fallbackMat: StandardMaterial;

  constructor(scene: Scene, opts: FactoryOptions) {
    this.scene = scene;
    this.glbUrl = opts.glbUrl;

    this.fallbackMat = new StandardMaterial("fallbackTargetMat", scene);
    this.fallbackMat.diffuseColor = new Color3(1, 1, 1);
    this.fallbackMat.emissiveColor = new Color3(0.2, 0.2, 0.2);
  }

  async ensureLoaded() {
    if (this.loaded) return;

    // ImportMeshAsync can load from a URL in /public
    const { SceneLoader } = await import("@babylonjs/core/Loading/sceneLoader");

    // Load GLB into the scene
    const result = await SceneLoader.ImportMeshAsync(
      "",
      "",
      this.glbUrl,
      this.scene
    );

    // Create an invisible root to parent things under
    const root = new TransformNode("targetRoot", this.scene);
    root.setEnabled(false);

    // Keep only meshes (ignore lights/cameras)
    const meshes = result.meshes.filter((m) => m instanceof Mesh) as Mesh[];

    // Parent under root and hide templates
    for (const m of meshes) {
      // Some GLBs create an extra "__root__" mesh; we only care about real geometry meshes
      if (!m.geometry) continue;

      m.setEnabled(false);
      m.isPickable = true; // instances will inherit this
      m.parent = root;

      this.templateMeshes.push(m);
    }

    this.root = root;
    this.loaded = true;
  }

  /**
   * Spawns one target as instances of the template meshes.
   * Returns the parent node for the spawned target (so you can dispose it as one unit).
   */
  spawn({ position, points = 100 }: TargetSpawn): TransformNode {
    // Parent for this spawned target
    const node = new TransformNode(`target_${Date.now()}`, this.scene);
    node.position.copyFrom(position);

    // If GLB not loaded yet, spawn a fallback sphere
    if (!this.loaded || this.templateMeshes.length === 0) {
      const s = MeshBuilder.CreateSphere(`fallback_${Date.now()}`, { diameter: 0.9 }, this.scene);
      s.position = Vector3.Zero();
      s.parent = node;
      s.material = this.fallbackMat;
      s.metadata = { isTarget: true, points };
      return node;
    }

    // Create instances of each template mesh
    for (const tmpl of this.templateMeshes) {
      const inst = tmpl.createInstance(`${tmpl.name}_i_${Date.now()}`) as Mesh;
      inst.parent = node;

      // Make sure it's pickable
      inst.isPickable = true;

      // Mark as target for hit detection
      inst.metadata = { isTarget: true, points };
    }

    // Apply red/white “traditional target” look
    // This assumes the GLB has 1 material or multiple; we override with our own materials.
    // If you want a perfect bullseye, model it in the GLB; this tint just enforces color identity.
    this.applyRedWhiteMaterials(node);

    return node;
  }

  private applyRedWhiteMaterials(targetNode: TransformNode) {
    // Create two materials (cached by name)
    let red = this.scene.getMaterialByName("targetRed") as StandardMaterial | null;
    if (!red) {
      red = new StandardMaterial("targetRed", this.scene);
      red.diffuseColor = new Color3(0.85, 0.1, 0.1);
      red.emissiveColor = new Color3(0.08, 0.01, 0.01);
      red.specularColor = new Color3(0.2, 0.2, 0.2);
    }

    let white = this.scene.getMaterialByName("targetWhite") as StandardMaterial | null;
    if (!white) {
      white = new StandardMaterial("targetWhite", this.scene);
      white.diffuseColor = new Color3(0.95, 0.95, 0.95);
      white.emissiveColor = new Color3(0.04, 0.04, 0.04);
      white.specularColor = new Color3(0.2, 0.2, 0.2);
    }

    // Alternate materials across child meshes for a red/white vibe
    // (If your GLB has named parts like "ring_red", "ring_white", we can do exact matching.)
    const meshes = targetNode.getChildMeshes(false) as AbstractMesh[];
    meshes.forEach((m, idx) => {
      (m as Mesh).material = idx % 2 === 0 ? red! : white!;
    });
  }
}