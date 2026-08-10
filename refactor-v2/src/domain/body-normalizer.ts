import type { CharacterState } from './models';

export type BodyShapeId = 'hourglass' | 'pear' | 'inverted_triangle' | 'rectangle' | 'oval';
export type BodyLevel = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
export type WaistLevel = 'minimal' | 'subtle' | 'moderate' | 'pronounced' | 'very_pronounced' | 'extreme';

export interface BodyDNA {
  version: 'body-dna-1.0';
  raw: {
    heightCm: number;
    weightKg: number;
    bustCm: number;
    waistCm: number;
    hipsCm: number;
    bodyFatPercent: number;
    muscleMassId: CharacterState['body']['muscleMassId'];
    breastShapeId: CharacterState['body']['breastShapeId'];
    breastFirmnessId: CharacterState['body']['breastFirmnessId'];
    buttockShapeId: CharacterState['body']['buttockShapeId'];
    buttockFirmnessId: CharacterState['body']['buttockFirmnessId'];
  };
  ratios: {
    bustToHeight: number;
    waistToHeight: number;
    hipsToHeight: number;
    bustToWaist: number;
    hipsToWaist: number;
    waistToBust: number;
    waistToHips: number;
    bustToHips: number;
    hipsToBust: number;
    waistToOuterBody: number;
    waistContrast: number;
    upperLowerDelta: number;
    circumferenceScale: number;
  };
  composition: {
    bmi: number;
    fatMassKg: number;
    leanMassKg: number;
    fmi: number;
    ffmi: number;
    musclePrior: number;
    softnessScore: number;
    muscularityScore: number;
  };
  semantics: {
    shape: BodyShapeId;
    waistDefinition: WaistLevel;
    bustRelativeScale: BodyLevel;
    waistRelativeScale: BodyLevel;
    hipsRelativeScale: BodyLevel;
    overallMass: BodyLevel;
    softTissue: BodyLevel;
    muscularity: BodyLevel;
    upperLowerBalance: 'upper_dominant' | 'slightly_upper_dominant' | 'balanced' | 'slightly_lower_dominant' | 'lower_dominant';
    centrality: BodyLevel;
    peripheralContrast: BodyLevel;
  };
}

const round = (value: number, digits = 3) => Number(value.toFixed(digits));
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function level01(value: number): BodyLevel {
  if (value < 0.2) return 'very_low';
  if (value < 0.4) return 'low';
  if (value < 0.6) return 'moderate';
  if (value < 0.8) return 'high';
  return 'very_high';
}

function ratioLevel(value: number, low: number, high: number): BodyLevel {
  return level01(clamp01((value - low) / (high - low)));
}

function waistLevel(value: number): WaistLevel {
  if (value < 0.10) return 'minimal';
  if (value < 0.17) return 'subtle';
  if (value < 0.24) return 'moderate';
  if (value < 0.31) return 'pronounced';
  if (value < 0.38) return 'very_pronounced';
  return 'extreme';
}

function shapeFromRatios(waistContrast: number, upperLowerDelta: number, waistToHeight: number): BodyShapeId {
  if (waistToHeight >= 0.52 && waistContrast < 0.16) return 'oval';
  if (upperLowerDelta <= -0.10) return 'pear';
  if (upperLowerDelta >= 0.10) return 'inverted_triangle';
  if (waistContrast >= 0.24) return 'hourglass';
  return 'rectangle';
}

function balanceFromDelta(delta: number): BodyDNA['semantics']['upperLowerBalance'] {
  if (delta >= 0.16) return 'upper_dominant';
  if (delta >= 0.06) return 'slightly_upper_dominant';
  if (delta <= -0.16) return 'lower_dominant';
  if (delta <= -0.06) return 'slightly_lower_dominant';
  return 'balanced';
}

function musclePrior(id: CharacterState['body']['muscleMassId']): number {
  switch (id) {
    case 'soft': return 0.15;
    case 'toned': return 0.40;
    case 'athletic': return 0.70;
    case 'muscular': return 1.00;
    default: return 0.40;
  }
}

