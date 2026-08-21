import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
  muscle: number;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry.dispose();
    }
  });
}

function cylinderBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radiusTop: number,
  radiusBottom: number,
  material: THREE.Material,
  radialSegments = 16,
) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, radialSegments, 1, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function ellipsoid(
  scale: THREE.Vector3,
  position: THREE.Vector3,
  material: THREE.Material,
  widthSegments = 24,
  heightSegments = 16,
) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, widthSegments, heightSegments), material);
  mesh.scale.copy(scale);
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function horizontalRing(rx: number, rz: number, y: number, material: THREE.Material) {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= 72; i += 1) {
    const angle = (i / 72) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(angle) * rx, y, Math.sin(angle) * rz));
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
}

export class BodyScene {
  private readonly canvas: HTMLCanvasElement;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly controls: OrbitControls;
  private readonly bodyRoot = new THREE.Group();
  private readonly measurementRoot = new THREE.Group();
  private readonly bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0xd7d5d2,
    roughness: 0.72,
    metalness: 0.02,
  });
  private readonly accentMaterial = new THREE.MeshStandardMaterial({
    color: 0xc9c6c2,
    roughness: 0.78,
    metalness: 0,
  });
  private readonly measureMaterial = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
  private readonly resizeObserver: ResizeObserver;
  private frame = 0;
  private disposed = false;
  private currentHeight = 1.7;
  private grid: THREE.GridHelper;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0b0f);

    this.camera = new THREE.PerspectiveCamera(35, 1, 0.01, 20);
    this.camera.position.set(0, 0.92, 3.15);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.55;
    this.controls.maxDistance = 5.2;
    this.controls.target.set(0, 0.88, 0);
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 1.1;

    const ambient = new THREE.HemisphereLight(0xffffff, 0x31313b, 2.35);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 3.1);
    key.position.set(2.8, 4.2, 3.8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x8b5cf6, 1.65);
    rim.position.set(-3, 2.8, -2.4);
    this.scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.7, 64),
      new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 1, metalness: 0 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.003;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.grid = new THREE.GridHelper(3.2, 16, 0x34343f, 0x202028);
    this.grid.position.y = 0.002;
    this.scene.add(this.grid);

    this.scene.add(this.bodyRoot, this.measurementRoot);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.animate();
  }

  update(params: BodyParams, showMeasurements: boolean) {
    disposeObject(this.bodyRoot);
    disposeObject(this.measurementRoot);
    this.bodyRoot.clear();
    this.measurementRoot.clear();

    const height = params.height / 100;
    this.currentHeight = height;
    const bmi = params.weight / (height * height);
    const fat = clamp((params.bodyFat - 8) / 37, 0, 1);
    const muscle = clamp(params.muscle / 3, 0, 1);
    const female = params.gender === 'female';

    const circumferenceRadius = (cm: number) => (cm / 100) / (2 * Math.PI) * 1.12;
    const waistR = circumferenceRadius(params.waist) * (0.98 + fat * 0.05);
    const bustR = circumferenceRadius(params.bust) * (1.01 + fat * 0.04);
    const hipsR = circumferenceRadius(params.hips) * (female ? 1.04 : 0.98) * (1 + fat * 0.04);
    const massScale = clamp(1 + (bmi - 20.8) * 0.014, 0.86, 1.28);
    const shoulderR = Math.max(
      bustR * (female ? 1.03 : 1.11),
      height * (female ? 0.104 : 0.116) * (1 + muscle * 0.12),
    );

    const torsoDepthScale = female ? 0.68 + fat * 0.08 : 0.72 + fat * 0.08;
    const hipDepth = hipsR * (female ? 0.79 : 0.72) * (1 + fat * 0.08);
    const bustDepth = bustR * torsoDepthScale;
    const waistDepth = waistR * (0.76 + fat * 0.05);

    const yHip = height * 0.50;
    const yHighHip = height * 0.555;
    const yWaist = height * 0.625;
    const yUnderBust = height * 0.685;
    const yBust = height * 0.73;
    const yShoulder = height * 0.815;
    const yNeckBase = height * 0.855;

    const torsoProfile = [
      new THREE.Vector2(hipsR * 0.88, yHip - height * 0.025),
      new THREE.Vector2(hipsR, yHip),
      new THREE.Vector2(hipsR * 0.96, yHighHip),
      new THREE.Vector2(waistR * 1.05, yWaist - height * 0.018),
      new THREE.Vector2(waistR, yWaist),
      new THREE.Vector2(bustR * 0.88, yUnderBust),
      new THREE.Vector2(bustR, yBust),
      new THREE.Vector2(shoulderR * 0.91, yShoulder - height * 0.018),
      new THREE.Vector2(shoulderR, yShoulder),
      new THREE.Vector2(height * 0.048, yNeckBase),
    ];

    const torso = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 40), this.bodyMaterial);
    torso.scale.z = torsoDepthScale;
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.bodyRoot.add(torso);

    const pelvis = ellipsoid(
      new THREE.Vector3(hipsR * 0.98, height * 0.074, hipDepth),
      new THREE.Vector3(0, yHip, 0),
      this.bodyMaterial,
    );
    this.bodyRoot.add(pelvis);

    const buttScale = female ? 1 : 0.78;
    for (const side of [-1, 1] as const) {
      this.bodyRoot.add(
        ellipsoid(
          new THREE.Vector3(hipsR * 0.47, height * 0.06, hipDepth * 0.59 * buttScale),
          new THREE.Vector3(side * hipsR * 0.43, yHip + height * 0.005, -hipDepth * 0.48),
          this.accentMaterial,
          20,
          14,
        ),
      );
    }

    if (female) {
      const bustExcess = clamp((params.bust - params.waist * 1.12) / 100, 0.02, 0.38);
      const breastX = clamp(bustR * 0.48, height * 0.038, height * 0.061);
      const breastY = height * (0.036 + bustExcess * 0.055);
      const breastZ = height * (0.031 + bustExcess * 0.095);
      for (const side of [-1, 1] as const) {
        this.bodyRoot.add(
          ellipsoid(
            new THREE.Vector3(breastX, breastY, breastZ),
            new THREE.Vector3(side * bustR * 0.46, yBust - height * 0.005, bustDepth * 0.72),
            this.accentMaterial,
            24,
            16,
          ),
        );
      }
    }

    const neckRadius = height * (female ? 0.032 : 0.036) * (1 + muscle * 0.08);
    const neckStart = new THREE.Vector3(0, yNeckBase - height * 0.008, 0);
    const neckEnd = new THREE.Vector3(0, height * 0.895, 0);
    this.bodyRoot.add(cylinderBetween(neckStart, neckEnd, neckRadius * 0.9, neckRadius, this.bodyMaterial, 20));

    const headCenterY = height * 0.94;
    this.bodyRoot.add(
      ellipsoid(
        new THREE.Vector3(height * 0.047, height * 0.061, height * 0.052),
        new THREE.Vector3(0, headCenterY, height * 0.002),
        this.bodyMaterial,
        28,
        20,
      ),
    );

    const limbMass = massScale * (0.94 + fat * 0.11 + muscle * 0.10);
    const upperArmR = height * (female ? 0.021 : 0.024) * limbMass;
    const forearmR = upperArmR * 0.79;
    const thighR = height * (female ? 0.036 : 0.034) * limbMass * (1 + (hipsR / Math.max(height, 0.01) - 0.095) * 1.8);
    const calfR = thighR * (0.66 + muscle * 0.08);

    for (const side of [-1, 1] as const) {
      const shoulder = new THREE.Vector3(side * shoulderR * 0.96, yShoulder - height * 0.012, 0);
      const elbow = new THREE.Vector3(side * (shoulderR + height * 0.03), height * 0.675, 0.006);
      const wrist = new THREE.Vector3(side * (shoulderR + height * 0.026), height * 0.535, 0.012);
      this.bodyRoot.add(cylinderBetween(shoulder, elbow, upperArmR * 1.02, upperArmR * 0.84, this.bodyMaterial));
      this.bodyRoot.add(cylinderBetween(elbow, wrist, upperArmR * 0.82, forearmR * 0.78, this.bodyMaterial));
      this.bodyRoot.add(
        ellipsoid(
          new THREE.Vector3(forearmR * 0.78, height * 0.025, forearmR * 0.58),
          new THREE.Vector3(wrist.x, wrist.y - height * 0.022, wrist.z + height * 0.006),
          this.bodyMaterial,
          18,
          12,
        ),
      );

      const hipJointX = side * hipsR * 0.48;
      const hipJoint = new THREE.Vector3(hipJointX, yHip - height * 0.02, 0);
      const knee = new THREE.Vector3(side * height * 0.058, height * 0.285, 0.008);
      const ankle = new THREE.Vector3(side * height * 0.052, height * 0.075, 0.015);
      this.bodyRoot.add(cylinderBetween(hipJoint, knee, thighR * 1.04, thighR * 0.72, this.bodyMaterial, 20));
      this.bodyRoot.add(cylinderBetween(knee, ankle, calfR * 1.02, calfR * 0.54, this.bodyMaterial, 18));
      this.bodyRoot.add(
        ellipsoid(
          new THREE.Vector3(calfR * 0.58, height * 0.027, height * 0.058),
          new THREE.Vector3(ankle.x, height * 0.035, height * 0.028),
          this.bodyMaterial,
          18,
          12,
        ),
      );
    }

    if (showMeasurements) {
      this.measurementRoot.add(horizontalRing(bustR * 1.03, bustDepth * 1.08, yBust, this.measureMaterial));
      this.measurementRoot.add(horizontalRing(waistR * 1.05, waistDepth * 1.10, yWaist, this.measureMaterial));
      this.measurementRoot.add(horizontalRing(hipsR * 1.04, hipDepth * 1.05, yHip, this.measureMaterial));

      const heightGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.34, 0, 0),
        new THREE.Vector3(-0.34, height, 0),
      ]);
      this.measurementRoot.add(new THREE.Line(heightGeometry, this.measureMaterial));
    }

    this.controls.target.set(0, height * 0.52, 0);
    this.fitCamera(false);
  }

  setMeasurementsVisible(visible: boolean) {
    this.measurementRoot.visible = visible;
  }

  setGridVisible(visible: boolean) {
    this.grid.visible = visible;
  }

  setAutoRotate(value: boolean) {
    this.controls.autoRotate = value;
  }

  setView(view: CameraView) {
    const targetY = this.currentHeight * 0.52;
    const distance = 2.9;
    const positions: Record<Exclude<CameraView, 'free'>, THREE.Vector3> = {
      front: new THREE.Vector3(0, targetY, distance),
      side: new THREE.Vector3(distance, targetY, 0),
      back: new THREE.Vector3(0, targetY, -distance),
    };
    if (view === 'free') {
      this.camera.position.set(1.7, targetY + 0.18, 2.55);
    } else {
      this.camera.position.copy(positions[view]);
    }
    this.controls.target.set(0, targetY, 0);
    this.controls.update();
  }

  private fitCamera(onlyIfNeeded: boolean) {
    if (onlyIfNeeded && this.camera.position.length() > 1.2) return;
    const targetY = this.currentHeight * 0.52;
    this.camera.position.set(0, targetY + 0.08, 2.85 + Math.max(0, this.currentHeight - 1.7) * 0.75);
    this.controls.target.set(0, targetY, 0);
    this.controls.update();
  }

  private resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private animate = () => {
    if (this.disposed) return;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.frame = requestAnimationFrame(this.animate);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    disposeObject(this.bodyRoot);
    disposeObject(this.measurementRoot);
    this.bodyMaterial.dispose();
    this.accentMaterial.dispose();
    this.measureMaterial.dispose();
    this.renderer.dispose();
  }
}
