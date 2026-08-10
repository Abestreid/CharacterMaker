import { normalizeBody, type BodyDNA, type CharacterState } from '../../domain';
import {
  FLUX2_KLEIN_CANONICAL_OUTFIT,
  type Flux2KleinPhotoRole,
} from './flux2-klein-4b.persona-adapter';

export type Flux2DevPhotoRole = Flux2KleinPhotoRole;

export function buildFlux2DevPersonaPhotoPrompt(input: {
  character: CharacterState;
  role: Flux2DevPhotoRole;
  referenceRoles?: readonly string[];
}): string {
  const { character, role } = input;
  const body = normalizeBody(character);
  const fullBody = role === 'full_front' || role === 'full_back' || role === 'profile_left';
  const sections: string[] = [
    openingSentence(character, role),
  ];

  if (fullBody) {
    sections.push(fullBodyNarrative(character, body));
    sections.push(`Calibration clothing: ${canonicalOutfit(character)}.`);
  } else if (role === 'portrait') {
    sections.push(upperBodyNarrative(character, body));
    sections.push(`Calibration clothing: ${canonicalOutfit(character)}.`);
  }

  sections.push(identitySentence(character));
  sections.push(faceSentence(character));
  sections.push(hairSentence(character));
  sections.push(makeupSentence(character));

  const permanentDetails = stableDetailSentence(character, role);
  if (permanentDetails) sections.push(permanentDetails);

  const referenceInstruction = referenceSentence(input.referenceRoles ?? []);
  if (referenceInstruction) sections.push(referenceInstruction);

  sections.push(cameraAndStudioSentence(role));
  sections.push(finalQualitySentence(fullBody));

  return sections.filter(Boolean).join('\n\n');
}

function openingSentence(character: CharacterState, role: Flux2DevPhotoRole): string {
  return [
    shotSentence(role),
    `of one ${character.identity.age}-year-old ${promptId(character.identity.genderId)}.`,
    `Create a realistic canonical identity reference in ${promptId(character.appearance.imageStyleId)} style.`,
    'Stable identity, realistic anatomy and exact silhouette preservation are more important than decorative styling.',
  ].join(' ');
}

function fullBodyNarrative(character: CharacterState, dna: BodyDNA): string {
  const { raw, ratios: r, semantics: s } = dna;
  return [
    `BodyDNA: ${shapePhrase(s.shape)} with ${waistPhrase(s.waistDefinition)}, ${balancePhrase(s.upperLowerBalance)}, ${scalePhrase(s.bustRelativeScale, 'bust')} and ${scalePhrase(s.hipsRelativeScale, 'hips')}.`,
    distributionPhrase(dna),
    `The canonical physical anchors are ${raw.heightCm} cm height, ${raw.weightKg} kg weight and ${raw.bustCm}/${raw.waistCm}/${raw.hipsCm} cm bust-waist-hips at ${raw.bodyFatPercent}% body fat.`,
    `Preserve the visible geometry implied by waist-to-height ${r.waistToHeight}, bust-to-waist ${r.bustToWaist}, hips-to-waist ${r.hipsToWaist}, waist-to-hips ${r.waistToHips} and bust-to-hips ${r.bustToHips}; do not average these proportions toward a generic body.`,
    compositionSentence(character, dna),
    bodyFormSentence(character),
  ].filter(Boolean).join(' ');
}

function upperBodyNarrative(character: CharacterState, dna: BodyDNA): string {
  const { raw, ratios: r, semantics: s } = dna;
  return [
    `Upper-body BodyDNA: ${scalePhrase(s.bustRelativeScale, 'bust')} with ${waistPhrase(s.waistDefinition)} and ${softTissuePhrase(s.softTissue)}.`,
    `Keep the upper torso consistent with ${raw.bustCm} cm bust, ${raw.waistCm} cm waist and ${raw.bodyFatPercent}% body fat.`,
    `Preserve bust-to-height ${r.bustToHeight}, waist-to-height ${r.waistToHeight} and bust-to-waist ${r.bustToWaist}.`,
    bodyFormSentence(character, true),
  ].filter(Boolean).join(' ');
}

