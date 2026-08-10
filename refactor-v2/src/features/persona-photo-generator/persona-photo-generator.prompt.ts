import {
  BREAST_FIRMNESS_OPTIONS,
  BREAST_SHAPES,
  BUTTOCK_FIRMNESS_OPTIONS,
  BUTTOCK_SHAPES,
  CHEEKBONE_TYPES,
  CHIN_SHAPES,
  ETHNICITIES,
  EYE_COLORS,
  EYEBROW_SHAPES,
  EYEBROW_THICKNESS_OPTIONS,
  EYELINER_STYLES,
  EYESHADOW_COLORS,
  EYE_SHAPES,
  EYE_SIZES,
  EYE_SPACING_OPTIONS,
  FOREHEAD_SIZES,
  GENDERS,
  HAIRSTYLES,
  HAIR_COLORS,
  HAIR_LENGTHS,
  HAIR_TYPES,
  HEAD_SHAPES,
  IMAGE_STYLES,
  LIPSTICK_COLORS,
  LIP_SHAPES,
  MUSCLE_MASS_OPTIONS,
  NOSE_SHAPES,
  NOSE_SIZES,
  SKIN_TONES,
  bodyDnaPromptLines,
  getLabelById,
  type CatalogOption,
  type CharacterState,
} from '../../domain';

export type CharacterPhotoRole = 'face_closeup' | 'portrait' | 'full_front' | 'full_back' | 'profile_left';

export type CharacterPhotoStep = {
  role: CharacterPhotoRole;
  label: string;
  shortLabel: string;
  description: string;
  contextLabel: string;
  width: number;
  height: number;
};

export const CHARACTER_PHOTO_STEPS = [
  { role: 'face_closeup', label: 'Лицо крупно', shortLabel: 'Лицо', description: 'Фронтальный крупный план. Формирует основной канон лицевой идентичности.', contextLabel: 'Только лицо и идентичность', width: 768, height: 768 },
  { role: 'portrait', label: 'Портрет / торс', shortLabel: 'Торс', description: 'Фронтальный портрет от головы примерно до талии. Уточняет лицо и верхнюю часть тела.', contextLabel: 'Лицо + верхняя часть тела', width: 768, height: 1024 },
  { role: 'full_front', label: 'Полный рост спереди', shortLabel: 'Спереди', description: 'Нейтральная стойка, полностью видны голова, корпус, ноги и стопы.', contextLabel: 'Лицо + все параметры тела', width: 768, height: 1024 },
  { role: 'full_back', label: 'Полный рост сзади', shortLabel: 'Сзади', description: 'Нейтральная стойка строго спиной к камере для канона силуэта и пропорций.', contextLabel: 'Идентичность + все параметры тела со спины', width: 768, height: 1024 },
  { role: 'profile_left', label: 'Профиль в полный рост', shortLabel: 'Профиль', description: 'Левый боковой профиль в полный рост без перспективных искажений.', contextLabel: 'Лицо в профиль + все параметры тела', width: 768, height: 1024 },
] as const satisfies readonly CharacterPhotoStep[];

export const DEFAULT_CANONICAL_OUTFIT = 'opaque fitted beige athletic crop top ending clearly above the natural waist, plus low-to-mid-rise short fitted beige athletic shorts; the entire natural waist and waist-to-hip transition must remain visible, matte fabric, no logos, no patterns, no accessories';

