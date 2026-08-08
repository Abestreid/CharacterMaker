import {
  ACCESSORIES,
  ASPECT_RATIOS,
  BACKGROUNDS,
  BASE_LAYER_TYPES,
  BOTTOM_TYPES,
  BREAST_FIRMNESS_OPTIONS,
  BREAST_SHAPES,
  BREAST_SIZE_OPTIONS,
  BUTTOCK_FIRMNESS_OPTIONS,
  BUTTOCK_SHAPES,
  CHARACTER_ORIENTATIONS,
  CHEEKBONE_TYPES,
  CHIN_SHAPES,
  CLOTHING_COLORS,
  CLOTHING_MATERIALS,
  EMOTIONS,
  ETHNICITIES,
  EYE_COLORS,
  EYEBROW_SHAPES,
  EYEBROW_THICKNESS_OPTIONS,
  EYELINER_STYLES,
  EYESHADOW_COLORS,
  EYE_SHAPES,
  EYE_SIZES,
  EYE_SPACING_OPTIONS,
  FOOTWEAR_TYPES,
  FOREHEAD_SIZES,
  GENDERS,
  HAIRSTYLES,
  HAIR_COLORS,
  HAIR_LENGTHS,
  HAIR_TYPES,
  HEAD_SHAPES,
  HORIZONTAL_CAMERA_ANGLES,
  IMAGE_STYLES,
  LIGHTING_TYPES,
  LIGHT_COLORS,
  LIPSTICK_COLORS,
  LIP_SHAPES,
  MOTIONS,
  MUSCLE_MASS_OPTIONS,
  NATURAL_LIGHT_TIMES,
  NOSE_SHAPES,
  NOSE_SIZES,
  OUTERWEAR_TYPES,
  POSES,
  SCENE_FILTERS,
  SHOT_TYPES,
  SKIN_TONES,
  STUDIO_LIGHT_SETUPS,
  TOP_TYPES,
  VERTICAL_CAMERA_ANGLES,
  getLabelById,
  type CharacterState,
  type SceneState,
  type WardrobeState,
} from '../domain';
import type { PresetAsset } from '../infrastructure/supabase/preset-assets.repository';
import type { AiContext, PresetKind } from '../infrastructure/supabase/preset.repository';
import { characterMakerService } from './character-maker.service';

export type LabeledValue = {
  id: string | null;
  label: string | null;
};

export type ContextAsset = {
  id: string;
  role: string;
  isPrimary: boolean;
  sortOrder: number;
  referenceStatus: PresetAsset['referenceStatus'];
  publicUrl: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
};

export type VisualPackage = {
  kind: PresetKind;
  assetCount: number;
  eligibleAssetCount: number;
  canonicalCount: number;
  approvedCount: number;
  referenceQuality: 'canonical' | 'approved' | 'fallback' | 'none';
  primaryFaceAsset: ContextAsset | null;
  primaryBodyAsset: ContextAsset | null;
  recommendedAssets: ContextAsset[];
  recommendedAssetIds: string[];
  warnings: string[];
};

export type EntityContext<TStructured> = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  schemaVersion: string;
  version: number;
  aiContext: AiContext;
  structured: TStructured;
  assets: ContextAsset[];
};

export type CharacterContext = EntityContext<ReturnType<typeof describeCharacter>>;
export type OutfitContext = EntityContext<ReturnType<typeof describeOutfit>>;
export type SceneContext = EntityContext<ReturnType<typeof describeScene>>;

export type GenerationContext = {
  schemaVersion: 'generation-context-v2';
  character: CharacterContext;
  outfit: OutfitContext | null;
  scene: SceneContext | null;
  visualPackage: {
    character: VisualPackage;
    outfit: VisualPackage | null;
    scene: VisualPackage | null;
    recommendedAssets: ContextAsset[];
    recommendedAssetIds: string[];
    primaryFaceAssetId: string | null;
    primaryBodyAssetId: string | null;
  };
  canonicalAssets: ContextAsset[];
  referenceAssets: ContextAsset[];
};

export async function getCharacterContext(characterId: string): Promise<CharacterContext> {
  const [items, stored, assets] = await Promise.all([
    characterMakerService.characters.list(),
    characterMakerService.characters.load(characterId),
    characterMakerService.presets.assets('character', characterId),
  ]);
  const item = items.find((candidate) => candidate.id === characterId);
  if (!item) throw new Error(`Персона ${characterId} не найдена в активной публичной библиотеке.`);
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    schemaVersion: stored.schemaVersion,
    version: stored.version,
    aiContext: item.aiContext,
    structured: describeCharacter(stored.state),
    assets: assets.map(contextAsset),
  };
}

