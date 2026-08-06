import type { CatalogOption } from '../core';

export const SCENE_FILTERS = [
  { id: "none", label: "Нет" },
  { id: "soft_focus", label: "Soft Focus (мягкий фокус)" },
  { id: "vignette", label: "Vignette (виньетка)" },
  { id: "airbrush", label: "Airbrush (сглаживание кожи)" },
  { id: "high_contrast", label: "High Contrast (высокий контраст)" },
  { id: "sepia", label: "Sepia (сепия)" },
  { id: "faded", label: "Faded (выцветший)" },
  { id: "film_grain", label: "Film Grain (зернистость пленки)" },
  { id: "glow", label: "Glow (свечение)" },
  { id: "pop_art", label: "Pop Art (поп-арт)" },
  { id: "monochrome", label: "Monochrome (монохром)" },
  { id: "inversion", label: "Inversion (инверсия цвета)" },
] as const satisfies readonly CatalogOption[];

export type SceneFilterId = typeof SCENE_FILTERS[number]['id'];
