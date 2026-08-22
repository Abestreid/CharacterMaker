import type { CatalogOption } from '../core';

export const HEAD_SHAPES = [
  { id: "oval", label: "Овальная" },
  { id: "round", label: "Круглая" },
  { id: "square", label: "Квадратная" },
  { id: "heart", label: "Сердцевидная" },
  { id: "oblong", label: "Продолговатая" },
  { id: "diamond", label: "Ромбовидная" },
] as const satisfies readonly CatalogOption[];
export type HeadShapeId = typeof HEAD_SHAPES[number]['id'];

export const FOREHEAD_SIZES = [
  { id: "low", label: "Низкий" },
  { id: "medium", label: "Средний" },
  { id: "high", label: "Высокий" },
] as const satisfies readonly CatalogOption[];
export type ForeheadSizeId = typeof FOREHEAD_SIZES[number]['id'];

export const EYEBROW_SHAPES = [
  { id: "curved", label: "Изогнутые" },
  { id: "straight", label: "Прямые" },
  { id: "rounded", label: "Округлые" },
  { id: "angled", label: "С изломом" },
  { id: "arched", label: "Дугообразные" },
] as const satisfies readonly CatalogOption[];
export type EyebrowShapeId = typeof EYEBROW_SHAPES[number]['id'];

export const EYEBROW_THICKNESS_OPTIONS = [
  { id: "thin", label: "Тонкие" },
  { id: "medium", label: "Средние" },
  { id: "thick", label: "Густые" },
] as const satisfies readonly CatalogOption[];
export type EyebrowThicknessId = typeof EYEBROW_THICKNESS_OPTIONS[number]['id'];

export const EYE_SHAPES = [
  { id: "almond", label: "Миндалевидные" },
  { id: "round", label: "Круглые" },
  { id: "deep_set", label: "Глубоко посаженные" },
  { id: "monolid", label: "Монолитное веко" },
  { id: "hooded", label: "С нависшим веком" },
  { id: "upturned", label: "Приподнятые уголки" },
  { id: "downturned", label: "Опущенные уголки" },
] as const satisfies readonly CatalogOption[];
export type EyeShapeId = typeof EYE_SHAPES[number]['id'];

export const EYE_SIZES = [
  { id: "small", label: "Маленькие" },
  { id: "medium", label: "Средние" },
  { id: "large", label: "Большие" },
] as const satisfies readonly CatalogOption[];
export type EyeSizeId = typeof EYE_SIZES[number]['id'];

export const EYE_SPACING_OPTIONS = [
  { id: "close_set", label: "Близко посаженные" },
  { id: "medium", label: "Среднее расстояние" },
  { id: "wide_set", label: "Широко посаженные" },
] as const satisfies readonly CatalogOption[];
export type EyeSpacingId = typeof EYE_SPACING_OPTIONS[number]['id'];

export const NOSE_SHAPES = [
  { id: "straight", label: "Прямой" },
  { id: "roman", label: "Римский" },
  { id: "upturned", label: "Курносый" },
  { id: "button", label: "Нос-кнопка" },
  { id: "aquiline", label: "Орлиный" },
  { id: "wide", label: "Широкий" },
] as const satisfies readonly CatalogOption[];
export type NoseShapeId = typeof NOSE_SHAPES[number]['id'];

export const NOSE_SIZES = [
  { id: "small", label: "Маленький" },
  { id: "medium", label: "Средний" },
  { id: "large", label: "Большой" },
] as const satisfies readonly CatalogOption[];
export type NoseSizeId = typeof NOSE_SIZES[number]['id'];

export const LIP_SHAPES = [
  { id: "full", label: "Полные" },
  { id: "thin", label: "Тонкие" },
  { id: "heart", label: "В форме сердца" },
  { id: "defined_cupids_bow", label: "С четким бантом Купидона" },
  { id: "center_full", label: "Пухлые по центру" },
  { id: "downturned", label: "Опущенные уголки" },
] as const satisfies readonly CatalogOption[];
export type LipShapeId = typeof LIP_SHAPES[number]['id'];

export const CHEEKBONE_TYPES = [
  { id: "high", label: "Высокие скулы" },
  { id: "low", label: "Низкие скулы" },
  { id: "full_cheeks", label: "Полные щеки" },
  { id: "hollow_cheeks", label: "Впалые щеки" },
  { id: "dimples", label: "Ямочки на щеках" },
] as const satisfies readonly CatalogOption[];
export type CheekboneTypeId = typeof CHEEKBONE_TYPES[number]['id'];

export const CHIN_SHAPES = [
  { id: "pointed", label: "Острый" },
  { id: "square", label: "Квадратный" },
  { id: "round", label: "Круглый" },
  { id: "cleft", label: "С ямочкой" },
  { id: "receding", label: "Скошенный" },
] as const satisfies readonly CatalogOption[];
export type ChinShapeId = typeof CHIN_SHAPES[number]['id'];
