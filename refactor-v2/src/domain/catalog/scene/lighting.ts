import type { CatalogOption, NumericParameterDefinition } from '../core';

export const LIGHTING_TYPES = [
  { id: "natural", label: "Естественное" },
  { id: "studio", label: "Студийное" },
] as const satisfies readonly CatalogOption[];
export type LightingTypeId = typeof LIGHTING_TYPES[number]['id'];

export const NATURAL_LIGHT_TIMES = [
  { id: "sunrise", label: "Рассвет" },
  { id: "morning", label: "Утро" },
  { id: "day", label: "День" },
  { id: "evening", label: "Вечер" },
  { id: "sunset", label: "Закат" },
  { id: "night", label: "Ночь" },
] as const satisfies readonly CatalogOption[];
export type NaturalLightTimeId = typeof NATURAL_LIGHT_TIMES[number]['id'];

export const STUDIO_LIGHT_SETUPS = [
  { id: "three_point", label: "Трехточечное освещение (классическая схема)" },
  { id: "rembrandt", label: "Освещение Рембрандта (драматичное, с треугольником света на щеке)" },
  { id: "butterfly", label: "Освещение «Бабочка» (гламурное, тень под носом)" },
  { id: "loop", label: "Петлевое освещение (небольшая тень от носа сбоку)" },
  { id: "split", label: "Разделенное освещение (лицо разделено на свет и тень)" },
  { id: "rim", label: "Контурный свет (подсветка силуэта сзади)" },
  { id: "high_key", label: "Высокий ключ (яркое, воздушное, почти без теней)" },
  { id: "low_key", label: "Низкий ключ (темное, драматичное, высокий контраст)" },
  { id: "large_softbox", label: "Один большой софтбокс (мягкий, рассеянный свет)" },
  { id: "single_hard_light", label: "Жесткий свет от одного источника (четкие, резкие тени)" },
  { id: "ring_light", label: "Кольцевой свет (для бьюти, без теней)" },
] as const satisfies readonly CatalogOption[];
export type StudioLightSetupId = typeof STUDIO_LIGHT_SETUPS[number]['id'];

export const LIGHT_COLORS = [
  { id: "neutral_white", label: "Белый (нейтральный)" },
  { id: "warm_white", label: "Белый (теплый)" },
  { id: "cold_white", label: "Белый (холодный)" },
  { id: "red", label: "Красный" },
  { id: "orange", label: "Оранжевый" },
  { id: "yellow", label: "Желтый" },
  { id: "green", label: "Зеленый" },
  { id: "light_blue", label: "Голубой" },
  { id: "blue", label: "Синий" },
  { id: "purple", label: "Фиолетовый" },
  { id: "pink", label: "Розовый" },
  { id: "none", label: "Нет" },
] as const satisfies readonly CatalogOption[];
export type LightColorId = typeof LIGHT_COLORS[number]['id'];

export const COLOR_TEMPERATURE_PARAMETER = {
  id: 'color_temperature',
  label: 'Цветовая температура',
  min: 2000,
  max: 10000,
  step: 100,
  defaultValue: 5500,
  unit: 'K',
} as const satisfies NumericParameterDefinition;

export function getColorTemperatureLabel(kelvin: number): string {
  if (kelvin < 2500) return 'Очень теплый (свет свечи)';
  if (kelvin < 3500) return 'Теплый (лампа накаливания)';
  if (kelvin < 5000) return 'Слегка теплый (утреннее солнце)';
  if (kelvin < 6000) return 'Нейтральный (дневной свет)';
  if (kelvin < 7500) return 'Холодный (пасмурное небо)';
  return 'Очень холодный (синее небо)';
}
