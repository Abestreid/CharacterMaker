import type {
  BreastFirmnessId,
  BreastShapeId,
  BreastSizeId,
  ButtockFirmnessId,
  ButtockShapeId,
} from '../../domain/catalog/character/body';

export type CharacterBodyShapeProfile = {
  cupsize: number;
  breastFirmness: number;
  breastDistance: number;
  breastPoint: number;
  breastVertical: number;
  buttockVolume: number;
  hipDepth: number;
  hipWidth: number;
  hipHeight: number;
};

const clamp = (value: number, min = -1, max = 1) => Math.max(min, Math.min(max, value));

const CUPSIZE: Record<BreastSizeId, number> = {
  small: 0.12,
  medium: 0.5,
  large: 0.78,
  very_large: 1,
};

const FIRMNESS: Record<BreastFirmnessId, number> = {
  soft: 0.08,
  natural: 0.5,
  firm: 0.78,
  lifted: 1,
};

export function breastSizeToCupsize(value: BreastSizeId | null): number {
  return value ? CUPSIZE[value] : 0.5;
}

export function breastFirmnessToMacro(value: BreastFirmnessId | null): number {
  return value ? FIRMNESS[value] : 0.5;
}

export function buildCharacterBodyShapeProfile(input: {
  breastSizeId: BreastSizeId | null;
  breastShapeId: BreastShapeId | null;
  breastFirmnessId: BreastFirmnessId | null;
  buttockShapeId: ButtockShapeId | null;
  buttockFirmnessId: ButtockFirmnessId | null;
}): CharacterBodyShapeProfile {
  const profile: CharacterBodyShapeProfile = {
    cupsize: breastSizeToCupsize(input.breastSizeId),
    breastFirmness: breastFirmnessToMacro(input.breastFirmnessId),
    breastDistance: 0,
    breastPoint: 0,
    breastVertical: 0,
    buttockVolume: 0,
    hipDepth: 0,
    hipWidth: 0,
    hipHeight: 0,
  };

  // Size and firmness are MakeHuman macro dimensions. Shape remains a detail
  // profile layered on top so changing the categorical type does not silently
  // redefine the requested bust circumference.
  switch (input.breastShapeId) {
    case 'round':
      profile.breastPoint += 0.16;
      profile.breastVertical += 0.08;
      break;
    case 'teardrop':
      profile.breastVertical -= 0.2;
      profile.breastPoint += 0.06;
      break;
    case 'east_west':
      profile.breastDistance += 0.5;
      profile.breastPoint -= 0.08;
      break;
    case 'bell':
      profile.breastVertical -= 0.34;
      profile.breastPoint -= 0.08;
      break;
    case 'conical':
      profile.breastPoint += 0.58;
      break;
    case 'athletic':
      profile.breastVertical += 0.16;
      profile.breastPoint -= 0.18;
      break;
    case 'slender':
      profile.breastPoint -= 0.16;
      break;
    case 'asymmetrical':
      // Stock CC0 detail set has no clean left/right asymmetry pair. Keep a
      // small off-neutral profile until a dedicated corrective target is added.
      profile.breastDistance += 0.08;
      profile.breastVertical -= 0.05;
      break;
    case 'ptotic':
      profile.breastVertical -= 0.58;
      profile.breastPoint -= 0.22;
      break;
    case 'wide_set':
      profile.breastDistance += 0.68;
      break;
    case 'close_set':
      profile.breastDistance -= 0.68;
      break;
    default:
      break;
  }

  switch (input.buttockShapeId) {
    case 'a_shape':
      profile.buttockVolume += 0.22;
      profile.hipWidth += 0.3;
      profile.hipHeight -= 0.1;
      break;
    case 'v_shape':
      profile.buttockVolume -= 0.16;
      profile.hipWidth -= 0.24;
      profile.hipHeight += 0.12;
      break;
    case 'round':
      profile.buttockVolume += 0.48;
      profile.hipDepth += 0.2;
      break;
    case 'square':
      profile.buttockVolume += 0.1;
      profile.hipWidth += 0.4;
      profile.hipDepth -= 0.06;
      break;
    default:
      break;
  }

  switch (input.buttockFirmnessId) {
    case 'soft':
      profile.buttockVolume += 0.1;
      profile.hipHeight -= 0.08;
      break;
    case 'firm':
      profile.hipDepth += 0.1;
      profile.hipHeight += 0.08;
      break;
    case 'toned':
      profile.buttockVolume -= 0.04;
      profile.hipDepth += 0.16;
      profile.hipHeight += 0.14;
      break;
    default:
      break;
  }

  profile.breastDistance = clamp(profile.breastDistance);
  profile.breastPoint = clamp(profile.breastPoint);
  profile.breastVertical = clamp(profile.breastVertical);
  profile.buttockVolume = clamp(profile.buttockVolume);
  profile.hipDepth = clamp(profile.hipDepth);
  profile.hipWidth = clamp(profile.hipWidth);
  profile.hipHeight = clamp(profile.hipHeight);
  return profile;
}

export const CHARACTER_BODY_MACRO_PARAM_NAMES = {
  cupsize: 'cupsize',
  breastFirmness: 'breast_firmness',
} as const;
