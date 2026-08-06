import type { FormSectionDefinition } from '../catalog/core';

export const CHARACTER_FORM_SECTIONS = [
  { id: 'identity', title: 'Основные данные', sortOrder: 10, fieldIds: ['identity.genderId', 'identity.age'] },
  { id: 'body', title: 'Физические параметры', sortOrder: 20, fieldIds: ['body.height', 'body.weight', 'body.bust', 'body.waist', 'body.hips', 'body.bodyFat', 'body.muscleMassId', 'body.breastShapeId', 'body.breastFirmnessId', 'body.buttockShapeId', 'body.buttockFirmnessId'] },
  { id: 'appearance', title: 'Внешность', sortOrder: 30, fieldIds: ['appearance.imageStyleId', 'appearance.ethnicityId', 'appearance.skinToneId', 'appearance.eyeColorId', 'appearance.hair.lengthId', 'appearance.hair.typeId', 'appearance.hair.hairstyleId', 'appearance.hair.colorId'] },
  { id: 'face', title: 'Черты лица', sortOrder: 40, fieldIds: ['face.headShapeId', 'face.foreheadSizeId', 'face.eyebrowShapeId', 'face.eyebrowThicknessId', 'face.eyeShapeId', 'face.eyeSizeId', 'face.eyeSpacingId', 'face.noseShapeId', 'face.noseSizeId', 'face.lipShapeId', 'face.cheekboneTypeId', 'face.chinShapeId'] },
  { id: 'makeup', title: 'Макияж', sortOrder: 50, fieldIds: ['makeup.enabled', 'makeup.eyelinerStyleId', 'makeup.eyeshadowColorId', 'makeup.lipstickColorId'] },
  { id: 'tattoos', title: 'Татуировки', sortOrder: 60, fieldIds: ['tattoos.enabled', 'tattoos.description'] },
] as const satisfies readonly FormSectionDefinition[];

export const WARDROBE_FORM_SECTIONS = [
  { id: 'layers', title: 'Одежда', sortOrder: 10, fieldIds: ['baseLayer.typeId', 'baseLayer.colorId', 'baseLayer.materialId', 'top.typeId', 'top.colorId', 'top.materialId', 'bottom.typeId', 'bottom.colorId', 'bottom.materialId', 'outerwear.typeId', 'outerwear.colorId', 'outerwear.materialId', 'footwear.typeId', 'footwear.colorId', 'footwear.materialId'] },
  { id: 'accessories', title: 'Аксессуары', sortOrder: 20, fieldIds: ['accessoryIds', 'customDescription'] },
] as const satisfies readonly FormSectionDefinition[];

export const SCENE_FORM_SECTIONS = [
  { id: 'character', title: 'Персонаж', sortOrder: 10, fieldIds: ['character.mode', 'character.poseId', 'character.motionId', 'character.emotionId', 'character.orientationId'] },
  { id: 'camera', title: 'Камера и кадр', sortOrder: 20, fieldIds: ['camera.verticalAngleId', 'camera.horizontalAngleId', 'camera.shotTypeId', 'camera.aspectRatioId'] },
  { id: 'environment', title: 'Сцена и стиль', sortOrder: 30, fieldIds: ['environment.backgroundId', 'environment.customBackground', 'style.imageStyleId'] },
  { id: 'lighting', title: 'Освещение и цвет', sortOrder: 40, fieldIds: ['lighting.typeId', 'lighting.naturalTimeId', 'lighting.studioSetupId', 'lighting.mainLightColorId', 'lighting.accentLightColorId', 'lighting.colorTemperature'] },
  { id: 'postprocessing', title: 'Постобработка', sortOrder: 50, fieldIds: ['style.filterId'] },
  { id: 'reference', title: 'Референс сцены', sortOrder: 60, fieldIds: ['reference.image', 'reference.useClothing', 'reference.useExpression'] },
] as const satisfies readonly FormSectionDefinition[];
