import type {
  AspectRatioId,
  BackgroundId,
  CharacterOrientationId,
  EmotionId,
  HorizontalCameraAngleId,
  ImageStyleId,
  LightingTypeId,
  LightColorId,
  MotionId,
  NaturalLightTimeId,
  PoseId,
  SceneFilterId,
  ShotTypeId,
  StudioLightSetupId,
  VerticalCameraAngleId,
} from '../catalog';
import type { ReferenceImageState } from './reference-image';

export interface SceneState {
  character: {
    mode: 'pose' | 'motion';
    poseId: PoseId | null;
    motionId: MotionId | null;
    emotionId: EmotionId;
    orientationId: CharacterOrientationId;
  };
  camera: {
    shotTypeId: ShotTypeId;
    verticalAngleId: VerticalCameraAngleId;
    horizontalAngleId: HorizontalCameraAngleId;
    aspectRatioId: AspectRatioId;
  };
  environment: {
    backgroundId: BackgroundId | null;
    customBackground: string;
  };
  lighting: {
    typeId: LightingTypeId;
    naturalTimeId: NaturalLightTimeId | null;
    studioSetupId: StudioLightSetupId | null;
    mainLightColorId: LightColorId | null;
    accentLightColorId: LightColorId | null;
    colorTemperature: number;
  };
  style: {
    imageStyleId: ImageStyleId;
    filterId: SceneFilterId;
  };
  reference: {
    image: ReferenceImageState | null;
    useClothing: boolean;
    useExpression: boolean;
  };
}
