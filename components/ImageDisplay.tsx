
import React from 'react';
import { ImageResult } from '../types';
import Spinner from './Spinner';

interface ImageDisplayProps {
  images: ImageResult[];
  isGeneratingPortrait: boolean;
  isGeneratingFullBody: boolean;
  isGeneratingBackView: boolean;
  error: string | null;
  isApplyingEnhancements: boolean;
  onApplyImageProcessing: () => void;
  processingOptions: { cropAndStraighten: boolean; enhance: boolean; removeBg: boolean; removeAccessories: boolean; };
  setProcessingOptions: React.Dispatch<React.SetStateAction<{ cropAndStraighten: boolean; enhance: boolean; removeBg: boolean; removeAccessories: boolean; }>>;
  onEdit: (image: ImageResult) => void;
}

const CheckboxOption: React.FC<{ id: string; label: string; checked: boolean; onChange: (checked: boolean) => void; disabled: boolean; }> = ({ id, label, checked, onChange, disabled }) => (
    <label htmlFor={id} className={`flex items-center space-x-2 text-sm ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
        <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={e => onChange(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-gray-500 bg-gray-700 text-indigo-500 focus:ring-indigo-600 focus:ring-offset-gray-800"
        />
        <span className="text-gray-300">{label}</span>
    </label>
);

const ImageCard: React.FC<{ 
  title: string; 
  image?: ImageResult; 
  isLoading?: boolean;
  isApplyingEnhancements?: boolean;
  onApplyImageProcessing?: () => void;
  processingOptions?: { cropAndStraighten: boolean; enhance: boolean; removeBg: boolean; removeAccessories: boolean; };
  setProcessingOptions?: React.Dispatch<React.SetStateAction<{ cropAndStraighten: boolean; enhance: boolean; removeBg: boolean; removeAccessories: boolean; }>>;
  onEdit: (image: ImageResult) => void;
}> = ({ title, image, isLoading = false, isApplyingEnhancements, onApplyImageProcessing, processingOptions, setProcessingOptions, onEdit }) => (
  <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col border border-gray-700">
    <div className="aspect-[3/4] flex-grow flex items-center justify-center bg-gray-900/50">
      {isLoading ? (
        <Spinner />
      ) : image?.src ? (
        <img src={image.src} alt={title} className="object-contain w-full h-full" />
      ) : (
        <div className="text-gray-500 text-center px-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p className="mt-2 text-sm">Изображение появится здесь</p>
        </div>
      )}
    </div>
    <div className="bg-gray-700 p-3 text-center flex justify-between items-center">
      <h3 className="font-semibold text-gray-200">{title}</h3>
      {image && !isLoading && (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onEdit(image)}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-gray-600"
            title={`Редактировать ${title}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
            </svg>
          </button>
          <a
            href={image.src}
            download={`${title.toLowerCase().replace(/\s+/g, '-')}-персонаж.png`}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-gray-600"
            title={`Скачать ${title}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        </div>
      )}
    </div>
    {title === 'Портрет' && image?.src && !isLoading && (
      <div className="p-3 bg-gray-700/50 border-t border-gray-600 space-y-3">
          <h4 className="font-semibold text-xs text-indigo-300 uppercase tracking-wider">ИИ Обработка</h4>
          <div className="grid grid-cols-1 gap-1">
              <CheckboxOption 
                  id="crop" label="Кадрировать лицо"
                  checked={processingOptions.cropAndStraighten}
                  onChange={(v) => setProcessingOptions(prev => ({ ...prev, cropAndStraighten: v }))}
                  disabled={isApplyingEnhancements}
              />
              <CheckboxOption 
                  id="enhance" label="Улучшить качество"
                  checked={processingOptions.enhance}
                  onChange={(v) => setProcessingOptions(prev => ({ ...prev, enhance: v }))}
                  disabled={isApplyingEnhancements}
              />
          </div>
          <button 
              onClick={onApplyImageProcessing}
              disabled={isApplyingEnhancements}
              className="w-full text-xs bg-indigo-600 text-white font-bold py-1.5 rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
              {isApplyingEnhancements ? 'Обработка...' : 'Применить'}
          </button>
      </div>
    )}
  </div>
);

const ImageDisplay: React.FC<ImageDisplayProps> = ({ 
    images, isGeneratingPortrait, isGeneratingFullBody, isGeneratingBackView, 
    error, isApplyingEnhancements, onApplyImageProcessing, processingOptions, setProcessingOptions, onEdit
}) => {
  const placeholders: ('Портрет' | 'Полный Рост' | 'Вид Сзади')[] = ['Портрет', 'Полный Рост', 'Вид Сзади'];
  const anyLoading = isGeneratingPortrait || isGeneratingFullBody || isGeneratingBackView;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-900/40 border border-red-500 text-red-200 p-4 rounded-lg flex items-start space-x-3 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-bold">Ошибка генерации</h4>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {images.length === 0 && !anyLoading ? (
          <div className="bg-gray-800 p-12 rounded-lg border-2 border-dashed border-gray-700 flex flex-col items-center justify-center text-center text-gray-500">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v1m6 11h2m-6.586 4.414l1.414 1.414M4 11H2m17.586 4.414l-1.414 1.414M4.414 6.414L3 5m16.586-1.414l-1.414 1.414M12 20v1M4.414 17.586L3 19m11-1.586l1.414-1.414M9 12a3 3 0 116 0 3 3 0 01-6 0z" /></svg>
             <h2 className="text-xl font-bold mb-2">Лист персонажа пуст</h2>
             <p className="max-w-xs text-sm">Настройте параметры и нажмите "Сгенерировать", чтобы создать визуальный образ.</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
           {placeholders.map((title) => {
               const image = images.find(img => img.type === title);
               const cardIsLoading = 
                 (title === 'Портрет' && isGeneratingPortrait) ||
                 (title === 'Полный Рост' && isGeneratingFullBody) ||
                 (title === 'Вид Сзади' && isGeneratingBackView);

               return (
                 <ImageCard 
                    key={title} title={title} image={image} isLoading={cardIsLoading}
                    isApplyingEnhancements={title === 'Портрет' ? isApplyingEnhancements : undefined}
                    onApplyImageProcessing={title === 'Портрет' ? onApplyImageProcessing : undefined}
                    processingOptions={title === 'Портрет' ? processingOptions : undefined}
                    setProcessingOptions={title === 'Портрет' ? setProcessingOptions : undefined}
                    onEdit={onEdit}
                 />
               )
           })}
        </div>
      )}
    </div>
  );
};

export default ImageDisplay;
