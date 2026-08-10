import { normalizeBody, type BodyDNA, type CharacterState } from '../../domain';

export type Flux2KleinPhotoRole = 'face_closeup' | 'portrait' | 'full_front' | 'full_back' | 'profile_left';

export const FLUX2_KLEIN_4B_GUIDANCE = 1.0;

export const FLUX2_KLEIN_CANONICAL_OUTFIT = 'opaque fitted beige athletic crop top ending clearly above the natural waist, with low-to-mid-rise short fitted beige athletic shorts in plain matte fabric; the natural waist, upper hip line and waist-to-hip transition remain fully visible';

export function buildFlux2KleinPersonaPhotoPrompt(input: {
  character: CharacterState;
  role: Flux2KleinPhotoRole;
  referenceRoles?: readonly string[];
}): string {
  const { character, role } = input;
  const fullBody = role === 'full_front' || role === 'full_back' || role === 'profile_left';
  const sections: string[] = [];

  sections.push(openingSentence(character, role));

  if (fullBody) {
    sections.push(fullBodyGeometry(character));
    sections.push(fullBodyComposition(character));
    sections.push(bodyDetailSentence(character));
    sections.push(`Calibration clothing: ${canonicalOutfit(character)}.`);
  } else if (role === 'portrait') {
    sections.push(upperBodyGeometry(character));
    sections.push(upperBodyComposition(character));
    sections.push(upperBodyDetailSentence(character));
    sections.push(`Calibration clothing: ${canonicalOutfit(character)}.`);
  }

  sections.push(identitySentence(character));
  sections.push(faceSentence(character));
  sections.push(hairSentence(character));
  const makeup = makeupSentence(character);
  if (makeup) sections.push(makeup);
  const stableDetails = stableDetailSentence(character, role);
  if (stableDetails) sections.push(stableDetails);

  const references = referenceSentence(input.referenceRoles ?? []);
  if (references) sections.push(references);

  sections.push(cameraAndStudioSentence(role));
  sections.push('Render one single canonical reference photograph with realistic anatomy, natural skin texture, sharp subject detail and the complete required framing inside the image.');

  return sections.join('\n\n');
}

function openingSentence(character: CharacterState, role: Flux2KleinPhotoRole): string {
  const subject = `${character.identity.age}-year-old ${promptId(character.identity.genderId)}`;
  const style = promptId(character.appearance.imageStyleId);
  return `${shotSentence(role)} of one ${subject}, ${style}. The saved identity and body geometry are the primary visual requirements.`;
}

function fullBodyGeometry(character: CharacterState): string {
  const dna = normalizeBody(character);
  const { ratios: r, semantics: s, raw } = dna;
  return [
    `Body geometry: ${shapePhrase(s.shape)}, ${waistPhrase(s.waistDefinition)}, ${bustScalePhrase(s.bustRelativeScale)}, ${hipsScalePhrase(s.hipsRelativeScale)}, ${balancePhrase(s.upperLowerBalance)}.`,
    distributionPhrase(dna),
    `Canonical measurement anchors: height ${raw.heightCm} cm, weight ${raw.weightKg} kg, bust/waist/hips ${raw.bustCm}/${raw.waistCm}/${raw.hipsCm} cm, body fat ${raw.bodyFatPercent}%.`,
    `Relative geometry: bust-to-height ${r.bustToHeight}, waist-to-height ${r.waistToHeight}, hips-to-height ${r.hipsToHeight}; bust-to-waist ${r.bustToWaist}, hips-to-waist ${r.hipsToWaist}, waist-to-hips ${r.waistToHips}, bust-to-hips ${r.bustToHips}. Treat these proportions as the canonical silhouette.`
  ].join(' ');
}

