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
  patchPreset,
  savePreset,
  setAssetReferenceStatus,
  type AiContext,
  type ParameterValueInput,
  type PresetKind,
  type PresetPatch,
  type PresetPayload,
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
  if (!identity.id) return savePreset('character', characterStateToPreset(identity, state));

  const presets = await fetchPublicCharacters();
  const existing = presets.find((item) => item.id === identity.id);
  if (!existing) throw new Error(`Персона не найдена: ${identity.id}`);
  const stored = await loadCharacterState(identity.id);
  const resolved = resolveIdentity(identity, existing);
  const baselineIdentity = identityFromExisting(existing);
  const baseline = characterStateToPreset(baselineIdentity, stored.state);
  const current = characterStateToPreset(resolved, state);
  const patch = buildStatePatch('character', baseline, current, resolved, 'character-state-v3');
  if (!hasPatchChanges(patch)) return identity.id;
  return patchPreset('character', identity.id, patch, identity.expectedVersion ?? stored.version);
}

async function saveOutfit(identity: PresetIdentity, state: WardrobeState): Promise<string> {
  if (!identity.id) return savePreset('outfit', wardrobeStateToOutfitPreset(identity, state));

  const presets = await fetchPublicOutfits();
  const existing = presets.find((item) => item.id === identity.id);
  if (!existing) throw new Error(`Образ не найден: ${identity.id}`);
  const stored = await loadWardrobeState(identity.id);
  const resolved = resolveIdentity(identity, existing);
  const baselineIdentity = identityFromExisting(existing);
  const baseline = wardrobeStateToOutfitPreset(baselineIdentity, stored.state);
  const current = wardrobeStateToOutfitPreset(resolved, state);
  const patch = buildStatePatch('outfit', baseline, current, resolved, 'wardrobe-state-v2');
  if (!hasPatchChanges(patch)) return identity.id;
  return patchPreset('outfit', identity.id, patch, identity.expectedVersion ?? stored.version);
}

async function saveScene(identity: PresetIdentity, state: SceneState): Promise<string> {
  if (!identity.id) return savePreset('scene', sceneStateToPreset(identity, state));

  const presets = await fetchPublicScenes();
  const existing = presets.find((item) => item.id === identity.id);
  if (!existing) throw new Error(`Сцена не найдена: ${identity.id}`);
  const stored = await loadSceneState(identity.id);
  const resolved = resolveIdentity(identity, existing);
  const baselineIdentity = identityFromExisting(existing);
  const baseline = sceneStateToPreset(baselineIdentity, stored.state);
  const current = sceneStateToPreset(resolved, state);
  const patch = buildStatePatch('scene', baseline, current, resolved, 'scene-state-v3');
  if (!hasPatchChanges(patch)) return identity.id;
  return patchPreset('scene', identity.id, patch, identity.expectedVersion ?? stored.version);
}

type ExistingPresetIdentity = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  version: number;
  aiContext: AiContext;
};

function resolveIdentity(identity: PresetIdentity, existing: ExistingPresetIdentity): PresetIdentity {
  return {
    ...identity,
    id: existing.id,
    aiContext: identity.aiContext ?? existing.aiContext,
  };
}

function identityFromExisting(existing: ExistingPresetIdentity): PresetIdentity {
  return {
    id: existing.id,
    slug: existing.slug,
    name: existing.name,
    description: existing.description,
    expectedVersion: existing.version,
    aiContext: existing.aiContext,
  };
}

const PATCHABLE_TOP_LEVEL_KEYS = [
  'slug',
  'name',
  'description',
  'schema_version',
  'ai_context',
  'age',
  'height_cm',
  'weight_kg',
  'bust_cm',
  'waist_cm',
  'hips_cm',
  'body_fat_percent',
  'physique_description',
  'category',
  'suggested_background_id',
  'background_id',
  'background_slug',
  'custom_background_text',
  'prompt_text',
  'reference_use_clothing',
  'reference_use_expression',
] as const;

export function buildStatePatch(
  _kind: PresetKind,
  baseline: PresetPayload,
  current: PresetPayload,
  identity: PresetIdentity,
  schemaVersion: string,
): PresetPatch {
  const patch: PresetPatch = {};
  const mutablePatch = patch as Record<string, unknown>;
  const candidate: PresetPayload = {
    ...current,
    name: identity.name,
    slug: identity.slug,
    schema_version: schemaVersion,
  };
  if (identity.description !== undefined) candidate.description = identity.description;
  if (identity.aiContext !== undefined) candidate.ai_context = identity.aiContext;

  for (const key of PATCHABLE_TOP_LEVEL_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(candidate, key)) continue;
    const before = baseline[key as keyof PresetPayload];
    const after = candidate[key as keyof PresetPayload];
    if (!deepEqual(before, after)) mutablePatch[key] = after;
  }

  const parameters = diffParameters(baseline.parameters ?? [], candidate.parameters ?? []);
  if (parameters.length) patch.parameters = parameters;
  return patch;
}

function diffParameters(before: readonly ParameterValueInput[], after: readonly ParameterValueInput[]): ParameterValueInput[] {
  const beforeByKey = new Map(before.map((item) => [parameterKey(item), item]));
  const afterByKey = new Map(after.map((item) => [parameterKey(item), item]));
  const changes: ParameterValueInput[] = [];

  for (const [key, current] of afterByKey) {
    const previous = beforeByKey.get(key);
    if (!previous || !sameParameter(previous, current)) changes.push(normalizeParameter(current));
  }

  for (const [key, previous] of beforeByKey) {
    if (afterByKey.has(key)) continue;
    changes.push({ catalog_id: previous.catalog_id, position: previous.position ?? 0, delete: true });
  }

  return changes;
}

function parameterKey(value: ParameterValueInput): string {
  return `${value.catalog_id}:${value.position ?? 0}`;
}

function normalizeParameter(value: ParameterValueInput): ParameterValueInput {
  const normalized: ParameterValueInput = {
    catalog_id: value.catalog_id,
    position: value.position ?? 0,
  };
  if (value.option_id !== undefined) normalized.option_id = value.option_id;
  if (value.number_value !== undefined) normalized.number_value = value.number_value;
  if (value.text_value !== undefined) normalized.text_value = value.text_value;
  if (value.boolean_value !== undefined) normalized.boolean_value = value.boolean_value;
  if (value.json_value !== undefined) normalized.json_value = value.json_value;
  return normalized;
}

function sameParameter(a: ParameterValueInput, b: ParameterValueInput): boolean {
  return a.catalog_id === b.catalog_id
    && (a.position ?? 0) === (b.position ?? 0)
    && deepEqual(a.option_id, b.option_id)
    && deepEqual(a.number_value, b.number_value)
    && deepEqual(a.text_value, b.text_value)
    && deepEqual(a.boolean_value, b.boolean_value)
    && deepEqual(a.json_value, b.json_value);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a === undefined || b === undefined) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

function hasPatchChanges(patch: PresetPatch): boolean {
  return Object.keys(patch).length > 0;
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
