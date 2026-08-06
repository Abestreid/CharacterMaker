
import React from 'react';

interface AccordionItemProps {
  title: string;
  id: string;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: (id: string) => void;
  icon?: React.ReactNode;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({ title, id, children, isOpen, onToggle, icon }) => {
  return (
    <div className="border-t border-gray-700 first:border-t-0">
      <button
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${id}`}
        id={`accordion-header-${id}`}
        className="flex items-center justify-between w-full p-4 text-left text-gray-200 bg-gray-800/80 hover:bg-gray-700/50 focus:outline-none focus-visible:ring focus-visible:ring-indigo-500 focus-visible:ring-opacity-75 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {icon && <span className="text-indigo-400">{icon}</span>}
          <span className="font-semibold">{title}</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 transform transition-transform duration-300 text-gray-400 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        id={`accordion-content-${id}`}
        role="region"
        aria-labelledby={`accordion-header-${id}`}
        className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
            <div className="p-4 bg-gray-800/50">
              {children}
            </div>
        </div>
      </div>
    </div>
  );
};