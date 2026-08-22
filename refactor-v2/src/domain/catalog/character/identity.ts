import type { CatalogOption } from '../core';

export const GENDERS = [
  { id: "female", label: "Женский" },
  { id: "male", label: "Мужской" },
] as const satisfies readonly CatalogOption[];

export type GenderId = typeof GENDERS[number]['id'];

export const AGE_PARAMETER = {
  id: 'age',
  label: 'Возраст',
  min: 16,
  max: 90,
  step: 1,
  defaultValue: 25,
  unit: 'лет',
} as const;
