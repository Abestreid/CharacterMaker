import { supabase } from './client';

export type PresetKind = 'character' | 'outfit' | 'scene';
export type AssetOwnerKind = PresetKind | 'background' | 'generation';
export type ReferenceStatus = 'normal' | 'approved' | 'canonical' | 'rejected' | 'reference_only';

export type AiContext = {
  summary?: string;
  canonicalDescription?: string;
  identityInstructions?: string;
  mustPreserve?: string[];
  mayVary?: string[];
  avoid?: string[];
  generationNotes?: string[];
  schemaVersion?: string;
  [key: string]: unknown;
};

export type ParameterValueInput = {
  catalog_id: string;
  position?: number;
  option_id?: string | null;
  number_value?: number | null;
  text_value?: string | null;
  boolean_value?: boolean | null;
  json_value?: unknown;
};

export type PresetPayload = {
  id?: string;
  slug: string;
  name: string;
  description?: string | null;
  parameters?: ParameterValueInput[];
  metadata?: Record<string, unknown>;
  schema_version?: string;
  ai_context?: AiContext;
  expected_version?: number;
  idempotency_key?: string;
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  bust_cm?: number | null;
  waist_cm?: number | null;
  hips_cm?: number | null;
  body_fat_percent?: number | null;
  physique_description?: string | null;
  category?: string | null;
  suggested_background_id?: string | null;
  background_id?: string | null;
  background_slug?: string | null;
  custom_background_text?: string | null;
  prompt_text?: string | null;
  reference_use_clothing?: boolean;
  reference_use_expression?: boolean;
};

export type AttachAssetInput = {
  ownerKind: AssetOwnerKind;
  ownerId: string;
  role: string;
  objectPath: string;
  publicUrl: string;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  isPrimary?: boolean;
  referenceStatus?: ReferenceStatus;
  metadata?: Record<string, unknown>;
};

export async function savePreset(kind: PresetKind, payload: PresetPayload): Promise<string> {
  const requestPayload: PresetPayload = {
    ...payload,
    idempotency_key: payload.idempotency_key ?? crypto.randomUUID(),
  };
  const { data, error } = await supabase.rpc('public_upsert_preset', {
    p_kind: kind,
    p_payload: requestPayload,
  });
  if (error) throw error;
  if (typeof data !== 'string' || !data.trim()) throw new Error('Supabase не вернул ID сохраненного пресета.');
  return data;
}

export async function deletePreset(kind: PresetKind, id: string, hard = false): Promise<boolean> {
  const { data, error } = await supabase.rpc('public_delete_preset', {
    p_kind: kind,
    p_id: id,
    p_hard: hard,
  });
  if (error) throw error;
  return data === true;
}

export async function attachInfinityFreeAsset(input: AttachAssetInput): Promise<string> {
  const { data, error } = await supabase.rpc('public_attach_asset', {
    p_owner_kind: input.ownerKind,
    p_owner_id: input.ownerId,
    p_role: input.role,
    p_object_path: input.objectPath,
    p_public_url: input.publicUrl,
    p_file_name: input.fileName ?? null,
    p_mime_type: input.mimeType ?? null,
    p_size_bytes: input.sizeBytes ?? null,
    p_width: input.width ?? null,
    p_height: input.height ?? null,
    p_is_primary: input.isPrimary ?? false,
    p_metadata: {
      ...(input.metadata ?? {}),
      reference_status: input.referenceStatus ?? 'normal',
    },
  });
  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Supabase не вернул ID файла.');
  return data;
}

export async function setAssetReferenceStatus(assetId: string, referenceStatus: ReferenceStatus): Promise<boolean> {
  const { data, error } = await supabase.rpc('public_set_asset_reference_status', {
    p_asset_id: assetId,
    p_reference_status: referenceStatus,
  });
  if (error) throw error;
  return data === true;
}

export async function deleteAssetMetadata(assetId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('public_delete_asset', { p_asset_id: assetId });
  if (error) throw error;
  return data === true;
}

export async function setCharacterOutfit(characterId: string, outfitPresetId: string, isDefault = false): Promise<boolean> {
  const { data, error } = await supabase.rpc('public_set_character_outfit', {
    p_character_id: characterId,
    p_outfit_preset_id: outfitPresetId,
    p_is_default: isDefault,
  });
  if (error) throw error;
  return data === true;
}
