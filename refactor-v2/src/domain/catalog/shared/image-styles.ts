import type { CatalogCategory, CatalogOption } from '../core';

export const IMAGE_STYLE_CATEGORIES = [
  { id: "photography", label: "Фотография" },
  { id: "illustration", label: "Иллюстрация" },
  { id: "painting", label: "Живопись" },
  { id: "drawing", label: "Рисунок" },
  { id: "genre", label: "Жанровый стиль" },
  { id: "three_dimensional", label: "3D" },
] as const satisfies readonly CatalogOption[];

export type ImageStyleCategoryId = typeof IMAGE_STYLE_CATEGORIES[number]['id'];

export const IMAGE_STYLES = [
  { id: "hyperrealistic_photo", label: "Гиперреалистичная фотография", categoryId: "photography" },
  { id: "cinematic_portrait_8k", label: "Кинематографический портрет (8K)", categoryId: "photography" },
  { id: "detailed_digital_painting", label: "Цифровая живопись (детальная)", categoryId: "illustration" },
  { id: "airy_fantasy_art", label: "Фэнтези-арт (воздушный)", categoryId: "genre" },
  { id: "shinkai_anime", label: "Аниме (стиль Синкая)", categoryId: "illustration" },
  { id: "cyberpunk_neon_noir", label: "Киберпанк (неоновый нуар)", categoryId: "genre" },
  { id: "steampunk_vintage_technology", label: "Стимпанк (винтажная техника)", categoryId: "genre" },
  { id: "gothic_dark_atmospheric", label: "Готическое искусство (мрачное и атмосферное)", categoryId: "genre" },
  { id: "art_nouveau", label: "Ар-нуво (элегантные линии)", categoryId: "illustration" },
  { id: "game_character_concept_art", label: "Концепт-арт (игровой персонаж)", categoryId: "illustration" },
  { id: "classical_oil_painting", label: "Масляная живопись (классическая)", categoryId: "painting" },
  { id: "soft_vibrant_watercolor", label: "Акварель (мягкая и яркая)", categoryId: "painting" },
  { id: "expressive_charcoal_sketch", label: "Угольный набросок (экспрессивный)", categoryId: "drawing" },
  { id: "octane_3d_render", label: "3D-рендер (качество Octane)", categoryId: "three_dimensional" },
  { id: "vintage_sepia_photo", label: "Винтажная фотография (сепия)", categoryId: "photography" },
  { id: "film_noir_black_white", label: "Фильм-нуар (высококонтрастный ч/б)", categoryId: "photography" },
  { id: "vibrant_comic_art", label: "Яркий комикс-арт", categoryId: "illustration" },
  { id: "minimal_line_art", label: "Минималистичный лайн-арт", categoryId: "drawing" },
] as const satisfies readonly CatalogOption<string, ImageStyleCategoryId>[];

export type ImageStyleId = typeof IMAGE_STYLES[number]['id'];