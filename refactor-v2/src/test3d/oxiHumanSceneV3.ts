import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type {
  BreastFirmnessId,
  BreastShapeId,
  BreastSizeId,
  ButtockFirmnessId,
  ButtockShapeId,
  MuscleMassId,
} from '../domain/catalog/character/body';

export type Gender = 'female' | 'male';
export type CameraView = 'front' | 'side' | 'back' | 'free';

export type BodyParams = {
  gender: Gender;
  height: number;
  weight: number;
  bust: number;
  waist: number;
  hips: number;
  bodyFat: number;
  muscleMassId: MuscleMassId;
  breastSizeId: BreastSizeId | null;
  breastShapeId: BreastShapeId | null;
  breastFirmnessId: BreastFirmnessId | null;
  buttockShapeId: ButtockShapeId | null;
  buttockFirmnessId: ButtockFirmnessId | null;
};

export type OxiMeasurements = {
  heightCm: number | null;
  chestCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  weightKg: number | null;
};

export type OxiFitResult = {
  elapsedMs: number;
  converged: boolean;
  iterations: number;
  version: string;
  sourceVertexCount: number;
  sourceIndexCount: number;
  renderedIndexCount: number;
  measurements: OxiMeasurements;
};

export type OxiLoadProgress = {
  phase: 'wasm' | 'pack' | 'mesh';
  progress: number;
  label: string;
};

type FitReport = {
  converged?: boolean;
  iterations?: number;
  results?: Array<{ name: string; target_cm: number; measured_cm: number; delta_cm: number }>;
};

type OxiEngine = {
  set_param: (name: string, value: number) => void;
  get_param: (name: string) => number;
  fit_to_measurements: (json: string) => string;
  get_measurements_json: () => string;
  refresh_geometry: () => number;
  positions_ptr: () => number;
  positions_len: () => number;
  normals_ptr: () => number;
  normals_len: () => number;
  uvs_ptr: () => number;
  uvs_len: () => number;
  indices_ptr: () => number;
  indices_len: () => number;
  get_vertex_count: () => number;
  get_index_count: () => number;
};

type OxiWasmModule = {
  default: (input?: unknown) => Promise<unknown>;
  set_panic_hook: () => void;
  get_version: () => string;
  wasm_memory: () => WebAssembly.Memory;
  OxiHumanEngine: { from_core_pack_bytes: (bytes: Uint8Array) => OxiEngine };
};

const SHAPE_TARGETS = [
  'breast/breast-dist-decr',
  'breast/breast-dist-incr',
  'breast/breast-point-decr',
  'breast/breast-point-incr',
  'breast/breast-trans-down',
  'breast/breast-trans-up',
  'breast/breast-volume-vert-down',
  'breast/breast-volume-vert-up',
  'buttocks/buttocks-volume-decr',
  'buttocks/buttocks-volume-incr',
  'hip/hip-scale-depth-decr',
  'hip/hip-scale-depth-incr',
  'hip/hip-scale-horiz-decr',
  'hip/hip-scale-horiz-incr',
  'hip/hip-scale-vert-decr',
  'hip/hip-scale-vert-incr',
] as const;

type ShapeTarget = typeof SHAPE_TARGETS[number];

type ShapeAxes = {
  breastDistance: number;
  breastPoint: number;
  breastVertical: number;
  breastVolume: number;
  buttockVolume: number;
  hipDepth: number;
  hipWidth: number;
  hipHeight: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const clampAxis = (value: number) => clamp(value, -1, 1);

const numberOrNull = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
};

function parseMeasurements(json: string): OxiMeasurements {
  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(json) as Record<string, unknown>;
  } catch {
    return { heightCm: null, chestCm: null, waistCm: null, hipCm: null, weightKg: null };
  }
  return {
    heightCm: numberOrNull(raw.total_height, raw.height_cm, raw.height, raw.stature_cm, raw.stature),
    chestCm: numberOrNull(raw.chest_cm, raw.chest, raw.bust_cm, raw.bust),
    waistCm: numberOrNull(raw.waist_cm, raw.waist),
    hipCm: numberOrNull(raw.hip_cm, raw.hip, raw.hips_cm, raw.hips),
    weightKg: numberOrNull(raw.weight_kg, raw.weightKg, raw.mass_kg, raw.mass),
  };
}

async function fetchBytes(url: string, onProgress?: (progress: number) => void) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  const total = Number(response.headers.get('content-length')) || 0;
  if (!response.body || !total) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    onProgress?.(1);
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress?.(clamp(received / total, 0, 1));
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function nextPaint() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

