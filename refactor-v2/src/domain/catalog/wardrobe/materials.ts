import type { CatalogOption } from '../core';

export const CLOTHING_MATERIALS = [
  { id: "regular_fabric", label: "Обычная ткань" },
  { id: "cotton", label: "Хлопок" },
  { id: "denim", label: "Деним (джинса)" },
  { id: "silk", label: "Шелк" },
  { id: "satin", label: "Атлас" },
  { id: "velvet", label: "Бархат" },
  { id: "wool", label: "Шерсть" },
  { id: "knitted", label: "Вязаный" },
  { id: "leather", label: "Кожа" },
  { id: "suede", label: "Замша" },
  { id: "nylon", label: "Нейлон" },
  { id: "lace", label: "Кружево" },
  { id: "transparent", label: "Прозрачная" },
  { id: "sheer", label: "Просвечивающая" },
  { id: "large_mesh", label: "Сетка (крупная)" },
  { id: "fine_mesh", label: "Сетка (мелкая)" },
  { id: "matte", label: "Матовый" },
  { id: "glossy", label: "Глянцевый" },
  { id: "fur", label: "Мех" },
  { id: "latex_vinyl", label: "Латекс / Винил" },
] as const satisfies readonly CatalogOption[];

export type ClothingMaterialId = typeof CLOTHING_MATERIALS[number]['id'];