function compositionSentence(character: CharacterState, dna: BodyDNA): string {
  const s = dna.semantics;
  return `Body composition should read as ${massPhrase(s.overallMass)}, ${softTissuePhrase(s.softTissue)} and ${promptId(character.body.muscleMassId)} muscularity, without changing the stored circumferences or silhouette.`;
}

function bodyFormSentence(character: CharacterState, upperOnly = false): string {
  if (character.identity.genderId !== 'female') {
    return `Torso musculature: ${promptId(character.body.muscleMassId)}.`;
  }

  const details = [
    character.body.breastShapeId ? `${promptId(character.body.breastShapeId)} breast shape` : null,
    character.body.breastFirmnessId ? `${promptId(character.body.breastFirmnessId)} breast tissue` : null,
    !upperOnly && character.body.buttockShapeId ? `${buttockShape(character.body.buttockShapeId)} buttock shape` : null,
    !upperOnly && character.body.buttockFirmnessId ? `${promptId(character.body.buttockFirmnessId)} buttock tissue` : null,
  ].filter(Boolean);

  return details.length ? `Anatomical form details: ${details.join(', ')}.` : '';
}

function identitySentence(character: CharacterState): string {
  return `Identity appearance: ${promptId(character.appearance.ethnicityId)} appearance, ${promptId(character.appearance.skinToneId)} skin and ${promptId(character.appearance.eyeColorId)} eyes. Keep facial identity stable across every canonical view.`;
}

function faceSentence(character: CharacterState): string {
  const face = character.face;
  return [
    'Facial structure:',
    `${promptId(face.headShapeId)} head shape,`,
    `${promptId(face.foreheadSizeId)} forehead,`,
    `${promptId(face.eyebrowShapeId)} ${promptId(face.eyebrowThicknessId)} eyebrows,`,
    `${promptId(face.eyeShapeId)} ${promptId(face.eyeSizeId)} eyes with ${promptId(face.eyeSpacingId)} spacing,`,
    `${promptId(face.noseShapeId)} ${promptId(face.noseSizeId)} nose,`,
    `${promptId(face.lipShapeId)} lips,`,
    `${promptId(face.cheekboneTypeId)} cheekbones and ${promptId(face.chinShapeId)} chin.`,
  ].join(' ');
}

function hairSentence(character: CharacterState): string {
  const hair = character.appearance.hair;
  const extra = englishFreeText(hair.details);
  return `Hair: ${promptId(hair.lengthId)}, ${promptId(hair.typeId)}, ${promptId(hair.hairstyleId)}, ${promptId(hair.colorId)}.${extra ? ` Additional hair detail: ${extra}.` : ''}`;
}

function makeupSentence(character: CharacterState): string {
  if (!character.makeup.enabled) return 'Face styling: bare-face appearance with natural skin detail.';
  const details = [
    character.makeup.eyelinerStyleId ? `${promptId(character.makeup.eyelinerStyleId)} eyeliner` : null,
    character.makeup.eyeshadowColorId ? `${promptId(character.makeup.eyeshadowColorId)} eyeshadow` : null,
    character.makeup.lipstickColorId ? `${promptId(character.makeup.lipstickColorId)} lipstick` : null,
  ].filter(Boolean);
  const extra = englishFreeText(character.makeup.details);
  return `Face styling: ${details.join(', ')}.${extra ? ` Additional makeup detail: ${extra}.` : ''}`;
}

