import { RotateCcw } from 'lucide-react';
import { useState } from 'react';
import {
  AGE_PARAMETER,
  BREAST_FIRMNESS_OPTIONS,
  BREAST_SHAPES,
  BUTTOCK_FIRMNESS_OPTIONS,
  BUTTOCK_SHAPES,
  CHARACTER_MEASUREMENTS,
  CHEEKBONE_TYPES,
  CHIN_SHAPES,
  ETHNICITIES,
  EYE_COLORS,
  EYEBROW_SHAPES,
  EYEBROW_THICKNESS_OPTIONS,
  EYELINER_STYLES,
  EYESHADOW_COLORS,
  EYE_SHAPES,
  EYE_SIZES,
  EYE_SPACING_OPTIONS,
  FOREHEAD_SIZES,
  GENDERS,
  HAIRSTYLES,
  HAIR_COLORS,
  HAIR_LENGTHS,
  HAIR_TYPES,
  HEAD_SHAPES,
  IMAGE_STYLES,
  LIPSTICK_COLORS,
  LIP_SHAPES,
  MUSCLE_MASS_OPTIONS,
  NOSE_SHAPES,
  NOSE_SIZES,
  SKIN_TONES,
} from '../domain';
import {
  CatalogField,
  ChoiceGrid,
  NumberControl,
  PageIntro,
  SectionCard,
  SectionTabs,
  TextArea,
  Toggle,
} from '../components/ui';
import { useEditorStore } from '../store/editor-store';

type CharacterSection = 'basic' | 'body' | 'face' | 'hair' | 'makeup' | 'tattoos';

const sections = [
  { id: 'basic', label: 'Основное' },
  { id: 'body', label: 'Тело' },
  { id: 'face', label: 'Лицо' },
  { id: 'hair', label: 'Волосы' },
  { id: 'makeup', label: 'Макияж' },
  { id: 'tattoos', label: 'Тату' },
] as const;

