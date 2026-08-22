import {
  ACCESSORIES,
  ASPECT_RATIOS,
  BACKGROUNDS,
  BASE_LAYER_TYPES,
  BOTTOM_TYPES,
  BREAST_FIRMNESS_OPTIONS,
  BREAST_SHAPES,
  BREAST_SIZE_OPTIONS,
  BUTTOCK_FIRMNESS_OPTIONS,
  BUTTOCK_SHAPES,
  CHARACTER_ORIENTATIONS,
  CHEEKBONE_TYPES,
  CHIN_SHAPES,
  CLOTHING_COLORS,
  CLOTHING_MATERIALS,
  EMOTIONS,
  ETHNICITIES,
  EYE_COLORS,
  EYEBROW_SHAPES,
  EYEBROW_THICKNESS_OPTIONS,
  EYELINER_STYLES,
  EYESHADOW_COLORS,
  EYE_SHAPES,
  EYE_SIZES,
  EYE_SPACING_OPTIONS,
  FOOTWEAR_TYPES,
  FOREHEAD_SIZES,
  GENDERS,
  HAIRSTYLES,
  HAIR_COLORS,
  HAIR_LENGTHS,
  HAIR_TYPES,
  HEAD_SHAPES,
  HORIZONTAL_CAMERA_ANGLES,
  IMAGE_STYLES,
  LIGHTING_TYPES,
  LIGHT_COLORS,
  LIPSTICK_COLORS,
  LIP_SHAPES,
  MOTIONS,
  MUSCLE_MASS_OPTIONS,
  NATURAL_LIGHT_TIMES,
  NOSE_SHAPES,
  NOSE_SIZES,
  OUTERWEAR_TYPES,
  POSES,
  SCENE_FILTERS,
  SHOT_TYPES,
  SKIN_TONES,
  STUDIO_LIGHT_SETUPS,
  TOP_TYPES,
  VERTICAL_CAMERA_ANGLES,
} from '../catalog';
import type { CharacterState, SceneState, WardrobeState } from '../models';
import { hasOption } from './catalog.validator';

export function validateCharacterState(state: CharacterState): void {
  const checks: Array<[string, boolean]> = [
    ['identity.genderId', hasOption(GENDERS, state.identity.genderId)],
    ['body.muscleMassId', hasOption(MUSCLE_MASS_OPTIONS, state.body.muscleMassId)],
    ['body.breastSizeId', hasOption(BREAST_SIZE_OPTIONS, state.body.breastSizeId)],
    ['body.breastShapeId', hasOption(BREAST_SHAPES, state.body.breastShapeId)],
    ['body.breastFirmnessId', hasOption(BREAST_FIRMNESS_OPTIONS, state.body.breastFirmnessId)],
    ['body.buttockShapeId', hasOption(BUTTOCK_SHAPES, state.body.buttockShapeId)],
    ['body.buttockFirmnessId', hasOption(BUTTOCK_FIRMNESS_OPTIONS, state.body.buttockFirmnessId)],
    ['appearance.ethnicityId', hasOption(ETHNICITIES, state.appearance.ethnicityId)],
    ['appearance.skinToneId', hasOption(SKIN_TONES, state.appearance.skinToneId)],
    ['appearance.eyeColorId', hasOption(EYE_COLORS, state.appearance.eyeColorId)],
    ['appearance.hair.lengthId', hasOption(HAIR_LENGTHS, state.appearance.hair.lengthId)],
    ['appearance.hair.typeId', hasOption(HAIR_TYPES, state.appearance.hair.typeId)],
    ['appearance.hair.hairstyleId', hasOption(HAIRSTYLES, state.appearance.hair.hairstyleId)],
    ['appearance.hair.colorId', hasOption(HAIR_COLORS, state.appearance.hair.colorId)],
    ['appearance.imageStyleId', hasOption(IMAGE_STYLES, state.appearance.imageStyleId)],
    ['face.headShapeId', hasOption(HEAD_SHAPES, state.face.headShapeId)],
    ['face.foreheadSizeId', hasOption(FOREHEAD_SIZES, state.face.foreheadSizeId)],
    ['face.eyebrowShapeId', hasOption(EYEBROW_SHAPES, state.face.eyebrowShapeId)],
    ['face.eyebrowThicknessId', hasOption(EYEBROW_THICKNESS_OPTIONS, state.face.eyebrowThicknessId)],
    ['face.eyeShapeId', hasOption(EYE_SHAPES, state.face.eyeShapeId)],
    ['face.eyeSizeId', hasOption(EYE_SIZES, state.face.eyeSizeId)],
    ['face.eyeSpacingId', hasOption(EYE_SPACING_OPTIONS, state.face.eyeSpacingId)],
    ['face.noseShapeId', hasOption(NOSE_SHAPES, state.face.noseShapeId)],
    ['face.noseSizeId', hasOption(NOSE_SIZES, state.face.noseSizeId)],
    ['face.lipShapeId', hasOption(LIP_SHAPES, state.face.lipShapeId)],
    ['face.cheekboneTypeId', hasOption(CHEEKBONE_TYPES, state.face.cheekboneTypeId)],
    ['face.chinShapeId', hasOption(CHIN_SHAPES, state.face.chinShapeId)],
    ['makeup.eyelinerStyleId', hasOption(EYELINER_STYLES, state.makeup.eyelinerStyleId)],
    ['makeup.eyeshadowColorId', hasOption(EYESHADOW_COLORS, state.makeup.eyeshadowColorId)],
    ['makeup.lipstickColorId', hasOption(LIPSTICK_COLORS, state.makeup.lipstickColorId)],
  ];
  const invalid = checks.filter(([, ok]) => !ok).map(([field]) => field);
  if (invalid.length) throw new Error(`Некорректные поля CharacterState: ${invalid.join(', ')}`);
}

