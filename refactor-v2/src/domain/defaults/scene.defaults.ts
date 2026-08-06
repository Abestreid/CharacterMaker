import type { SceneState } from '../models';

export const SCENE_DEFAULTS: SceneState = {
  character: {
    mode: 'pose',
    poseId: 'standing_neutral',
    motionId: null,
    emotionId: 'neutral',
    orientationId: 'front',
  },
  camera: {
    shotTypeId: 'full_body',
    verticalAngleId: 'eye_level',
    horizontalAngleId: 'center',
    aspectRatioId: 'portrait_standard',
  },
  environment: {
    backgroundId: 'professional_white_cyclorama',
    customBackground: '',
  },
  lighting: {
    typeId: 'natural',
    naturalTimeId: 'day',
    studioSetupId: 'three_point',
    mainLightColorId: 'neutral_white',
    accentLightColorId: 'none',
    colorTemperature: 5500,
  },
  style: {
    imageStyleId: 'hyperrealistic_photo',
    filterId: 'none',
  },
  reference: {
    image: null,
    useClothing: true,
    useExpression: true,
  },
};
