import type { CatalogOption } from './types';

export function getOptionById<TOption extends CatalogOption>(
  options: readonly TOption[],
  id: string | null | undefined,
): TOption | null {
  if (!id) return null;
  return options.find((option) => option.id === id) ?? null;
}

export function getLabelById<TOption extends CatalogOption>(
  options: readonly TOption[],
  id: string | null | undefined,
): string {
  return getOptionById(options, id)?.label ?? '';
}

export function getIdByLabel<TOption extends CatalogOption>(
  options: readonly TOption[],
  label: string | null | undefined,
): TOption['id'] | null {
  if (!label) return null;
  return options.find((option) => option.label === label)?.id ?? null;
}

export function groupOptionsByCategory<TOption extends CatalogOption>(
  options: readonly TOption[],
): Record<string, TOption[]> {
  return options.reduce<Record<string, TOption[]>>((groups, option) => {
    const categoryId = option.categoryId ?? 'uncategorized';
    (groups[categoryId] ??= []).push(option);
    return groups;
  }, {});
}
