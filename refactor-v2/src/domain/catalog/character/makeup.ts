import type { CatalogOption } from '../core';

export const EYELINER_STYLES = [
  { id: "none", label: "Нет" },
  { id: "thin", label: "Тонкая" },
  { id: "winged", label: "Крылатая" },
  { id: "cat_eye", label: "Кошачий глаз" },
  { id: "smoky", label: "Дымчатая" },
] as const satisfies readonly CatalogOption[];
export type EyelinerStyleId = typeof EYELINER_STYLES[number]['id'];

export const EYESHADOW_COLORS = [
  { id: "none", label: "Нет" },
  { id: "neutral_brown", label: "Нейтральный коричневый" },
  { id: "smoky_black", label: "Дымчатый черный" },
  { id: "shimmering_gold", label: "Мерцающее золото" },
  { id: "rose_champagne", label: "Розовое шампанское" },
  { id: "plum_violet", label: "Сливовый фиолетовый" },
] as const satisfies readonly CatalogOption[];
export type EyeshadowColorId = typeof EYESHADOW_COLORS[number]['id'];

export const LIPSTICK_COLORS = [
  { id: "none", label: "Нет" },
  { id: "natural", label: "Натуральный" },
  { id: "glossy_pink", label: "Глянцевый розовый" },
  { id: "classic_red", label: "Классический красный" },
  { id: "deep_berry", label: "Глубокий ягодный" },
  { id: "matte_nude", label: "Матовый нюд" },
] as const satisfies readonly CatalogOption[];
export type LipstickColorId = typeof LIPSTICK_COLORS[number]['id'];
