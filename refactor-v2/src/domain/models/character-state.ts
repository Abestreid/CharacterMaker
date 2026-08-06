import type {
  BreastFirmnessId,
  BreastShapeId,
  ButtockFirmnessId,
  ButtockShapeId,
  CheekboneTypeId,
  ChinShapeId,
  EthnicityId,
  EyeColorId,
  EyebrowShapeId,
  EyebrowThicknessId,
  EyelinerStyleId,
  EyeshadowColorId,
  EyeShapeId,
  EyeSizeId,
  EyeSpacingId,
  ForeheadSizeId,
  GenderId,
  HairColorId,
  HairLengthId,
  HairstyleId,
  HairTypeId,
  HeadShapeId,
  ImageStyleId,
  LipShapeId,
  LipstickColorId,
  MuscleMassId,
  NoseShapeId,
  NoseSizeId,
  SkinToneId,
} from '../catalog';

export interface CharacterState {
  identity: {
    genderId: GenderId;
    age: number;
  };
  body: {
    height: number;
    weight: number;
    bust: number;
    waist: number;
    hips: number;
    bodyFat: number;
    muscleMassId: MuscleMassId;
    breastShapeId: BreastShapeId | null;
    breastFirmnessId: BreastFirmnessId | null;
    buttockShapeId: ButtockShapeId | null;
    buttockFirmnessId: ButtockFirmnessId | null;
  };
  appearance: {
    ethnicityId: EthnicityId;
    skinToneId: SkinToneId;
    eyeColorId: EyeColorId;
    hair: {
      lengthId: HairLengthId;
      typeId: HairTypeId;
      hairstyleId: HairstyleId;
      colorId: HairColorId;
    };
    imageStyleId: ImageStyleId;
  };
  face: {
    headShapeId: HeadShapeId;
    foreheadSizeId: ForeheadSizeId;
    eyebrowShapeId: EyebrowShapeId;
    eyebrowThicknessId: EyebrowThicknessId;
    eyeShapeId: EyeShapeId;
    eyeSizeId: EyeSizeId;
    eyeSpacingId: EyeSpacingId;
    noseShapeId: NoseShapeId;
    noseSizeId: NoseSizeId;
    lipShapeId: LipShapeId;
    cheekboneTypeId: CheekboneTypeId;
    chinShapeId: ChinShapeId;
  };
  makeup: {
    enabled: boolean;
    eyelinerStyleId: EyelinerStyleId | null;
    eyeshadowColorId: EyeshadowColorId | null;
    lipstickColorId: LipstickColorId | null;
  };
  tattoos: {
    enabled: boolean;
    description: string;
  };
}
