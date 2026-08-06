import type { CatalogOption } from '../core';

export const SHOT_TYPES = [
  { id: "extreme_close_up_eyes", label: "Экстремальный крупный план, только глаза" },
  { id: "close_up_face", label: "Крупный план, лицо" },
  { id: "medium_close_up_bust", label: "По грудь" },
  { id: "medium_shot_waist", label: "По пояс" },
  { id: "medium_long_shot_knees", label: "По колени" },
  { id: "american_shot_ankles", label: "Американский план, по щиколотки" },
  { id: "full_body", label: "В полный рост" },
] as const satisfies readonly CatalogOption[];
export type ShotTypeId = typeof SHOT_TYPES[number]['id'];

export const VERTICAL_CAMERA_ANGLES = [
  { id: "top_down", label: "Сверху над персонажем, вид сверху" },
  { id: "high_angle", label: "Высокий угол, сверху вниз" },
  { id: "eye_level", label: "Уровень глаз, прямо" },
  { id: "low_angle", label: "Низкий угол, снизу вверх" },
  { id: "worms_eye", label: "Снизу под персонажем, червячный ракурс" },
] as const satisfies readonly CatalogOption[];
export type VerticalCameraAngleId = typeof VERTICAL_CAMERA_ANGLES[number]['id'];

export const HORIZONTAL_CAMERA_ANGLES = [
  { id: "left", label: "Слева" },
  { id: "center", label: "По центру" },
  { id: "right", label: "Справа" },
] as const satisfies readonly CatalogOption[];
export type HorizontalCameraAngleId = typeof HORIZONTAL_CAMERA_ANGLES[number]['id'];

export interface AspectRatioOption extends CatalogOption {
  value: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  orientation: 'square' | 'portrait' | 'landscape';
}

export const ASPECT_RATIOS = [
  { id: "square", label: "1:1", value: "1:1", orientation: "square" },
  { id: "portrait_standard", label: "3:4", value: "3:4", orientation: "portrait" },
  { id: "landscape_standard", label: "4:3", value: "4:3", orientation: "landscape" },
  { id: "portrait_wide", label: "9:16", value: "9:16", orientation: "portrait" },
  { id: "landscape_wide", label: "16:9", value: "16:9", orientation: "landscape" },
] as const satisfies readonly AspectRatioOption[];
export type AspectRatioId = typeof ASPECT_RATIOS[number]['id'];
