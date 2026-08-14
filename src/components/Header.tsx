import React from 'react';
import { Plus, Sun, Moon, WifiOff, Brain } from 'lucide-react';
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
    <header className="sticky top-0 z-30 w-full glass-header px-5 py-3.5 flex items-center justify-between border-b transition-colors duration-200">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-sm border border-[var(--border-solid)] bg-[var(--bg-surface)] flex items-center justify-center shrink-0">
          <Brain className="w-6 h-6 text-[#3C4E43] dark:text-[#526E5C]" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-black tracking-tight text-[var(--text-primary)] leading-none">
              Diariamente
            </h1>
            {!isOnline && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                <WifiOff className="w-3 h-3" />
                <span>Offline</span>
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] font-extrabold mt-0.5 opacity-80">
            Monitoraggio Personale
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={onToggleTheme}
          className="p-2.5 min-h-[44px] min-w-[44px] rounded-full text-[var(--text-primary)] bg-[var(--bg-surface)] hover:opacity-80 active:scale-95 transition-all duration-150 border border-[var(--border-solid)] shadow-sm cursor-pointer flex items-center justify-center"
          aria-label="Cambia tema"
        >
          {themeMode === 'dark' || themeMode === 'ocean' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-[#5B67CA]" />
          )}
        </button>

        <button
          type="button"
          onClick={onNewEntry}
          className="btn-primary inline-flex items-center space-x-1.5 px-4 py-2.5 min-h-[44px] rounded-full bg-[#5B67CA] hover:bg-[#4A55B8] text-white text-xs font-bold shadow-md shadow-[#5B67CA]/20 active:scale-95 transition-all duration-150 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="text-white font-bold">Nuova</span>
        </button>
      </div>
    </header>
  );
};