export function normalizeBody(character: CharacterState): BodyDNA {
  const { height, weight, bust, waist, hips, bodyFat, muscleMassId, breastShapeId, breastFirmnessId, buttockShapeId, buttockFirmnessId } = character.body;
  const heightM = height / 100;

  const bustToHeight = bust / height;
  const waistToHeight = waist / height;
  const hipsToHeight = hips / height;
  const bustToWaist = bust / waist;
  const hipsToWaist = hips / waist;
  const waistToBust = waist / bust;
  const waistToHips = waist / hips;
  const bustToHips = bust / hips;
  const hipsToBust = hips / bust;
  const outerBodyAverage = (bust + hips) / 2;
  const waistToOuterBody = waist / outerBodyAverage;
  const waistContrast = 1 - waistToOuterBody;
  const upperLowerDelta = (bust - hips) / outerBodyAverage;
  const circumferenceScale = (bustToHeight + waistToHeight + hipsToHeight) / 3;

  const bmi = weight / (heightM * heightM);
  const fatMassKg = weight * (bodyFat / 100);
  const leanMassKg = weight - fatMassKg;
  const fmi = fatMassKg / (heightM * heightM);
  const ffmi = leanMassKg / (heightM * heightM);
  const muscle = musclePrior(muscleMassId);

  // Generator-oriented scores. Body-fat and explicit muscle class are separate axes.
  const softnessScore = clamp01((bodyFat - 8) / 37);
  const normalizedFfmi = clamp01((ffmi - 14) / 12);
  const muscularityScore = clamp01(0.6 * muscle + 0.4 * normalizedFfmi);

  return {
    version: 'body-dna-1.0',
    raw: {
      heightCm: height,
      weightKg: weight,
      bustCm: bust,
      waistCm: waist,
      hipsCm: hips,
      bodyFatPercent: bodyFat,
      muscleMassId,
      breastShapeId,
      breastFirmnessId,
      buttockShapeId,
      buttockFirmnessId,
    },
    ratios: {
      bustToHeight: round(bustToHeight),
      waistToHeight: round(waistToHeight),
      hipsToHeight: round(hipsToHeight),
      bustToWaist: round(bustToWaist),
      hipsToWaist: round(hipsToWaist),
      waistToBust: round(waistToBust),
      waistToHips: round(waistToHips),
      bustToHips: round(bustToHips),
      hipsToBust: round(hipsToBust),
      waistToOuterBody: round(waistToOuterBody),
      waistContrast: round(waistContrast),
      upperLowerDelta: round(upperLowerDelta),
      circumferenceScale: round(circumferenceScale),
    },
    composition: {
      bmi: round(bmi, 2),
      fatMassKg: round(fatMassKg, 2),
      leanMassKg: round(leanMassKg, 2),
      fmi: round(fmi, 2),
      ffmi: round(ffmi, 2),
      musclePrior: round(muscle, 2),
      softnessScore: round(softnessScore, 2),
      muscularityScore: round(muscularityScore, 2),
    },
    semantics: {
      shape: shapeFromRatios(waistContrast, upperLowerDelta, waistToHeight),
      waistDefinition: waistLevel(waistContrast),
      bustRelativeScale: ratioLevel(bustToHeight, 0.42, 0.72),
      waistRelativeScale: ratioLevel(waistToHeight, 0.30, 0.62),
      hipsRelativeScale: ratioLevel(hipsToHeight, 0.42, 0.76),
      overallMass: ratioLevel(bmi, 17, 34),
      softTissue: level01(softnessScore),
      muscularity: level01(muscularityScore),
      upperLowerBalance: balanceFromDelta(upperLowerDelta),
      centrality: ratioLevel(waistToOuterBody, 0.55, 0.95),
      peripheralContrast: level01(clamp01(waistContrast / 0.45)),
    },
  };
}

export function bodyDnaPromptLines(character: CharacterState): string[] {
  const dna = normalizeBody(character);
  const r = dna.ratios;
  const c = dna.composition;
  const s = dna.semantics;

  return [
    `BODY_DNA_VERSION: ${dna.version}`,
    `RELATIVE_TO_HEIGHT: bust=${r.bustToHeight}, waist=${r.waistToHeight}, hips=${r.hipsToHeight}`,
    `SILHOUETTE_RATIOS: bust_to_waist=${r.bustToWaist}, hips_to_waist=${r.hipsToWaist}, bust_to_hips=${r.bustToHips}`,
    `INVERSE_RATIOS: waist_to_bust=${r.waistToBust}, waist_to_hips=${r.waistToHips}, hips_to_bust=${r.hipsToBust}`,
    `WAIST_GEOMETRY: waist_to_outer_body=${r.waistToOuterBody}, waist_contrast=${r.waistContrast}`,
    `UPPER_LOWER_GEOMETRY: delta=${r.upperLowerDelta}, balance=${s.upperLowerBalance}`,
    `BODY_SCALE: circumference_scale=${r.circumferenceScale}, overall_mass=${s.overallMass}`,
    `BODY_COMPOSITION: bmi=${c.bmi}, fat_mass_kg=${c.fatMassKg}, lean_mass_kg=${c.leanMassKg}, fmi=${c.fmi}, ffmi=${c.ffmi}`,
    `BODY_SEMANTICS: shape=${s.shape}, waist=${s.waistDefinition}, bust_relative=${s.bustRelativeScale}, waist_relative=${s.waistRelativeScale}, hips_relative=${s.hipsRelativeScale}, soft_tissue=${s.softTissue}, muscularity=${s.muscularity}`,
    'INTERPRETATION_RULE: preserve these relative proportions. Do not infer breast or hip size from raw centimeters alone; use height-normalized and waist/bust/hip ratios as the primary geometry. Weight and body-fat describe total mass/composition, not a reason to overwrite the stated circumferences.',
  ];
}
