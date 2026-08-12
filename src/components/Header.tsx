import React from 'react';
import { Brain, Plus, Sun, Moon, WifiOff } from 'lucide-react';
import { ViewType, ThemeMode } from '../types';

interface HeaderProps {
  currentView: ViewType;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onNewEntry: () => void;
  isOnline: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  themeMode,
  onToggleTheme,
  onNewEntry,
  isOnline,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full glass-header bg-white dark:bg-[#121915] px-5 py-3.5 flex items-center justify-between border-b border-[#C8D5CB] dark:border-[#2B3A31]">
      <div className="flex items-center space-x-2.5">
        <div className="p-2.5 rounded-2xl bg-[#5B67CA]/15 text-[#5B67CA] dark:text-[#9CA6DC] border border-[#5B67CA]/30 shadow-sm">
          <Brain className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-black tracking-tight text-[#15251C] dark:text-[#EEF3EF] leading-none">
              Diario Mente
            </h1>
            {!isOnline && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-[#15251C] dark:text-[#EEF3EF] border border-amber-500/30">
                <WifiOff className="w-3 h-3" />
                <span>Offline</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#15251C] dark:text-[#D5E0D8] font-bold mt-0.5">
            Monitoraggio CBT
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onToggleTheme}
          className="p-2.5 rounded-full text-[#15251C] dark:text-[#EEF3EF] bg-white dark:bg-[#1B2520] hover:bg-[#EBF0EC] dark:hover:bg-[#2B3A31] active:scale-95 transition-all duration-150 border border-[#C8D5CB] dark:border-[#2B3A31] shadow-sm cursor-pointer"
          aria-label="Cambia tema"
        >
          {themeMode === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-[#2D5C3E]" />
          )}
        </button>

        <button
          type="button"
          onClick={onNewEntry}
          className="btn-primary inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[#5B67CA] hover:bg-[#4A55B8] text-white text-xs font-semibold shadow-md shadow-[#5B67CA]/20 active:scale-95 transition-all duration-150 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="text-white font-semibold">Nuova</span>
        </button>
      </div>
    </header>
  );
};
