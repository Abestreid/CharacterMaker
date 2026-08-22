import type {
  CatalogCategory,
  CatalogOption,
  NumericParameterDefinition,
} from '../catalog/core';

export function validateUniqueIds(
  catalogName: string,
  options: readonly CatalogOption[],
): void {
  const ids = new Set<string>();
  for (const option of options) {
    if (!option.id.trim()) throw new Error(`${catalogName}: найден пустой id`);
    if (!option.label.trim()) throw new Error(`${catalogName}: пустая подпись у ${option.id}`);
    if (ids.has(option.id)) throw new Error(`${catalogName}: повторяющийся id ${option.id}`);
    ids.add(option.id);
  }
}

export function validateCategories(
  catalogName: string,
  categories: readonly CatalogCategory[],
  options: readonly CatalogOption[],
): void {
  validateUniqueIds(`${catalogName}.categories`, categories);
  const categoryIds = new Set(categories.map((category) => category.id));
  for (const option of options) {
    if (option.categoryId && !categoryIds.has(option.categoryId)) {
      throw new Error(`${catalogName}: неизвестная категория ${option.categoryId} у ${option.id}`);
    }
  }
}

export function validateNumericParameter(
  parameter: NumericParameterDefinition,
): void {
  if (parameter.min >= parameter.max) throw new Error(`${parameter.id}: min должен быть меньше max`);
  if (parameter.step <= 0) throw new Error(`${parameter.id}: step должен быть больше нуля`);
  if (parameter.defaultValue < parameter.min || parameter.defaultValue > parameter.max) {
    throw new Error(`${parameter.id}: defaultValue находится вне диапазона`);
  }
}

export function hasOption(
  options: readonly CatalogOption[],
  id: string | null,
): boolean {
  return id === null || options.some((option) => option.id === id);
}
