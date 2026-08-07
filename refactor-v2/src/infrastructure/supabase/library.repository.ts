import { supabase } from './client';

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
};

export type PublicOutfitPreset = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  suggestedBackgroundId: string | null;
  promptText: string | null;
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
};

export type PublicAsset = {
  id: string;
  objectPath: string | null;
  publicUrl: string | null;
  mimeType: string | null;
  fileName: string | null;
  width: number | null;
  height: number | null;
};

export async function fetchPublicCharacters(): Promise<PublicCharacterPreset[]> {
  const { data, error } = await supabase
    .from('characters')
    .select('id,slug,name,description,age,height_cm,weight_kg,bust_cm,waist_cm,hips_cm,body_fat_percent')
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
  }));
}

export async function fetchPublicOutfits(): Promise<PublicOutfitPreset[]> {
  const { data, error } = await supabase
    .from('outfit_presets')
    .select('id,slug,name,description,category,suggested_background_id,prompt_text')
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
    .select('id,slug,name,description,background_id,custom_background_text,prompt_text')
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
  }));
}

export async function fetchPublicAssets(assetIds: readonly string[]): Promise<PublicAsset[]> {
  if (assetIds.length === 0) return [];
  const { data, error } = await supabase
    .from('assets')
    .select('id,object_path,public_url,mime_type,file_name,width,height')
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
    width: row.width,
    height: row.height,
  }));
}
