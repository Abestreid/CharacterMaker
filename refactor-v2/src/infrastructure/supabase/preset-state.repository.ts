import {
  BACKGROUNDS,
  CHARACTER_DEFAULTS,
  SCENE_DEFAULTS,
  WARDROBE_DEFAULTS,
  validateCharacterState,
  validateSceneState,
  validateWardrobeState,
  type CharacterState,
  type SceneState,
  type WardrobeState,
} from '../../domain';
import { supabase } from './client';

export type StoredPresetState<TState> = {
  state: TState;
  version: number;
  schemaVersion: string;
};

type ParameterRow = {
  catalog_id: string;
  position: number;
  option_id: string | null;
  number_value: number | string | null;
  text_value: string | null;
  boolean_value: boolean | null;
  json_value: unknown;
};

export async function loadCharacterState(characterId: string): Promise<StoredPresetState<CharacterState>> {
  const [{ data: character, error: characterError }, rows] = await Promise.all([
    supabase
      .from('characters')
      .select('id,age,height_cm,weight_kg,bust_cm,waist_cm,hips_cm,body_fat_percent,version,schema_version')
      .eq('id', characterId)
      .single(),
    fetchParameterRows('character_parameter_values', 'character_id', characterId),
  ]);
  if (characterError) throw characterError;

  const state = structuredClone(CHARACTER_DEFAULTS);
  if (character.age !== null) state.identity.age = Number(character.age);
  if (character.height_cm !== null) state.body.height = Number(character.height_cm);
  if (character.weight_kg !== null) state.body.weight = Number(character.weight_kg);
  if (character.bust_cm !== null) state.body.bust = Number(character.bust_cm);
  if (character.waist_cm !== null) state.body.waist = Number(character.waist_cm);
  if (character.hips_cm !== null) state.body.hips = Number(character.hips_cm);
  if (character.body_fat_percent !== null) state.body.bodyFat = Number(character.body_fat_percent);

  state.identity.genderId = optionValue<typeof state.identity.genderId>(rows, 'gender') ?? state.identity.genderId;
  state.body.muscleMassId = optionValue<typeof state.body.muscleMassId>(rows, 'muscle_mass') ?? state.body.muscleMassId;
  state.body.breastSizeId = optionValue<NonNullable<typeof state.body.breastSizeId>>(rows, 'breast_size');
  state.body.breastShapeId = optionValue<NonNullable<typeof state.body.breastShapeId>>(rows, 'breast_shape');
  state.body.breastFirmnessId = optionValue<NonNullable<typeof state.body.breastFirmnessId>>(rows, 'breast_firmness');
  state.body.buttockShapeId = optionValue<NonNullable<typeof state.body.buttockShapeId>>(rows, 'buttock_shape');
  state.body.buttockFirmnessId = optionValue<NonNullable<typeof state.body.buttockFirmnessId>>(rows, 'buttock_firmness');
  state.appearance.ethnicityId = optionValue<typeof state.appearance.ethnicityId>(rows, 'ethnicity') ?? state.appearance.ethnicityId;
  state.appearance.skinToneId = optionValue<typeof state.appearance.skinToneId>(rows, 'skin_tone') ?? state.appearance.skinToneId;
  state.appearance.skinDetails = textValue(rows, 'skin_details') ?? '';
  state.appearance.eyeColorId = optionValue<typeof state.appearance.eyeColorId>(rows, 'eye_color') ?? state.appearance.eyeColorId;
  state.appearance.hair.lengthId = optionValue<typeof state.appearance.hair.lengthId>(rows, 'hair_length') ?? state.appearance.hair.lengthId;
  state.appearance.hair.typeId = optionValue<typeof state.appearance.hair.typeId>(rows, 'hair_type') ?? state.appearance.hair.typeId;
  state.appearance.hair.hairstyleId = optionValue<typeof state.appearance.hair.hairstyleId>(rows, 'hairstyle') ?? state.appearance.hair.hairstyleId;
  state.appearance.hair.colorId = optionValue<typeof state.appearance.hair.colorId>(rows, 'hair_color') ?? state.appearance.hair.colorId;
  state.appearance.hair.details = textValue(rows, 'hair_details') ?? '';
  state.appearance.imageStyleId = optionValue<typeof state.appearance.imageStyleId>(rows, 'image_style') ?? state.appearance.imageStyleId;
  state.face.headShapeId = optionValue<typeof state.face.headShapeId>(rows, 'head_shape') ?? state.face.headShapeId;
  state.face.foreheadSizeId = optionValue<typeof state.face.foreheadSizeId>(rows, 'forehead_size') ?? state.face.foreheadSizeId;
  state.face.eyebrowShapeId = optionValue<typeof state.face.eyebrowShapeId>(rows, 'eyebrow_shape') ?? state.face.eyebrowShapeId;
  state.face.eyebrowThicknessId = optionValue<typeof state.face.eyebrowThicknessId>(rows, 'eyebrow_thickness') ?? state.face.eyebrowThicknessId;
  state.face.eyeShapeId = optionValue<typeof state.face.eyeShapeId>(rows, 'eye_shape') ?? state.face.eyeShapeId;
  state.face.eyeSizeId = optionValue<typeof state.face.eyeSizeId>(rows, 'eye_size') ?? state.face.eyeSizeId;
  state.face.eyeSpacingId = optionValue<typeof state.face.eyeSpacingId>(rows, 'eye_spacing') ?? state.face.eyeSpacingId;
  state.face.noseShapeId = optionValue<typeof state.face.noseShapeId>(rows, 'nose_shape') ?? state.face.noseShapeId;
  state.face.noseSizeId = optionValue<typeof state.face.noseSizeId>(rows, 'nose_size') ?? state.face.noseSizeId;
  state.face.lipShapeId = optionValue<typeof state.face.lipShapeId>(rows, 'lip_shape') ?? state.face.lipShapeId;
  state.face.cheekboneTypeId = optionValue<typeof state.face.cheekboneTypeId>(rows, 'cheekbones') ?? state.face.cheekboneTypeId;
  state.face.chinShapeId = optionValue<typeof state.face.chinShapeId>(rows, 'chin_shape') ?? state.face.chinShapeId;
  state.makeup.enabled = booleanValue(rows, 'has_makeup') ?? state.makeup.enabled;
  state.makeup.eyelinerStyleId = state.makeup.enabled ? optionValue<NonNullable<typeof state.makeup.eyelinerStyleId>>(rows, 'eyeliner_style') : null;
  state.makeup.eyeshadowColorId = state.makeup.enabled ? optionValue<NonNullable<typeof state.makeup.eyeshadowColorId>>(rows, 'eyeshadow_color') : null;
  state.makeup.lipstickColorId = state.makeup.enabled ? optionValue<NonNullable<typeof state.makeup.lipstickColorId>>(rows, 'lipstick_color') : null;
  state.makeup.details = state.makeup.enabled ? textValue(rows, 'makeup_details') ?? '' : '';
  state.tattoos.enabled = booleanValue(rows, 'has_tattoos') ?? state.tattoos.enabled;
  state.tattoos.description = state.tattoos.enabled ? textValue(rows, 'tattoo_description') ?? '' : '';
  state.permanentFeatures = textValue(rows, 'permanent_features') ?? '';

  validateCharacterState(state);
  return { state, version: Number(character.version), schemaVersion: character.schema_version };
}

