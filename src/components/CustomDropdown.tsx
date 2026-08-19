import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
        className="w-full inline-flex items-center justify-between gap-2.5 px-3.5 sm:px-4 py-2.5 min-h-[44px] text-xs font-bold rounded-2xl border border-[var(--border-solid)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-subtle)] focus:outline-none transition-all duration-150 cursor-pointer active:scale-95 select-none"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--text-secondary)] transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -6 }}
            transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
            className="absolute right-0 mt-2 w-full min-w-[190px] z-[100] rounded-2xl border border-white/20 bg-[#161822] text-white shadow-2xl p-1.5 backdrop-blur-2xl space-y-0.5 overflow-hidden"
            style={{
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            }}
          >
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
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-white text-[#090A0E] font-bold shadow-xs'
                      : 'text-zinc-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#090A0E] shrink-0 ml-2 stroke-[3]" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
