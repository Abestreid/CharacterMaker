export interface CatalogOption<
  TId extends string = string,
  TCategoryId extends string = string,
> {
  id: TId;
  label: string;
  categoryId?: TCategoryId;
  description?: string;
  tags?: readonly string[];
  sortOrder?: number;
  disabled?: boolean;
}

export interface CatalogCategory<TId extends string = string> {
  id: TId;
  label: string;
  description?: string;
  sortOrder?: number;
}

export interface ColorCatalogOption<
  TId extends string = string,
  TCategoryId extends string = string,
> extends CatalogOption<TId, TCategoryId> {
  hex: `#${string}`;
}

export interface NumericParameterDefinition {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit?: string;
}

export type FieldControlType =
  | 'select'
  | 'multi_select'
  | 'number'
  | 'boolean'
  | 'text'
  | 'textarea'
  | 'image';

export interface FieldCondition {
  fieldId: string;
  operator: 'equals' | 'not_equals' | 'truthy' | 'falsy';
  value?: unknown;
}

export interface FieldDefinition {
  id: string;
  label: string;
  control: FieldControlType;
  catalogKey?: string;
  numericParameterKey?: string;
  required?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  allowCustomValue?: boolean;
  placeholder?: string;
  visibleWhen?: FieldCondition;
  disabledWhen?: FieldCondition;
}

export interface FormSectionDefinition {
  id: string;
  title: string;
  fieldIds: readonly string[];
  sortOrder: number;
}
