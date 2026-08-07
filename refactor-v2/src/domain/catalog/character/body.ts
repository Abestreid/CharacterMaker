import type { CatalogOption, NumericParameterDefinition } from '../core';

export const CHARACTER_MEASUREMENTS = {
  height: { id: 'height', label: 'Рост', min: 140, max: 220, step: 1, defaultValue: 170, unit: 'см' },
  weight: { id: 'weight', label: 'Вес', min: 40, max: 150, step: 1, defaultValue: 60, unit: 'кг' },
  bust: { id: 'bust', label: 'Обхват груди', min: 70, max: 140, step: 1, defaultValue: 90, unit: 'см' },
  waist: { id: 'waist', label: 'Обхват талии', min: 50, max: 120, step: 1, defaultValue: 65, unit: 'см' },
  hips: { id: 'hips', label: 'Обхват бедер', min: 70, max: 140, step: 1, defaultValue: 95, unit: 'см' },
  bodyFat: { id: 'body_fat', label: 'Процент жира', min: 8, max: 45, step: 1, defaultValue: 22, unit: '%' },
} as const satisfies Record<string, NumericParameterDefinition>;

export const MUSCLE_MASS_OPTIONS = [
  { id: 'soft', label: 'Мягкая' },
  { id: 'toned', label: 'Тонизированная' },
  { id: 'athletic', label: 'Атлетическая' },
  { id: 'muscular', label: 'Мускулистая' },
] as const satisfies readonly CatalogOption[];
export type MuscleMassId = typeof MUSCLE_MASS_OPTIONS[number]['id'];

export const BREAST_SIZE_OPTIONS = [
  { id: 'small', label: 'Маленькая' },
  { id: 'medium', label: 'Средняя' },
  { id: 'large', label: 'Большая' },
  { id: 'very_large', label: 'Очень крупная' },
] as const satisfies readonly CatalogOption[];
export type BreastSizeId = typeof BREAST_SIZE_OPTIONS[number]['id'];

export const BREAST_SHAPES = [
  { id: 'round', label: 'Круглая' },
  { id: 'teardrop', label: 'Каплевидная' },
  { id: 'east_west', label: 'Восточная (восток-запад)' },
  { id: 'bell', label: 'Колокольчик' },
  { id: 'conical', label: 'Конусообразная' },
  { id: 'athletic', label: 'Атлетическая' },
  { id: 'slender', label: 'Стройная' },
  { id: 'asymmetrical', label: 'Асимметричная' },
  { id: 'ptotic', label: 'Опущенная (птоз)' },
  { id: 'wide_set', label: 'Широко посаженная' },
  { id: 'close_set', label: 'Близко посаженная' },
] as const satisfies readonly CatalogOption[];
export type BreastShapeId = typeof BREAST_SHAPES[number]['id'];

export const BREAST_FIRMNESS_OPTIONS = [
  { id: 'soft', label: 'Мягкая' },
  { id: 'natural', label: 'Естественная' },
  { id: 'firm', label: 'Упругая' },
  { id: 'lifted', label: 'Подтянутая' },
] as const satisfies readonly CatalogOption[];
export type BreastFirmnessId = typeof BREAST_FIRMNESS_OPTIONS[number]['id'];

export const BUTTOCK_SHAPES = [
  { id: 'a_shape', label: 'А-образная (сердечко)' },
  { id: 'v_shape', label: 'V-образная (треугольник)' },
  { id: 'round', label: 'Круглая' },
  { id: 'square', label: 'Квадратная' },
] as const satisfies readonly CatalogOption[];
export type ButtockShapeId = typeof BUTTOCK_SHAPES[number]['id'];

export const BUTTOCK_FIRMNESS_OPTIONS = [
  { id: 'soft', label: 'Мягкая' },
  { id: 'natural', label: 'Естественная' },
  { id: 'firm', label: 'Упругая' },
  { id: 'toned', label: 'Тонизированная' },
] as const satisfies readonly CatalogOption[];
export type ButtockFirmnessId = typeof BUTTOCK_FIRMNESS_OPTIONS[number]['id'];
