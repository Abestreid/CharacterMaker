# CharacterBody Engine v4

`src/lib/body3d` is the reusable CharacterMaker body package. `/dev/test3d/` is only its integration/diagnostic UI.

## Runtime

- **OxiHuman**: Rust/WASM parametric mesh and measurement fitter.
- **MakeHuman assets**: base mesh and morph targets packed into `oxihuman-core-v1.ohpk` during CI.
- **CharacterBody layer**: CharacterMaker domain parameters, categorical morph mapping, measurement solver, package serialization and validation.

The OxiHuman source is pinned in CI. The CharacterMaker patch restores the adult female MakeHuman breast macro lattice that stock OxiHuman does not pack: age × muscle × weight × cup size × firmness. The deployed pack is rejected if any of the required 162 macro corners or 16 direct shape targets are missing.

## Public API

```ts
import {
  CharacterBodyEngine,
  createBodyPackage,
  parseBodyPackage,
  serializeBodyPackage,
  type BodyParams,
} from '@/lib/body3d';

const engine = await CharacterBodyEngine.create(canvas, onProgress);
engine.preview(params);
const result = await engine.fit(params);
engine.setView('front');
engine.dispose();

const json = serializeBodyPackage(params);
const restored = parseBodyPackage(json);
```

`preview()` is the low-latency interactive path. `fit()` runs the OxiHuman measurement solver and returns the final measured mesh plus diagnostics.

## Parameter contract

`BodyParams` keeps explicit measurements separate from morphology:

- `height`, `weight`, `bust`, `waist`, `hips`, `bodyFat` are numeric CharacterMaker values.
- `muscleMassId` controls the muscle macro.
- `breastSizeId` controls the real MakeHuman **cupsize** macro.
- `breastFirmnessId` controls the independent MakeHuman **firmness** macro.
- `breastShapeId` uses direct detail morphs for spacing/projection/vertical distribution; it does not redefine cup size or firmness.
- `buttockShapeId` and `buttockFirmnessId` use direct buttock/hip detail morphs.

The bust circumference and cup-size category are intentionally independent. During `fit()`, CharacterBody iterates the fitter chest target after applying cup/firmness so the final mesh remains close to the requested CharacterMaker bust measurement.

## Serialized package

Current schema: `charactermaker.body.v1`  
Current engine version: `4.0.0`

```json
{
  "schema": "charactermaker.body.v1",
  "engine": "CharacterBody",
  "engineVersion": "4.0.0",
  "exportedAt": "2026-08-22T00:00:00.000Z",
  "params": {
    "gender": "female",
    "height": 170,
    "weight": 60,
    "bust": 90,
    "waist": 65,
    "hips": 95,
    "bodyFat": 22,
    "muscleMassId": "toned",
    "breastSizeId": "medium",
    "breastShapeId": "teardrop",
    "breastFirmnessId": "natural",
    "buttockShapeId": "round",
    "buttockFirmnessId": "natural"
  }
}
```

`parseBodyPackage()` validates schema/version, measurement ranges and every categorical ID before the state reaches the engine. Male packages normalize female-only breast morphology to `null`.

## CI invariants

The same validation is used by the diagnostic pack workflow and DEV deployment:

1. pinned OxiHuman source is patched;
2. Rust tests verify cup size and firmness are independent runtime dimensions;
3. MakeHuman upstream assets are fetched;
4. the CharacterBody OHPK is built with the same pack budget;
5. provenance must contain all required macro/detail targets and no explicit-anatomy targets;
6. TypeScript/Vitest checks and Vite build must pass;
7. DEV deploy verifies the remote commit and body-package version over FTP and performs HTTP/browser smoke checks.

This file documents the package boundary. Production CharacterMaker should depend on `src/lib/body3d`, not on implementation details inside `src/test3d`.
