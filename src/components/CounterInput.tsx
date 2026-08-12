import React from 'react';
import { Plus, Minus } from 'lucide-react';

interface CounterInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  sublabel?: string;
  min?: number;
}

export const CounterInput: React.FC<CounterInputProps> = ({
  label,
  value,
  onChange,
  sublabel,
  min = 0,
}) => {
  const handleDecrement = () => {
    onChange(Math.max(min, value - 1));
  };

  const handleIncrement = () => {
    onChange(value + 1);
  };

  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <span className="block text-sm font-black text-[#14241B] dark:text-[#EEF3EF]">{label}</span>
        {sublabel && <span className="block text-xs font-bold text-[#14241B] dark:text-[#D5E0D8]">{sublabel}</span>}
      </div>

      <div className="flex items-center space-x-3 bg-[#E8EFEA] dark:bg-[#121915] p-1.5 rounded-full border border-[#C8D4CB] dark:border-[#2B3A31]">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-8 h-8 rounded-full bg-white dark:bg-[#212E27] text-[#14241B] dark:text-[#EEF3EF] flex items-center justify-center shadow-sm hover:bg-[#E8EFEA] dark:hover:bg-[#2B3A31] active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 border border-[#C8D4CB] dark:border-[#2B3A31] cursor-pointer"
          aria-label="Decrementa"
        >
          <Minus className="w-4 h-4 stroke-[2.5]" />
        </button>

        <span className="w-8 text-center font-black text-[#14241B] dark:text-[#EEF3EF] text-base tabular-nums">
          {value}
        </span>

        <button
          type="button"
          onClick={handleIncrement}
          className="w-8 h-8 rounded-full bg-[#5B67CA] hover:bg-[#4A55B8] text-white flex items-center justify-center shadow-md active:scale-90 transition-all duration-150 cursor-pointer font-black"
          aria-label="Incrementa"
        >
          <Plus className="w-4 h-4 stroke-[2.5] text-white" />
        </button>
      </div>
    </div>
  );
};
