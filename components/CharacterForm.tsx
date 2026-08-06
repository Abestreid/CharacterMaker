
import React, { useEffect, useMemo, useState } from 'react';
import { CharacterProfile, ClothingPreset } from '../types';
import { GENDERS, MUSCLE_MASS_LEVELS, BREAST_SHAPES, BREAST_FIRMNESS_LEVELS, BUTTOCK_SHAPES, BUTTOCK_FIRMNESS_LEVELS } from '../src/constants/character/physique';
import { HAIR_LENGTHS, HAIR_TYPES, HAIRSTYLES, HAIR_COLORS, EYE_COLORS, SKIN_TONES, ETHNICITIES } from '../src/constants/character/appearance';
// FIX: Corrected typo in import from CHEEEKBONES to CHEEKBONES.
import { HEAD_SHAPES, FOREHEAD_SIZES, EYEBROW_SHAPES, EYEBROW_THICKNESSES, EYE_SHAPES, EYE_SIZES, EYE_SPACINGS, NOSE_SHAPES, NOSE_SIZES, LIP_SHAPES, CHEEKBONES, CHIN_SHAPES } from '../src/constants/character/facialFeatures';
import { EYELINER_STYLES, EYESHADOW_COLORS, LIPSTICK_COLORS } from '../src/constants/character/makeup';
import { BASE_LAYER_TYPES, TOP_TYPES, BOTTOM_TYPES, OUTERWEAR_TYPES, FOOTWEAR_TYPES } from '../src/constants/clothing/items';
import { CLOTHING_MATERIALS, CLOTHING_COLORS } from '../src/constants/clothing/properties';
import { ACCESSORIES } from '../src/constants/clothing/accessories';
import { CLOTHING_PRESETS } from '../src/constants/clothing/presets';
import { PRESET_CLOTHING_LIBRARY } from '../src/constants/clothing/library';
import { IMAGE_STYLES } from '../src/constants/scene/style';
import { PRESETS } from '../src/constants/character/presets';
import { AccordionItem } from './Accordion';
import SearchableSelect from './SearchableSelect';

interface CharacterFormProps {
  profile: CharacterProfile;
  setProfile: React.Dispatch<React.SetStateAction<CharacterProfile>>;
  isLoading: boolean;
  onClothingImageUpload: (file: File) => void;
  onSelectClothingLibraryItem: (urls: string[]) => void;
  onSetClothingFromUserLibrary: (images: string[]) => void;
  onClearClothingImage: () => void;
  clothingReferenceImages: string[] | null;
  setSceneBackground: (bg: string) => void;
  userImageLibrary: string[];
  onUserImageLibraryUpload: (files: FileList) => void;
  onDeleteUserImage: (index: number) => void;
}

