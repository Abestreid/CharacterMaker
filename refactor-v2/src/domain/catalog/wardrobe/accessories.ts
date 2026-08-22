import type { CatalogCategory, CatalogOption } from '../core';

export const ACCESSORY_CATEGORIES = [
  { id: "eyewear", label: "Очки" },
  { id: "jewelry", label: "Украшения" },
  { id: "headwear", label: "Головные уборы" },
  { id: "neckwear", label: "Шея и ворот" },
  { id: "hands", label: "Руки" },
  { id: "clothing_accessory", label: "Дополнения одежды" },
  { id: "bags", label: "Сумки" },
  { id: "props", label: "Предметы" },
  { id: "fantasy", label: "Фэнтези" },
  { id: "sport", label: "Спорт" },
  { id: "religious", label: "Религиозные предметы" },
] as const satisfies readonly CatalogCategory[];

export type AccessoryCategoryId = typeof ACCESSORY_CATEGORIES[number]['id'];

export const ACCESSORIES = [
  { id: "glasses", label: "Очки", categoryId: "eyewear" },
  { id: "thick_frame_glasses", label: "Очки в толстой оправе", categoryId: "eyewear" },
  { id: "sunglasses", label: "Солнечные очки", categoryId: "eyewear" },
  { id: "futuristic_sunglasses", label: "Футуристичные солнечные очки", categoryId: "eyewear" },
  { id: "necklace", label: "Ожерелье", categoryId: "jewelry" },
  { id: "pearl_necklace", label: "Жемчужное ожерелье", categoryId: "jewelry" },
  { id: "earrings", label: "Серьги", categoryId: "jewelry" },
  { id: "hoop_earrings", label: "Серьги-кольца", categoryId: "jewelry" },
  { id: "watch", label: "Часы", categoryId: "jewelry" },
  { id: "bracelet", label: "Браслет", categoryId: "jewelry" },
  { id: "ring", label: "Кольцо", categoryId: "jewelry" },
  { id: "hat", label: "Шляпа", categoryId: "headwear" },
  { id: "choker", label: "Чокер", categoryId: "neckwear" },
  { id: "piercing", label: "Пирсинг", categoryId: "jewelry" },
  { id: "tie", label: "Галстук", categoryId: "neckwear" },
  { id: "scarf", label: "Шарф", categoryId: "neckwear" },
  { id: "gloves", label: "Перчатки", categoryId: "hands" },
  { id: "belt", label: "Пояс", categoryId: "clothing_accessory" },
  { id: "bag", label: "Сумка", categoryId: "bags" },
  { id: "champagne_glass", label: "Бокал шампанского", categoryId: "props" },
  { id: "wings", label: "Крылья", categoryId: "fantasy" },
  { id: "sword", label: "Меч", categoryId: "fantasy" },
  { id: "dumbbells", label: "Гантели", categoryId: "sport" },
  { id: "wedding_ring", label: "Обручальное кольцо", categoryId: "jewelry" },
  { id: "book", label: "Книга", categoryId: "props" },
  { id: "coffee_cup", label: "Кофейная чашка", categoryId: "props" },
  { id: "gramophone", label: "Граммофон", categoryId: "props" },
  { id: "vinyl_record", label: "Виниловая пластинка", categoryId: "props" },
  { id: "roller_skates", label: "Ролики", categoryId: "props" },
  { id: "mask", label: "Маска", categoryId: "props" },
  { id: "cross", label: "Крест", categoryId: "religious" },
  { id: "candles", label: "Свечи", categoryId: "props" },
  { id: "pom_poms", label: "Помпоны", categoryId: "sport" },
] as const satisfies readonly CatalogOption<string, AccessoryCategoryId>[];

export type AccessoryId = typeof ACCESSORIES[number]['id'];
