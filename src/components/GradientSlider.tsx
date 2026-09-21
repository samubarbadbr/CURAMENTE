import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface GradientSliderProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
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
  step = 5,
  label,
  sublabel,
  lowLabel = 'Calma',
  midLabel = 'Moderata',
  highLabel = 'Elevata',
  size = 'md',
  id,
}) => {
  const currentStep = step > 0 ? step : 5;
  const rawNum = typeof value === 'number' && !isNaN(value) ? value : min;
  const clamped = Math.min(max, Math.max(min, rawNum));
  const safeValue = Math.round(clamped / currentStep) * currentStep;
  const percentage = Math.min(100, Math.max(0, ((safeValue - min) / (max - min)) * 100));

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

  const handleStep = (delta: number) => {
    const next = Math.min(max, Math.max(min, safeValue + delta));
    const snapped = Math.round(next / currentStep) * currentStep;
    onChange(snapped);
  };

  return (
    <div className="w-full space-y-2.5">
      {label && (
        <div className="flex items-center justify-between gap-2">
          <div>
            <label htmlFor={id} className="block text-sm font-black text-[var(--text-primary)]">
              {label}
            </label>
            {sublabel && (
              <p className="text-xs font-bold text-[var(--text-secondary)] mt-0.5">{sublabel}</p>
            )}
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handleStep(-currentStep)}
              disabled={safeValue <= min}
              aria-label={`Diminuisci di ${currentStep}`}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] border border-[var(--border-solid)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer text-xs font-bold"
              title={`-${currentStep}`}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span
              className={`inline-flex items-center justify-center min-w-[70px] px-3 py-1 rounded-full text-xs font-black border transition-colors duration-200 tabular-nums ${valueBadgeStyle} ${
                size === 'lg' ? 'text-base px-3.5 py-1.5 min-w-[82px]' : ''
              }`}
            >
              {safeValue} / {max}
            </span>
            <button
              type="button"
              onClick={() => handleStep(currentStep)}
              disabled={safeValue >= max}
              aria-label={`Aumenta di ${currentStep}`}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] border border-[var(--border-solid)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95 cursor-pointer text-xs font-bold"
              title={`+${currentStep}`}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="relative flex items-center py-2">
        {/* Track bar */}
        <div className="relative w-full h-3.5 rounded-full overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border-solid)]/40 shadow-inner">
          <div
            className="absolute inset-y-0 left-0 transition-all duration-100 rounded-full"
            style={{
              width: `${percentage}%`,
              ...trackStyle,
            }}
          />
        </div>

        {/* Visible Thumb Handle Indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white dark:bg-zinc-100 border-2 border-[var(--border-solid)] shadow-[0_2px_8px_rgba(0,0,0,0.35)] pointer-events-none transition-all duration-100 flex items-center justify-center z-10"
          style={{ left: `${percentage}%` }}
        >
          <div className="w-2 h-2 rounded-full bg-zinc-800 dark:bg-zinc-900" />
        </div>

        {/* Snapping Input */}
        <input
          type="range"
          id={id}
          min={min}
          max={max}
          step={currentStep}
          value={safeValue}
          onChange={(e) => {
            const raw = Number(e.target.value);
            const valid = Math.min(max, Math.max(min, raw));
            const snapped = Math.round(valid / currentStep) * currentStep;
            onChange(snapped);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-pan-x z-20"
          aria-label={label || 'Livello'}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={safeValue}
        />
      </div>

      {/* Preset markers & labels */}
      <div className="flex justify-between items-center text-[11px] font-extrabold text-[var(--text-secondary)] px-1 pt-0.5 select-none">
        <button
          type="button"
          onClick={() => onChange(min)}
          className="hover:text-emerald-500 transition-colors cursor-pointer text-left py-0.5"
        >
          {lowLabel} ({min})
        </button>
        <button
          type="button"
          onClick={() => {
            const mid = Math.round(((min + max) / 2) / currentStep) * currentStep;
            onChange(mid);
          }}
          className="hover:text-amber-500 transition-colors cursor-pointer text-center py-0.5"
        >
          {midLabel} ({Math.round(((min + max) / 2) / currentStep) * currentStep})
        </button>
        <button
          type="button"
          onClick={() => onChange(max)}
          className="hover:text-rose-500 transition-colors cursor-pointer text-right py-0.5"
        >
          {highLabel} ({max})
        </button>
      </div>
    </div>
  );
};

