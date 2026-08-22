import type { CatalogOption } from '../core';

export const ETHNICITIES = [
  { id: "caucasian", label: "Европеоид" },
  { id: "east_asian", label: "Восточноазиатский" },
  { id: "south_asian", label: "Южноазиатский" },
  { id: "african", label: "Африканский" },
  { id: "hispanic", label: "Испанский" },
  { id: "middle_eastern", label: "Ближневосточный" },
  { id: "native_american", label: "Коренной американец" },
] as const satisfies readonly CatalogOption[];
export type EthnicityId = typeof ETHNICITIES[number]['id'];

export const SKIN_TONES = [
  { id: "pale", label: "Бледная" },
  { id: "fair", label: "Светлая" },
  { id: "tanned", label: "Загорелая" },
  { id: "olive", label: "Оливковая" },
  { id: "dark", label: "Смуглая" },
  { id: "deep_dark", label: "Темная" },
  { id: "ebony", label: "Эбеновая" },
] as const satisfies readonly CatalogOption[];
export type SkinToneId = typeof SKIN_TONES[number]['id'];

export const EYE_COLORS = [
  { id: "blue", label: "Голубые" },
  { id: "green", label: "Зеленые" },
  { id: "blue_green", label: "Голубо-зеленые" },
  { id: "brown", label: "Карие" },
  { id: "hazel", label: "Ореховые" },
  { id: "gray", label: "Серые" },
  { id: "amber", label: "Янтарные" },
  { id: "violet", label: "Фиолетовые" },
] as const satisfies readonly CatalogOption[];
export type EyeColorId = typeof EYE_COLORS[number]['id'];

export const HAIR_LENGTHS = [
  { id: "very_short", label: "Очень короткие" },
  { id: "short", label: "Короткие" },
  { id: "shoulder_length", label: "До плеч" },
  { id: "long", label: "Длинные" },
  { id: "very_long", label: "Очень длинные" },
] as const satisfies readonly CatalogOption[];
export type HairLengthId = typeof HAIR_LENGTHS[number]['id'];

export const HAIR_TYPES = [
  { id: "straight", label: "Прямые" },
  { id: "wavy", label: "Волнистые" },
  { id: "curly", label: "Кудрявые" },
  { id: "coily", label: "Спиральные" },
] as const satisfies readonly CatalogOption[];
export type HairTypeId = typeof HAIR_TYPES[number]['id'];

export const HAIRSTYLES = [
  { id: "loose", label: "Распущенные" },
  { id: "loose_with_bangs", label: "Распущенные с челкой" },
  { id: "ponytail", label: "Конский хвост" },
  { id: "bun", label: "Пучок" },
  { id: "braids", label: "Косы" },
  { id: "bob", label: "Каре" },
  { id: "pixie", label: "Пикси" },
  { id: "mohawk", label: "Ирокез" },
] as const satisfies readonly CatalogOption[];
export type HairstyleId = typeof HAIRSTYLES[number]['id'];

export const HAIR_COLORS = [
  { id: "blonde", label: "Блонд" },
  { id: "light_brown", label: "Светло-русый" },
  { id: "brown", label: "Русый" },
  { id: "dark_brown", label: "Темно-русый" },
  { id: "chestnut", label: "Каштановый" },
  { id: "brunette", label: "Брюнет" },
  { id: "black", label: "Черный" },
  { id: "red", label: "Рыжий" },
  { id: "orange", label: "Оранжевый" },
  { id: "burgundy", label: "Бордовый" },
  { id: "silver", label: "Серебряный" },
  { id: "pastel_pink", label: "Пастельно-розовый" },
  { id: "electric_blue", label: "Электрический синий" },
  { id: "emerald_green", label: "Изумрудно-зеленый" },
] as const satisfies readonly CatalogOption[];
export type HairColorId = typeof HAIR_COLORS[number]['id'];
