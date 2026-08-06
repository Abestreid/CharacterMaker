
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface SearchableSelectProps {
  options: readonly string[] | readonly { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder = 'Выберите опцию', disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedOptions = useMemo(() => {
    if (options.length === 0) return [];
    if (typeof options[0] === 'string') {
      return (options as string[]).map(opt => ({ label: opt, value: opt }));
    }
    return options as { label: string; value: string }[];
  }, [options]);

  const selectedOption = useMemo(() => normalizedOptions.find(opt => opt.value === value), [normalizedOptions, value]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSearchTerm('');
      // Timeout to allow the element to be visible before focusing
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      document.body.style.overflow = 'auto';
    }
    // Cleanup function
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return normalizedOptions;
    return normalizedOptions.filter(opt => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, normalizedOptions]);
  
  const handleSelect = (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
  };

  const portalContent = (
    <div 
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-fade-in"
        onClick={() => setIsOpen(false)}
        role="dialog"
        aria-modal="true"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
    >
        <div 
            className="w-full max-w-lg mx-auto bg-gray-800 rounded-lg shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
        >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
                <h3 className="font-semibold text-lg text-gray-200">{selectedOption?.label || placeholder}</h3>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-gray-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            
            {/* Search */}
            <div className="p-4 border-b border-gray-700">
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Поиск..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
            </div>

            {/* List */}
            <ul className="flex-grow overflow-y-auto p-2">
                {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                    <li
                        key={opt.value}
                        onClick={() => handleSelect(opt.value)}
                        className={`px-3 py-3 text-base cursor-pointer rounded-md transition-colors hover:bg-indigo-600 ${value === opt.value ? 'bg-indigo-700 font-semibold' : ''}`}
                        role="option"
                        aria-selected={value === opt.value}
                    >
                        {opt.label}
                    </li>
                )) : <li className="px-3 py-3 text-base text-gray-500 text-center">Ничего не найдено</li>}
            </ul>
        </div>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-fade-in {
            animation: fadeIn 0.2s ease-out forwards;
          }
        `}</style>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className="w-full text-left bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm flex justify-between items-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="truncate text-gray-200">{selectedOption?.label || placeholder}</span>
         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
        </svg>
      </button>
      {isOpen && createPortal(portalContent, document.body)}
    </>
  );
};

export default SearchableSelect;