function validateLayer(
  name: string,
  typeOptions: readonly { id: string }[],
  layer: { typeId: string; colorId: string | null; materialId: string | null },
): void {
  if (!typeOptions.some((option) => option.id === layer.typeId)) throw new Error(`${name}.typeId`);
  if (!hasOption(CLOTHING_COLORS, layer.colorId)) throw new Error(`${name}.colorId`);
  if (!hasOption(CLOTHING_MATERIALS, layer.materialId)) throw new Error(`${name}.materialId`);
  if (layer.typeId === 'none' && (layer.colorId !== null || layer.materialId !== null)) {
    throw new Error(`${name}: для none цвет и материал должны быть null`);
  }
}

export function validateWardrobeState(state: WardrobeState): void {
  validateLayer('baseLayer', BASE_LAYER_TYPES, state.baseLayer);
  validateLayer('top', TOP_TYPES, state.top);
  validateLayer('bottom', BOTTOM_TYPES, state.bottom);
  validateLayer('outerwear', OUTERWEAR_TYPES, state.outerwear);
  validateLayer('footwear', FOOTWEAR_TYPES, state.footwear);
  for (const id of state.accessoryIds) {
    if (!ACCESSORIES.some((option) => option.id === id)) throw new Error(`accessoryIds: ${id}`);
  }
}

export function validateSceneState(state: SceneState): void {
  const checks: Array<[string, boolean]> = [
    ['character.poseId', hasOption(POSES, state.character.poseId)],
    ['character.motionId', hasOption(MOTIONS, state.character.motionId)],
    ['character.emotionId', hasOption(EMOTIONS, state.character.emotionId)],
    ['character.orientationId', hasOption(CHARACTER_ORIENTATIONS, state.character.orientationId)],
    ['camera.shotTypeId', hasOption(SHOT_TYPES, state.camera.shotTypeId)],
    ['camera.verticalAngleId', hasOption(VERTICAL_CAMERA_ANGLES, state.camera.verticalAngleId)],
    ['camera.horizontalAngleId', hasOption(HORIZONTAL_CAMERA_ANGLES, state.camera.horizontalAngleId)],
    ['camera.aspectRatioId', hasOption(ASPECT_RATIOS, state.camera.aspectRatioId)],
    ['environment.backgroundId', hasOption(BACKGROUNDS, state.environment.backgroundId)],
    ['lighting.typeId', hasOption(LIGHTING_TYPES, state.lighting.typeId)],
    ['lighting.naturalTimeId', hasOption(NATURAL_LIGHT_TIMES, state.lighting.naturalTimeId)],
    ['lighting.studioSetupId', hasOption(STUDIO_LIGHT_SETUPS, state.lighting.studioSetupId)],
    ['lighting.mainLightColorId', hasOption(LIGHT_COLORS, state.lighting.mainLightColorId)],
    ['lighting.accentLightColorId', hasOption(LIGHT_COLORS, state.lighting.accentLightColorId)],
    ['style.imageStyleId', hasOption(IMAGE_STYLES, state.style.imageStyleId)],
    ['style.filterId', hasOption(SCENE_FILTERS, state.style.filterId)],
  ];
  if (state.character.mode === 'pose' && state.character.poseId === null) checks.push(['character.poseId.required', false]);
  if (state.character.mode === 'motion' && state.character.motionId === null) checks.push(['character.motionId.required', false]);
  const invalid = checks.filter(([, ok]) => !ok).map(([field]) => field);
  if (invalid.length) throw new Error(`Некорректные поля SceneState: ${invalid.join(', ')}`);
}
