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
import type { AiContext } from '../infrastructure/supabase/preset.repository';
import { characterMakerService } from './character-maker.service';

export type LabeledValue = {
  id: string | null;
  label: string | null;
};

export type ContextAsset = {
  id: string;
  role: string;
  isPrimary: boolean;
  referenceStatus: PresetAsset['referenceStatus'];
  publicUrl: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
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
  schemaVersion: 'generation-context-v1';
  character: CharacterContext;
  outfit: OutfitContext | null;
  scene: SceneContext | null;
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
  const allAssets = [
    ...character.assets,
    ...(outfit?.assets ?? []),
    ...(scene?.assets ?? []),
  ];
  return {
    schemaVersion: 'generation-context-v1',
    character,
    outfit,
    scene,
    canonicalAssets: allAssets.filter((asset) => asset.referenceStatus === 'canonical'),
    referenceAssets: allAssets.filter((asset) => asset.referenceStatus === 'canonical' || asset.referenceStatus === 'approved' || asset.referenceStatus === 'reference_only'),
  };
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
    referenceStatus: asset.referenceStatus,
    publicUrl: asset.publicUrl,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
  };
}