function upperBodyGeometry(character: CharacterState): string {
  const dna = normalizeBody(character);
  const { ratios: r, semantics: s, raw } = dna;
  return [
    `Upper-body geometry: ${bustScalePhrase(s.bustRelativeScale)} and ${waistPhrase(s.waistDefinition)}.`,
    `Canonical upper-body anchors: bust ${raw.bustCm} cm, waist ${raw.waistCm} cm, body fat ${raw.bodyFatPercent}%.`,
    `Relevant proportions: bust-to-height ${r.bustToHeight}, waist-to-height ${r.waistToHeight}, bust-to-waist ${r.bustToWaist}, waist-to-bust ${r.waistToBust}.`
  ].join(' ');
}

function fullBodyComposition(character: CharacterState): string {
  const dna = normalizeBody(character);
  const c = dna.composition;
  const s = dna.semantics;
  return `Body composition: ${massPhrase(s.overallMass)} for the stated height, ${softTissuePhrase(s.softTissue)}, ${muscularityPhrase(character.body.muscleMassId, s.muscularity)}. Composition anchors: BMI ${c.bmi}, fat mass ${c.fatMassKg} kg, lean mass ${c.leanMassKg} kg, FMI ${c.fmi}, FFMI ${c.ffmi}.`;
}

function upperBodyComposition(character: CharacterState): string {
  const dna = normalizeBody(character);
  const s = dna.semantics;
  return `Visible tissue character: ${softTissuePhrase(s.softTissue)} with ${muscularityPhrase(character.body.muscleMassId, s.muscularity)}.`;
}

function bodyDetailSentence(character: CharacterState): string {
  if (character.identity.genderId !== 'female') return `Torso musculature: ${promptId(character.body.muscleMassId)}.`;
  const details = [
    character.body.breastShapeId ? `${promptId(character.body.breastShapeId)} breast shape` : null,
    character.body.breastFirmnessId ? `${promptId(character.body.breastFirmnessId)} breast tissue` : null,
    character.body.buttockShapeId ? `${buttockShape(character.body.buttockShapeId)} buttock shape` : null,
    character.body.buttockFirmnessId ? `${promptId(character.body.buttockFirmnessId)} buttock tissue` : null,
  ].filter(Boolean);
  return details.length ? `Body-form details: ${details.join(', ')}.` : '';
}

function upperBodyDetailSentence(character: CharacterState): string {
  if (character.identity.genderId !== 'female') return `Torso musculature: ${promptId(character.body.muscleMassId)}.`;
  const details = [
    character.body.breastShapeId ? `${promptId(character.body.breastShapeId)} breast shape` : null,
    character.body.breastFirmnessId ? `${promptId(character.body.breastFirmnessId)} breast tissue` : null,
  ].filter(Boolean);
  return details.length ? `Upper-body form details: ${details.join(', ')}.` : '';
}

function identitySentence(character: CharacterState): string {
  return `Identity appearance: ${promptId(character.appearance.ethnicityId)} appearance, ${promptId(character.appearance.skinToneId)} skin, ${promptId(character.appearance.eyeColorId)} eyes.`;
}

function faceSentence(character: CharacterState): string {
  const f = character.face;
  return `Face: ${promptId(f.headShapeId)} head shape, ${promptId(f.foreheadSizeId)} forehead, ${promptId(f.eyebrowShapeId)} ${promptId(f.eyebrowThicknessId)} eyebrows, ${promptId(f.eyeShapeId)} ${promptId(f.eyeSizeId)} eyes with ${promptId(f.eyeSpacingId)} spacing, ${promptId(f.noseShapeId)} ${promptId(f.noseSizeId)} nose, ${promptId(f.lipShapeId)} lips, ${promptId(f.cheekboneTypeId)} cheekbones, ${promptId(f.chinShapeId)} chin.`;
}

function hairSentence(character: CharacterState): string {
  const h = character.appearance.hair;
  const extra = h.details.trim() ? ` Additional hair detail: ${h.details.trim()}.` : '';
  return `Hair: ${promptId(h.lengthId)}, ${promptId(h.typeId)}, ${promptId(h.hairstyleId)}, ${promptId(h.colorId)}.${extra}`;
}

