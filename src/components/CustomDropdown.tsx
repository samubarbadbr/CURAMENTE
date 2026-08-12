import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ElementType;
}

interface CustomDropdownProps<T extends string = string> {
  options: DropdownOption<T>[];
  value: T;
  onChange: (val: T) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function CustomDropdown<T extends string = string>({
  options,
  value,
  onChange,
  placeholder = 'Seleziona...',
  className = '',
  id,
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`} id={id}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="custom-dropdown-btn w-full inline-flex items-center justify-between gap-2.5 px-4 py-2.5 min-h-[44px] text-xs font-black rounded-[12px] border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] text-[#15251C] dark:text-[#EEF3EF] shadow-sm hover:bg-[#EBF0EC] dark:hover:bg-[#212E27] focus:outline-none focus:ring-2 focus:ring-[#5B67CA] transition-all duration-150 cursor-pointer active:scale-98"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 text-[#15251C] dark:text-[#EEF3EF] transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="dropdown-menu absolute right-0 mt-1.5 w-full min-w-[170px] z-50 rounded-[12px] border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] shadow-xl p-1.5 animate-fade-in space-y-0.5">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-[#E0E6FD] dark:bg-[#2B3A31] text-[#15251C] dark:text-[#EEF3EF] font-black'
                    : 'text-[#15251C] dark:text-[#EEF3EF] hover:bg-[#EBF0EC] dark:hover:bg-[#212E27]'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#5B67CA] dark:text-[#6A9C78] shrink-0 ml-1.5 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
