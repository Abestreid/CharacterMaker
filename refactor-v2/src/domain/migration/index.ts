import {
  ASPECT_RATIOS,
  BACKGROUNDS,
  CHARACTER_ORIENTATIONS,
  EMOTIONS,
  ETHNICITIES,
  EYE_COLORS,
  EYE_SHAPES,
  GENDERS,
  HAIR_COLORS,
  HAIR_LENGTHS,
  HAIRSTYLES,
  HAIR_TYPES,
  HORIZONTAL_CAMERA_ANGLES,
  IMAGE_STYLES,
  MOTIONS,
  POSES,
  SCENE_FILTERS,
  SHOT_TYPES,
  SKIN_TONES,
  VERTICAL_CAMERA_ANGLES,
  getIdByLabel,
} from '../catalog';
import {
  CHARACTER_DEFAULTS,
  SCENE_DEFAULTS,
} from '../defaults';
import type { CharacterState, SceneState } from '../models';

export interface MigrationResult<T> {
  value: T;
  warnings: string[];
}

export interface LegacyCharacterProfile {
  gender?: string;
  age?: number;
  height?: number;
  weight?: number;
  bust?: number;
  waist?: number;
  hips?: number;
  bodyFat?: number;
  ethnicity?: string;
  skinTone?: string;
  eyeColor?: string;
  hairLength?: string;
  hairType?: string;
  hairstyle?: string;
  hairColor?: string;
  eyeShape?: string;
  imageStyle?: string;
}

function mappedOrDefault<T extends string>(
  field: string,
  label: string | undefined,
  options: readonly { id: T; label: string }[],
  fallback: T,
  warnings: string[],
): T {
  if (!label) return fallback;
  const id = getIdByLabel(options, label) as T | null;
  if (id) return id;
  warnings.push(`${field}: не найдено значение "${label}", применено ${fallback}`);
  return fallback;
}

export function migrateCharacterProfile(
  legacy: LegacyCharacterProfile,
): MigrationResult<CharacterState> {
  const warnings: string[] = [];
  const value: CharacterState = structuredClone(CHARACTER_DEFAULTS);

  value.identity.genderId = mappedOrDefault('gender', legacy.gender, GENDERS, value.identity.genderId, warnings);
  value.identity.age = legacy.age ?? value.identity.age;
  value.body.height = legacy.height ?? value.body.height;
  value.body.weight = legacy.weight ?? value.body.weight;
  value.body.bust = legacy.bust ?? value.body.bust;
  value.body.waist = legacy.waist ?? value.body.waist;
  value.body.hips = legacy.hips ?? value.body.hips;
  value.body.bodyFat = legacy.bodyFat ?? value.body.bodyFat;
  value.appearance.ethnicityId = mappedOrDefault('ethnicity', legacy.ethnicity, ETHNICITIES, value.appearance.ethnicityId, warnings);
  value.appearance.skinToneId = mappedOrDefault('skinTone', legacy.skinTone, SKIN_TONES, value.appearance.skinToneId, warnings);
  value.appearance.eyeColorId = mappedOrDefault('eyeColor', legacy.eyeColor, EYE_COLORS, value.appearance.eyeColorId, warnings);
  value.appearance.hair.lengthId = mappedOrDefault('hairLength', legacy.hairLength, HAIR_LENGTHS, value.appearance.hair.lengthId, warnings);
  value.appearance.hair.typeId = mappedOrDefault('hairType', legacy.hairType, HAIR_TYPES, value.appearance.hair.typeId, warnings);
  value.appearance.hair.hairstyleId = mappedOrDefault('hairstyle', legacy.hairstyle, HAIRSTYLES, value.appearance.hair.hairstyleId, warnings);
  value.appearance.hair.colorId = mappedOrDefault('hairColor', legacy.hairColor, HAIR_COLORS, value.appearance.hair.colorId, warnings);
  value.face.eyeShapeId = mappedOrDefault('eyeShape', legacy.eyeShape, EYE_SHAPES, value.face.eyeShapeId, warnings);
  value.appearance.imageStyleId = mappedOrDefault('imageStyle', legacy.imageStyle, IMAGE_STYLES, value.appearance.imageStyleId, warnings);

  return { value, warnings };
}

export interface LegacySceneState {
  pose?: string;
  motion?: string;
  emotion?: string;
  orientation?: string;
  shotType?: string;
  cameraVertical?: string;
  cameraHorizontal?: string;
  aspectRatio?: string;
  background?: string;
  imageStyle?: string;
  filter?: string;
}

export function migrateSceneState(
  legacy: LegacySceneState,
): MigrationResult<SceneState> {
  const warnings: string[] = [];
  const value: SceneState = structuredClone(SCENE_DEFAULTS);

  if (legacy.motion) {
    value.character.mode = 'motion';
    value.character.motionId = mappedOrDefault('motion', legacy.motion, MOTIONS, 'walking_confidently', warnings);
    value.character.poseId = null;
  } else if (legacy.pose) {
    value.character.mode = 'pose';
    value.character.poseId = mappedOrDefault('pose', legacy.pose, POSES, 'standing_neutral', warnings);
    value.character.motionId = null;
  }

  value.character.emotionId = mappedOrDefault('emotion', legacy.emotion, EMOTIONS, value.character.emotionId, warnings);
  value.character.orientationId = mappedOrDefault('orientation', legacy.orientation, CHARACTER_ORIENTATIONS, value.character.orientationId, warnings);
  value.camera.shotTypeId = mappedOrDefault('shotType', legacy.shotType, SHOT_TYPES, value.camera.shotTypeId, warnings);
  value.camera.verticalAngleId = mappedOrDefault('cameraVertical', legacy.cameraVertical, VERTICAL_CAMERA_ANGLES, value.camera.verticalAngleId, warnings);
  value.camera.horizontalAngleId = mappedOrDefault('cameraHorizontal', legacy.cameraHorizontal, HORIZONTAL_CAMERA_ANGLES, value.camera.horizontalAngleId, warnings);
  value.camera.aspectRatioId = mappedOrDefault('aspectRatio', legacy.aspectRatio, ASPECT_RATIOS, value.camera.aspectRatioId, warnings);
  value.environment.backgroundId = mappedOrDefault('background', legacy.background, BACKGROUNDS, value.environment.backgroundId ?? 'professional_white_cyclorama', warnings);
  value.style.imageStyleId = mappedOrDefault('imageStyle', legacy.imageStyle, IMAGE_STYLES, value.style.imageStyleId, warnings);
  value.style.filterId = mappedOrDefault('filter', legacy.filter, SCENE_FILTERS, value.style.filterId, warnings);

  return { value, warnings };
}
