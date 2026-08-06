import type { CharacterState } from '../models';

export const CHARACTER_DEFAULTS: CharacterState = {
  identity: { genderId: 'female', age: 25 },
  body: {
    height: 170,
    weight: 60,
    bust: 90,
    waist: 65,
    hips: 95,
    bodyFat: 22,
    muscleMassId: 'toned',
    breastShapeId: 'round',
    breastFirmnessId: 'firm',
    buttockShapeId: 'round',
    buttockFirmnessId: 'firm',
  },
  appearance: {
    ethnicityId: 'caucasian',
    skinToneId: 'fair',
    eyeColorId: 'brown',
    hair: {
      lengthId: 'long',
      typeId: 'wavy',
      hairstyleId: 'loose',
      colorId: 'brunette',
    },
    imageStyleId: 'hyperrealistic_photo',
  },
  face: {
    headShapeId: 'oval',
    foreheadSizeId: 'medium',
    eyebrowShapeId: 'curved',
    eyebrowThicknessId: 'medium',
    eyeShapeId: 'almond',
    eyeSizeId: 'medium',
    eyeSpacingId: 'medium',
    noseShapeId: 'straight',
    noseSizeId: 'medium',
    lipShapeId: 'full',
    cheekboneTypeId: 'high',
    chinShapeId: 'pointed',
  },
  makeup: {
    enabled: true,
    eyelinerStyleId: 'thin',
    eyeshadowColorId: 'neutral_brown',
    lipstickColorId: 'natural',
  },
  tattoos: {
    enabled: false,
    description: '',
  },
};