export async function getOutfitContext(outfitId: string): Promise<OutfitContext> {
  const [items, stored, assets] = await Promise.all([
    characterMakerService.outfits.list(),
    characterMakerService.outfits.load(outfitId),
    characterMakerService.presets.assets('outfit', outfitId),
  ]);
  const item = items.find((candidate) => candidate.id === outfitId);
  if (!item) throw new Error(`Образ ${outfitId} не найден в активной публичной библиотеке.`);
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    schemaVersion: stored.schemaVersion,
    version: stored.version,
    aiContext: item.aiContext,
    structured: describeOutfit(stored.state),
    assets: assets.map(contextAsset),
  };
}

export async function getSceneContext(sceneId: string): Promise<SceneContext> {
  const [items, stored, assets] = await Promise.all([
    characterMakerService.scenes.list(),
    characterMakerService.scenes.load(sceneId),
    characterMakerService.presets.assets('scene', sceneId),
  ]);
  const item = items.find((candidate) => candidate.id === sceneId);
  if (!item) throw new Error(`Сцена ${sceneId} не найдена в активной публичной библиотеке.`);
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    schemaVersion: stored.schemaVersion,
    version: stored.version,
    aiContext: item.aiContext,
    structured: describeScene(stored.state),
    assets: assets.map(contextAsset),
  };
}

export async function buildGenerationContext(input: {
  characterId: string;
  outfitId?: string | null;
  sceneId?: string | null;
}): Promise<GenerationContext> {
  const [character, outfit, scene] = await Promise.all([
    getCharacterContext(input.characterId),
    input.outfitId ? getOutfitContext(input.outfitId) : Promise.resolve(null),
    input.sceneId ? getSceneContext(input.sceneId) : Promise.resolve(null),
  ]);

  const characterVisual = buildVisualPackage('character', character.assets);
  const outfitVisual = outfit ? buildVisualPackage('outfit', outfit.assets) : null;
  const sceneVisual = scene ? buildVisualPackage('scene', scene.assets) : null;
  const recommendedAssets = recommendedGenerationAssets(characterVisual, outfitVisual, sceneVisual);
  const allAssets = [
    ...character.assets,
    ...(outfit?.assets ?? []),
    ...(scene?.assets ?? []),
  ];

  return {
    schemaVersion: 'generation-context-v2',
    character,
    outfit,
    scene,
    visualPackage: {
      character: characterVisual,
      outfit: outfitVisual,
      scene: sceneVisual,
      recommendedAssets,
      recommendedAssetIds: recommendedAssets.map((asset) => asset.id),
      primaryFaceAssetId: characterVisual.primaryFaceAsset?.id ?? null,
      primaryBodyAssetId: characterVisual.primaryBodyAsset?.id ?? null,
    },
    canonicalAssets: allAssets.filter((asset) => asset.referenceStatus === 'canonical'),
    referenceAssets: allAssets.filter((asset) => asset.referenceStatus === 'canonical' || asset.referenceStatus === 'approved' || asset.referenceStatus === 'reference_only'),
  };
}

export function buildVisualPackage(kind: PresetKind, assets: readonly ContextAsset[]): VisualPackage {
  const eligible = assets.filter((asset) => asset.referenceStatus !== 'rejected');
  const ranked = [...eligible].sort((a, b) => assetScore(kind, b) - assetScore(kind, a));
  const primaryFaceAsset = kind === 'character' ? ranked.find((asset) => isFaceRole(asset.role)) ?? null : null;
  const primaryBodyAsset = kind === 'character' ? ranked.find((asset) => isBodyRole(asset.role)) ?? null : null;
  const recommendedAssets = uniqueAssets([primaryFaceAsset, primaryBodyAsset, ...ranked].filter((asset): asset is ContextAsset => asset !== null));
  const canonicalCount = eligible.filter((asset) => asset.referenceStatus === 'canonical').length;
  const approvedCount = eligible.filter((asset) => asset.referenceStatus === 'approved').length;
  const warnings: string[] = [];

  if (eligible.length === 0) warnings.push('No active non-rejected visual assets are linked to this preset.');
  if (eligible.length > 0 && canonicalCount === 0 && approvedCount === 0) warnings.push('No canonical/approved visual asset is available; fallback references are being used.');
  if (kind === 'character' && eligible.length > 0 && !primaryFaceAsset) warnings.push('No face/portrait role is available.');
  if (kind === 'character' && eligible.length > 0 && !primaryBodyAsset) warnings.push('No dedicated full-body/body-reference role is available.');

  return {
    kind,
    assetCount: assets.length,
    eligibleAssetCount: eligible.length,
    canonicalCount,
    approvedCount,
    referenceQuality: canonicalCount > 0 ? 'canonical' : approvedCount > 0 ? 'approved' : eligible.length > 0 ? 'fallback' : 'none',
    primaryFaceAsset,
    primaryBodyAsset,
    recommendedAssets,
    recommendedAssetIds: recommendedAssets.map((asset) => asset.id),
    warnings,
  };
}

