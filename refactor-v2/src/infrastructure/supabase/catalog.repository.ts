import { supabase } from './client';

export type DatabaseCatalogOption = {
  id: string;
  label: string;
  categoryId?: string;
  hex?: string;
  value?: string;
  metadata?: Record<string, unknown>;
};

export type DatabaseCatalog = {
  key: string;
  section: string;
  label: string;
  valueType: string;
  selectionMode: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: unknown;
  options: DatabaseCatalogOption[];
};

export async function fetchPublicCatalogs(): Promise<DatabaseCatalog[]> {
  const [{ data: catalogs, error: catalogsError }, { data: options, error: optionsError }] = await Promise.all([
    supabase
      .from('catalogs')
      .select('id,domain,label,value_type,selection_mode,unit,min_value,max_value,step_value,default_value,sort_order')
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('catalog_options')
      .select('catalog_id,id,label,category_id,hex,value_text,metadata,sort_order')
      .eq('is_active', true)
      .order('sort_order'),
  ]);

  if (catalogsError) throw catalogsError;
  if (optionsError) throw optionsError;

  const optionsByCatalog = new Map<string, DatabaseCatalogOption[]>();
  for (const option of options ?? []) {
    const list = optionsByCatalog.get(option.catalog_id) ?? [];
    list.push({
      id: option.id,
      label: option.label,
      ...(option.category_id ? { categoryId: option.category_id } : {}),
      ...(option.hex ? { hex: option.hex } : {}),
      ...(option.value_text ? { value: option.value_text } : {}),
      ...(option.metadata && typeof option.metadata === 'object' && !Array.isArray(option.metadata)
        ? { metadata: option.metadata as Record<string, unknown> }
        : {}),
    });
    optionsByCatalog.set(option.catalog_id, list);
  }

  return (catalogs ?? []).map((catalog) => ({
    key: catalog.id,
    section: catalog.domain,
    label: catalog.label,
    valueType: catalog.value_type,
    selectionMode: catalog.selection_mode,
    ...(catalog.unit ? { unit: catalog.unit } : {}),
    ...(catalog.min_value !== null ? { min: Number(catalog.min_value) } : {}),
    ...(catalog.max_value !== null ? { max: Number(catalog.max_value) } : {}),
    ...(catalog.step_value !== null ? { step: Number(catalog.step_value) } : {}),
    ...(catalog.default_value !== null ? { defaultValue: catalog.default_value } : {}),
    options: optionsByCatalog.get(catalog.id) ?? [],
  }));
}