function makeupSentence(character: CharacterState): string {
  if (!character.makeup.enabled) return 'Face styling: bare-face appearance with natural skin detail.';
  const details = [
    character.makeup.eyelinerStyleId ? `${promptId(character.makeup.eyelinerStyleId)} eyeliner` : null,
    character.makeup.eyeshadowColorId ? `${promptId(character.makeup.eyeshadowColorId)} eyeshadow` : null,
    character.makeup.lipstickColorId ? `${promptId(character.makeup.lipstickColorId)} lipstick` : null,
  ].filter(Boolean);
  const extra = character.makeup.details.trim() ? ` Additional makeup detail: ${character.makeup.details.trim()}.` : '';
  return `Face styling: ${details.join(', ')}.${extra}`;
}

function stableDetailSentence(character: CharacterState, role: Flux2KleinPhotoRole): string {
  const details: string[] = [];
  if (character.appearance.skinDetails.trim()) details.push(`Skin detail: ${character.appearance.skinDetails.trim()}.`);
  if (character.permanentFeatures.trim()) details.push(`Permanent identity feature: ${character.permanentFeatures.trim()}.`);
  if (character.tattoos.enabled && character.tattoos.description.trim() && role !== 'face_closeup') {
    details.push(`Visible tattoo identity marks: ${character.tattoos.description.trim()}.`);
  }
  return details.join(' ');
}

function referenceSentence(referenceRoles: readonly string[]): string {
  if (referenceRoles.length === 0) return '';
  const descriptions = referenceRoles.slice(0, 4).map((role, index) => `image ${index} (${role}): ${referenceRolePurpose(role)}`);
  return `Reference images: ${descriptions.join('; ')}. Use the references for identity and the stated role-specific anatomy, while the current prompt defines the requested camera, pose, calibration clothing and studio setup.`;
}

function referenceRolePurpose(role: string): string {
  if (role === 'face_closeup') return 'primary facial identity and facial proportions';
  if (role === 'portrait') return 'facial identity and upper-body proportions';
  if (role === 'full_front') return 'canonical full-body proportions and front silhouette';
  if (role === 'full_back') return 'canonical rear silhouette and body proportions';
  if (role === 'profile_left') return 'canonical side-profile silhouette and body depth';
  return 'identity and relevant visible anatomy';
}

function cameraAndStudioSentence(role: Flux2KleinPhotoRole): string {
  if (role === 'face_closeup') return 'Camera and studio: eye-level 85mm-equivalent portrait lens, symmetrical frontal framing, clean light-gray seamless studio background, soft even frontal lighting.';
  if (role === 'portrait') return 'Camera and studio: eye-level 85mm-equivalent portrait lens, frontal head-to-waist framing, clean light-gray seamless studio background, soft even frontal lighting.';
  return 'Camera and studio: 70mm-equivalent lens from sufficient distance for low perspective distortion, camera centered around mid-torso height, clean light-gray seamless studio background, soft even frontal lighting.';
}

function shotSentence(role: Flux2KleinPhotoRole): string {
  if (role === 'face_closeup') return 'Canonical close-up portrait, full head visible, straight frontal face, relaxed neutral expression, eyes toward camera';
  if (role === 'portrait') return 'Canonical frontal upper-body portrait from full head through the natural waist, relaxed shoulders and arms';
  if (role === 'full_front') return 'Canonical strict front-view full-body photograph, head-to-toe with both feet visible, neutral upright stance, arms relaxed slightly away from the torso';
  if (role === 'full_back') return 'Canonical strict back-view full-body photograph, head-to-toe with both feet visible, head aligned straight away from the camera, neutral upright stance, arms relaxed slightly away from the torso';
  return 'Canonical exact left-side full-body profile photograph, head-to-toe with both feet visible, face and torso aligned at 90 degrees to the camera, neutral upright stance';
}

