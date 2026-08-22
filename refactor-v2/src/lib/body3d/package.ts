import {
  BREAST_FIRMNESS_OPTIONS,
  BREAST_SHAPES,
  BREAST_SIZE_OPTIONS,
  BUTTOCK_FIRMNESS_OPTIONS,
  BUTTOCK_SHAPES,
  CHARACTER_MEASUREMENTS,
  MUSCLE_MASS_OPTIONS,
} from '../../domain/catalog/character/body';
import type { BodyParams } from './CharacterBodyEngine';

export const CHARACTER_BODY_PACKAGE_SCHEMA = 'charactermaker.body.v1' as const;
export const CHARACTER_BODY_ENGINE_VERSION = '4.0.0' as const;

export type CharacterBodyPackage = {
  schema: typeof CHARACTER_BODY_PACKAGE_SCHEMA;
  engine: 'CharacterBody';
  engineVersion: typeof CHARACTER_BODY_ENGINE_VERSION;
  exportedAt: string;
  params: BodyParams;
};

const optionIds = <T extends readonly { id: string }[]>(options: T) => new Set(options.map((item) => item.id));
const muscleIds = optionIds(MUSCLE_MASS_OPTIONS);
const breastSizeIds = optionIds(BREAST_SIZE_OPTIONS);
const breastShapeIds = optionIds(BREAST_SHAPES);
const breastFirmnessIds = optionIds(BREAST_FIRMNESS_OPTIONS);
const buttockShapeIds = optionIds(BUTTOCK_SHAPES);
const buttockFirmnessIds = optionIds(BUTTOCK_FIRMNESS_OPTIONS);

function assertRecord(value: unknown, label: string): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function numberInRange(value: unknown, min: number, max: number, label: string) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} must be a finite number in ${min}..${max}`);
  }
  return value;
}

function enumValue(value: unknown, allowed: Set<string>, label: string) {
  if (typeof value !== 'string' || !allowed.has(value)) throw new Error(`${label} has unsupported value`);
  return value;
}

function nullableEnum(value: unknown, allowed: Set<string>, label: string) {
  if (value == null) return null;
  return enumValue(value, allowed, label);
}

export function validateBodyParams(value: unknown): BodyParams {
  assertRecord(value, 'params');
  const gender = value.gender;
  if (gender !== 'female' && gender !== 'male') throw new Error('params.gender must be female or male');

  const params: BodyParams = {
    gender,
    height: numberInRange(value.height, CHARACTER_MEASUREMENTS.height.min, CHARACTER_MEASUREMENTS.height.max, 'height'),
    weight: numberInRange(value.weight, CHARACTER_MEASUREMENTS.weight.min, CHARACTER_MEASUREMENTS.weight.max, 'weight'),
    bust: numberInRange(value.bust, CHARACTER_MEASUREMENTS.bust.min, CHARACTER_MEASUREMENTS.bust.max, 'bust'),
    waist: numberInRange(value.waist, CHARACTER_MEASUREMENTS.waist.min, CHARACTER_MEASUREMENTS.waist.max, 'waist'),
    hips: numberInRange(value.hips, CHARACTER_MEASUREMENTS.hips.min, CHARACTER_MEASUREMENTS.hips.max, 'hips'),
    bodyFat: numberInRange(value.bodyFat, CHARACTER_MEASUREMENTS.bodyFat.min, CHARACTER_MEASUREMENTS.bodyFat.max, 'bodyFat'),
    muscleMassId: enumValue(value.muscleMassId, muscleIds, 'muscleMassId') as BodyParams['muscleMassId'],
    breastSizeId: nullableEnum(value.breastSizeId, breastSizeIds, 'breastSizeId') as BodyParams['breastSizeId'],
    breastShapeId: nullableEnum(value.breastShapeId, breastShapeIds, 'breastShapeId') as BodyParams['breastShapeId'],
    breastFirmnessId: nullableEnum(value.breastFirmnessId, breastFirmnessIds, 'breastFirmnessId') as BodyParams['breastFirmnessId'],
    buttockShapeId: nullableEnum(value.buttockShapeId, buttockShapeIds, 'buttockShapeId') as BodyParams['buttockShapeId'],
    buttockFirmnessId: nullableEnum(value.buttockFirmnessId, buttockFirmnessIds, 'buttockFirmnessId') as BodyParams['buttockFirmnessId'],
  };

  // Male packages cannot accidentally retain stale female-only morphology.
  if (gender === 'male') {
    params.breastSizeId = null;
    params.breastShapeId = null;
    params.breastFirmnessId = null;
  }
  return params;
}

export function createBodyPackage(params: BodyParams, exportedAt = new Date().toISOString()): CharacterBodyPackage {
  return {
    schema: CHARACTER_BODY_PACKAGE_SCHEMA,
    engine: 'CharacterBody',
    engineVersion: CHARACTER_BODY_ENGINE_VERSION,
    exportedAt,
    params: validateBodyParams(params),
  };
}

export function serializeBodyPackage(params: BodyParams) {
  return JSON.stringify(createBodyPackage(params), null, 2);
}

export function parseBodyPackage(input: string | unknown): CharacterBodyPackage {
  const raw = typeof input === 'string' ? JSON.parse(input) as unknown : input;
  assertRecord(raw, 'body package');
  if (raw.schema !== CHARACTER_BODY_PACKAGE_SCHEMA) throw new Error(`Unsupported body package schema: ${String(raw.schema)}`);
  if (raw.engine !== 'CharacterBody') throw new Error(`Unsupported body engine: ${String(raw.engine)}`);
  if (raw.engineVersion !== CHARACTER_BODY_ENGINE_VERSION) {
    throw new Error(`Unsupported CharacterBody version: ${String(raw.engineVersion)}`);
  }
  if (typeof raw.exportedAt !== 'string' || Number.isNaN(Date.parse(raw.exportedAt))) {
    throw new Error('body package exportedAt must be an ISO date');
  }
  return {
    schema: CHARACTER_BODY_PACKAGE_SCHEMA,
    engine: 'CharacterBody',
    engineVersion: CHARACTER_BODY_ENGINE_VERSION,
    exportedAt: raw.exportedAt,
    params: validateBodyParams(raw.params),
  };
}
