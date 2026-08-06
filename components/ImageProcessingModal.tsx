
import React from 'react';
import { createPortal } from 'react-dom';

const MiniSpinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


interface ImageProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  imageSrc: string;
  options: {
    enhance: boolean;
    removeBg: boolean;
    removeAccessories: boolean;
  };
  setOptions: React.Dispatch<React.SetStateAction<{
    enhance: boolean;
    removeBg: boolean;
    removeAccessories: boolean;
  }>>;
  isProcessing: boolean;
}

const CheckboxOption: React.FC<{ id: string; label: string; checked: boolean; onChange: (checked: boolean) => void; disabled: boolean; }> = ({ id, label, checked, onChange, disabled }) => (
    <label htmlFor={id} className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${disabled ? 'opacity-60' : 'cursor-pointer hover:bg-gray-700/50'}`}>
        <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={e => onChange(e.target.checked)}
            disabled={disabled}
            className="h-5 w-5 rounded border-gray-500 bg-gray-700 text-indigo-500 focus:ring-indigo-600 focus:ring-offset-gray-800"
        />
        <span className="text-gray-300">{label}</span>
    </label>
);


const ImageProcessingModal: React.FC<ImageProcessingModalProps> = ({ isOpen, onClose, onConfirm, imageSrc, options, setOptions, isProcessing }) => {
  if (!isOpen) return null;

  const handleOptionChange = (option: keyof typeof options, value: boolean) => {
      setOptions(prev => ({ ...prev, [option]: value }));
  };

  const portalContent = (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-2xl mx-auto bg-gray-800 rounded-lg shadow-2xl flex flex-col max-h-[95vh]">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h3 className="font-semibold text-xl text-indigo-400">Обработка Изображения</h3>
          <button onClick={onClose} disabled={isProcessing} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700 disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="relative aspect-square bg-gray-900/50 rounded-lg flex items-center justify-center overflow-hidden">
                    {isProcessing ? (
                        <div className="text-center">
                             <svg aria-hidden="true" className="w-12 h-12 text-gray-600 animate-spin fill-indigo-500" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                            </svg>
                            <p className="mt-4 text-gray-400">Обработка...</p>
                        </div>
                    ) : (
                        <img src={imageSrc} alt="Uploaded for processing" className="object-contain w-full h-full" />
                    )}
                </div>
                <div className="space-y-4">
                    <h4 className="font-semibold text-gray-200">Опции Улучшения</h4>
                    <p className="text-sm text-gray-400">ИИ обработает ваше изображение: кадрирует лицо, улучшит качество и применит выбранные опции.</p>
                    <div className="space-y-2 pt-2">
                       <CheckboxOption id="enhance" label="Улучшить качество и детализацию лица" checked={options.enhance} onChange={(v) => handleOptionChange('enhance', v)} disabled={isProcessing} />
                       <CheckboxOption id="removeBg" label="Удалить фон (заменить на нейтральный)" checked={options.removeBg} onChange={(v) => handleOptionChange('removeBg', v)} disabled={isProcessing} />
                       <CheckboxOption id="removeAccessories" label="Удалить аксессуары (очки, шляпы)" checked={options.removeAccessories} onChange={(v) => handleOptionChange('removeAccessories', v)} disabled={isProcessing} />
                    </div>
                </div>
            </div>
        </div>
        
        <div className="p-4 bg-gray-800/50 border-t border-gray-700 flex justify-end items-center space-x-3">
            <button onClick={onClose} disabled={isProcessing} className="py-2 px-4 rounded-md text-sm font-semibold transition-colors bg-gray-600 hover:bg-gray-500 text-white disabled:opacity-50">
              Отмена
            </button>
            <button onClick={onConfirm} disabled={isProcessing} className="py-2 px-5 rounded-md text-sm font-semibold transition-colors bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]">
              {isProcessing ? <MiniSpinner /> : 'Обработать'}
            </button>
        </div>
      </div>
    </div>
  );
  
  return createPortal(portalContent, document.body);
};

export default ImageProcessingModal;
