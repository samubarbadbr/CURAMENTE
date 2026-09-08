import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  label?: string;
  minDate?: string;
  maxDate?: string;
  className?: string;
}

const MONTH_NAMES_IT = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
];

const DAY_NAMES_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  label,
  minDate,
  maxDate,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const parsedDate = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState<number>(
    isNaN(parsedDate.getTime()) ? new Date().getFullYear() : parsedDate.getFullYear()
  );
  const [viewMonth, setViewMonth] = useState<number>(
    isNaN(parsedDate.getTime()) ? new Date().getMonth() : parsedDate.getMonth()
  );

  // Sync view when value changes from outside
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Format date for display in input: "DD/MM/YYYY"
  const formattedDisplay = value
    ? (() => {
        const parts = value.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return value;
      })()
    : 'Seleziona data';

  // Navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const str = `${yyyy}-${mm}-${dd}`;
    onChange(str);
    setViewYear(yyyy);
    setViewMonth(today.getMonth());
    setIsOpen(false);
  };

  // Build calendar matrix (Monday-based)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  
  // 0 = Sunday, 1 = Monday -> convert to Monday=0, Sunday=6
  let startDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startDayOfWeek < 0) startDayOfWeek = 6;

  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Create grid cells (42 cells: 6 rows of 7 days)
  const calendarCells: Array<{
    dayNumber: number;
    monthOffset: number; // -1 = prev, 0 = current, 1 = next
    dateString: string;
    isCurrentMonth: boolean;
    isSelected: boolean;
    isToday: boolean;
    isDisabled: boolean;
  }> = [];

  const todayStr = new Date().toISOString().slice(0, 10);

  // Prev month filler
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = viewMonth === 0 ? 12 : viewMonth;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      dayNumber: d,
      monthOffset: -1,
      dateString: dateStr,
      isCurrentMonth: false,
      isSelected: dateStr === value,
      isToday: dateStr === todayStr,
      isDisabled: Boolean((minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)),
    });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const m = viewMonth + 1;
    const dateStr = `${viewYear}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      dayNumber: d,
      monthOffset: 0,
      dateString: dateStr,
      isCurrentMonth: true,
      isSelected: dateStr === value,
      isToday: dateStr === todayStr,
      isDisabled: Boolean((minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)),
    });
  }

  // Next month filler
  const remainingCells = 42 - calendarCells.length;
  for (let d = 1; d <= remainingCells; d++) {
    const m = viewMonth === 11 ? 1 : viewMonth + 2;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({
      dayNumber: d,
      monthOffset: 1,
      dateString: dateStr,
      isCurrentMonth: false,
      isSelected: dateStr === value,
      isToday: dateStr === todayStr,
      isDisabled: Boolean((minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)),
    });
  }

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${isOpen ? 'z-50' : 'z-10'} ${className}`}>
      {label && (
        <label className="block text-[11px] font-bold text-[var(--text-secondary)] mb-1">
          {label}
        </label>
      )}

      {/* Elegant Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-solid)] text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent-primary)] focus:outline-none focus:border-[var(--accent-primary)] shadow-sm transition-all duration-150 cursor-pointer"
        aria-label="Seleziona data"
      >
        <div className="flex items-center space-x-2.5">
          <CalendarIcon className="w-4 h-4 text-[var(--accent-primary)] shrink-0 stroke-[2.2]" />
          <span className="tracking-wide">{formattedDisplay}</span>
        </div>
      </button>

      {/* Custom Solid High-Relief Popover Calendar */}
      {isOpen && (
        <div className="absolute z-[99999] top-full left-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] p-3.5 rounded-2xl bg-[var(--bg-page)] dark:bg-[#0f1118] border-2 border-[var(--border-solid)] shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl animate-fade-in text-[var(--text-primary)]">
          {/* Header with Month/Year and navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              aria-label="Mese precedente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-black tracking-wide">
              {MONTH_NAMES_IT[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              aria-label="Mese successivo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 pt-2.5 pb-1 text-center">
            {DAY_NAMES_IT.map((d) => (
              <span key={d} className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell, idx) => {
              let cellClasses =
                'h-8 w-full rounded-xl text-xs font-bold flex items-center justify-center transition-all duration-150 cursor-pointer select-none ';

              if (cell.isDisabled) {
                cellClasses += 'opacity-30 cursor-not-allowed text-[var(--text-muted)] ';
              } else if (cell.isSelected) {
                cellClasses += 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] shadow-md font-black ';
              } else if (cell.isToday) {
                cellClasses +=
                  'border border-[var(--accent-primary)] text-[var(--accent-primary)] font-black bg-[var(--accent-primary)]/10 ';
              } else if (!cell.isCurrentMonth) {
                cellClasses += 'text-[var(--text-muted)] opacity-50 hover:bg-[var(--bg-subtle)] ';
              } else {
                cellClasses += 'text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] ';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={cell.isDisabled}
                  onClick={() => {
                    onChange(cell.dateString);
                    setIsOpen(false);
                  }}
                  className={cellClasses}
                >
                  {cell.dayNumber}
                </button>
              );
            })}
          </div>

          {/* Quick Shortcuts: Oggi / Chiudi */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-[var(--border-subtle)] text-xs font-bold">
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-[var(--accent-primary)] hover:underline cursor-pointer px-1 py-0.5"
            >
              Oggi
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer px-1 py-0.5"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