export function buildCharacterPhotoPrompt(input: {
  character: CharacterState;
  role: CharacterPhotoRole;
  personaName?: string | null;
  referenceRoles?: readonly string[];
}): string {
  const { character, role } = input;
  const lines: string[] = [];
  const personaName = input.personaName?.trim() || 'the same person';

  lines.push('Create ONE canonical reference image, not a collage and not a character sheet.');
  lines.push(`Subject: ${personaName}. Keep exactly one stable identity across all canonical reference images.`);
  lines.push('Use neutral reference photography: clean light-gray seamless studio background, soft even frontal light, natural skin texture, realistic anatomy, minimal lens distortion, no dramatic pose.');
  lines.push(`Requested visual style parameter: ${optionValue(IMAGE_STYLES, character.appearance.imageStyleId)}.`);
  lines.push(`SHOT: ${shotInstruction(role)}`);
  lines.push('');
  lines.push('IDENTITY_AND_FACE_PARAMETERS:');
  lines.push(...faceParameterLines(character));

  if (role === 'portrait') {
    lines.push('');
    lines.push('UPPER_BODY_PARAMETERS:');
    lines.push(...upperBodyParameterLines(character));
    lines.push('');
    lines.push('BODY_DNA_PROPORTIONS:');
    lines.push(...bodyDnaPromptLines(character));
  }

  if (role === 'full_front' || role === 'full_back' || role === 'profile_left') {
    lines.push('');
    lines.push('FULL_BODY_PARAMETERS:');
    lines.push(...fullBodyParameterLines(character));
    lines.push('');
    lines.push('BODY_DNA_PROPORTIONS:');
    lines.push(...bodyDnaPromptLines(character));
  }

  if (role !== 'face_closeup') {
    lines.push('');
    lines.push(`TEMPORARY_REFERENCE_OUTFIT: ${canonicalOutfit(character)}.`);
    lines.push('The reference outfit is temporary calibration clothing only. Never treat it as a permanent identity feature. Keep the body silhouette readable and do not add outerwear, jewelry, bags, hats or props.');
    if (character.identity.age >= 18 && (role === 'full_front' || role === 'full_back' || role === 'profile_left')) {
      lines.push('CALIBRATION_VISIBILITY_RULE: the narrowest natural waist, both lateral waist contours, upper hip line and waist-to-hip transition must be plainly visible. Clothing must not cover the waist, use a high waistband, compress the torso, flatten the hips, or reshape the silhouette.');
    }
  } else {
    lines.push('If shoulders/clothing are visible, use the same plain beige sports top. Do not add jewelry, hats, glasses or props.');
  }

  const referenceRoles = input.referenceRoles ?? [];
  if (referenceRoles.length > 0) {
    lines.push('');
    lines.push('REFERENCE_IMAGES:');
    referenceRoles.forEach((referenceRole, index) => lines.push(`- image ${index}: ${referenceRole}. Use it only to preserve the same identity and the body/face information appropriate to that reference.`));
    lines.push('Do not copy background, lighting, pose or accidental clothing details from reference images. Structured parameters and BodyDNA in this prompt are the current source of truth.');
  }

  lines.push('');
  lines.push('QUALITY_RULES: same person, neutral expression, preserve BodyDNA ratios, natural anatomy, anatomically coherent hands and feet when visible, no crop of required body parts, no text, no watermark, no extra people.');
  return lines.join('\n');
}

function faceParameterLines(character: CharacterState): string[] {
  const lines = [
    `AGE: ${character.identity.age}`,
    `GENDER: ${optionValue(GENDERS, character.identity.genderId)}`,
    `ETHNICITY: ${optionValue(ETHNICITIES, character.appearance.ethnicityId)}`,
    `SKIN_TONE: ${optionValue(SKIN_TONES, character.appearance.skinToneId)}`,
    `EYE_COLOR: ${optionValue(EYE_COLORS, character.appearance.eyeColorId)}`,
    `HAIR_LENGTH: ${optionValue(HAIR_LENGTHS, character.appearance.hair.lengthId)}`,
    `HAIR_TYPE: ${optionValue(HAIR_TYPES, character.appearance.hair.typeId)}`,
    `HAIRSTYLE: ${optionValue(HAIRSTYLES, character.appearance.hair.hairstyleId)}`,
    `HAIR_COLOR: ${optionValue(HAIR_COLORS, character.appearance.hair.colorId)}`,
    `HEAD_SHAPE: ${optionValue(HEAD_SHAPES, character.face.headShapeId)}`,
    `FOREHEAD_SIZE: ${optionValue(FOREHEAD_SIZES, character.face.foreheadSizeId)}`,
    `EYEBROW_SHAPE: ${optionValue(EYEBROW_SHAPES, character.face.eyebrowShapeId)}`,
    `EYEBROW_THICKNESS: ${optionValue(EYEBROW_THICKNESS_OPTIONS, character.face.eyebrowThicknessId)}`,
    `EYE_SHAPE: ${optionValue(EYE_SHAPES, character.face.eyeShapeId)}`,
    `EYE_SIZE: ${optionValue(EYE_SIZES, character.face.eyeSizeId)}`,
    `EYE_SPACING: ${optionValue(EYE_SPACING_OPTIONS, character.face.eyeSpacingId)}`,
    `NOSE_SHAPE: ${optionValue(NOSE_SHAPES, character.face.noseShapeId)}`,
    `NOSE_SIZE: ${optionValue(NOSE_SIZES, character.face.noseSizeId)}`,
    `LIP_SHAPE: ${optionValue(LIP_SHAPES, character.face.lipShapeId)}`,
    `CHEEKBONES: ${optionValue(CHEEKBONE_TYPES, character.face.cheekboneTypeId)}`,
    `CHIN_SHAPE: ${optionValue(CHIN_SHAPES, character.face.chinShapeId)}`,
  ];
  if (character.appearance.skinDetails.trim()) lines.push(`SKIN_DETAILS: ${character.appearance.skinDetails.trim()}`);
  if (character.appearance.hair.details.trim()) lines.push(`HAIR_DETAILS: ${character.appearance.hair.details.trim()}`);
  if (character.makeup.enabled) {
    lines.push('MAKEUP_ENABLED: yes');
    lines.push(`EYELINER: ${optionValue(EYELINER_STYLES, character.makeup.eyelinerStyleId)}`);
    lines.push(`EYESHADOW: ${optionValue(EYESHADOW_COLORS, character.makeup.eyeshadowColorId)}`);
    lines.push(`LIPSTICK: ${optionValue(LIPSTICK_COLORS, character.makeup.lipstickColorId)}`);
    if (character.makeup.details.trim()) lines.push(`MAKEUP_DETAILS: ${character.makeup.details.trim()}`);
  } else lines.push('MAKEUP_ENABLED: no');
  if (character.permanentFeatures.trim()) lines.push(`PERMANENT_FEATURES: ${character.permanentFeatures.trim()}`);
  return lines;
}

