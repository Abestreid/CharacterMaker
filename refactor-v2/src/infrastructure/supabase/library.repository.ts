import { supabase } from './client';

export type PublicCharacter = {
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

export type PublicWardrobeItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  itemKind: string;
  primaryLayer: string | null;
};

export type PublicBackground = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  promptText: string | null;
};

export async function fetchPublicCharacters(): Promise<PublicCharacter[]> {
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

export async function fetchPublicWardrobeItems(): Promise<PublicWardrobeItem[]> {
  const { data, error } = await supabase
    .from('wardrobe_items')
    .select('id,slug,name,description,item_kind,primary_layer')
    .eq('is_public', true)
    .eq('status', 'active')
    .order('name');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    itemKind: row.item_kind,
    primaryLayer: row.primary_layer,
  }));
}

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
