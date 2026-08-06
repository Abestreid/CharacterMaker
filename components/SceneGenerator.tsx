
import React, { useState, useEffect } from 'react';
// FIX: Corrected the import paths for constants from a non-existent module.
import { POSES, ANIMATIONS, CHARACTER_ORIENTATIONS, CHARACTER_EMOTIONS } from '../src/constants/scene/composition';
import { BACKGROUND_PRESETS, NATURAL_LIGHT_OPTIONS, STUDIO_LIGHT_PRESETS, STUDIO_LAMP_COLORS } from '../src/constants/scene/environment';
import { ASPECT_RATIOS, CAMERA_VERTICAL_POSITIONS, CAMERA_HORIZONTAL_POSITIONS, SCENE_SHOT_TYPES } from '../src/constants/scene/camera';
import { IMAGE_STYLES, SCENE_FILTERS } from '../src/constants/scene/style';
import { PHOTOSHOOT_PRESETS } from '../src/constants/scene/presets';
import { AccordionItem } from './Accordion';
import SearchableSelect from './SearchableSelect';
import { PhotoshootPreset } from '../types';

interface SceneGeneratorProps {
  pose: string;
  setPose: (pose: string) => void;
  animation: string;
  setAnimation: (animation: string) => void;
  shotType: string;
  setShotType: (type: string) => void;
  background: string;
  setBackground: (bg: string) => void;
  aspectRatio: string;
  setAspectRatio: (ratio: string) => void;
  cameraVertical: string;
  setCameraVertical: (angle: string) => void;
  cameraHorizontal: string;
  setCameraHorizontal: (angle: string) => void;
  characterOrientation: string;
  setCharacterOrientation: (angle: string) => void;
  emotion: string;
  setEmotion: (emotion: string) => void;
  imageStyle: string;
  setImageStyle: (style: string) => void;
  filter: string;
  setFilter: (filter: string) => void;
  onGenerate: (options?: { useReferenceDirectly?: boolean }) => void;
  isLoading: boolean;
  isAnalyzing: boolean;
  onAnalyze: () => void;
  lightingType: 'natural' | 'studio';
  setLightingType: (type: 'natural' | 'studio') => void;
  naturalLight: string;
  setNaturalLight: (light: string) => void;
  studioLightSetup: string;
  setStudioLightSetup: (setup: string) => void;
  studioMainLightColor: string;
  setStudioMainLightColor: (color: string) => void;
  studioAccentLightColor: string;
  setStudioAccentLightColor: (color: string) => void;
  colorTemperature: number;
  setColorTemperature: (temp: number) => void;
  sceneReferenceImage: string | null;
  onSceneReferenceUpload: (file: File) => void;
  onClearSceneReference: () => void;
  useClothingFromReference: boolean;
  setUseClothingFromReference: (value: boolean) => void;
  useExpressionFromReference: boolean;
  setUseExpressionFromReference: (value: boolean) => void;
}