const CharacterForm: React.FC<CharacterFormProps> = ({ 
  profile, 
  setProfile, 
  isLoading,
  onClothingImageUpload,
  onSelectClothingLibraryItem,
  onSetClothingFromUserLibrary,
  onClearClothingImage,
  clothingReferenceImages,
  setSceneBackground,
  userImageLibrary,
  onUserImageLibraryUpload,
  onDeleteUserImage
}) => {
  
  const [openAccordion, setOpenAccordion] = useState<string | null>('presets');
  const [selectedLibraryIndices, setSelectedLibraryIndices] = useState<number[]>([]);

  const handleAccordionToggle = (id: string) => {
    setOpenAccordion(prev => (prev === id ? null : id));
  };
  
  const handleChange = (field: keyof CharacterProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handlePresetChange = (presetName: string) => {
    const preset = PRESETS.find(p => p.name === presetName);
    if (preset) {
        setProfile(preset.profile);
    }
  };
  
  const handleClothingPresetChange = (presetName: string) => {
    const selectedPreset = CLOTHING_PRESETS.find(p => p.name === presetName);
    if (selectedPreset) {
      setProfile(prev => ({
        ...prev,
        clothingPreset: selectedPreset.name,
        baseLayerType: selectedPreset.baseLayerType, baseLayerColor: selectedPreset.baseLayerColor, baseLayerMaterial: selectedPreset.baseLayerMaterial,
        topType: selectedPreset.topType, topColor: selectedPreset.topColor, topMaterial: selectedPreset.topMaterial,
        bottomType: selectedPreset.bottomType, bottomColor: selectedPreset.bottomColor, bottomMaterial: selectedPreset.bottomMaterial,
        outerwearType: selectedPreset.outerwearType, outerwearColor: selectedPreset.outerwearColor, outerwearMaterial: selectedPreset.outerwearMaterial,
        footwearType: selectedPreset.footwearType, footwearColor: selectedPreset.footwearColor, footwearMaterial: selectedPreset.footwearMaterial,
        accessories: selectedPreset.accessories, accessoriesCustom: selectedPreset.accessoriesCustom,
        hasAccessories: selectedPreset.accessories.length > 0 || !!selectedPreset.accessoriesCustom,
      }));
      setSceneBackground(selectedPreset.suggestedBackground);
      onClearClothingImage();
    }
  };

  const handleAccessoryChange = (accessory: string, isChecked: boolean) => {
    setProfile(prev => {
      const currentAccessories = prev.accessories || [];
      if (isChecked) {
        return { ...prev, accessories: [...currentAccessories, accessory] };
      } else {
        return { ...prev, accessories: currentAccessories.filter(item => item !== accessory) };
      }
    });
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (file: File) => void) => {
    if (e.target.files && e.target.files[0]) {
      callback(e.target.files[0]);
    }
  };

  const handleUserLibrarySelection = (index: number) => {
    setSelectedLibraryIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const handleApplyUserLibrarySelection = () => {
    if (selectedLibraryIndices.length === 0) return;
    const selectedImages = selectedLibraryIndices.map(index => userImageLibrary[index]);
    onSetClothingFromUserLibrary(selectedImages);
    setSelectedLibraryIndices([]);
  };

  const handleUserLibraryFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          onUserImageLibraryUpload(e.target.files);
      }
  };
  
  const characterPresetOptions = useMemo(() => PRESETS.map(p => ({ label: p.name, value: p.name })), []);
  
  // FIX: Renamed 'clothingCategories' to 'clothingPresetOptions' and flattened the structure to be compatible with the SearchableSelect component.
  const clothingPresetOptions = useMemo(() => CLOTHING_PRESETS.map(p => ({ label: p.name, value: p.name })), []);

  const FormRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      {children}
    </div>
  );
  
  const Slider: React.FC<{label: string, value: number, onChange: (v: number) => void, min: number, max: number, unit: string, physiqueKey: keyof CharacterProfile}> = ({ label, value, onChange, min, max, unit, physiqueKey }) => (
     <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
        <div className="flex items-center space-x-3">
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={e => onChange(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                disabled={isLoading}
            />
            <input
              type="number"
              value={value}
              onChange={e => {
                let num = parseInt(e.target.value, 10);
                if (isNaN(num)) num = min;
                if (num > max) num = max;
                if (num < min) num = min;
                onChange(num);
              }}
              className="w-24 bg-gray-900/50 rounded-md p-2 text-center border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <span className="text-sm text-gray-400 w-4">{unit}</span>
        </div>
     </div>
  );
  
  const ColorSelect: React.FC<{ field: keyof CharacterProfile; disabled?: boolean }> = ({ field, disabled = false }) => {
    const selectedColor = CLOTHING_COLORS.find(c => c.name === profile[field]) || CLOTHING_COLORS[0];
    return (
      <div className="flex items-center space-x-2">
         <div className={`w-5 h-5 rounded-full border-2 border-gray-500 shrink-0 ${disabled || isLoading ? 'opacity-50' : ''}`} style={{ backgroundColor: selectedColor.hex }} title={selectedColor.name}></div>
         <SearchableSelect value={profile[field] as string} onChange={v => handleChange(field, v)} options={CLOTHING_COLORS.map(c => c.name)} disabled={isLoading || disabled} />
      </div>
    );
  };
  
  const ClothingItem: React.FC<{ item: string; typeField: keyof CharacterProfile; colorField: keyof CharacterProfile; materialField: keyof CharacterProfile; typeOptions: readonly string[]; }> = 
  ({ item, typeField, colorField, materialField, typeOptions }) => (
    <div className="grid grid-cols-7 gap-2 items-center">
        <label className="col-span-1 text-sm text-gray-400">{item}</label>
        <div className="col-span-2"><SearchableSelect options={typeOptions} value={profile[typeField] as string} onChange={(v) => handleChange(typeField, v)} disabled={isLoading} /></div>
        <div className="col-span-2"><ColorSelect field={colorField} disabled={profile[typeField] === 'Нет одежды'} /></div>
        <div className="col-span-2"><SearchableSelect options={CLOTHING_MATERIALS} value={profile[materialField] as string} onChange={(v) => handleChange(materialField, v)} disabled={isLoading || profile[typeField] === 'Нет одежды'}/></div>
    </div>
  );
  
  const ToggleSwitch: React.FC<{ label: string, field: keyof CharacterProfile, isChecked: boolean }> = ({ label, field, isChecked }) => (
    <label className="flex items-center cursor-pointer"><input type="checkbox" checked={isChecked} onChange={e => handleChange(field, e.target.checked)} className="sr-only peer" disabled={isLoading} /><div className="relative w-11 h-6 bg-gray-700 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-800 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div><span className="ms-3 text-sm font-medium text-gray-300">{label}</span></label>
  );

  return (
    <div className="rounded-lg overflow-hidden border border-gray-700">
        <AccordionItem id="presets" title="Пресеты Персонажей" isOpen={openAccordion === 'presets'} onToggle={handleAccordionToggle}>
          <FormRow label="Загрузить Пресет Персонажа">
            <SearchableSelect options={characterPresetOptions} value="" onChange={handlePresetChange} placeholder="Выберите пресет..." disabled={isLoading}/>
          </FormRow>
        </AccordionItem>

        <AccordionItem id="clothing" title="Одежда" isOpen={openAccordion === 'clothing'} onToggle={handleAccordionToggle}>
            <FormRow label="Пресет Одежды"><SearchableSelect options={clothingPresetOptions} value={profile.clothingPreset} onChange={handleClothingPresetChange} disabled={isLoading}/></FormRow>
            
            <div className="mt-4 p-4 bg-gray-900/50 rounded-lg space-y-3">
              <h4 className="text-base font-semibold text-gray-300 mb-2">Референс Одежды</h4>
              <div className="grid grid-cols-2 gap-2">
                <label className="block w-full text-center bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer text-sm">Загрузить файл<input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, onClothingImageUpload)} disabled={isLoading} /></label>
                <SearchableSelect options={PRESET_CLOTHING_LIBRARY.map(c => c.name)} value="" onChange={(name) => onSelectClothingLibraryItem(PRESET_CLOTHING_LIBRARY.find(c => c.name === name)?.images || [])} placeholder="Загрузить из библиотеки..." disabled={isLoading} />
              </div>
              {clothingReferenceImages && (
                <div className="mt-2 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-sm text-green-400">Референс загружен ({clothingReferenceImages.length} шт.)</span>
                    <button onClick={onClearClothingImage} className="text-red-400 hover:text-red-300 text-xs" title="Очистить референс">&times;</button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 p-4 bg-gray-900/50 rounded-lg space-y-3">
              <h4 className="text-base font-semibold text-gray-300 mb-2">Детализация Одежды</h4>
              <div className="grid grid-cols-7 gap-2 items-center mb-2"><div className="col-span-1"></div><label className="col-span-2 text-xs font-bold text-gray-400 text-center">Тип</label><label className="col-span-2 text-xs font-bold text-gray-400 text-center">Цвет</label><label className="col-span-2 text-xs font-bold text-gray-400 text-center">Материал</label></div>
              <ClothingItem item="Нижний Слой" typeField="baseLayerType" colorField="baseLayerColor" materialField="baseLayerMaterial" typeOptions={BASE_LAYER_TYPES} />
              <ClothingItem item="Верх" typeField="topType" colorField="topColor" materialField="topMaterial" typeOptions={TOP_TYPES} />
              <ClothingItem item="Низ" typeField="bottomType" colorField="bottomColor" materialField="bottomMaterial" typeOptions={BOTTOM_TYPES} />
              <ClothingItem item="Верхняя Одежда" typeField="outerwearType" colorField="outerwearColor" materialField="outerwearMaterial" typeOptions={OUTERWEAR_TYPES} />
              <ClothingItem item="Обувь" typeField="footwearType" colorField="footwearColor" materialField="footwearMaterial" typeOptions={FOOTWEAR_TYPES} />
            </div>
        </AccordionItem>
        
        <AccordionItem id="mods" title="Аксессуары и Тату" isOpen={openAccordion === 'mods'} onToggle={handleAccordionToggle}>
            <div className="space-y-4">
              <ToggleSwitch label="Аксессуары" field="hasAccessories" isChecked={profile.hasAccessories} />
              {profile.hasAccessories && (<div className="mt-4 pt-4 pl-4 border-l-2 border-gray-700 space-y-4">
                  <FormRow label="Выберите аксессуары"><div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">{ACCESSORIES.map(acc => (<label key={acc} className="flex items-center space-x-2 text-sm cursor-pointer"><input type="checkbox" checked={(profile.accessories || []).includes(acc)} onChange={e => handleAccessoryChange(acc, e.target.checked)} disabled={isLoading} className="h-4 w-4 rounded border-gray-500 bg-gray-800 text-indigo-500 focus:ring-indigo-600 focus:ring-offset-gray-800" /><span className="text-gray-300">{acc}</span></label>))}</div></FormRow>
                  <FormRow label="Доп. описание (важно для платьев, костюмов)"><textarea value={profile.accessoriesCustom} onChange={e => handleChange('accessoriesCustom', e.target.value)} rows={3} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled={isLoading} /></FormRow>
              </div>)}
            </div>
            <hr className="border-gray-700 my-4" />
            <div className="space-y-4">
              <ToggleSwitch label="Татуировки" field="hasTattoos" isChecked={profile.hasTattoos} />
              {profile.hasTattoos && (<div className="mt-4 pt-4 pl-4 border-l-2 border-gray-700 space-y-4">
                <FormRow label="Описание татуировок"><textarea value={profile.tattooDescription} onChange={e => handleChange('tattooDescription', e.target.value)} rows={3} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Например: 'маленькая роза на левом плече, дракон на всю спину'" disabled={isLoading}/></FormRow>
              </div>)}
            </div>
        </AccordionItem>
        
        <AccordionItem id="user_library" title="Референсы Пользователя" isOpen={openAccordion === 'user_library'} onToggle={handleAccordionToggle}>
           <div className="space-y-4">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {userImageLibrary.map((img, index) => (
                      <div key={index} className="relative aspect-square group cursor-pointer" onClick={() => handleUserLibrarySelection(index)}>
                          <img src={`data:image/png;base64,${img}`} alt={`user ref ${index}`} className="w-full h-full object-cover rounded-md" />
                          <div className={`absolute inset-0 rounded-md transition-all ${selectedLibraryIndices.includes(index) ? 'ring-4 ring-offset-2 ring-offset-gray-800 ring-indigo-500' : 'bg-black/50 opacity-0 group-hover:opacity-100'}`}></div>
                          <button onClick={(e) => { e.stopPropagation(); onDeleteUserImage(index); }} className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                      </div>
                  ))}
                  <label className="aspect-square flex items-center justify-center bg-gray-700/50 rounded-md border-2 border-dashed border-gray-600 hover:border-indigo-500 transition-colors cursor-pointer">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                      <input type="file" multiple className="hidden" accept="image/*" onChange={handleUserLibraryFileUpload} disabled={isLoading} />
                  </label>
              </div>
              {selectedLibraryIndices.length > 0 && (
                <button onClick={handleApplyUserLibrarySelection} className="w-full mt-2 bg-indigo-600 text-white font-semibold py-2 rounded-md hover:bg-indigo-700 transition-colors">Применить {selectedLibraryIndices.length} референс(а)</button>
              )}
           </div>
        </AccordionItem>
        
        <AccordionItem id="physique" title="Физические параметры" isOpen={openAccordion === 'physique'} onToggle={handleAccordionToggle}>
            <FormRow label="Пол"><SearchableSelect options={GENDERS} value={profile.gender} onChange={(v) => handleChange('gender', v)} disabled={isLoading} /></FormRow>
            <Slider label="Возраст" value={profile.age} onChange={(v) => handleChange('age', v)} min={16} max={90} unit="лет" physiqueKey="age" />
            <Slider label="Рост" value={profile.height} onChange={(v) => handleChange('height', v)} min={140} max={220} unit="см" physiqueKey="height" />
            <Slider label="Вес" value={profile.weight} onChange={(v) => handleChange('weight', v)} min={40} max={150} unit="кг" physiqueKey="weight" />
            <Slider label="Обхват груди" value={profile.bust} onChange={(v) => handleChange('bust', v)} min={70} max={140} unit="см" physiqueKey="bust" />
            <Slider label="Обхват талии" value={profile.waist} onChange={(v) => handleChange('waist', v)} min={50} max={120} unit="см" physiqueKey="waist" />
            <Slider label="Обхват бедер" value={profile.hips} onChange={(v) => handleChange('hips', v)} min={70} max={140} unit="см" physiqueKey="hips" />
            <Slider label="Процент жира" value={profile.bodyFat} onChange={(v) => handleChange('bodyFat', v)} min={8} max={45} unit="%" physiqueKey="bodyFat" />
            <FormRow label="Мышечная масса"><SearchableSelect options={MUSCLE_MASS_LEVELS} value={profile.muscleMass} onChange={(v) => handleChange('muscleMass', v)} disabled={isLoading}/></FormRow>
            {profile.gender === 'Женский' && <>
                <FormRow label="Форма груди"><SearchableSelect options={BREAST_SHAPES} value={profile.breastShape} onChange={(v) => handleChange('breastShape', v)} disabled={isLoading}/></FormRow>
                <FormRow label="Упругость груди"><SearchableSelect options={BREAST_FIRMNESS_LEVELS} value={profile.breastFirmness} onChange={(v) => handleChange('breastFirmness', v)} disabled={isLoading}/></FormRow>
                <FormRow label="Форма ягодиц"><SearchableSelect options={BUTTOCK_SHAPES} value={profile.buttockShape} onChange={(v) => handleChange('buttockShape', v)} disabled={isLoading}/></FormRow>
                <FormRow label="Упругость ягодиц"><SearchableSelect options={BUTTOCK_FIRMNESS_LEVELS} value={profile.buttockFirmness} onChange={(v) => handleChange('buttockFirmness', v)} disabled={isLoading}/></FormRow>
            </>}
        </AccordionItem>

        <AccordionItem id="appearance" title="Внешность" isOpen={openAccordion === 'appearance'} onToggle={handleAccordionToggle}>
            <FormRow label="Стиль Изображения"><SearchableSelect options={IMAGE_STYLES} value={profile.imageStyle} onChange={(v) => handleChange('imageStyle', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Этнос"><SearchableSelect options={ETHNICITIES} value={profile.ethnicity} onChange={(v) => handleChange('ethnicity', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Тон кожи"><SearchableSelect options={SKIN_TONES} value={profile.skinTone} onChange={(v) => handleChange('skinTone', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Цвет глаз"><SearchableSelect options={EYE_COLORS} value={profile.eyeColor} onChange={(v) => handleChange('eyeColor', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Длина волос"><SearchableSelect options={HAIR_LENGTHS} value={profile.hairLength} onChange={(v) => handleChange('hairLength', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Тип волос"><SearchableSelect options={HAIR_TYPES} value={profile.hairType} onChange={(v) => handleChange('hairType', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Прическа"><SearchableSelect options={HAIRSTYLES} value={profile.hairstyle} onChange={(v) => handleChange('hairstyle', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Цвет волос"><SearchableSelect options={HAIR_COLORS} value={profile.hairColor} onChange={(v) => handleChange('hairColor', v)} disabled={isLoading}/></FormRow>
        </AccordionItem>
        
        <AccordionItem id="facial" title="Черты Лица" isOpen={openAccordion === 'facial'} onToggle={handleAccordionToggle}>
            <FormRow label="Форма головы"><SearchableSelect options={HEAD_SHAPES} value={profile.headShape} onChange={(v) => handleChange('headShape', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Лоб"><SearchableSelect options={FOREHEAD_SIZES} value={profile.foreheadSize} onChange={(v) => handleChange('foreheadSize', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Форма бровей"><SearchableSelect options={EYEBROW_SHAPES} value={profile.eyebrowShape} onChange={(v) => handleChange('eyebrowShape', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Густота бровей"><SearchableSelect options={EYEBROW_THICKNESSES} value={profile.eyebrowThickness} onChange={(v) => handleChange('eyebrowThickness', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Форма глаз"><SearchableSelect options={EYE_SHAPES} value={profile.eyeShape} onChange={(v) => handleChange('eyeShape', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Размер глаз"><SearchableSelect options={EYE_SIZES} value={profile.eyeSize} onChange={(v) => handleChange('eyeSize', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Расстояние между глазами"><SearchableSelect options={EYE_SPACINGS} value={profile.eyeSpacing} onChange={(v) => handleChange('eyeSpacing', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Форма носа"><SearchableSelect options={NOSE_SHAPES} value={profile.noseShape} onChange={(v) => handleChange('noseShape', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Размер носа"><SearchableSelect options={NOSE_SIZES} value={profile.noseSize} onChange={(v) => handleChange('noseSize', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Форма губ"><SearchableSelect options={LIP_SHAPES} value={profile.lipShape} onChange={(v) => handleChange('lipShape', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Скулы"><SearchableSelect options={CHEEKBONES} value={profile.cheekbones} onChange={(v) => handleChange('cheekbones', v)} disabled={isLoading}/></FormRow>
            <FormRow label="Форма подбородка"><SearchableSelect options={CHIN_SHAPES} value={profile.chinShape} onChange={(v) => handleChange('chinShape', v)} disabled={isLoading}/></FormRow>
        </AccordionItem>

        <AccordionItem id="makeup" title="Макияж" isOpen={openAccordion === 'makeup'} onToggle={handleAccordionToggle}>
            <ToggleSwitch label="Макияж" field="hasMakeup" isChecked={profile.hasMakeup} />
            {profile.hasMakeup && (
            <div className="mt-4 pt-4 pl-4 border-l-2 border-gray-700 space-y-4">
                <FormRow label="Подводка"><SearchableSelect options={EYELINER_STYLES} value={profile.eyelinerStyle} onChange={(v) => handleChange('eyelinerStyle', v)} disabled={isLoading}/></FormRow>
                <FormRow label="Тени"><SearchableSelect options={EYESHADOW_COLORS} value={profile.eyeshadowColor} onChange={(v) => handleChange('eyeshadowColor', v)} disabled={isLoading}/></FormRow>
                <FormRow label="Помада"><SearchableSelect options={LIPSTICK_COLORS} value={profile.lipstickColor} onChange={(v) => handleChange('lipstickColor', v)} disabled={isLoading}/></FormRow>
            </div>
            )}
        </AccordionItem>
    </div>
  );
};

export default CharacterForm;