export async function loadWardrobeState(outfitId: string): Promise<StoredPresetState<WardrobeState>> {
  const [{ data: outfit, error: outfitError }, rows] = await Promise.all([
    supabase.from('outfit_presets').select('id,version,schema_version').eq('id', outfitId).single(),
    fetchParameterRows('outfit_preset_parameter_values', 'outfit_preset_id', outfitId),
  ]);
  if (outfitError) throw outfitError;

  const state = structuredClone(WARDROBE_DEFAULTS);
  state.baseLayer.typeId = optionValue<typeof state.baseLayer.typeId>(rows, 'base_layer_type') ?? state.baseLayer.typeId;
  state.top.typeId = optionValue<typeof state.top.typeId>(rows, 'top_type') ?? state.top.typeId;
  state.bottom.typeId = optionValue<typeof state.bottom.typeId>(rows, 'bottom_type') ?? state.bottom.typeId;
  state.outerwear.typeId = optionValue<typeof state.outerwear.typeId>(rows, 'outerwear_type') ?? state.outerwear.typeId;
  state.footwear.typeId = optionValue<typeof state.footwear.typeId>(rows, 'footwear_type') ?? state.footwear.typeId;

  const layers = [state.baseLayer, state.top, state.bottom, state.outerwear, state.footwear];
  layers.forEach((layer, position) => {
    if (layer.typeId === 'none') {
      layer.colorId = null;
      layer.materialId = null;
      return;
    }
    layer.colorId = optionValue<NonNullable<typeof layer.colorId>>(rows, 'clothing_color', position);
    layer.materialId = optionValue<NonNullable<typeof layer.materialId>>(rows, 'clothing_material', position);
  });
  state.accessoryIds = rows
    .filter((row) => row.catalog_id === 'accessory' && row.option_id)
    .sort((a, b) => a.position - b.position)
    .map((row) => row.option_id as WardrobeState['accessoryIds'][number]);
  state.customDescription = textValue(rows, 'accessories_custom') ?? '';

  validateWardrobeState(state);
  return { state, version: Number(outfit.version), schemaVersion: outfit.schema_version };
}