function largestConnectedComponent(indices: Uint32Array, vertexCount: number) {
  const parent = new Int32Array(vertexCount);
  const rank = new Uint8Array(vertexCount);
  for (let i = 0; i < vertexCount; i += 1) parent[i] = i;

  const find = (value: number) => {
    let x = value;
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!;
      x = parent[x]!;
    }
    return x;
  };
  const unite = (a: number, b: number) => {
    let ra = find(a);
    let rb = find(b);
    if (ra === rb) return;
    if (rank[ra]! < rank[rb]!) [ra, rb] = [rb, ra];
    parent[rb] = ra;
    if (rank[ra] === rank[rb]) rank[ra] = (rank[ra] ?? 0) + 1;
  };

  for (let i = 0; i + 2 < indices.length; i += 3) {
    const a = indices[i]!;
    const b = indices[i + 1]!;
    const c = indices[i + 2]!;
    if (a >= vertexCount || b >= vertexCount || c >= vertexCount) continue;
    unite(a, b);
    unite(b, c);
  }

  const counts = new Map<number, number>();
  let winner = -1;
  let winnerCount = 0;
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const a = indices[i]!;
    if (a >= vertexCount) continue;
    const root = find(a);
    const count = (counts.get(root) ?? 0) + 1;
    counts.set(root, count);
    if (count > winnerCount) {
      winner = root;
      winnerCount = count;
    }
  }
  if (winner < 0) return new Uint32Array(indices);
  const kept: number[] = [];
  for (let i = 0; i + 2 < indices.length; i += 3) {
    const a = indices[i]!;
    if (a < vertexCount && find(a) === winner) kept.push(a, indices[i + 1]!, indices[i + 2]!);
  }
  return Uint32Array.from(kept);
}

function shapeAxes(params: BodyParams): ShapeAxes {
  const axes: ShapeAxes = {
    breastDistance: 0,
    breastPoint: 0,
    breastVertical: 0,
    breastVolume: 0,
    buttockVolume: 0,
    hipDepth: 0,
    hipWidth: 0,
    hipHeight: 0,
  };

  if (params.gender === 'female') {
    switch (params.breastSizeId) {
      case 'small': axes.breastVolume -= 0.38; axes.breastPoint -= 0.14; break;
      case 'large': axes.breastVolume += 0.36; axes.breastPoint += 0.10; break;
      case 'very_large': axes.breastVolume += 0.68; axes.breastPoint += 0.18; break;
      default: break;
    }

    switch (params.breastShapeId) {
      case 'round': axes.breastVolume += 0.10; axes.breastPoint += 0.12; break;
      case 'teardrop': axes.breastVertical -= 0.22; axes.breastVolume += 0.10; break;
      case 'east_west': axes.breastDistance += 0.46; axes.breastPoint -= 0.06; break;
      case 'bell': axes.breastVertical -= 0.34; axes.breastVolume += 0.22; axes.breastPoint -= 0.08; break;
      case 'conical': axes.breastPoint += 0.55; axes.breastVolume -= 0.08; break;
      case 'athletic': axes.breastVertical += 0.16; axes.breastVolume -= 0.22; axes.breastPoint -= 0.12; break;
      case 'slender': axes.breastVolume -= 0.28; axes.breastPoint -= 0.10; break;
      case 'asymmetrical': axes.breastDistance += 0.10; axes.breastVertical -= 0.06; break;
      case 'ptotic': axes.breastVertical -= 0.55; axes.breastPoint -= 0.24; break;
      case 'wide_set': axes.breastDistance += 0.62; break;
      case 'close_set': axes.breastDistance -= 0.62; break;
      default: break;
    }

    switch (params.breastFirmnessId) {
      case 'soft': axes.breastVertical -= 0.20; axes.breastPoint -= 0.12; break;
      case 'firm': axes.breastVertical += 0.13; axes.breastPoint += 0.10; break;
      case 'lifted': axes.breastVertical += 0.28; axes.breastPoint += 0.12; break;
      default: break;
    }
  }

  switch (params.buttockShapeId) {
    case 'a_shape': axes.buttockVolume += 0.20; axes.hipWidth += 0.28; axes.hipHeight -= 0.10; break;
    case 'v_shape': axes.buttockVolume -= 0.16; axes.hipWidth -= 0.22; axes.hipHeight += 0.12; break;
    case 'round': axes.buttockVolume += 0.46; axes.hipDepth += 0.18; break;
    case 'square': axes.buttockVolume += 0.10; axes.hipWidth += 0.38; axes.hipDepth -= 0.06; break;
    default: break;
  }

  switch (params.buttockFirmnessId) {
    case 'soft': axes.buttockVolume += 0.10; axes.hipHeight -= 0.08; break;
    case 'firm': axes.hipDepth += 0.10; axes.hipHeight += 0.07; break;
    case 'toned': axes.buttockVolume -= 0.05; axes.hipDepth += 0.16; axes.hipHeight += 0.12; break;
    default: break;
  }

  for (const key of Object.keys(axes) as Array<keyof ShapeAxes>) axes[key] = clampAxis(axes[key]);
  return axes;
}

