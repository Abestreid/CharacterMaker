import type { CharacterState, SceneState, WardrobeState } from '../../domain';
import type { ParameterValueInput, PresetPayload } from './preset.repository';

const option = (catalog_id: string, option_id: string, position = 0): ParameterValueInput => ({ catalog_id, option_id, position });
const bool = (catalog_id: string, boolean_value: boolean, position = 0): ParameterValueInput => ({ catalog_id, boolean_value, position });
const text = (catalog_id: string, text_value: string, position = 0): ParameterValueInput => ({ catalog_id, text_value, position });
const number = (catalog_id: string, number_value: number, position = 0): ParameterValueInput => ({ catalog_id, number_value, position });

export type PresetIdentity = {
  id?: string;
  name: string;
  slug: string;
  description?: string | null;
};

export function characterStateToPreset(identity: PresetIdentity, state: CharacterState): PresetPayload {
  const parameters: ParameterValueInput[] = [
    option('gender', state.identity.genderId),
    option('muscle_mass', state.body.muscleMassId),
    option('ethnicity', state.appearance.ethnicityId),
    option('skin_tone', state.appearance.skinToneId),
    option('eye_color', state.appearance.eyeColorId),
    option('hair_length', state.appearance.hair.lengthId),
    option('hair_type', state.appearance.hair.typeId),
    option('hairstyle', state.appearance.hair.hairstyleId),
    option('hair_color', state.appearance.hair.colorId),
    option('image_style', state.appearance.imageStyleId),
    option('head_shape', state.face.headShapeId),
    option('forehead_size', state.face.foreheadSizeId),
    option('eyebrow_shape', state.face.eyebrowShapeId),
    option('eyebrow_thickness', state.face.eyebrowThicknessId),
    option('eye_shape', state.face.eyeShapeId),
    option('eye_size', state.face.eyeSizeId),
    option('eye_spacing', state.face.eyeSpacingId),
    option('nose_shape', state.face.noseShapeId),
    option('nose_size', state.face.noseSizeId),
    option('lip_shape', state.face.lipShapeId),
    option('cheekbones', state.face.cheekboneTypeId),
    option('chin_shape', state.face.chinShapeId),
    bool('has_makeup', state.makeup.enabled),
    bool('has_tattoos', state.tattoos.enabled),
  ];

  if (state.body.breastShapeId) parameters.push(option('breast_shape', state.body.breastShapeId));
  if (state.body.breastFirmnessId) parameters.push(option('breast_firmness', state.body.breastFirmnessId));
  if (state.body.buttockShapeId) parameters.push(option('buttock_shape', state.body.buttockShapeId));
  if (state.body.buttockFirmnessId) parameters.push(option('buttock_firmness', state.body.buttockFirmnessId));
  if (state.makeup.enabled) {
    if (state.makeup.eyelinerStyleId) parameters.push(option('eyeliner_style', state.makeup.eyelinerStyleId));
    if (state.makeup.eyeshadowColorId) parameters.push(option('eyeshadow_color', state.makeup.eyeshadowColorId));
    if (state.makeup.lipstickColorId) parameters.push(option('lipstick_color', state.makeup.lipstickColorId));
  }
  if (state.tattoos.enabled && state.tattoos.description.trim()) parameters.push(text('tattoo_description', state.tattoos.description.trim()));

  return {
    ...identity,
    age: state.identity.age,
    height_cm: state.body.height,
    weight_kg: state.body.weight,
    bust_cm: state.body.bust,
    waist_cm: state.body.waist,
    hips_cm: state.body.hips,
    body_fat_percent: state.body.bodyFat,
    parameters,
    metadata: { editor_schema: 'character-state-v2', editor_state: state },
  };
}

export function wardrobeStateToOutfitPreset(identity: PresetIdentity, state: WardrobeState): PresetPayload {
  const parameters: ParameterValueInput[] = [
    option('base_layer_type', state.baseLayer.typeId),
    option('top_type', state.top.typeId),
    option('bottom_type', state.bottom.typeId),
    option('outerwear_type', state.outerwear.typeId),
    option('footwear_type', state.footwear.typeId),
  ];

  [state.baseLayer, state.top, state.bottom, state.outerwear, state.footwear].forEach((layer, index) => {
    if (layer.colorId) parameters.push(option('clothing_color', layer.colorId, index));
    if (layer.materialId) parameters.push(option('clothing_material', layer.materialId, index));
  });
  state.accessoryIds.forEach((accessoryId, index) => parameters.push(option('accessory', accessoryId, index)));
  if (state.customDescription.trim()) parameters.push(text('accessories_custom', state.customDescription.trim()));

  return {
    ...identity,
    parameters,
    metadata: {
      editor_schema: 'wardrobe-state-v2',
      editor_state: state,
      layer_positions: ['base_layer', 'top', 'bottom', 'outerwear', 'footwear'],
    },
  };
}

export function sceneStateToPreset(identity: PresetIdentity, state: SceneState): PresetPayload {
  const parameters: ParameterValueInput[] = [
    option('emotion', state.character.emotionId),
    option('character_orientation', state.character.orientationId),
    option('shot_type', state.camera.shotTypeId),
    option('vertical_camera_angle', state.camera.verticalAngleId),
    option('horizontal_camera_angle', state.camera.horizontalAngleId),
    option('aspect_ratio', state.camera.aspectRatioId),
    option('lighting_type', state.lighting.typeId),
    number('color_temperature', state.lighting.colorTemperature),
    option('image_style', state.style.imageStyleId),
    option('scene_filter', state.style.filterId),
  ];

  if (state.character.mode === 'pose' && state.character.poseId) parameters.push(option('pose', state.character.poseId));
  if (state.character.mode === 'motion' && state.character.motionId) parameters.push(option('motion', state.character.motionId));
  if (state.environment.backgroundId) parameters.push(option('background', state.environment.backgroundId));
  if (state.lighting.naturalTimeId) parameters.push(option('natural_light_time', state.lighting.naturalTimeId));
  if (state.lighting.studioSetupId) parameters.push(option('studio_light_setup', state.lighting.studioSetupId));
  if (state.lighting.mainLightColorId) parameters.push(option('light_color', state.lighting.mainLightColorId, 0));
  if (state.lighting.accentLightColorId) parameters.push(option('light_color', state.lighting.accentLightColorId, 1));

  const editorState: SceneState = {
    ...state,
    reference: {
      ...state.reference,
      image: null,
    },
  };

  return {
    ...identity,
    custom_background_text: state.environment.customBackground.trim() || null,
    parameters,
    metadata: {
      editor_schema: 'scene-state-v2',
      editor_state: editorState,
      character_mode: state.character.mode,
      use_clothing_from_reference: state.reference.useClothing,
      use_expression_from_reference: state.reference.useExpression,
      has_reference_image: Boolean(state.reference.image),
    },
  };
}
