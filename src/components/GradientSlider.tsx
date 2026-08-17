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

  let valueBadgeStyle = 'bg-emerald-500/15 text-[var(--text-primary)] border-emerald-500/30';
  if (percentage > 35 && percentage <= 68) {
    valueBadgeStyle = 'bg-amber-500/20 text-[var(--text-primary)] border-amber-500/40';
  } else if (percentage > 68) {
    valueBadgeStyle = 'bg-rose-500/20 text-[var(--text-primary)] border-rose-500/40';
  }

  const trackStyle = {
    background: `linear-gradient(to right, 
      #10B981 0%, 
      #34D399 30%, 
      #F59E0B 65%, 
      #F97316 85%, 
      #EF4444 100%)`,
  };

  return (
    <div className="w-full space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <div>
            <label htmlFor={id} className="block text-sm font-black text-[var(--text-primary)]">
              {label}
            </label>
            {sublabel && (
              <p className="text-xs font-bold text-[var(--text-secondary)] mt-0.5">{sublabel}</p>
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
        <div className="relative w-full h-3 rounded-full overflow-hidden bg-[var(--bg-subtle)]">
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
        <div className="flex justify-between text-[11px] font-extrabold text-[var(--text-secondary)] px-0.5 pt-0.5">
          <span>{lowLabel}</span>
          <span>{midLabel}</span>
          <span>{highLabel}</span>
        </div>
      )}
    </div>
  );
};