export async function loadSceneState(sceneId: string): Promise<StoredPresetState<SceneState>> {
  const [{ data: scene, error: sceneError }, rows] = await Promise.all([
    supabase
      .from('scene_presets')
      .select('id,background_id,custom_background_text,reference_use_clothing,reference_use_expression,version,schema_version')
      .eq('id', sceneId)
      .single(),
    fetchParameterRows('scene_preset_parameter_values', 'scene_preset_id', sceneId),
  ]);
  if (sceneError) throw sceneError;

  const state = structuredClone(SCENE_DEFAULTS);
  const poseId = optionValue<NonNullable<typeof state.character.poseId>>(rows, 'pose');
  const motionId = optionValue<NonNullable<typeof state.character.motionId>>(rows, 'motion');
  if (motionId) {
    state.character.mode = 'motion';
    state.character.motionId = motionId;
    state.character.poseId = null;
  } else {
    state.character.mode = 'pose';
    state.character.poseId = poseId ?? state.character.poseId;
    state.character.motionId = null;
  }

  state.character.emotionId = optionValue<typeof state.character.emotionId>(rows, 'emotion') ?? state.character.emotionId;
  state.character.orientationId = optionValue<typeof state.character.orientationId>(rows, 'character_orientation') ?? state.character.orientationId;
  state.camera.shotTypeId = optionValue<typeof state.camera.shotTypeId>(rows, 'shot_type') ?? state.camera.shotTypeId;
  state.camera.verticalAngleId = optionValue<typeof state.camera.verticalAngleId>(rows, 'vertical_camera_angle') ?? state.camera.verticalAngleId;
  state.camera.horizontalAngleId = optionValue<typeof state.camera.horizontalAngleId>(rows, 'horizontal_camera_angle') ?? state.camera.horizontalAngleId;
  state.camera.aspectRatioId = optionValue<typeof state.camera.aspectRatioId>(rows, 'aspect_ratio') ?? state.camera.aspectRatioId;
  state.environment.backgroundId = optionValue<NonNullable<typeof state.environment.backgroundId>>(rows, 'background');
  if (!state.environment.backgroundId && scene.background_id) {
    const { data: background, error: backgroundError } = await supabase.from('backgrounds').select('slug').eq('id', scene.background_id).single();
    if (backgroundError) throw backgroundError;
    if (BACKGROUNDS.some((item) => item.id === background.slug)) {
      state.environment.backgroundId = background.slug as NonNullable<typeof state.environment.backgroundId>;
    }
  }
  state.environment.customBackground = scene.custom_background_text ?? '';
  state.lighting.typeId = optionValue<typeof state.lighting.typeId>(rows, 'lighting_type') ?? state.lighting.typeId;
  state.lighting.naturalTimeId = optionValue<NonNullable<typeof state.lighting.naturalTimeId>>(rows, 'natural_light_time');
  state.lighting.studioSetupId = optionValue<NonNullable<typeof state.lighting.studioSetupId>>(rows, 'studio_light_setup');
  state.lighting.mainLightColorId = optionValue<NonNullable<typeof state.lighting.mainLightColorId>>(rows, 'light_color', 0);
  state.lighting.accentLightColorId = optionValue<NonNullable<typeof state.lighting.accentLightColorId>>(rows, 'light_color', 1);
  state.lighting.colorTemperature = numberValue(rows, 'color_temperature') ?? state.lighting.colorTemperature;
  state.style.imageStyleId = optionValue<typeof state.style.imageStyleId>(rows, 'image_style') ?? state.style.imageStyleId;
  state.style.filterId = optionValue<typeof state.style.filterId>(rows, 'scene_filter') ?? state.style.filterId;
  state.reference.image = null;
  state.reference.useClothing = scene.reference_use_clothing === true;
  state.reference.useExpression = scene.reference_use_expression === true;

  validateSceneState(state);
  return { state, version: Number(scene.version), schemaVersion: scene.schema_version };
}

async function fetchParameterRows(table: string, ownerColumn: string, ownerId: string): Promise<ParameterRow[]> {
  const { data, error } = await supabase
    .from(table)
    .select('catalog_id,position,option_id,number_value,text_value,boolean_value,json_value')
    .eq(ownerColumn, ownerId)
    .order('position');
  if (error) throw error;
  return (data ?? []) as ParameterRow[];
}

function rowFor(rows: readonly ParameterRow[], catalogId: string, position = 0): ParameterRow | undefined {
  return rows.find((row) => row.catalog_id === catalogId && row.position === position);
}

function optionValue<T extends string>(rows: readonly ParameterRow[], catalogId: string, position = 0): T | null {
  return (rowFor(rows, catalogId, position)?.option_id ?? null) as T | null;
}

function textValue(rows: readonly ParameterRow[], catalogId: string, position = 0): string | null {
  return rowFor(rows, catalogId, position)?.text_value ?? null;
}

function booleanValue(rows: readonly ParameterRow[], catalogId: string, position = 0): boolean | null {
  return rowFor(rows, catalogId, position)?.boolean_value ?? null;
}

function numberValue(rows: readonly ParameterRow[], catalogId: string, position = 0): number | null {
  const value = rowFor(rows, catalogId, position)?.number_value;
  return value === null || value === undefined ? null : Number(value);
}