const SceneGenerator: React.FC<SceneGeneratorProps> = ({
  pose, setPose, animation, setAnimation, shotType, setShotType, background, setBackground, 
  aspectRatio, setAspectRatio, cameraVertical, setCameraVertical, cameraHorizontal, 
  setCameraHorizontal, characterOrientation, setCharacterOrientation, emotion, setEmotion, 
  imageStyle, setImageStyle, filter, setFilter, onGenerate, isLoading, isAnalyzing, onAnalyze,
  lightingType, setLightingType, naturalLight, setNaturalLight, studioLightSetup,
  setStudioLightSetup, studioMainLightColor, setStudioMainLightColor, studioAccentLightColor,
  setStudioAccentLightColor, colorTemperature, setColorTemperature, sceneReferenceImage,
  onSceneReferenceUpload, onClearSceneReference, useClothingFromReference, setUseClothingFromReference,
  useExpressionFromReference, setUseExpressionFromReference
}) => {
  const [localBackground, setLocalBackground] = useState(background);
  const [openAccordion, setOpenAccordion] = useState<string | null>('character');

  const handleAccordionToggle = (id: string) => {
    setOpenAccordion(prev => (prev === id ? null : id));
  };

  useEffect(() => {
    setLocalBackground(background);
  }, [background]);

  const handlePoseChange = (newPose: string) => {
    setPose(newPose);
    if (newPose) {
      setAnimation('');
    }
  };

  const handleAnimationChange = (newAnimation: string) => {
    setAnimation(newAnimation);
    if (newAnimation) {
      setPose('');
    }
  };

  const handlePhotoshootPresetChange = (presetName: string) => {
    const preset = PHOTOSHOOT_PRESETS.find(p => p.name === presetName);
    if (preset) {
        setPose(preset.pose);
        setShotType(preset.shotType);
        setBackground(preset.background);
        setAspectRatio(preset.aspectRatio);
        setCameraVertical(preset.cameraVertical);
        setCameraHorizontal(preset.cameraHorizontal);
        setCharacterOrientation(preset.characterOrientation);
        setEmotion(preset.emotion);
        setImageStyle(preset.imageStyle);
        setLightingType(preset.lightingType);
        setNaturalLight(preset.naturalLight);
        setStudioLightSetup(preset.studioLightSetup);
        setStudioMainLightColor(preset.studioMainLightColor);
        setStudioAccentLightColor(preset.studioAccentLightColor);
        setColorTemperature(preset.colorTemperature);
        setFilter(preset.filter);
        setAnimation(''); // Presets use static poses
    }
  };

  const FormRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      {children}
    </div>
  );

  const getTemperatureDescription = (kelvin: number): string => {
    if (kelvin < 2500) return 'Очень теплый (свет свечи)';
    if (kelvin < 3500) return 'Теплый (лампа накаливания)';
    if (kelvin < 5000) return 'Слегка теплый (утреннее солнце)';
    if (kelvin < 6000) return 'Нейтральный (дневной свет)';
    if (kelvin < 7500) return 'Холодный (пасмурное небо)';
    return 'Очень холодный (синее небо)';
};

  const Slider: React.FC<{value: number, onChange: (v: number) => void, min: number, max: number, unit: string, description: string}> = ({ value, onChange, min, max, unit, description }) => (
     <div className="flex items-center space-x-3">
        <input
            type="range"
            min={min}
            max={max}
            value={value}
            onChange={e => onChange(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
            disabled={isLoading || isAnalyzing}
        />
        <div className="text-sm font-mono bg-gray-700 px-2 py-1 rounded w-48 text-center">
            <span>{value} {unit}</span>
            <span className="block text-xs text-gray-400 truncate">{description}</span>
        </div>
     </div>
  );

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg">
      <div className="p-4">
        <h2 className="text-2xl font-bold text-teal-400">Генератор Сцен</h2>
        <p className="text-sm text-gray-400 mt-1">Поместите вашего персонажа в новое окружение.</p>
        <div className="mt-4">
            <SearchableSelect
                options={PHOTOSHOOT_PRESETS.map(p => p.name)}
                onChange={handlePhotoshootPresetChange}
                placeholder="Загрузить Пресет Фотосессии..."
                disabled={isLoading || isAnalyzing}
                value="" // Uncontrolled to just act as a loader
            />
        </div>
      </div>
      
      <div className="p-4 border-y border-gray-700">
        <h3 className="text-base font-semibold text-gray-300 mb-3">Референс Сцены (Опционально)</h3>
        <p className="text-xs text-gray-500 mb-3">Загрузите изображение, чтобы ИИ воссоздал его или проанализировал для переноса настроек.</p>
        {sceneReferenceImage ? (
            <div className="space-y-3">
                <div className="relative aspect-video group rounded-lg overflow-hidden bg-gray-900/50 flex items-center justify-center">
                    <img src={`data:image/jpeg;base64,${sceneReferenceImage}`} alt="Референс сцены" className="w-full h-full object-contain" />
                    <button onClick={onClearSceneReference} className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity" title="Очистить референс">&times;</button>
                </div>
                <div className="space-y-2 mt-3 p-3 bg-gray-900/50 rounded-md border border-gray-700">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={useClothingFromReference}
                            onChange={(e) => setUseClothingFromReference(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-500 bg-gray-800 text-indigo-500 focus:ring-indigo-600 focus:ring-offset-gray-800"
                        />
                        <span className="text-sm text-gray-300">Использовать одежду с референса</span>
                    </label>
                     <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={useExpressionFromReference}
                            onChange={(e) => setUseExpressionFromReference(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-500 bg-gray-800 text-indigo-500 focus:ring-indigo-600 focus:ring-offset-gray-800"
                        />
                        <span className="text-sm text-gray-300">Использовать выражение лица с референса</span>
                    </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    <button
                        onClick={onAnalyze}
                        disabled={isLoading || isAnalyzing}
                        className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:from-sky-600 hover:to-blue-700 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md text-sm"
                    >
                        {isAnalyzing ? 'Анализ...' : 'Анализировать и настроить'}
                    </button>
                    <button
                        onClick={() => onGenerate({ useReferenceDirectly: true })}
                        disabled={isLoading || isAnalyzing}
                        className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md text-sm"
                    >
                        {isLoading ? 'Генерация...' : 'Сгенерировать по референсу'}
                    </button>
                </div>
            </div>
        ) : (
            <label className="block w-full text-center bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer text-sm">
                Загрузить референс сцены
                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                        onSceneReferenceUpload(e.target.files[0]);
                    }
                }} disabled={isLoading} />
            </label>
        )}
      </div>

      <div className={`rounded-lg overflow-hidden border border-gray-700`}>
        <AccordionItem id="character" title="Персонаж" isOpen={openAccordion === 'character'} onToggle={handleAccordionToggle}>
            <FormRow label="Статичная Поза">
              <SearchableSelect 
                options={POSES} 
                value={pose} 
                onChange={handlePoseChange} 
                disabled={isLoading || !!animation}
                placeholder="Выберите статичную позу..."
              />
            </FormRow>
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-gray-600"></div>
              <span className="flex-shrink mx-4 text-gray-500 text-xs">ИЛИ</span>
              <div className="flex-grow border-t border-gray-600"></div>
            </div>
            <FormRow label="Анимация (в движении)">
              <SearchableSelect 
                options={ANIMATIONS} 
                value={animation} 
                onChange={handleAnimationChange} 
                disabled={isLoading || !!pose}
                placeholder="Выберите анимацию..."
              />
            </FormRow>
            <FormRow label="Эмоция Персонажа"><SearchableSelect options={CHARACTER_EMOTIONS} value={emotion} onChange={setEmotion} disabled={isLoading}/></FormRow>
            <FormRow label="Положение персонажа к камере"><SearchableSelect options={CHARACTER_ORIENTATIONS.map(o => o.label)} value={CHARACTER_ORIENTATIONS.find(o => o.value === characterOrientation)?.label} onChange={v => setCharacterOrientation(CHARACTER_ORIENTATIONS.find(o => o.label === v)?.value || '')} disabled={isLoading}/></FormRow>
        </AccordionItem>

        <AccordionItem id="camera" title="Камера и Кадр" isOpen={openAccordion === 'camera'} onToggle={handleAccordionToggle}>
           <FormRow label="Вертикальное положение камеры"><SearchableSelect options={CAMERA_VERTICAL_POSITIONS.map(o => o.label)} value={CAMERA_VERTICAL_POSITIONS.find(o => o.value === cameraVertical)?.label} onChange={v => setCameraVertical(CAMERA_VERTICAL_POSITIONS.find(o => o.label === v)?.value || '')} disabled={isLoading}/></FormRow>
           <FormRow label="Горизонтальное положение камеры"><SearchableSelect options={CAMERA_HORIZONTAL_POSITIONS.map(o => o.label)} value={CAMERA_HORIZONTAL_POSITIONS.find(o => o.value === cameraHorizontal)?.label} onChange={v => setCameraHorizontal(CAMERA_HORIZONTAL_POSITIONS.find(o => o.label === v)?.value || '')} disabled={isLoading}/></FormRow>
           <FormRow label="Кадрирование (Тип Кадра)"><SearchableSelect options={SCENE_SHOT_TYPES.map(o => o.label)} value={SCENE_SHOT_TYPES.find(o => o.value === shotType)?.label} onChange={v => setShotType(SCENE_SHOT_TYPES.find(o => o.label === v)?.value || '')} disabled={isLoading}/></FormRow>
        </AccordionItem>
        
        <AccordionItem id="scene" title="Сцена и Стиль" isOpen={openAccordion === 'scene'} onToggle={handleAccordionToggle}>
            <FormRow label="Пресет Фона">
              <SearchableSelect
                options={BACKGROUND_PRESETS}
                value={background}
                onChange={setBackground}
                disabled={isLoading || isAnalyzing}
              />
            </FormRow>
            <FormRow label="Произвольный фон (переопределяет пресет)">
              <textarea
                value={localBackground}
                onBlur={() => setBackground(localBackground)}
                onChange={(e) => setLocalBackground(e.target.value)}
                rows={2}
                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                placeholder="Например: 'уютная спальня с большим окном'"
                disabled={isLoading || isAnalyzing}
              />
            </FormRow>
            <FormRow label="Соотношение сторон"><SearchableSelect options={ASPECT_RATIOS} value={aspectRatio} onChange={setAspectRatio} disabled={isLoading || isAnalyzing}/></FormRow>
            <FormRow label="Стиль Изображения"><SearchableSelect options={IMAGE_STYLES} value={imageStyle} onChange={setImageStyle} disabled={isLoading || isAnalyzing}/></FormRow>
        </AccordionItem>
        
        <AccordionItem id="lighting" title="Освещение и Цвет" isOpen={openAccordion === 'lighting'} onToggle={handleAccordionToggle}>
            <div className="flex items-center justify-center space-x-2 bg-gray-900/50 p-1 rounded-lg mb-4">
                <button onClick={() => setLightingType('natural')} className={`px-4 py-2 text-sm font-semibold rounded-md flex-1 transition-colors ${lightingType === 'natural' ? 'bg-teal-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Естественное</button>
                <button onClick={() => setLightingType('studio')} className={`px-4 py-2 text-sm font-semibold rounded-md flex-1 transition-colors ${lightingType === 'studio' ? 'bg-teal-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Студийное</button>
            </div>
            {lightingType === 'natural' ? (
                <FormRow label="Время суток"><SearchableSelect options={NATURAL_LIGHT_OPTIONS} value={naturalLight} onChange={setNaturalLight} disabled={isLoading || isAnalyzing}/></FormRow>
            ) : (
                <div className="space-y-4">
                    <FormRow label="Схема света"><SearchableSelect options={STUDIO_LIGHT_PRESETS} value={studioLightSetup} onChange={setStudioLightSetup} disabled={isLoading || isAnalyzing}/></FormRow>
                    <FormRow label="Цвет основного света"><SearchableSelect options={STUDIO_LAMP_COLORS.filter(c => c !== 'Нет')} value={studioMainLightColor} onChange={setStudioMainLightColor} disabled={isLoading || isAnalyzing}/></FormRow>
                    <FormRow label="Цвет акцентного света"><SearchableSelect options={STUDIO_LAMP_COLORS} value={studioAccentLightColor} onChange={setStudioAccentLightColor} disabled={isLoading || isAnalyzing}/></FormRow>
                </div>
            )}
            <FormRow label="Цветовая температура">
                <Slider value={colorTemperature} onChange={setColorTemperature} min={2000} max={10000} unit="K" description={getTemperatureDescription(colorTemperature)} />
            </FormRow>
        </AccordionItem>
        
        <AccordionItem id="post" title="Постобработка" isOpen={openAccordion === 'post'} onToggle={handleAccordionToggle}>
             <FormRow label="Фильтр"><SearchableSelect options={SCENE_FILTERS} value={filter} onChange={setFilter} disabled={isLoading || isAnalyzing}/></FormRow>
        </AccordionItem>
      </div>
      
      <div className="p-4">
        <button
          onClick={() => onGenerate()}
          disabled={isLoading || isAnalyzing}
          className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg text-lg"
        >
          {isLoading ? 'Генерация...' : 'Сгенерировать по Настройкам'}
        </button>
      </div>

    </div>
  );
};

export default SceneGenerator;