export function CharacterPage() {
  const [section, setSection] = useState<CharacterSection>('basic');
  const character = useEditorStore((state) => state.character);
  const setCharacter = useEditorStore((state) => state.setCharacter);
  const resetCharacter = useEditorStore((state) => state.resetCharacter);

  const action = (
    <button className="focus-ring grid size-11 shrink-0 place-items-center rounded-2xl border border-zinc-800 bg-zinc-900/80 text-zinc-500 transition hover:text-zinc-100" onClick={resetCharacter} title="Сбросить параметры персонажа" type="button">
      <RotateCcw className="size-4" />
    </button>
  );

  return (
    <div>
      <PageIntro
        action={action}
        description="Настройка построена по принципу постепенного раскрытия: на экране остается только одна логическая группа параметров."
        eyebrow="Шаг 1"
        title="Персонаж"
      />
      <SectionTabs items={sections} onChange={setSection} value={section} />

      {section === 'basic' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard description="Базовые данные определяют общий профиль персонажа." title="Основные данные">
            <ChoiceGrid columns={2} label="Пол" onChange={(genderId) => setCharacter({ ...character, identity: { ...character.identity, genderId } })} options={GENDERS} value={character.identity.genderId} />
            <NumberControl {...AGE_PARAMETER} onChange={(age) => setCharacter({ ...character, identity: { ...character.identity, age } })} value={character.identity.age} />
            <CatalogField label="Этнический тип" onChange={(ethnicityId) => setCharacter({ ...character, appearance: { ...character.appearance, ethnicityId } })} options={ETHNICITIES} value={character.appearance.ethnicityId} />
          </SectionCard>

          <SectionCard description="Цветовые признаки и общий способ визуального представления." title="Визуальная основа">
            <CatalogField label="Тон кожи" onChange={(skinToneId) => setCharacter({ ...character, appearance: { ...character.appearance, skinToneId } })} options={SKIN_TONES} value={character.appearance.skinToneId} />
            <CatalogField label="Цвет глаз" onChange={(eyeColorId) => setCharacter({ ...character, appearance: { ...character.appearance, eyeColorId } })} options={EYE_COLORS} value={character.appearance.eyeColorId} />
            <CatalogField label="Стиль изображения" onChange={(imageStyleId) => setCharacter({ ...character, appearance: { ...character.appearance, imageStyleId } })} options={IMAGE_STYLES} value={character.appearance.imageStyleId} />
          </SectionCard>
        </div>
      ) : null}

      {section === 'body' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard description="Все диапазоны берутся непосредственно из domain-каталога." title="Размеры тела">
            <NumberControl {...CHARACTER_MEASUREMENTS.height} onChange={(height) => setCharacter({ ...character, body: { ...character.body, height } })} value={character.body.height} />
            <NumberControl {...CHARACTER_MEASUREMENTS.weight} onChange={(weight) => setCharacter({ ...character, body: { ...character.body, weight } })} value={character.body.weight} />
            <NumberControl {...CHARACTER_MEASUREMENTS.bust} onChange={(bust) => setCharacter({ ...character, body: { ...character.body, bust } })} value={character.body.bust} />
            <NumberControl {...CHARACTER_MEASUREMENTS.waist} onChange={(waist) => setCharacter({ ...character, body: { ...character.body, waist } })} value={character.body.waist} />
            <NumberControl {...CHARACTER_MEASUREMENTS.hips} onChange={(hips) => setCharacter({ ...character, body: { ...character.body, hips } })} value={character.body.hips} />
            <NumberControl {...CHARACTER_MEASUREMENTS.bodyFat} onChange={(bodyFat) => setCharacter({ ...character, body: { ...character.body, bodyFat } })} value={character.body.bodyFat} />
          </SectionCard>

          <SectionCard description="Дополнительные параметры композиции тела." title="Форма и композиция">
            <ChoiceGrid columns={2} label="Мышечная масса" onChange={(muscleMassId) => setCharacter({ ...character, body: { ...character.body, muscleMassId } })} options={MUSCLE_MASS_OPTIONS} value={character.body.muscleMassId} />
            {character.identity.genderId === 'female' ? (
              <>
                <CatalogField label="Форма груди" onChange={(breastShapeId) => setCharacter({ ...character, body: { ...character.body, breastShapeId } })} options={BREAST_SHAPES} value={character.body.breastShapeId} />
                <ChoiceGrid columns={2} label="Упругость груди" onChange={(breastFirmnessId) => setCharacter({ ...character, body: { ...character.body, breastFirmnessId } })} options={BREAST_FIRMNESS_OPTIONS} value={character.body.breastFirmnessId} />
                <ChoiceGrid columns={2} label="Форма ягодиц" onChange={(buttockShapeId) => setCharacter({ ...character, body: { ...character.body, buttockShapeId } })} options={BUTTOCK_SHAPES} value={character.body.buttockShapeId} />
                <ChoiceGrid columns={2} label="Упругость ягодиц" onChange={(buttockFirmnessId) => setCharacter({ ...character, body: { ...character.body, buttockFirmnessId } })} options={BUTTOCK_FIRMNESS_OPTIONS} value={character.body.buttockFirmnessId} />
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-4 text-sm leading-6 text-zinc-500">Женские параметры формы скрыты для мужского персонажа, но структура состояния остается валидной.</div>
            )}
          </SectionCard>
        </div>
      ) : null}

      {section === 'face' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard title="Контур лица">
            <CatalogField label="Форма головы" onChange={(headShapeId) => setCharacter({ ...character, face: { ...character.face, headShapeId } })} options={HEAD_SHAPES} value={character.face.headShapeId} />
            <ChoiceGrid columns={3} label="Размер лба" onChange={(foreheadSizeId) => setCharacter({ ...character, face: { ...character.face, foreheadSizeId } })} options={FOREHEAD_SIZES} value={character.face.foreheadSizeId} />
            <CatalogField label="Скулы и щеки" onChange={(cheekboneTypeId) => setCharacter({ ...character, face: { ...character.face, cheekboneTypeId } })} options={CHEEKBONE_TYPES} value={character.face.cheekboneTypeId} />
            <CatalogField label="Форма подбородка" onChange={(chinShapeId) => setCharacter({ ...character, face: { ...character.face, chinShapeId } })} options={CHIN_SHAPES} value={character.face.chinShapeId} />
          </SectionCard>
          <SectionCard title="Брови и глаза">
            <CatalogField label="Форма бровей" onChange={(eyebrowShapeId) => setCharacter({ ...character, face: { ...character.face, eyebrowShapeId } })} options={EYEBROW_SHAPES} value={character.face.eyebrowShapeId} />
            <ChoiceGrid columns={3} label="Густота бровей" onChange={(eyebrowThicknessId) => setCharacter({ ...character, face: { ...character.face, eyebrowThicknessId } })} options={EYEBROW_THICKNESS_OPTIONS} value={character.face.eyebrowThicknessId} />
            <CatalogField label="Форма глаз" onChange={(eyeShapeId) => setCharacter({ ...character, face: { ...character.face, eyeShapeId } })} options={EYE_SHAPES} value={character.face.eyeShapeId} />
            <ChoiceGrid columns={3} label="Размер глаз" onChange={(eyeSizeId) => setCharacter({ ...character, face: { ...character.face, eyeSizeId } })} options={EYE_SIZES} value={character.face.eyeSizeId} />
            <ChoiceGrid columns={3} label="Расстояние между глазами" onChange={(eyeSpacingId) => setCharacter({ ...character, face: { ...character.face, eyeSpacingId } })} options={EYE_SPACING_OPTIONS} value={character.face.eyeSpacingId} />
          </SectionCard>
          <SectionCard title="Нос">
            <CatalogField label="Форма носа" onChange={(noseShapeId) => setCharacter({ ...character, face: { ...character.face, noseShapeId } })} options={NOSE_SHAPES} value={character.face.noseShapeId} />
            <ChoiceGrid columns={3} label="Размер носа" onChange={(noseSizeId) => setCharacter({ ...character, face: { ...character.face, noseSizeId } })} options={NOSE_SIZES} value={character.face.noseSizeId} />
          </SectionCard>
          <SectionCard title="Губы">
            <CatalogField label="Форма губ" onChange={(lipShapeId) => setCharacter({ ...character, face: { ...character.face, lipShapeId } })} options={LIP_SHAPES} value={character.face.lipShapeId} />
          </SectionCard>
        </div>
      ) : null}

      {section === 'hair' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard description="Четыре независимых параметра волос." title="Структура волос">
            <CatalogField label="Длина волос" onChange={(lengthId) => setCharacter({ ...character, appearance: { ...character.appearance, hair: { ...character.appearance.hair, lengthId } } })} options={HAIR_LENGTHS} value={character.appearance.hair.lengthId} />
            <ChoiceGrid columns={2} label="Тип волос" onChange={(typeId) => setCharacter({ ...character, appearance: { ...character.appearance, hair: { ...character.appearance.hair, typeId } } })} options={HAIR_TYPES} value={character.appearance.hair.typeId} />
          </SectionCard>
          <SectionCard title="Прическа и цвет">
            <CatalogField label="Прическа" onChange={(hairstyleId) => setCharacter({ ...character, appearance: { ...character.appearance, hair: { ...character.appearance.hair, hairstyleId } } })} options={HAIRSTYLES} value={character.appearance.hair.hairstyleId} />
            <CatalogField label="Цвет волос" onChange={(colorId) => setCharacter({ ...character, appearance: { ...character.appearance, hair: { ...character.appearance.hair, colorId } } })} options={HAIR_COLORS} value={character.appearance.hair.colorId} />
          </SectionCard>
        </div>
      ) : null}

      {section === 'makeup' ? (
        <SectionCard description="Дополнительные поля появляются только после включения макияжа." title="Макияж">
          <Toggle checked={character.makeup.enabled} description="Показывать параметры подводки, теней и помады" label="Использовать макияж" onChange={(enabled) => setCharacter({ ...character, makeup: { ...character.makeup, enabled, eyelinerStyleId: enabled ? character.makeup.eyelinerStyleId ?? 'none' : null, eyeshadowColorId: enabled ? character.makeup.eyeshadowColorId ?? 'none' : null, lipstickColorId: enabled ? character.makeup.lipstickColorId ?? 'none' : null } })} />
          {character.makeup.enabled ? (
            <div className="grid gap-4 md:grid-cols-3">
              <CatalogField label="Подводка" onChange={(eyelinerStyleId) => setCharacter({ ...character, makeup: { ...character.makeup, eyelinerStyleId } })} options={EYELINER_STYLES} value={character.makeup.eyelinerStyleId} />
              <CatalogField label="Тени" onChange={(eyeshadowColorId) => setCharacter({ ...character, makeup: { ...character.makeup, eyeshadowColorId } })} options={EYESHADOW_COLORS} value={character.makeup.eyeshadowColorId} />
              <CatalogField label="Помада" onChange={(lipstickColorId) => setCharacter({ ...character, makeup: { ...character.makeup, lipstickColorId } })} options={LIPSTICK_COLORS} value={character.makeup.lipstickColorId} />
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {section === 'tattoos' ? (
        <SectionCard description="В текущей domain-модели татуировки задаются переключателем и свободным описанием." title="Татуировки">
          <Toggle checked={character.tattoos.enabled} description="Добавить текстовое описание татуировок" label="У персонажа есть татуировки" onChange={(enabled) => setCharacter({ ...character, tattoos: { ...character.tattoos, enabled } })} />
          {character.tattoos.enabled ? <TextArea label="Описание татуировок" onChange={(description) => setCharacter({ ...character, tattoos: { ...character.tattoos, description } })} placeholder="Например: небольшая роза на левом плече" value={character.tattoos.description} /> : null}
        </SectionCard>
      ) : null}
    </div>
  );
}