function upperBodyParameterLines(character: CharacterState): string[] {
  const lines = [
    `BUST_CM: ${character.body.bust}`,
    `WAIST_CM: ${character.body.waist}`,
    `BODY_FAT_PERCENT: ${character.body.bodyFat}`,
    `MUSCLE_MASS: ${optionValue(MUSCLE_MASS_OPTIONS, character.body.muscleMassId)}`,
  ];
  if (character.identity.genderId === 'female') {
    lines.push(`BREAST_SHAPE: ${optionValue(BREAST_SHAPES, character.body.breastShapeId)}`);
    lines.push(`BREAST_FIRMNESS: ${optionValue(BREAST_FIRMNESS_OPTIONS, character.body.breastFirmnessId)}`);
  }
  if (character.tattoos.enabled && character.tattoos.description.trim()) lines.push(`VISIBLE_TATTOOS: preserve tattoos when they fall inside this framing; ${character.tattoos.description.trim()}`);
  return lines;
}

function fullBodyParameterLines(character: CharacterState): string[] {
  const lines = [
    `HEIGHT_CM: ${character.body.height}`,
    `WEIGHT_KG: ${character.body.weight}`,
    `BUST_CM: ${character.body.bust}`,
    `WAIST_CM: ${character.body.waist}`,
    `HIPS_CM: ${character.body.hips}`,
    `BODY_FAT_PERCENT: ${character.body.bodyFat}`,
    `MUSCLE_MASS: ${optionValue(MUSCLE_MASS_OPTIONS, character.body.muscleMassId)}`,
  ];
  if (character.identity.genderId === 'female') {
    lines.push(`BREAST_SHAPE: ${optionValue(BREAST_SHAPES, character.body.breastShapeId)}`);
    lines.push(`BREAST_FIRMNESS: ${optionValue(BREAST_FIRMNESS_OPTIONS, character.body.breastFirmnessId)}`);
    lines.push(`BUTTOCK_SHAPE: ${optionValue(BUTTOCK_SHAPES, character.body.buttockShapeId)}`);
    lines.push(`BUTTOCK_FIRMNESS: ${optionValue(BUTTOCK_FIRMNESS_OPTIONS, character.body.buttockFirmnessId)}`);
  }
  if (character.tattoos.enabled) lines.push(character.tattoos.description.trim() ? `TATTOOS: ${character.tattoos.description.trim()}` : 'TATTOOS: enabled, preserve any visible tattoo identity marks');
  else lines.push('TATTOOS: none');
  return lines;
}

function shotInstruction(role: CharacterPhotoRole): string {
  if (role === 'face_closeup') return 'front-facing close-up of the face and full head, neutral relaxed expression, eyes looking at camera, only a little shoulder visible, symmetrical eye-level camera';
  if (role === 'portrait') return 'front-facing upper-body portrait from full head to approximately waist, arms relaxed, shoulders and torso readable, eye-level camera';
  if (role === 'full_front') return 'strict front view, head-to-toe full body, feet fully visible, arms relaxed slightly away from torso, neutral stance, camera centered at body level';
  if (role === 'full_back') return 'strict back view, head-to-toe full body, feet fully visible, face not turned toward camera, arms relaxed slightly away from torso, neutral stance, camera centered at body level';
  return 'strict left-side profile, head-to-toe full body, feet fully visible, neutral stance, face and body exactly 90 degrees to camera, minimal perspective distortion';
}

function canonicalOutfit(character: CharacterState): string {
  if (character.identity.age < 18) return 'opaque modest beige athletic T-shirt and beige knee-length athletic shorts, matte fabric, no logos, no patterns, no accessories';
  return DEFAULT_CANONICAL_OUTFIT;
}

function optionValue<TOption extends CatalogOption>(options: readonly TOption[], id: string | null | undefined): string {
  if (!id) return 'not specified';
  const label = getLabelById(options, id);
  return label ? `${label} [${id}]` : id;
}
