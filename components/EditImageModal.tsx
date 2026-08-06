
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { CharacterProfile } from '../types';
import { AccordionItem } from './Accordion';
import SearchableSelect from './SearchableSelect';
// FIX: Corrected the import paths for constants from a non-existent module.
import { CLOTHING_PRESETS } from '../src/constants/clothing/presets';
import { CLOTHING_COLORS, CLOTHING_MATERIALS } from '../src/constants/clothing/properties';
import { BASE_LAYER_TYPES, TOP_TYPES, BOTTOM_TYPES, OUTERWEAR_TYPES, FOOTWEAR_TYPES } from '../src/constants/clothing/items';
import { ACCESSORIES } from '../src/constants/clothing/accessories';
import { EYELINER_STYLES, EYESHADOW_COLORS, LIPSTICK_COLORS } from '../src/constants/character/makeup';


interface EditImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmTextualEdit: (prompt: string) => void;
  onConfirmAppearanceEdit: (profile: CharacterProfile) => void;
  targetImage: { src: string; type: string; } | null;
  initialProfile: CharacterProfile;
  isEditing: boolean;
}

const EditImageModal: React.FC<EditImageModalProps> = ({
  isOpen,
  onClose,
  onConfirmTextualEdit,
  onConfirmAppearanceEdit,
  targetImage,
  initialProfile,
  isEditing,
}) => {
  const [textPrompt, setTextPrompt] = useState('');
  const [localProfile, setLocalProfile] = useState<CharacterProfile>(initialProfile);
  const [openAccordion, setOpenAccordion] = useState<string | null>('clothing');

  useEffect(() => {
    if (isOpen) {
      // Reset states when modal opens
      setTextPrompt('');
      setLocalProfile(initialProfile);
      setOpenAccordion('clothing');
    }
  }, [isOpen, initialProfile]);
  
  const clothingPresetOptions = useMemo(() => CLOTHING_PRESETS.map(opt => ({ label: opt.name, value: opt.name })), []);

  if (!isOpen || !targetImage) return null;
  
  const isAdvancedEditor = targetImage.type === 'Полный Рост' || targetImage.type === 'Вид Сзади';

  const handleConfirm = () => {
    if (isAdvancedEditor) {
      onConfirmAppearanceEdit(localProfile);
    } else {
      onConfirmTextualEdit(textPrompt);
    }
  };
  
  const handleAccordionToggle = (id: string) => {
    setOpenAccordion(prev => (prev === id ? null : id));
  };
  
  const handleChange = (field: keyof CharacterProfile, value: any) => {
    setLocalProfile(prev => ({ ...prev, [field]: value }));
  };
  
  const handleAccessoryChange = (accessory: string, isChecked: boolean) => {
    setLocalProfile(prev => {
      const currentAccessories = prev.accessories || [];
      if (isChecked) {
        return { ...prev, accessories: [...currentAccessories, accessory] };
      } else {
        return { ...prev, accessories: currentAccessories.filter(item => item !== accessory) };
      }
    });
  };
  
  const handleClothingPresetChange = (value: string) => {
    const presetName = value;
    const selectedPreset = CLOTHING_PRESETS.find(p => p.name === presetName);
    if (selectedPreset) {
      setLocalProfile(prev => ({
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
    }
  };
  
  // Reusable components for the form inside modal
  const FormRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-400 mb-2">{label}</label>
      {children}
    </div>
  );

  const ClothingItem: React.FC<{ item: string; typeField: keyof CharacterProfile; colorField: keyof CharacterProfile; materialField: keyof CharacterProfile; typeOptions: readonly string[]; }> = 
  ({ item, typeField, colorField, materialField, typeOptions }) => (
    <div className="grid grid-cols-7 gap-2 items-center">
        <label className="col-span-1 text-sm text-gray-400">{item}</label>
        <div className="col-span-2"><SearchableSelect options={typeOptions} value={localProfile[typeField] as string} onChange={(v) => handleChange(typeField, v)} /></div>
        <div className="col-span-2"><ColorSelect field={colorField} disabled={localProfile[typeField] === 'Нет одежды'} /></div>
        <div className="col-span-2"><SearchableSelect options={CLOTHING_MATERIALS} value={localProfile[materialField] as string} onChange={(v) => handleChange(materialField, v)} disabled={localProfile[typeField] === 'Нет одежды'}/></div>
    </div>
  );
  
  const ColorSelect: React.FC<{ field: keyof CharacterProfile; disabled?: boolean }> = ({ field, disabled = false }) => {
    const selectedColor = CLOTHING_COLORS.find(c => c.name === localProfile[field]) || CLOTHING_COLORS[0];
    return (
      <div className="flex items-center space-x-2">
         <div className={`w-5 h-5 rounded-full border-2 border-gray-500 shrink-0 ${disabled || isEditing ? 'opacity-50' : ''}`} style={{ backgroundColor: selectedColor.hex }} title={selectedColor.name}></div>
         <SearchableSelect value={localProfile[field] as string} onChange={v => handleChange(field, v)} options={CLOTHING_COLORS.map(c => c.name)} disabled={isEditing || disabled} />
      </div>
    );
  };
  
  const ToggleSwitch: React.FC<{ label: string, field: keyof CharacterProfile, isChecked: boolean }> = ({ label, field, isChecked }) => (
    <label className="flex items-center cursor-pointer"><input type="checkbox" checked={isChecked} onChange={e => handleChange(field, e.target.checked)} className="sr-only peer" disabled={isEditing} /><div className="relative w-11 h-6 bg-gray-700 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-800 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div><span className="ms-3 text-sm font-medium text-gray-300">{label}</span></label>
  );

  const portalContent = (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-4xl mx-auto bg-gray-800 rounded-lg shadow-2xl flex flex-col max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
        
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="font-semibold text-xl text-indigo-400">Редактировать Изображение: {targetImage.type}</h3>
          <button onClick={onClose} disabled={isEditing} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700 disabled:opacity-50"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        <div className="flex-grow overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="relative aspect-square bg-gray-900/50 rounded-lg flex items-center justify-center overflow-hidden">
              <img src={targetImage.src} alt="Editing preview" className="object-contain w-full h-full" />
            </div>
            
            {isAdvancedEditor ? (
              <div className="space-y-4">
                <div className="rounded-lg overflow-hidden border border-gray-700">
                  <AccordionItem id="clothing" title="Одежда" isOpen={openAccordion === 'clothing'} onToggle={handleAccordionToggle}>
                     <FormRow label="Пресет Одежды"><SearchableSelect options={clothingPresetOptions} value={localProfile.clothingPreset} onChange={handleClothingPresetChange} /></FormRow>
                      <div className="mt-4 p-4 bg-gray-900/50 rounded-lg space-y-3">
                        <div className="grid grid-cols-7 gap-2 items-center mb-2"><div className="col-span-1"></div><label className="col-span-2 text-xs font-bold text-gray-400 text-center">Тип</label><label className="col-span-2 text-xs font-bold text-gray-400 text-center">Цвет</label><label className="col-span-2 text-xs font-bold text-gray-400 text-center">Материал</label></div>
                        <ClothingItem item="Нижний Слой" typeField="baseLayerType" colorField="baseLayerColor" materialField="baseLayerMaterial" typeOptions={BASE_LAYER_TYPES} />
                        <ClothingItem item="Верх" typeField="topType" colorField="topColor" materialField="topMaterial" typeOptions={TOP_TYPES} />
                        <ClothingItem item="Низ" typeField="bottomType" colorField="bottomColor" materialField="bottomMaterial" typeOptions={BOTTOM_TYPES} />
                        <ClothingItem item="Верхняя Одежда" typeField="outerwearType" colorField="outerwearColor" materialField="outerwearMaterial" typeOptions={OUTERWEAR_TYPES} />
                        <ClothingItem item="Обувь" typeField="footwearType" colorField="footwearColor" materialField="footwearMaterial" typeOptions={FOOTWEAR_TYPES} />
                      </div>
                  </AccordionItem>
                  <AccordionItem id="mods" title="Аксессуары и Татуировки" isOpen={openAccordion === 'mods'} onToggle={handleAccordionToggle}>
                      <ToggleSwitch label="Аксессуары" field="hasAccessories" isChecked={localProfile.hasAccessories} />
                      {localProfile.hasAccessories && (<div className="mt-4 pt-4 pl-4 border-l-2 border-gray-700 space-y-4">
                          <FormRow label="Выберите аксессуары"><div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">{ACCESSORIES.map(acc => (<label key={acc} className="flex items-center space-x-2 text-sm cursor-pointer"><input type="checkbox" checked={(localProfile.accessories || []).includes(acc)} onChange={e => handleAccessoryChange(acc, e.target.checked)} className="h-4 w-4 rounded border-gray-500 bg-gray-800 text-indigo-500 focus:ring-indigo-600 focus:ring-offset-gray-800" /><span className="text-gray-300">{acc}</span></label>))}</div></FormRow>
                          <FormRow label="Доп. описание"><textarea value={localProfile.accessoriesCustom} onChange={e => handleChange('accessoriesCustom', e.target.value)} rows={2} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" /></FormRow>
                      </div>)}
                  </AccordionItem>
                   <AccordionItem id="makeup" title="Макияж" isOpen={openAccordion === 'makeup'} onToggle={handleAccordionToggle}>
                      <ToggleSwitch label="Макияж" field="hasMakeup" isChecked={localProfile.hasMakeup} />
                      {localProfile.hasMakeup && (<div className="mt-4 pt-4 pl-4 border-l-2 border-gray-700 space-y-4">
                          <FormRow label="Подводка"><SearchableSelect options={EYELINER_STYLES} value={localProfile.eyelinerStyle} onChange={(v) => handleChange('eyelinerStyle', v)} /></FormRow>
                          <FormRow label="Тени"><SearchableSelect options={EYESHADOW_COLORS} value={localProfile.eyeshadowColor} onChange={(v) => handleChange('eyeshadowColor', v)} /></FormRow>
                          <FormRow label="Помада"><SearchableSelect options={LIPSTICK_COLORS} value={localProfile.lipstickColor} onChange={(v) => handleChange('lipstickColor', v)} /></FormRow>
                      </div>)}
                  </AccordionItem>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-200">Опишите ваши изменения</h4>
                <p className="text-sm text-gray-400">Используйте простой язык для описания того, что вы хотите изменить. Например: "добавь улыбку", "сделай глаза голубыми".</p>
                <textarea value={textPrompt} onChange={(e) => setTextPrompt(e.target.value)} rows={5} className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Например: добавь легкую улыбку..." disabled={isEditing}/>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-800/50 border-t border-gray-700 flex justify-end items-center space-x-3">
          <button onClick={onClose} disabled={isEditing} className="py-2 px-4 rounded-md text-sm font-semibold transition-colors bg-gray-600 hover:bg-gray-500 text-white disabled:opacity-50">Отмена</button>
          <button onClick={handleConfirm} disabled={isEditing || (!isAdvancedEditor && !textPrompt)} className="py-2 px-5 rounded-md text-sm font-semibold transition-colors bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]">
            {isEditing ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Обработка...</>) : 'Применить Изменения'}
          </button>
        </div>

      </div>
    </div>
  );

  return createPortal(portalContent, document.body);
};

export default EditImageModal;
