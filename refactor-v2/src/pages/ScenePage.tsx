import { ImagePlus, RotateCcw, Trash2 } from 'lucide-react';
import { useState, type ChangeEvent } from 'react';
import {
  ASPECT_RATIOS,
  BACKGROUNDS,
  CHARACTER_ORIENTATIONS,
  COLOR_TEMPERATURE_PARAMETER,
  EMOTIONS,
  HORIZONTAL_CAMERA_ANGLES,
  IMAGE_STYLES,
  LIGHTING_TYPES,
  LIGHT_COLORS,
  MOTIONS,
  NATURAL_LIGHT_TIMES,
  POSES,
  SCENE_FILTERS,
  SHOT_TYPES,
  STUDIO_LIGHT_SETUPS,
  VERTICAL_CAMERA_ANGLES,
  getColorTemperatureLabel,
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

type SceneSection = 'character' | 'camera' | 'environment' | 'lighting' | 'style' | 'reference';

const sections = [
  { id: 'character', label: 'Персонаж' },
  { id: 'camera', label: 'Камера' },
  { id: 'environment', label: 'Окружение' },
  { id: 'lighting', label: 'Свет' },
  { id: 'style', label: 'Стиль' },
  { id: 'reference', label: 'Референс' },
] as const;

export function ScenePage() {
  const [section, setSection] = useState<SceneSection>('character');
  const scene = useEditorStore((state) => state.scene);
  const setScene = useEditorStore((state) => state.setScene);
  const resetScene = useEditorStore((state) => state.resetScene);

  const handleReference = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      setScene({
        ...scene,
        reference: {
          ...scene.reference,
          image: {
            id: crypto.randomUUID(),
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            dataUrl: reader.result,
            createdAt: new Date().toISOString(),
          },
        },
      });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  return (
    <div>
      <PageIntro
        action={(
          <button className="focus-ring grid size-11 shrink-0 place-items-center rounded-2xl border border-zinc-800 bg-zinc-900/80 text-zinc-500 transition hover:text-zinc-100" onClick={resetScene} title="Сбросить сцену" type="button">
            <RotateCcw className="size-4" />
          </button>
        )}
        description="Параметры сцены разделены на композицию, камеру, окружение, освещение и визуальный стиль. Все 46 поз и 55 фонов доступны через поиск."
        eyebrow="Шаг 3"
        title="Сцена"
      />
      <SectionTabs items={sections} onChange={setSection} value={section} />

      {section === 'character' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard description="Поза и движение взаимоисключающие и управляются явным режимом." title="Действие персонажа">
            <ChoiceGrid
              columns={2}
              label="Режим"
              onChange={(mode) => setScene({ ...scene, character: { ...scene.character, mode, poseId: mode === 'pose' ? scene.character.poseId ?? 'standing_neutral' : null, motionId: mode === 'motion' ? scene.character.motionId ?? 'walking_confidently' : null } })}
              options={[{ id: 'pose', label: 'Статичная поза' }, { id: 'motion', label: 'Движение' }] as const}
              value={scene.character.mode}
            />
            {scene.character.mode === 'pose' ? (
              <CatalogField label={`Поза · ${POSES.length} вариантов`} onChange={(poseId) => setScene({ ...scene, character: { ...scene.character, poseId } })} options={POSES} value={scene.character.poseId} />
            ) : (
              <CatalogField label={`Движение · ${MOTIONS.length} вариантов`} onChange={(motionId) => setScene({ ...scene, character: { ...scene.character, motionId } })} options={MOTIONS} value={scene.character.motionId} />
            )}
          </SectionCard>
          <SectionCard title="Выражение и положение">
            <CatalogField label="Эмоция" onChange={(emotionId) => setScene({ ...scene, character: { ...scene.character, emotionId } })} options={EMOTIONS} value={scene.character.emotionId} />
            <ChoiceGrid columns={2} label="Положение к камере" onChange={(orientationId) => setScene({ ...scene, character: { ...scene.character, orientationId } })} options={CHARACTER_ORIENTATIONS} value={scene.character.orientationId} />
          </SectionCard>
        </div>
      ) : null}

      {section === 'camera' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard title="Кадрирование">
            <CatalogField label="Тип кадра" onChange={(shotTypeId) => setScene({ ...scene, camera: { ...scene.camera, shotTypeId } })} options={SHOT_TYPES} value={scene.camera.shotTypeId} />
            <ChoiceGrid columns={3} label="Соотношение сторон" onChange={(aspectRatioId) => setScene({ ...scene, camera: { ...scene.camera, aspectRatioId } })} options={ASPECT_RATIOS} value={scene.camera.aspectRatioId} />
          </SectionCard>
          <SectionCard title="Положение камеры">
            <CatalogField label="Вертикальный угол" onChange={(verticalAngleId) => setScene({ ...scene, camera: { ...scene.camera, verticalAngleId } })} options={VERTICAL_CAMERA_ANGLES} value={scene.camera.verticalAngleId} />
            <ChoiceGrid columns={3} label="Горизонтальное положение" onChange={(horizontalAngleId) => setScene({ ...scene, camera: { ...scene.camera, horizontalAngleId } })} options={HORIZONTAL_CAMERA_ANGLES} value={scene.camera.horizontalAngleId} />
          </SectionCard>
        </div>
      ) : null}

      {section === 'environment' ? (
        <SectionCard description={`${BACKGROUNDS.length} базовых фоновых значений из domain-каталога.`} title="Окружение">
          <CatalogField label="Фон" onChange={(backgroundId) => setScene({ ...scene, environment: { ...scene.environment, backgroundId } })} options={BACKGROUNDS} value={scene.environment.backgroundId} />
          <TextArea label="Собственное описание фона" onChange={(customBackground) => setScene({ ...scene, environment: { ...scene.environment, customBackground } })} placeholder="Например: просторная фотостудия с мокрым бетонным полом и панорамным окном" value={scene.environment.customBackground} />
          {scene.environment.customBackground.trim() ? <div className="rounded-2xl border border-amber-400/20 bg-amber-400/8 p-3 text-sm text-amber-100/80">Пользовательское описание имеет приоритет над выбранным фоном.</div> : null}
        </SectionCard>
      ) : null}

      {section === 'lighting' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard title="Тип освещения">
            <ChoiceGrid columns={2} label="Режим света" onChange={(typeId) => setScene({ ...scene, lighting: { ...scene.lighting, typeId } })} options={LIGHTING_TYPES} value={scene.lighting.typeId} />
            {scene.lighting.typeId === 'natural' ? (
              <ChoiceGrid columns={3} label="Время суток" onChange={(naturalTimeId) => setScene({ ...scene, lighting: { ...scene.lighting, naturalTimeId } })} options={NATURAL_LIGHT_TIMES} value={scene.lighting.naturalTimeId} />
            ) : (
              <>
                <CatalogField label="Схема студийного света" onChange={(studioSetupId) => setScene({ ...scene, lighting: { ...scene.lighting, studioSetupId } })} options={STUDIO_LIGHT_SETUPS} value={scene.lighting.studioSetupId} />
                <div className="grid gap-4 md:grid-cols-2">
                  <CatalogField label="Основной свет" onChange={(mainLightColorId) => setScene({ ...scene, lighting: { ...scene.lighting, mainLightColorId } })} options={LIGHT_COLORS.filter((option) => option.id !== 'none')} value={scene.lighting.mainLightColorId} />
                  <CatalogField label="Акцентный свет" onChange={(accentLightColorId) => setScene({ ...scene, lighting: { ...scene.lighting, accentLightColorId } })} options={LIGHT_COLORS} value={scene.lighting.accentLightColorId} />
                </div>
              </>
            )}
          </SectionCard>
          <SectionCard description={getColorTemperatureLabel(scene.lighting.colorTemperature)} title="Цветовая температура">
            <NumberControl {...COLOR_TEMPERATURE_PARAMETER} onChange={(colorTemperature) => setScene({ ...scene, lighting: { ...scene.lighting, colorTemperature } })} value={scene.lighting.colorTemperature} />
          </SectionCard>
        </div>
      ) : null}

      {section === 'style' ? (
        <div className="grid gap-4 xl:grid-cols-2">
          <SectionCard title="Визуальный стиль">
            <CatalogField label="Стиль изображения" onChange={(imageStyleId) => setScene({ ...scene, style: { ...scene.style, imageStyleId } })} options={IMAGE_STYLES} value={scene.style.imageStyleId} />
          </SectionCard>
          <SectionCard title="Постобработка">
            <CatalogField label="Фильтр" onChange={(filterId) => setScene({ ...scene, style: { ...scene.style, filterId } })} options={SCENE_FILTERS} value={scene.style.filterId} />
          </SectionCard>
        </div>
      ) : null}

      {section === 'reference' ? (
        <SectionCard description="Файл хранится локально вместе с MIME-типом, размером и временем загрузки." title="Референс сцены">
          {scene.reference.image ? (
            <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
              <img alt={scene.reference.image.name} className="max-h-96 w-full object-contain" src={scene.reference.image.dataUrl} />
              <div className="flex items-center justify-between gap-4 p-3">
                <div className="min-w-0"><p className="truncate text-sm font-medium text-zinc-200">{scene.reference.image.name}</p><p className="mt-0.5 text-xs text-zinc-600">{scene.reference.image.mimeType} · {Math.round(scene.reference.image.size / 1024)} КБ</p></div>
                <button className="focus-ring grid size-10 shrink-0 place-items-center rounded-full bg-red-500/10 text-red-300" onClick={() => setScene({ ...scene, reference: { ...scene.reference, image: null } })} type="button"><Trash2 className="size-4" /></button>
              </div>
            </div>
          ) : (
            <label className="focus-within:ring-2 focus-within:ring-violet-400/70 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-700 bg-zinc-950/50 p-6 text-center transition hover:border-zinc-600">
              <ImagePlus className="size-8 text-violet-400" />
              <span className="mt-3 text-sm font-medium text-zinc-200">Загрузить референс сцены</span>
              <span className="mt-1 text-xs text-zinc-600">PNG, JPEG, WebP и другие изображения браузера</span>
              <input accept="image/*" className="sr-only" onChange={handleReference} type="file" />
            </label>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            <Toggle checked={scene.reference.useClothing} label="Использовать одежду" onChange={(useClothing) => setScene({ ...scene, reference: { ...scene.reference, useClothing } })} />
            <Toggle checked={scene.reference.useExpression} label="Использовать выражение лица" onChange={(useExpression) => setScene({ ...scene, reference: { ...scene.reference, useExpression } })} />
          </div>
        </SectionCard>
      ) : null}
    </div>
  );
}
