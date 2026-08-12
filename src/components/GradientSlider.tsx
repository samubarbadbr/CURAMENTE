import React from 'react';

interface GradientSliderProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  label?: string;
  sublabel?: string;
  lowLabel?: string;
  midLabel?: string;
  highLabel?: string;
  size?: 'md' | 'lg';
  id?: string;
}

export const GradientSlider: React.FC<GradientSliderProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  label,
  sublabel,
  lowLabel = 'Calma',
  midLabel = 'Moderata',
  highLabel = 'Elevata',
  size = 'md',
  id,
}) => {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  let valueBadgeStyle = 'bg-[#2D5C3E]/15 text-[#14241B] dark:text-[#EEF3EF] border-[#2D5C3E]/30';
  if (percentage > 35 && percentage <= 68) {
    valueBadgeStyle = 'bg-[#5B67CA]/20 text-[#14241B] dark:text-[#EEF3EF] border-[#5B67CA]/40';
  } else if (percentage > 68) {
    valueBadgeStyle = 'bg-rose-500/20 text-[#14241B] dark:text-[#EEF3EF] border-rose-500/40';
  }

  const trackStyle = {
    background: `linear-gradient(to right, 
      #2D5C3E 0%, 
      #4A7C59 30%, 
      #5B67CA 65%, 
      #D97706 85%, 
      #E11D48 100%)`,
  };

  return (
    <div className="w-full space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor={id} className="block text-sm font-black text-[#14241B] dark:text-[#EEF3EF]">
              {label}
            </label>
            {sublabel && (
              <p className="text-xs font-bold text-[#14241B] dark:text-[#D5E0D8] mt-0.5">{sublabel}</p>
            )}
          </div>
          <span
            className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black border transition-colors duration-200 tabular-nums ${valueBadgeStyle} ${
              size === 'lg' ? 'text-base px-3.5 py-1.5' : ''
            }`}
          >
            {value} / {max}
          </span>
        </div>
      )}

      <div className="relative flex items-center">
        <div className="relative w-full h-3 rounded-full overflow-hidden bg-[#E8EFEA] dark:bg-[#2B3A31]">
          <div
            className="absolute inset-y-0 left-0 transition-all duration-75 rounded-full"
            style={{
              width: `${percentage}%`,
              ...trackStyle,
            }}
          />
        </div>

        <input
          type="range"
          id={id}
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-pan-x"
        />
      </div>

      {(lowLabel || midLabel || highLabel) && (
        <div className="flex justify-between text-[11px] font-extrabold text-[#14241B] dark:text-[#EEF3EF] px-0.5 pt-0.5">
          <span>{lowLabel}</span>
          <span>{midLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
};
