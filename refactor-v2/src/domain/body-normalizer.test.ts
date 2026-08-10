import { describe, expect, it } from 'vitest';
import type { CharacterState } from './models';
import { normalizeBody } from './body-normalizer';

function character(body: Partial<CharacterState['body']>): CharacterState {
  return {
    identity: { genderId: 'female', age: 30 },
    body: {
      height: 170,
      weight: 65,
      bust: 100,
      waist: 60,
      hips: 108,
      bodyFat: 24,
      muscleMassId: 'toned',
      breastSizeId: null,
      breastShapeId: 'round',
      breastFirmnessId: 'firm',
      buttockShapeId: 'round',
      buttockFirmnessId: 'firm',
      ...body,
    },
    appearance: {
      ethnicityId: 'caucasian',
      skinToneId: 'fair',
      skinDetails: '',
      eyeColorId: 'brown',
      hair: { lengthId: 'long', typeId: 'wavy', hairstyleId: 'loose', colorId: 'brunette', details: '' },
      imageStyleId: 'photorealistic',
    },
    face: {
      headShapeId: 'oval', foreheadSizeId: 'medium', eyebrowShapeId: 'curved', eyebrowThicknessId: 'medium',
      eyeShapeId: 'almond', eyeSizeId: 'medium', eyeSpacingId: 'medium', noseShapeId: 'straight', noseSizeId: 'medium',
      lipShapeId: 'full', cheekboneTypeId: 'high', chinShapeId: 'pointed',
    },
    makeup: { enabled: false, eyelinerStyleId: null, eyeshadowColorId: null, lipstickColorId: null, details: '' },
    tattoos: { enabled: false, description: '' },
    permanentFeatures: '',
  } as CharacterState;
}

describe('normalizeBody', () => {
  it('calculates the agreed body ratios for a 170 cm 100-60-108 persona', () => {
    const dna = normalizeBody(character({ height: 170, bust: 100, waist: 60, hips: 108 }));

    expect(dna.ratios.bustToHeight).toBeCloseTo(100 / 170, 3);
    expect(dna.ratios.waistToHeight).toBeCloseTo(60 / 170, 3);
    expect(dna.ratios.hipsToHeight).toBeCloseTo(108 / 170, 3);
    expect(dna.ratios.bustToWaist).toBeCloseTo(100 / 60, 3);
    expect(dna.ratios.hipsToWaist).toBeCloseTo(108 / 60, 3);
    expect(dna.ratios.bustToHips).toBeCloseTo(100 / 108, 3);
    expect(dna.ratios.waistContrast).toBeCloseTo(1 - 60 / 104, 3);
    expect(dna.semantics.waistDefinition).toBe('extreme');
    expect(dna.semantics.upperLowerBalance).toBe('slightly_lower_dominant');
  });

  it('keeps geometric ratios almost identical when the whole body is scaled with height', () => {
    const short = normalizeBody(character({ height: 160, weight: 58, bust: 90, waist: 60, hips: 90 }));
    const tall = normalizeBody(character({ height: 180, weight: 73.4, bust: 101.25, waist: 67.5, hips: 101.25 }));

    expect(tall.ratios.bustToHeight).toBeCloseTo(short.ratios.bustToHeight, 3);
    expect(tall.ratios.waistToHeight).toBeCloseTo(short.ratios.waistToHeight, 3);
    expect(tall.ratios.hipsToHeight).toBeCloseTo(short.ratios.hipsToHeight, 3);
    expect(tall.ratios.bustToWaist).toBeCloseTo(short.ratios.bustToWaist, 3);
    expect(tall.ratios.hipsToWaist).toBeCloseTo(short.ratios.hipsToWaist, 3);
    expect(tall.ratios.bustToHips).toBeCloseTo(short.ratios.bustToHips, 3);
    expect(tall.ratios.waistContrast).toBeCloseTo(short.ratios.waistContrast, 3);
    expect(tall.semantics.shape).toBe(short.semantics.shape);
  });

  it('separates identical measurements with different mass composition', () => {
    const leanMuscular = normalizeBody(character({ weight: 80, bodyFat: 15, muscleMassId: 'muscular' }));
    const softHighFat = normalizeBody(character({ weight: 80, bodyFat: 35, muscleMassId: 'soft' }));

    expect(leanMuscular.ratios).toEqual(softHighFat.ratios);
    expect(leanMuscular.composition.ffmi).toBeGreaterThan(softHighFat.composition.ffmi);
    expect(leanMuscular.composition.muscularityScore).toBeGreaterThan(softHighFat.composition.muscularityScore);
    expect(softHighFat.composition.softnessScore).toBeGreaterThan(leanMuscular.composition.softnessScore);
  });
});
