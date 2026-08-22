import { describe, expect, it } from 'vitest';
import type { BodyParams } from './CharacterBodyEngine';
import {
  breastFirmnessToMacro,
  breastSizeToCupsize,
  buildCharacterBodyShapeProfile,
} from './morphProfile';
import {
  CHARACTER_BODY_ENGINE_VERSION,
  CHARACTER_BODY_PACKAGE_SCHEMA,
  createBodyPackage,
  parseBodyPackage,
  serializeBodyPackage,
} from './package';

const FEMALE: BodyParams = {
  gender: 'female',
  height: 170,
  weight: 60,
  bust: 90,
  waist: 65,
  hips: 95,
  bodyFat: 22,
  muscleMassId: 'toned',
  breastSizeId: 'medium',
  breastShapeId: 'teardrop',
  breastFirmnessId: 'natural',
  buttockShapeId: 'round',
  buttockFirmnessId: 'natural',
};

describe('CharacterBody macro mappings', () => {
  it('keeps breast-size categories strictly ordered on the MakeHuman cup axis', () => {
    const values = ['small', 'medium', 'large', 'very_large'].map((id) => breastSizeToCupsize(id as BodyParams['breastSizeId']));
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(new Set(values).size).toBe(values.length);
    expect(values[0]).toBeGreaterThanOrEqual(0);
    expect(values.at(-1)).toBeLessThanOrEqual(1);
  });

  it('keeps firmness independent and strictly ordered', () => {
    const values = ['soft', 'natural', 'firm', 'lifted'].map((id) => breastFirmnessToMacro(id as BodyParams['breastFirmnessId']));
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(new Set(values).size).toBe(values.length);
  });

  it('does not let a breast shape silently redefine cup size or firmness', () => {
    const round = buildCharacterBodyShapeProfile({ ...FEMALE, breastShapeId: 'round' });
    const ptotic = buildCharacterBodyShapeProfile({ ...FEMALE, breastShapeId: 'ptotic' });
    expect(round.cupsize).toBe(ptotic.cupsize);
    expect(round.breastFirmness).toBe(ptotic.breastFirmness);
    expect(round.breastVertical).not.toBe(ptotic.breastVertical);
  });

  it('clamps all direct detail axes to the OxiHuman 0..1 signed-pair envelope', () => {
    const profile = buildCharacterBodyShapeProfile({
      ...FEMALE,
      breastShapeId: 'wide_set',
      breastFirmnessId: 'lifted',
      buttockShapeId: 'square',
      buttockFirmnessId: 'toned',
    });
    for (const [key, value] of Object.entries(profile)) {
      if (key === 'cupsize' || key === 'breastFirmness') {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      } else {
        expect(value).toBeGreaterThanOrEqual(-1);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('CharacterBody package', () => {
  it('round-trips a versioned body package without losing state', () => {
    const exportedAt = '2026-08-22T00:00:00.000Z';
    const pkg = createBodyPackage(FEMALE, exportedAt);
    expect(pkg.schema).toBe(CHARACTER_BODY_PACKAGE_SCHEMA);
    expect(pkg.engineVersion).toBe(CHARACTER_BODY_ENGINE_VERSION);
    expect(parseBodyPackage(JSON.stringify(pkg))).toEqual(pkg);
    expect(parseBodyPackage(serializeBodyPackage(FEMALE)).params).toEqual(FEMALE);
  });

  it('rejects unsupported schema/version and out-of-range measurements', () => {
    const pkg = createBodyPackage(FEMALE, '2026-08-22T00:00:00.000Z');
    expect(() => parseBodyPackage({ ...pkg, schema: 'charactermaker.body.v0' })).toThrow(/schema/i);
    expect(() => parseBodyPackage({ ...pkg, engineVersion: '3.1.0' })).toThrow(/version/i);
    expect(() => parseBodyPackage({ ...pkg, params: { ...pkg.params, waist: 10 } })).toThrow(/waist/i);
  });

  it('normalizes stale breast morphology out of a male package', () => {
    const pkg = createBodyPackage({ ...FEMALE, gender: 'male' });
    expect(pkg.params.breastSizeId).toBeNull();
    expect(pkg.params.breastShapeId).toBeNull();
    expect(pkg.params.breastFirmnessId).toBeNull();
  });
});