function recommendedGenerationAssets(character: VisualPackage, outfit: VisualPackage | null, scene: VisualPackage | null): ContextAsset[] {
  const face = character.primaryFaceAsset;
  const body = character.primaryBodyAsset;
  const outfitPrimary = outfit?.recommendedAssets[0] ?? null;
  const scenePrimary = scene?.recommendedAssets[0] ?? null;
  return uniqueAssets([
    face,
    body,
    outfitPrimary,
    scenePrimary,
    ...character.recommendedAssets,
    ...(outfit?.recommendedAssets ?? []),
    ...(scene?.recommendedAssets ?? []),
  ].filter((asset): asset is ContextAsset => asset !== null));
}

function uniqueAssets(assets: readonly ContextAsset[]): ContextAsset[] {
  const seen = new Set<string>();
  return assets.filter((asset) => {
    if (seen.has(asset.id)) return false;
    seen.add(asset.id);
    return true;
  });
}

function assetScore(kind: PresetKind, asset: ContextAsset): number {
  const statusScore: Record<ContextAsset['referenceStatus'], number> = {
    canonical: 5000,
    approved: 4000,
    reference_only: 3000,
    normal: 1000,
    rejected: -100000,
  };
  return statusScore[asset.referenceStatus] + (asset.isPrimary ? 500 : 0) + roleScore(kind, asset.role) - asset.sortOrder;
}

function roleScore(kind: PresetKind, role: string): number {
  const character: Record<string, number> = {
    face_closeup: 1200,
    face: 1150,
    portrait: 1100,
    headshot: 1050,
    full_front: 1000,
    full_body_front: 1000,
    body_reference: 950,
    full_body: 900,
    left_profile: 800,
    right_profile: 800,
    profile: 790,
    hair_reference: 700,
    full_back: 650,
    reference: 500,
    cover: 400,
  };
  const outfit: Record<string, number> = {
    on_model: 1100,
    front: 1050,
    cover: 1000,
    back: 800,
    side: 750,
    detail: 650,
    texture: 600,
    reference: 500,
  };
  const scene: Record<string, number> = {
    reference: 1100,
    background_reference: 1050,
    style_reference: 1000,
    preview: 900,
    cover: 850,
  };
  return (kind === 'character' ? character : kind === 'outfit' ? outfit : scene)[role] ?? 100;
}

function isFaceRole(role: string): boolean {
  return ['face_closeup', 'face', 'portrait', 'headshot', 'left_profile', 'right_profile', 'profile'].includes(role);
}

function isBodyRole(role: string): boolean {
  return ['full_front', 'full_body_front', 'body_reference', 'full_body', 'full_back'].includes(role);
}

function describeCharacter(state: CharacterState) {
  return {
    identity: {
      gender: labeled(GENDERS, state.identity.genderId),
      age: state.identity.age,
    },
    body: {
      heightCm: state.body.height,
      weightKg: state.body.weight,
      bustCm: state.body.bust,
      waistCm: state.body.waist,
      hipsCm: state.body.hips,
      bodyFatPercent: state.body.bodyFat,
      muscleMass: labeled(MUSCLE_MASS_OPTIONS, state.body.muscleMassId),
      breastSize: labeled(BREAST_SIZE_OPTIONS, state.body.breastSizeId),
      breastShape: labeled(BREAST_SHAPES, state.body.breastShapeId),
      breastFirmness: labeled(BREAST_FIRMNESS_OPTIONS, state.body.breastFirmnessId),
      buttockShape: labeled(BUTTOCK_SHAPES, state.body.buttockShapeId),
      buttockFirmness: labeled(BUTTOCK_FIRMNESS_OPTIONS, state.body.buttockFirmnessId),
    },
    appearance: {
      ethnicity: labeled(ETHNICITIES, state.appearance.ethnicityId),
      skinTone: labeled(SKIN_TONES, state.appearance.skinToneId),
      skinDetails: state.appearance.skinDetails,
      eyeColor: labeled(EYE_COLORS, state.appearance.eyeColorId),
      imageStyle: labeled(IMAGE_STYLES, state.appearance.imageStyleId),
      hair: {
        length: labeled(HAIR_LENGTHS, state.appearance.hair.lengthId),
        type: labeled(HAIR_TYPES, state.appearance.hair.typeId),
        hairstyle: labeled(HAIRSTYLES, state.appearance.hair.hairstyleId),
        color: labeled(HAIR_COLORS, state.appearance.hair.colorId),
        details: state.appearance.hair.details,
      },
    },
    face: {
      headShape: labeled(HEAD_SHAPES, state.face.headShapeId),
      foreheadSize: labeled(FOREHEAD_SIZES, state.face.foreheadSizeId),
      eyebrowShape: labeled(EYEBROW_SHAPES, state.face.eyebrowShapeId),
      eyebrowThickness: labeled(EYEBROW_THICKNESS_OPTIONS, state.face.eyebrowThicknessId),
      eyeShape: labeled(EYE_SHAPES, state.face.eyeShapeId),
      eyeSize: labeled(EYE_SIZES, state.face.eyeSizeId),
      eyeSpacing: labeled(EYE_SPACING_OPTIONS, state.face.eyeSpacingId),
      noseShape: labeled(NOSE_SHAPES, state.face.noseShapeId),
      noseSize: labeled(NOSE_SIZES, state.face.noseSizeId),
      lipShape: labeled(LIP_SHAPES, state.face.lipShapeId),
      cheekbones: labeled(CHEEKBONE_TYPES, state.face.cheekboneTypeId),
      chinShape: labeled(CHIN_SHAPES, state.face.chinShapeId),
    },
    makeup: {
      enabled: state.makeup.enabled,
      eyelinerStyle: labeled(EYELINER_STYLES, state.makeup.eyelinerStyleId),
      eyeshadowColor: labeled(EYESHADOW_COLORS, state.makeup.eyeshadowColorId),
      lipstickColor: labeled(LIPSTICK_COLORS, state.makeup.lipstickColorId),
      details: state.makeup.details,
    },
    tattoos: state.tattoos,
    permanentFeatures: state.permanentFeatures,
  };
}

