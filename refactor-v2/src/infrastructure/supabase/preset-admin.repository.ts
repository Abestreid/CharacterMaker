import { callAdminApi } from '../admin/admin-api';
import { requireAdminToken } from '../admin/admin-session';

export type PresetKind = 'character' | 'outfit' | 'scene';
export type AssetOwnerKind = PresetKind | 'background' | 'generation';

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
  status?: 'draft' | 'active' | 'archived';
  is_public?: boolean;
  parameters?: ParameterValueInput[];
  metadata?: Record<string, unknown>;
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
  custom_background_text?: string | null;
  prompt_text?: string | null;
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
  metadata?: Record<string, unknown>;
};

export async function savePreset(kind: PresetKind, payload: PresetPayload): Promise<string> {
  const token = requireAdminToken();
  const response = await callAdminApi<string>(token, 'upsert_preset', {
    p_kind: kind,
    p_payload: payload,
  });
  if (typeof response.data !== 'string') throw new Error('Supabase не вернул ID сохраненного пресета.');
  return response.data;
}

export async function deletePreset(kind: PresetKind, id: string, hard = false): Promise<boolean> {
  const token = requireAdminToken();
  const response = await callAdminApi<boolean>(token, 'delete_preset', {
    p_kind: kind,
    p_id: id,
    p_hard: hard,
  });
  return response.data === true;
}

export async function attachInfinityFreeAsset(input: AttachAssetInput): Promise<string> {
  const token = requireAdminToken();
  const response = await callAdminApi<string>(token, 'attach_asset', {
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
    p_metadata: input.metadata ?? {},
  });
  if (typeof response.data !== 'string') throw new Error('Supabase не вернул ID файла.');
  return response.data;
}

export async function deleteAssetMetadata(assetId: string): Promise<boolean> {
  const token = requireAdminToken();
  const response = await callAdminApi<boolean>(token, 'delete_asset', { p_asset_id: assetId });
  return response.data === true;
}

export async function setCharacterOutfit(characterId: string, outfitPresetId: string, isDefault = false): Promise<boolean> {
  const token = requireAdminToken();
  const response = await callAdminApi<boolean>(token, 'set_character_outfit', {
    p_character_id: characterId,
    p_outfit_preset_id: outfitPresetId,
    p_is_default: isDefault,
  });
  return response.data === true;
}
