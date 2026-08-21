import {
  OxiHumanSceneV3,
  type BodyParams,
  type CameraView,
  type OxiFitResult,
  type OxiLoadProgress,
  type OxiMeasurements,
} from '../../test3d/oxiHumanSceneV3';
import {
  buildCharacterBodyShapeProfile,
  CHARACTER_BODY_MACRO_PARAM_NAMES,
} from './morphProfile';

export type CharacterBodyDiagnostics = {
  cupsize: number;
  breastFirmness: number;
  requestedBustCm: number;
  solverBustCm: number;
  measuredBustCm: number | null;
  bustErrorCm: number | null;
  solverPasses: number;
};

export type CharacterBodyFitResult = OxiFitResult & {
  diagnostics: CharacterBodyDiagnostics;
};

type InternalEngine = {
  set_param: (name: string, value: number) => void;
  get_measurements_json: () => string;
};

type SceneInternals = {
  engine: InternalEngine;
  refreshGeometry: (reframe: boolean) => void;
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function parseMeasurements(json: string): OxiMeasurements {
  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    const read = (...keys: string[]) => {
      for (const key of keys) {
        const value = raw[key];
        if (typeof value === 'number' && Number.isFinite(value)) return value;
      }
      return null;
    };
    return {
      heightCm: read('total_height', 'height_cm', 'height', 'stature_cm', 'stature'),
      chestCm: read('chest_cm', 'chest', 'bust_cm', 'bust'),
      waistCm: read('waist_cm', 'waist'),
      hipCm: read('hip_cm', 'hip', 'hips_cm', 'hips'),
      weightKg: read('weight_kg', 'weightKg', 'mass_kg', 'mass'),
    };
  } catch {
    return { heightCm: null, chestCm: null, waistCm: null, hipCm: null, weightKg: null };
  }
}

/**
 * CharacterMaker Body Engine v4.
 *
 * OxiHuman remains the renderer/measurement runtime. This package adds the
 * missing MakeHuman CC0 cup-size/firmness macro dimensions and a small solver
 * that keeps the requested bust circumference approximately invariant while
 * categorical breast shape changes redistribute volume.
 */
export class CharacterBodyEngine {
  private constructor(private readonly scene: OxiHumanSceneV3) {}

  static async create(
    canvas: HTMLCanvasElement,
    onProgress?: (progress: OxiLoadProgress) => void,
  ) {
    return new CharacterBodyEngine(await OxiHumanSceneV3.create(canvas, onProgress));
  }

  dispose() { this.scene.dispose(); }
  setView(view: CameraView) { this.scene.setView(view); }
  setGridVisible(visible: boolean) { this.scene.setGridVisible(visible); }
  setAutoRotate(enabled: boolean) { this.scene.setAutoRotate(enabled); }
  getVersion() { return this.scene.getVersion(); }
  getSourceVertexCount() { return this.scene.getSourceVertexCount(); }
  getSourceIndexCount() { return this.scene.getSourceIndexCount(); }
  getRenderedIndexCount() { return this.scene.getRenderedIndexCount(); }

  private internals(): SceneInternals {
    // OxiHumanSceneV3 predates the packaged body engine. Keeping this bridge in
    // one module lets /test3d use the new runtime immediately; the next cleanup
    // can move the shared Three.js shell into this package without changing its
    // public API.
    return this.scene as unknown as SceneInternals;
  }

  private neutralLegacyBreast(params: BodyParams): BodyParams {
    if (params.gender !== 'female') return params;
    return {
      ...params,
      breastSizeId: 'medium',
      breastFirmnessId: 'natural',
    };
  }

  private applyCharacterMacros(params: BodyParams, reframe = false) {
    const profile = buildCharacterBodyShapeProfile(params);
    const { engine } = this.internals();
    engine.set_param(
      CHARACTER_BODY_MACRO_PARAM_NAMES.cupsize,
      params.gender === 'female' ? profile.cupsize : 0.5,
    );
    engine.set_param(
      CHARACTER_BODY_MACRO_PARAM_NAMES.breastFirmness,
      params.gender === 'female' ? profile.breastFirmness : 0.5,
    );
    this.internals().refreshGeometry(reframe);
    return profile;
  }

  preview(params: BodyParams) {
    // V3 detail morphs still provide spacing/projection/type. Size and firmness
    // are neutralised there because v4 drives their real MakeHuman macro axes.
    this.scene.preview(this.neutralLegacyBreast(params));
    this.applyCharacterMacros(params, false);
  }

  async fit(params: BodyParams): Promise<CharacterBodyFitResult> {
    const started = performance.now();
    const targetBust = params.bust;
    let solverBust = targetBust;
    let passes = 0;
    let last: OxiFitResult | null = null;
    let measured = parseMeasurements(this.internals().engine.get_measurements_json());

    // Applying cup/firmness after a circumference fit changes the chest tape
    // measure. Iterate on the fitter's internal chest target so the final mesh
    // preserves CharacterMaker's requested bust while retaining breast shape.
    for (let pass = 0; pass < 4; pass += 1) {
      passes = pass + 1;
      this.applyCharacterMacros(params, false);
      const fitParams = this.neutralLegacyBreast({ ...params, bust: solverBust });
      last = await this.scene.fit(fitParams);
      this.applyCharacterMacros(params, true);
      measured = parseMeasurements(this.internals().engine.get_measurements_json());

      if (measured.chestCm == null) break;
      const error = measured.chestCm - targetBust;
      if (Math.abs(error) <= 0.65) break;
      solverBust = clamp(solverBust - error * 0.82, 70, 140);
    }

    if (!last) {
      throw new Error('CharacterBody fit did not produce a result');
    }

    const profile = buildCharacterBodyShapeProfile(params);
    const bustError = measured.chestCm == null ? null : measured.chestCm - targetBust;
    return {
      ...last,
      elapsedMs: performance.now() - started,
      measurements: measured,
      diagnostics: {
        cupsize: profile.cupsize,
        breastFirmness: profile.breastFirmness,
        requestedBustCm: targetBust,
        solverBustCm: solverBust,
        measuredBustCm: measured.chestCm,
        bustErrorCm: bustError,
        solverPasses: passes,
      },
    };
  }
}

export type { BodyParams, CameraView, OxiLoadProgress };