const MUSCLE_VALUE: Record<MuscleMassId, number> = {
  soft: 0.22,
  toned: 0.48,
  athletic: 0.72,
  muscular: 0.94,
};

export class OxiHumanSceneV3 {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(36, 1, 0.01, 100000);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly grid = new THREE.GridHelper(4000, 40, 0x3f3f46, 0x24242b);
  private readonly floor: THREE.Mesh;
  private readonly resizeObserver: ResizeObserver;
  private readonly material = new THREE.MeshPhysicalMaterial({
    color: 0xcaa596,
    roughness: 0.76,
    metalness: 0,
    sheen: 0.2,
    sheenColor: new THREE.Color(0xffe5d7),
    sheenRoughness: 0.68,
    side: THREE.DoubleSide,
  });

  private geometry: THREE.BufferGeometry | null = null;
  private mesh: THREE.Mesh | null = null;
  private positions = new Float32Array(0);
  private normals = new Float32Array(0);
  private uvs = new Float32Array(0);
  private sourceIndices = new Uint32Array(0);
  private bodyIndices = new Uint32Array(0);
  private generation = -1;
  private frameId = 0;
  private disposed = false;
  private currentView: CameraView = 'front';
  private frameDistance = 30;
  private center = new THREE.Vector3();
  private size = new THREE.Vector3(1, 1, 1);

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly engine: OxiEngine,
    private readonly memory: WebAssembly.Memory,
    private readonly version: string,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const key = new THREE.DirectionalLight(0xffffff, 2.7);
    key.position.set(3, 8, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1536, 1536);
    this.scene.add(key, key.target);
    const fill = new THREE.DirectionalLight(0xc7d2fe, 0.95);
    fill.position.set(-6, 4, 4);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xc4b5fd, 1.3);
    rim.position.set(-2, 6, -8);
    this.scene.add(rim);
    this.scene.add(new THREE.HemisphereLight(0xe4e4ff, 0x17171e, 0.8));

    const floorGeometry = new THREE.PlaneGeometry(4000, 4000);
    floorGeometry.rotateX(-Math.PI / 2);
    this.floor = new THREE.Mesh(floorGeometry, new THREE.ShadowMaterial({ opacity: 0.2 }));
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);
    this.grid.material.transparent = true;
    this.grid.material.opacity = 0.2;
    this.scene.add(this.grid);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.82;
    this.controls.zoomSpeed = 0.85;
    this.controls.autoRotateSpeed = 0.65;
    this.controls.addEventListener('start', () => { this.currentView = 'free'; });

    this.refreshGeometry(true);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();
    this.animate();
  }

  static async create(canvas: HTMLCanvasElement, onProgress?: (progress: OxiLoadProgress) => void) {
    const assetBase = new URL('./oxihuman/', document.baseURI);
    const wasmUrl = new URL('pkg/oxihuman_wasm.js', assetBase).href;
    const packUrl = new URL('pack/oxihuman-core-v1.ohpk', assetBase).href;
    onProgress?.({ phase: 'wasm', progress: 0.06, label: 'Загружаю OxiHuman WASM' });
    let wasm: OxiWasmModule;
    try {
      wasm = (await import(/* @vite-ignore */ wasmUrl)) as OxiWasmModule;
      await wasm.default();
      wasm.set_panic_hook();
    } catch (error) {
      throw new Error(`WASM: ${error instanceof Error ? error.message : String(error)}`);
    }
    onProgress?.({ phase: 'pack', progress: 0.2, label: 'Загружаю CharacterMaker body pack' });
    const pack = await fetchBytes(packUrl, (progress) => onProgress?.({
      phase: 'pack', progress: 0.2 + progress * 0.68, label: 'Загружаю CharacterMaker body pack',
    }));
    onProgress?.({ phase: 'mesh', progress: 0.92, label: 'Собираю body-only mesh' });
    const engine = wasm.OxiHumanEngine.from_core_pack_bytes(pack);
    const scene = new OxiHumanSceneV3(canvas, engine, wasm.wasm_memory(), wasm.get_version());
    onProgress?.({ phase: 'mesh', progress: 1, label: 'CharacterMaker body pack готов' });
    return scene;
  }

  getVersion() { return this.version; }
  getSourceVertexCount() { return this.engine.get_vertex_count(); }
  getSourceIndexCount() { return this.engine.get_index_count(); }
  getRenderedIndexCount() { return this.bodyIndices.length; }
  setGridVisible(visible: boolean) { this.grid.visible = visible; }
  setAutoRotate(enabled: boolean) { this.controls.autoRotate = enabled; }

  setView(view: CameraView) {
    this.currentView = view;
    if (view === 'free') return;
    const d = this.frameDistance;
    const c = this.center;
    if (view === 'front') this.camera.position.set(c.x, c.y + this.size.y * 0.02, c.z + d);
    if (view === 'back') this.camera.position.set(c.x, c.y + this.size.y * 0.02, c.z - d);
    if (view === 'side') this.camera.position.set(c.x + d, c.y + this.size.y * 0.02, c.z);
    this.controls.target.copy(c);
    this.controls.update();
  }

  private setSignedPair(negative: ShapeTarget, positive: ShapeTarget, value: number) {
    const v = clampAxis(value);
    this.engine.set_param(negative, v < 0 ? -v : 0);
    this.engine.set_param(positive, v > 0 ? v : 0);
  }

  private applyShapeParams(params: BodyParams) {
    for (const target of SHAPE_TARGETS) this.engine.set_param(target, 0);
    const axes = shapeAxes(params);
    this.setSignedPair('breast/breast-dist-decr', 'breast/breast-dist-incr', axes.breastDistance);
    this.setSignedPair('breast/breast-point-decr', 'breast/breast-point-incr', axes.breastPoint);
    this.setSignedPair('breast/breast-trans-down', 'breast/breast-trans-up', axes.breastVertical);
    this.setSignedPair('breast/breast-volume-vert-down', 'breast/breast-volume-vert-up', axes.breastVolume);
    this.setSignedPair('buttocks/buttocks-volume-decr', 'buttocks/buttocks-volume-incr', axes.buttockVolume);
    this.setSignedPair('hip/hip-scale-depth-decr', 'hip/hip-scale-depth-incr', axes.hipDepth);
    this.setSignedPair('hip/hip-scale-horiz-decr', 'hip/hip-scale-horiz-incr', axes.hipWidth);
    this.setSignedPair('hip/hip-scale-vert-decr', 'hip/hip-scale-vert-incr', axes.hipHeight);
  }

  preview(params: BodyParams) {
    const heightPrior = clamp((params.height - 140) / 80, 0, 1);
    const bmi = params.weight / Math.max((params.height / 100) ** 2, 0.01);
    const bmiPrior = clamp((bmi - 16) / 24, 0, 1);
    const fatPrior = clamp((params.bodyFat - 8) / 37, 0, 1);
    this.engine.set_param('height', heightPrior);
    this.engine.set_param('weight', clamp(bmiPrior * 0.7 + fatPrior * 0.3, 0, 1));
    this.engine.set_param('muscle', MUSCLE_VALUE[params.muscleMassId]);
    this.engine.set_param('gender', params.gender === 'female' ? 1 : 0);
    this.engine.set_param('age', 0.5);
    this.applyShapeParams(params);
    this.refreshGeometry(false);
  }

  async fit(params: BodyParams): Promise<OxiFitResult> {
    this.preview(params);
    await nextPaint();
    const started = performance.now();
    let report: FitReport;
    try {
      report = JSON.parse(this.engine.fit_to_measurements(JSON.stringify({
        height_cm: params.height,
        chest_cm: params.bust,
        waist_cm: params.waist,
        hip_cm: params.hips,
        max_iterations: 38,
      }))) as FitReport;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error));
    }

    // The generic fitter is allowed to move gender/muscle. CharacterMaker treats
    // both as explicit state, while custom shape targets are independent extras.
    this.engine.set_param('gender', params.gender === 'female' ? 1 : 0);
    this.engine.set_param('muscle', MUSCLE_VALUE[params.muscleMassId]);
    this.applyShapeParams(params);
    this.refreshGeometry(true);

    const measurements = parseMeasurements(this.engine.get_measurements_json());
    for (const row of report.results ?? []) {
      if (row.name === 'height' && measurements.heightCm == null) measurements.heightCm = row.measured_cm;
      if (row.name === 'chest' && measurements.chestCm == null) measurements.chestCm = row.measured_cm;
      if (row.name === 'waist' && measurements.waistCm == null) measurements.waistCm = row.measured_cm;
      if (row.name === 'hip' && measurements.hipCm == null) measurements.hipCm = row.measured_cm;
    }
    if (this.currentView !== 'free') this.setView(this.currentView);
    return {
      elapsedMs: performance.now() - started,
      converged: Boolean(report.converged),
      iterations: Number(report.iterations ?? 0),
      version: this.version,
      sourceVertexCount: this.getSourceVertexCount(),
      sourceIndexCount: this.getSourceIndexCount(),
      renderedIndexCount: this.getRenderedIndexCount(),
      measurements,
    };
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.geometry?.dispose();
    this.material.dispose();
    this.floor.geometry.dispose();
    if (Array.isArray(this.floor.material)) this.floor.material.forEach((material) => material.dispose());
    else this.floor.material.dispose();
    this.renderer.dispose();
  }

  private makeViews() {
    this.engine.refresh_geometry();
    const buffer = this.memory.buffer;
    this.positions = new Float32Array(buffer, this.engine.positions_ptr(), this.engine.positions_len());
    this.normals = new Float32Array(buffer, this.engine.normals_ptr(), this.engine.normals_len());
    this.uvs = new Float32Array(buffer, this.engine.uvs_ptr(), this.engine.uvs_len());
    this.sourceIndices = new Uint32Array(buffer, this.engine.indices_ptr(), this.engine.indices_len());
  }

  private rebuildGeometry(generation: number) {
    this.makeViews();
    this.bodyIndices = largestConnectedComponent(this.sourceIndices, Math.floor(this.positions.length / 3));
    const geometry = new THREE.BufferGeometry();
    const positions = new THREE.BufferAttribute(this.positions, 3);
    const normals = new THREE.BufferAttribute(this.normals, 3);
    positions.setUsage(THREE.DynamicDrawUsage);
    normals.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('position', positions);
    geometry.setAttribute('normal', normals);
    if (this.uvs.length >= 2) geometry.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(this.bodyIndices, 1));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const previous = this.geometry;
    this.geometry = geometry;
    this.generation = generation;
    if (!this.mesh) {
      this.mesh = new THREE.Mesh(geometry, this.material);
      this.mesh.castShadow = true;
      this.scene.add(this.mesh);
    } else {
      this.mesh.geometry = geometry;
    }
    previous?.dispose();
    this.updateFrameFromGeometry();
  }

  private refreshGeometry(reframe: boolean) {
    const generation = this.engine.refresh_geometry();
    if (!this.geometry || generation !== this.generation || this.positions.buffer !== this.memory.buffer) {
      this.rebuildGeometry(generation);
    } else {
      const position = this.geometry.getAttribute('position');
      const normal = this.geometry.getAttribute('normal');
      position.needsUpdate = true;
      normal.needsUpdate = true;
      this.geometry.computeBoundingBox();
      this.geometry.computeBoundingSphere();
      this.updateFrameFromGeometry();
    }
    if (reframe && this.currentView !== 'free') this.setView(this.currentView);
  }

  private updateFrameFromGeometry() {
    const box = this.geometry?.boundingBox;
    if (!box) return;
    box.getCenter(this.center);
    box.getSize(this.size);
    const maxDim = Math.max(this.size.x, this.size.y, this.size.z, 0.001);
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    this.frameDistance = ((maxDim / 2) / Math.tan(fov / 2)) * 1.48;
    this.controls.target.copy(this.center);
    this.controls.minDistance = this.frameDistance * 0.34;
    this.controls.maxDistance = this.frameDistance * 3.4;
    this.floor.position.y = box.min.y - this.size.y * 0.002;
    this.grid.position.y = this.floor.position.y + this.size.y * 0.001;
    const gridScale = Math.max(this.size.x, this.size.z, this.size.y * 0.18) / 40;
    this.grid.scale.setScalar(Math.max(gridScale, 0.02));
  }

  private resize() {
    const parent = this.canvas.parentElement ?? this.canvas;
    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private animate = () => {
    if (this.disposed) return;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.frameId = requestAnimationFrame(this.animate);
  };
}
