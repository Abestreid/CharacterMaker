import { supabase } from './client';
import { fetchPublicAssets, type PublicAsset } from './library.repository';
import type { PresetKind } from './preset-admin.repository';

export type PresetAsset = PublicAsset & {
  role: string;
  isPrimary: boolean;
  sortOrder: number;
};

type AssetRelationRow = {
  asset_id: string;
  role: string;
  is_primary: boolean;
  sort_order: number;
};

export async function fetchPresetAssets(kind: PresetKind, presetId: string): Promise<PresetAsset[]> {
  const relation = relationConfig(kind);
  const { data, error } = await supabase
    .from(relation.table)
    .select('asset_id,role,is_primary,sort_order')
    .eq(relation.ownerColumn, presetId)
    .order('sort_order');
  if (error) throw error;

  const rows = (data ?? []) as AssetRelationRow[];
  const assets = await fetchPublicAssets(rows.map((row) => row.asset_id));
  const byId = new Map(assets.map((asset) => [asset.id, asset]));

  return rows.flatMap((row) => {
    const asset = byId.get(row.asset_id);
    return asset ? [{ ...asset, role: row.role, isPrimary: row.is_primary, sortOrder: row.sort_order }] : [];
  });
}

function relationConfig(kind: PresetKind): { table: string; ownerColumn: string } {
  if (kind === 'character') return { table: 'character_assets', ownerColumn: 'character_id' };
  if (kind === 'outfit') return { table: 'outfit_assets', ownerColumn: 'outfit_preset_id' };
  return { table: 'scene_assets', ownerColumn: 'scene_preset_id' };
}
