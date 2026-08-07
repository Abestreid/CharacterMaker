import type { CharacterState, SceneState, WardrobeState } from '../domain';
import { uploadImageToInfinityFree, deleteImageFromInfinityFree, type MediaScope } from '../infrastructure/media/infinityfree-media.repository';
import { fetchPublicCatalogs } from '../infrastructure/supabase/catalog.repository';
import {
  fetchPublicCharacters,
  fetchPublicOutfits,
  fetchPublicScenes,
  type PublicCharacterPreset,
  type PublicOutfitPreset,
  type PublicScenePreset,
} from '../infrastructure/supabase/library.repository';
import { fetchPresetAssets, type PresetAsset } from '../infrastructure/supabase/preset-assets.repository';
import {
  attachInfinityFreeAsset,
  deleteAssetMetadata,
  deletePreset,
  savePreset,
  setAssetReferenceStatus,
  type AiContext,
  type PresetKind,
  type ReferenceStatus,
} from '../infrastructure/supabase/preset.repository';
import {
  characterStateToPreset,
  sceneStateToPreset,
  wardrobeStateToOutfitPreset,
  type PresetIdentity,
} from '../infrastructure/supabase/preset-mappers';
import {
  loadCharacterState,
  loadSceneState,
  loadWardrobeState,
} from '../infrastructure/supabase/preset-state.repository';

export const characterMakerService = {
  catalogs: {
    list: fetchPublicCatalogs,
  },
  characters: {
    list: fetchPublicCharacters,
    load: loadCharacterState,
    save: saveCharacter,
  },
  outfits: {
    list: fetchPublicOutfits,
    load: loadWardrobeState,
    save: saveOutfit,
  },
  scenes: {
    list: fetchPublicScenes,
    load: loadSceneState,
    save: saveScene,
  },
  presets: {
    archive: (kind: PresetKind, id: string) => deletePreset(kind, id, false),
    assets: (kind: PresetKind, id: string) => fetchPresetAssets(kind, id),
  },
  assets: {
    upload: uploadPresetAsset,
    remove: removePresetAsset,
    setReferenceStatus: setAssetReferenceStatus,
  },
} as const;

async function saveCharacter(identity: PresetIdentity, state: CharacterState): Promise<string> {
  const resolved = await preserveAiContext(identity, fetchPublicCharacters);
  return savePreset('character', characterStateToPreset(resolved, state));
}

async function saveOutfit(identity: PresetIdentity, state: WardrobeState): Promise<string> {
  const resolved = await preserveAiContext(identity, fetchPublicOutfits);
  return savePreset('outfit', wardrobeStateToOutfitPreset(resolved, state));
}

async function saveScene(identity: PresetIdentity, state: SceneState): Promise<string> {
  const resolved = await preserveAiContext(identity, fetchPublicScenes);
  return savePreset('scene', sceneStateToPreset(resolved, state));
}

async function preserveAiContext<T extends { id: string; aiContext: AiContext }>(
  identity: PresetIdentity,
  list: () => Promise<T[]>,
): Promise<PresetIdentity> {
  if (!identity.id || identity.aiContext !== undefined) return identity;
  const existing = (await list()).find((item) => item.id === identity.id);
  if (!existing) return identity;
  return { ...identity, aiContext: existing.aiContext };
}

async function uploadPresetAsset(input: {
  kind: PresetKind;
  ownerId: string;
  role: string;
  file: File;
  isPrimary?: boolean;
  referenceStatus?: ReferenceStatus;
}): Promise<string> {
  const uploaded = await uploadImageToInfinityFree({
    file: input.file,
    scope: scopeForKind(input.kind),
    entityId: input.ownerId,
    role: input.role,
  });

  try {
    return await attachInfinityFreeAsset({
      ownerKind: input.kind,
      ownerId: input.ownerId,
      role: input.role,
      objectPath: uploaded.objectPath,
      publicUrl: uploaded.publicUrl,
      fileName: uploaded.fileName,
      mimeType: uploaded.mimeType,
      sizeBytes: uploaded.sizeBytes,
      width: uploaded.width,
      height: uploaded.height,
      isPrimary: input.isPrimary ?? false,
      referenceStatus: input.referenceStatus ?? 'normal',
    });
  } catch (reason: unknown) {
    await deleteImageFromInfinityFree(uploaded.objectPath).catch(() => undefined);
    throw reason;
  }
}

async function removePresetAsset(asset: PresetAsset): Promise<void> {
  if (asset.objectPath) await deleteImageFromInfinityFree(asset.objectPath);
  await deleteAssetMetadata(asset.id);
}

function scopeForKind(kind: PresetKind): MediaScope {
  if (kind === 'character') return 'characters';
  if (kind === 'outfit') return 'outfits';
  return 'scenes';
}

export type { PublicCharacterPreset, PublicOutfitPreset, PublicScenePreset };