function describeOutfit(state: WardrobeState) {
  return {
    baseLayer: describeLayer(state.baseLayer, BASE_LAYER_TYPES),
    top: describeLayer(state.top, TOP_TYPES),
    bottom: describeLayer(state.bottom, BOTTOM_TYPES),
    outerwear: describeLayer(state.outerwear, OUTERWEAR_TYPES),
    footwear: describeLayer(state.footwear, FOOTWEAR_TYPES),
    accessories: state.accessoryIds.map((id) => labeled(ACCESSORIES, id)),
    customDescription: state.customDescription,
  };
}

function describeScene(state: SceneState) {
  return {
    character: {
      mode: state.character.mode,
      pose: labeled(POSES, state.character.poseId),
      motion: labeled(MOTIONS, state.character.motionId),
      emotion: labeled(EMOTIONS, state.character.emotionId),
      orientation: labeled(CHARACTER_ORIENTATIONS, state.character.orientationId),
    },
    camera: {
      shotType: labeled(SHOT_TYPES, state.camera.shotTypeId),
      verticalAngle: labeled(VERTICAL_CAMERA_ANGLES, state.camera.verticalAngleId),
      horizontalAngle: labeled(HORIZONTAL_CAMERA_ANGLES, state.camera.horizontalAngleId),
      aspectRatio: labeled(ASPECT_RATIOS, state.camera.aspectRatioId),
    },
    environment: {
      background: labeled(BACKGROUNDS, state.environment.backgroundId),
      customBackground: state.environment.customBackground,
    },
    lighting: {
      type: labeled(LIGHTING_TYPES, state.lighting.typeId),
      naturalTime: labeled(NATURAL_LIGHT_TIMES, state.lighting.naturalTimeId),
      studioSetup: labeled(STUDIO_LIGHT_SETUPS, state.lighting.studioSetupId),
      mainLightColor: labeled(LIGHT_COLORS, state.lighting.mainLightColorId),
      accentLightColor: labeled(LIGHT_COLORS, state.lighting.accentLightColorId),
      colorTemperatureK: state.lighting.colorTemperature,
    },
    style: {
      imageStyle: labeled(IMAGE_STYLES, state.style.imageStyleId),
      filter: labeled(SCENE_FILTERS, state.style.filterId),
    },
    reference: {
      useClothing: state.reference.useClothing,
      useExpression: state.reference.useExpression,
    },
  };
}

function describeLayer<T extends string>(
  layer: { typeId: T; colorId: string | null; materialId: string | null },
  types: readonly { id: T; label: string }[],
) {
  return {
    type: labeled(types, layer.typeId),
    color: labeled(CLOTHING_COLORS, layer.colorId),
    material: labeled(CLOTHING_MATERIALS, layer.materialId),
  };
}

function labeled<T extends string>(options: readonly { id: T; label: string }[], id: T | null): LabeledValue {
  return {
    id,
    label: id === null ? null : getLabelById(options, id),
  };
}

function contextAsset(asset: PresetAsset): ContextAsset {
  return {
    id: asset.id,
    role: asset.role,
    isPrimary: asset.isPrimary,
    sortOrder: asset.sortOrder,
    referenceStatus: asset.referenceStatus,
    publicUrl: asset.publicUrl,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
  };
}
