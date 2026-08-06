import { RotateCcw } from 'lucide-react';
import {
  ACCESSORIES,
  BASE_LAYER_TYPES,
  BOTTOM_TYPES,
  CLOTHING_COLORS,
  CLOTHING_MATERIALS,
  FOOTWEAR_TYPES,
  OUTERWEAR_TYPES,
  TOP_TYPES,
  type ClothingLayerState,
} from '../domain';
import {
  CatalogField,
  MultiChoice,
  PageIntro,
  SectionCard,
  TextArea,
  type OptionLike,
} from '../components/ui';
import { useEditorStore } from '../store/editor-store';

export function WardrobePage() {
  const wardrobe = useEditorStore((state) => state.wardrobe);
  const setWardrobe = useEditorStore((state) => state.setWardrobe);
  const resetWardrobe = useEditorStore((state) => state.resetWardrobe);

  return (
    <div>
      <PageIntro
        action={(
          <button className="focus-ring grid size-11 shrink-0 place-items-center rounded-2xl border border-zinc-800 bg-zinc-900/80 text-zinc-500 transition hover:text-zinc-100" onClick={resetWardrobe} title="Сбросить одежду" type="button">
            <RotateCcw className="size-4" />
          </button>
        )}
        description="Каждый слой одежды редактируется независимо: тип, цвет и материал. Вариант «Нет одежды» автоматически скрывает лишние параметры."
        eyebrow="Шаг 2"
        title="Одежда"
      />

      <div className="space-y-4">
        <LayerEditor label="Нижний слой" onChange={(baseLayer) => setWardrobe({ ...wardrobe, baseLayer })} types={BASE_LAYER_TYPES} value={wardrobe.baseLayer} />
        <LayerEditor label="Верх" onChange={(top) => setWardrobe({ ...wardrobe, top })} types={TOP_TYPES} value={wardrobe.top} />
        <LayerEditor label="Низ" onChange={(bottom) => setWardrobe({ ...wardrobe, bottom })} types={BOTTOM_TYPES} value={wardrobe.bottom} />
        <LayerEditor label="Верхняя одежда" onChange={(outerwear) => setWardrobe({ ...wardrobe, outerwear })} types={OUTERWEAR_TYPES} value={wardrobe.outerwear} />
        <LayerEditor label="Обувь" onChange={(footwear) => setWardrobe({ ...wardrobe, footwear })} types={FOOTWEAR_TYPES} value={wardrobe.footwear} />

        <SectionCard description={`${ACCESSORIES.length} вариантов, доступен множественный выбор.`} title="Аксессуары">
          <MultiChoice label="Выбранные аксессуары" onChange={(accessoryIds) => setWardrobe({ ...wardrobe, accessoryIds })} options={ACCESSORIES} values={wardrobe.accessoryIds} />
          <TextArea label="Дополнительное описание" onChange={(customDescription) => setWardrobe({ ...wardrobe, customDescription })} placeholder="Особенности посадки, декоративные элементы, сочетания слоев" value={wardrobe.customDescription} />
        </SectionCard>
      </div>
    </div>
  );
}

function LayerEditor<TTypeId extends string>({
  label,
  types,
  value,
  onChange,
}: {
  label: string;
  types: readonly OptionLike<TTypeId>[];
  value: ClothingLayerState<TTypeId>;
  onChange: (value: ClothingLayerState<TTypeId>) => void;
}) {
  const empty = value.typeId === 'none';
  const typeLabel = types.find((option) => option.id === value.typeId)?.label ?? value.typeId;
  const colorLabel = CLOTHING_COLORS.find((option) => option.id === value.colorId)?.label;
  const materialLabel = CLOTHING_MATERIALS.find((option) => option.id === value.materialId)?.label;
  const summary = empty ? 'Не используется' : [typeLabel, colorLabel, materialLabel].filter(Boolean).join(' · ');

  return (
    <SectionCard description={summary} title={label}>
      <CatalogField
        label="Тип"
        onChange={(typeId) => onChange(typeId === 'none' ? { typeId, colorId: null, materialId: null } : { ...value, typeId })}
        options={types}
        value={value.typeId}
      />
      {!empty ? (
        <div className="grid gap-4 md:grid-cols-2">
          <CatalogField label="Цвет" onChange={(colorId) => onChange({ ...value, colorId })} options={CLOTHING_COLORS} value={value.colorId} />
          <CatalogField label="Материал" onChange={(materialId) => onChange({ ...value, materialId })} options={CLOTHING_MATERIALS} value={value.materialId} />
        </div>
      ) : null}
    </SectionCard>
  );
}