function stableDetailSentence(character: CharacterState, role: Flux2DevPhotoRole): string {
  const details: string[] = [];
  const skin = englishFreeText(character.appearance.skinDetails);
  const permanent = englishFreeText(character.permanentFeatures);
  const tattoo = englishFreeText(character.tattoos.description);

  if (skin) details.push(`Skin detail: ${skin}.`);
  if (permanent) details.push(`Permanent identity feature: ${permanent}.`);
  if (character.tattoos.enabled && tattoo && role !== 'face_closeup') details.push(`Visible tattoo identity marks: ${tattoo}.`);
  return details.join(' ');
}

function referenceSentence(referenceRoles: readonly string[]): string {
  if (referenceRoles.length === 0) return '';
  const references = referenceRoles.slice(0, 4).map((role, index) => `image ${index}: ${referenceRolePurpose(role)}`);
  return [
    `Reference roles: ${references.join('; ')}.`,
    'Use these images as hard identity and anatomy references, not as loose inspiration.',
    'Preserve the same person, facial proportions, body depth and silhouette across views.',
    'Do not inherit clothing, crop, pose, background or camera distortion from a reference when they conflict with the requested canonical shot.',
  ].join(' ');
}

function referenceRolePurpose(role: string): string {
  if (role === 'face_closeup') return 'primary facial identity and exact facial proportions';
  if (role === 'portrait') return 'facial identity and upper-body proportions';
  if (role === 'full_front') return 'front silhouette, limb proportions and canonical body geometry';
  if (role === 'full_back') return 'rear silhouette and canonical body geometry';
  if (role === 'profile_left') return 'side-profile silhouette, body depth and facial profile';
  return 'identity and relevant visible anatomy';
}

function cameraAndStudioSentence(role: Flux2DevPhotoRole): string {
  if (role === 'face_closeup') {
    return 'Camera calibration: eye-level 85mm-equivalent portrait lens, straight frontal face, no wide-angle distortion, full head inside frame, neutral light-gray seamless background and soft even studio lighting.';
  }
  if (role === 'portrait') {
    return 'Camera calibration: eye-level 85mm-equivalent portrait lens, frontal head-to-natural-waist framing, no perspective exaggeration, neutral light-gray seamless background and soft even studio lighting.';
  }
  return 'Camera calibration: 70mm-equivalent lens from sufficient distance, low perspective distortion, camera centered near mid-torso height, entire head-to-toe body and both feet inside frame, neutral light-gray seamless background and soft even studio lighting.';
}

function finalQualitySentence(fullBody: boolean): string {
  return [
    'Render one single high-fidelity canonical reference photograph.',
    'Use realistic anatomy, physically plausible joints, natural skin texture and stable identity.',
    fullBody ? 'The calibration clothing must keep the natural waist, upper hip line and waist-to-hip transition clearly visible.' : '',
    'Do not slim, enlarge, stylize or normalize the saved body geometry.',
  ].filter(Boolean).join(' ');
}

function shotSentence(role: Flux2DevPhotoRole): string {
  if (role === 'face_closeup') return 'Canonical close-up identity portrait with the full head visible, frontal face, neutral expression and eyes toward camera';
  if (role === 'portrait') return 'Canonical frontal upper-body portrait from the full head through the natural waist with relaxed shoulders and arms';
  if (role === 'full_front') return 'Canonical strict front-view full-body photograph, head-to-toe, neutral upright stance, both feet visible and arms relaxed slightly away from the torso';
  if (role === 'full_back') return 'Canonical strict back-view full-body photograph, head-to-toe, neutral upright stance, both feet visible, head aligned away from camera and arms relaxed slightly away from the torso';
  return 'Canonical exact left-side full-body profile photograph, head-to-toe, face and torso aligned at 90 degrees to camera, neutral upright stance and both feet visible';
}

function canonicalOutfit(character: CharacterState): string {
  if (character.identity.age < 18) return 'opaque modest beige athletic T-shirt with beige knee-length athletic shorts in plain matte fabric';
  return FLUX2_KLEIN_CANONICAL_OUTFIT;
}