function canonicalOutfit(character: CharacterState): string {
  if (character.identity.age < 18) return 'opaque modest beige athletic T-shirt with beige knee-length athletic shorts in plain matte fabric';
  return FLUX2_KLEIN_CANONICAL_OUTFIT;
}

function distributionPhrase(dna: BodyDNA): string {
  const { semantics: s } = dna;
  const peripheral = s.peripheralContrast === 'high' || s.peripheralContrast === 'very_high';
  const central = s.centrality === 'high' || s.centrality === 'very_high';
  if (peripheral && (s.upperLowerBalance === 'lower_dominant' || s.upperLowerBalance === 'slightly_lower_dominant')) {
    return 'Visible body volume is concentrated away from the waist, especially through the hips and lower body.';
  }
  if (peripheral && (s.upperLowerBalance === 'upper_dominant' || s.upperLowerBalance === 'slightly_upper_dominant')) {
    return 'Visible body volume is concentrated away from the waist, especially through the bust and upper torso.';
  }
  if (peripheral) return 'Visible body volume is concentrated away from the waist with balanced upper and lower curves.';
  if (central) return 'Visible body volume runs more continuously through the midsection with a softer waist transition.';
  return 'Visible body volume is distributed relatively evenly through the torso and hips.';
}

function shapePhrase(shape: BodyDNA['semantics']['shape']): string {
  if (shape === 'hourglass') return 'balanced hourglass silhouette';
  if (shape === 'pear') return 'pear-shaped silhouette with a fuller lower body';
  if (shape === 'inverted_triangle') return 'upper-body-dominant inverted-triangle silhouette';
  if (shape === 'oval') return 'oval silhouette with more midsection volume';
  return 'relatively straight rectangular silhouette';
}

function waistPhrase(level: BodyDNA['semantics']['waistDefinition']): string {
  if (level === 'minimal') return 'minimal waist indentation';
  if (level === 'subtle') return 'subtle waist indentation';
  if (level === 'moderate') return 'clearly defined waist';
  if (level === 'pronounced') return 'pronounced narrow waist';
  if (level === 'very_pronounced') return 'very pronounced narrow waist';
  return 'extremely pronounced narrow waist';
}

function bustScalePhrase(level: BodyDNA['semantics']['bustRelativeScale']): string {
  return `${levelPhrase(level)} bust circumference relative to height`;
}

function hipsScalePhrase(level: BodyDNA['semantics']['hipsRelativeScale']): string {
  return `${levelPhrase(level)} hip circumference relative to height`;
}

function balancePhrase(value: BodyDNA['semantics']['upperLowerBalance']): string {
  if (value === 'upper_dominant') return 'upper torso visibly fuller than hips';
  if (value === 'slightly_upper_dominant') return 'upper torso slightly fuller than hips';
  if (value === 'lower_dominant') return 'hips and lower body visibly fuller than upper torso';
  if (value === 'slightly_lower_dominant') return 'hips and lower body slightly fuller than upper torso';
  return 'upper and lower body visually balanced';
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

function muscularityPhrase(muscleMassId: CharacterState['body']['muscleMassId'], level: BodyDNA['semantics']['muscularity']): string {
  return `${promptId(muscleMassId)} muscular character (${levelPhrase(level)} relative muscularity)`;
}

function levelPhrase(level: BodyDNA['semantics']['bustRelativeScale']): string {
  if (level === 'very_low') return 'very small';
  if (level === 'low') return 'small';
  if (level === 'moderate') return 'moderate';
  if (level === 'high') return 'large';
  return 'very large';
}

function buttockShape(id: string): string {
  if (id === 'a_shape') return 'A-shaped heart-like';
  if (id === 'v_shape') return 'V-shaped';
  return promptId(id);
}

function promptId(id: string | null | undefined): string {
  if (!id) return 'unspecified';
  return id.replaceAll('_', ' ').replaceAll('-', ' ');
}
