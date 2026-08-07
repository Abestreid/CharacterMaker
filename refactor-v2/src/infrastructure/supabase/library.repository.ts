import type { AiContext, ReferenceStatus } from './preset.repository';
import { supabase } from './client';

export type PresetMetadata = Record<string, unknown> & { editor_state?: unknown };

export type PublicCharacterPreset = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  bustCm: number | null;
  waistCm: number | null;
  hipsCm: number | null;
  bodyFatPercent: number | null;
  schemaVersion: string;
  version: number;
  aiContext: AiContext;
  metadata: PresetMetadata;
};

export type PublicOutfitPreset = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  suggestedBackgroundId: string | null;
  promptText: string | null;
  schemaVersion: string;
  version: number;
  aiContext: AiContext;
  metadata: PresetMetadata;
};

export type PublicWardrobeItem = PublicOutfitPreset;

export type PublicBackground = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  promptText: string | null;
};

export type PublicScenePreset = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  backgroundId: string | null;
  customBackgroundText: string | null;
  promptText: string | null;
  referenceUseClothing: boolean;
  referenceUseExpression: boolean;
  schemaVersion: string;
  version: number;
  aiContext: AiContext;
  metadata: PresetMetadata;
};

export type PublicAsset = {
  id: string;
  objectPath: string | null;
  publicUrl: string | null;
  mimeType: string | null;
  fileName: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  referenceStatus: ReferenceStatus;
};

export async function fetchPublicCharacters(): Promise<PublicCharacterPreset[]> {
  const { data, error } = await supabase
    .from('characters')
    .select('id,slug,name,description,age,height_cm,weight_kg,bust_cm,waist_cm,hips_cm,body_fat_percent,schema_version,version,ai_context,metadata')
    .eq('is_public', true)
    .eq('status', 'active')
    .order('name');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    age: row.age,
    heightCm: row.height_cm === null ? null : Number(row.height_cm),
    weightKg: row.weight_kg === null ? null : Number(row.weight_kg),
    bustCm: row.bust_cm === null ? null : Number(row.bust_cm),
    waistCm: row.waist_cm === null ? null : Number(row.waist_cm),
    hipsCm: row.hips_cm === null ? null : Number(row.hips_cm),
    bodyFatPercent: row.body_fat_percent === null ? null : Number(row.body_fat_percent),
    schemaVersion: row.schema_version,
    version: Number(row.version),
    aiContext: asAiContext(row.ai_context),
    metadata: asMetadata(row.metadata),
  }));
}

export async function fetchPublicOutfits(): Promise<PublicOutfitPreset[]> {
  const { data, error } = await supabase
    .from('outfit_presets')
    .select('id,slug,name,description,category,suggested_background_id,prompt_text,schema_version,version,ai_context,metadata')
    .eq('is_public', true)
    .eq('status', 'active')
    .order('name');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    suggestedBackgroundId: row.suggested_background_id,
    promptText: row.prompt_text,
    schemaVersion: row.schema_version,
    version: Number(row.version),
    aiContext: asAiContext(row.ai_context),
    metadata: asMetadata(row.metadata),
  }));
}

export const fetchPublicWardrobeItems = fetchPublicOutfits;

export async function fetchPublicBackgrounds(): Promise<PublicBackground[]> {
  const { data, error } = await supabase
    .from('backgrounds')
    .select('id,slug,name,description,prompt_text')
    .eq('is_public', true)
    .eq('status', 'active')
    .order('name');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    promptText: row.prompt_text,
  }));
}

export async function fetchPublicScenes(): Promise<PublicScenePreset[]> {
  const { data, error } = await supabase
    .from('scene_presets')
    .select('id,slug,name,description,background_id,custom_background_text,prompt_text,reference_use_clothing,reference_use_expression,schema_version,version,ai_context,metadata')
    .eq('is_public', true)
    .eq('status', 'active')
    .order('name');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    backgroundId: row.background_id,
    customBackgroundText: row.custom_background_text,
    promptText: row.prompt_text,
    referenceUseClothing: row.reference_use_clothing === true,
    referenceUseExpression: row.reference_use_expression === true,
    schemaVersion: row.schema_version,
    version: Number(row.version),
    aiContext: asAiContext(row.ai_context),
    metadata: asMetadata(row.metadata),
  }));
}

export async function fetchPublicAssets(assetIds: readonly string[]): Promise<PublicAsset[]> {
  if (assetIds.length === 0) return [];
  const { data, error } = await supabase
    .from('assets')
    .select('id,object_path,public_url,mime_type,file_name,size_bytes,width,height,reference_status')
    .in('id', [...assetIds])
    .eq('is_public', true)
    .eq('status', 'active');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    objectPath: row.object_path,
    publicUrl: row.public_url,
    mimeType: row.mime_type,
    fileName: row.file_name,
    sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
    width: row.width,
    height: row.height,
    referenceStatus: asReferenceStatus(row.reference_status),
  }));
}

function asMetadata(value: unknown): PresetMetadata {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as PresetMetadata : {};
}

function asAiContext(value: unknown): AiContext {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as AiContext : {};
}

function asReferenceStatus(value: unknown): ReferenceStatus {
  return value === 'approved' || value === 'canonical' || value === 'rejected' || value === 'reference_only' ? value : 'normal';
}