function distributionPhrase(dna: BodyDNA): string {
  const s = dna.semantics;
  const peripheral = s.peripheralContrast === 'high' || s.peripheralContrast === 'very_high';
  const central = s.centrality === 'high' || s.centrality === 'very_high';
  if (peripheral && (s.upperLowerBalance === 'lower_dominant' || s.upperLowerBalance === 'slightly_lower_dominant')) {
    return 'Visible body volume is concentrated away from the waist and is strongest through the hips and lower body.';
  }
  if (peripheral && (s.upperLowerBalance === 'upper_dominant' || s.upperLowerBalance === 'slightly_upper_dominant')) {
    return 'Visible body volume is concentrated away from the waist and is strongest through the bust and upper torso.';
  }
  if (peripheral) return 'Visible body volume is concentrated away from the waist with balanced upper and lower curves.';
  if (central) return 'Visible body volume continues more smoothly through the midsection with a softer waist transition.';
  return 'Visible body volume is distributed relatively evenly through the torso and hips.';
}

function shapePhrase(shape: BodyDNA['semantics']['shape']): string {
  if (shape === 'hourglass') return 'a balanced hourglass silhouette';
  if (shape === 'pear') return 'a pear-shaped silhouette with a fuller lower body';
  if (shape === 'inverted_triangle') return 'an upper-body-dominant inverted-triangle silhouette';
  if (shape === 'oval') return 'an oval silhouette with more midsection volume';
  return 'a relatively straight rectangular silhouette';
}

function waistPhrase(level: BodyDNA['semantics']['waistDefinition']): string {
  if (level === 'minimal') return 'minimal waist indentation';
  if (level === 'subtle') return 'subtle waist indentation';
  if (level === 'moderate') return 'a clearly defined waist';
  if (level === 'pronounced') return 'a pronounced narrow waist';
  if (level === 'very_pronounced') return 'a very pronounced narrow waist';
  return 'an extremely pronounced narrow waist';
}

function scalePhrase(level: BodyDNA['semantics']['bustRelativeScale'], part: 'bust' | 'hips'): string {
  const scale = level === 'very_low' ? 'very small'
    : level === 'low' ? 'small'
      : level === 'moderate' ? 'moderate'
        : level === 'high' ? 'large'
          : 'very large';
  return `${scale} ${part} relative to height`;
}

function balancePhrase(value: BodyDNA['semantics']['upperLowerBalance']): string {
  if (value === 'upper_dominant') return 'an upper torso visibly fuller than the hips';
  if (value === 'slightly_upper_dominant') return 'an upper torso slightly fuller than the hips';
  if (value === 'lower_dominant') return 'hips and lower body visibly fuller than the upper torso';
  if (value === 'slightly_lower_dominant') return 'hips and lower body slightly fuller than the upper torso';
  return 'visually balanced upper and lower body volume';
}

function massPhrase(level: BodyDNA['semantics']['overallMass']): string {
  if (level === 'very_low') return 'very light overall body mass';
  if (level === 'low') return 'light overall body mass';
  if (level === 'moderate') return 'moderate overall body mass';
  if (level === 'high') return 'substantial overall body mass';
  return 'very substantial overall body mass';
}

function softTissuePhrase(level: BodyDNA['semantics']['softTissue']): string {
  if (level === 'very_low') return 'very low soft-tissue fullness';
  if (level === 'low') return 'low soft-tissue fullness';
  if (level === 'moderate') return 'moderate soft-tissue fullness';
  if (level === 'high') return 'high soft-tissue fullness';
  return 'very high soft-tissue fullness';
}

function buttockShape(id: string): string {
  if (id === 'a_shape') return 'A-shaped heart-like';
  if (id === 'v_shape') return 'V-shaped';
  return promptId(id);
}

function englishFreeText(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /[\u0400-\u04FF]/u.test(trimmed) ? '' : trimmed;
}

function promptId(id: string | null | undefined): string {
  if (!id) return 'unspecified';
  return id.replaceAll('_', ' ').replaceAll('-', ' ');
}
