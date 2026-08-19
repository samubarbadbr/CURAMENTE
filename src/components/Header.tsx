import React from 'react';
import { Plus, Sun, Moon, WifiOff, Brain, EyeOff, Eye, Home } from 'lucide-react';
import { ViewType, ThemeMode } from '../types';

interface HeaderProps {
  currentView: ViewType;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onNewEntry: () => void;
  isOnline: boolean;
  isPrivacyModeEnabled?: boolean;
  onTogglePrivacyMode?: () => void;
  onShowSplash?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  themeMode,
  onToggleTheme,
  onNewEntry,
  isOnline,
  isPrivacyModeEnabled = false,
  onTogglePrivacyMode,
  onShowSplash,
}) => {
  const isDark =
    themeMode === 'cyber' ||
    themeMode === 'midnight' ||
    themeMode === 'violet' ||
    (themeMode === 'auto' &&
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <header className="sticky top-0 z-30 w-full glass-header px-4 sm:px-6 py-3 flex items-center justify-between border-b transition-colors duration-200">
      {/* Top Left: Unified Sophisticated & Larger Brand Element */}
      <div className="flex items-center">
        {onShowSplash ? (
          <button
            type="button"
            id="header-home-btn"
            onClick={onShowSplash}
            className="flex items-center space-x-3 py-1.5 px-2 -ml-2 rounded-2xl hover:bg-[var(--bg-subtle)] active:scale-97 transition-all duration-150 cursor-pointer group select-none"
            aria-label="Torna alla copertina iniziale"
            title="Torna alla copertina"
          >
            <div className="w-10 h-10 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-solid)] flex items-center justify-center shadow-sm group-hover:scale-105 group-hover:shadow-md transition-all duration-150 shrink-0">
              <Brain className="w-5.5 h-5.5 text-[var(--accent-primary)] stroke-[2.2]" />
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-[var(--text-primary)] leading-none">
                Diariamente
              </h1>
              {!isOnline && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline</span>
                </span>
              )}
            </div>
          </button>
        ) : (
          <div className="flex items-center space-x-3 py-1.5 select-none">
            <div className="w-10 h-10 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-solid)] flex items-center justify-center shadow-sm shrink-0">
              <Brain className="w-5.5 h-5.5 text-[var(--accent-primary)] stroke-[2.2]" />
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-[var(--text-primary)] leading-none">
                Diariamente
              </h1>
              {!isOnline && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30">
                  <WifiOff className="w-3 h-3" />
                  <span>Offline</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons (Top Right) - Shifted left slightly on mobile with safe inset */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0 mr-1 sm:mr-0">
        {onTogglePrivacyMode && (
          <button
            type="button"
            onClick={onTogglePrivacyMode}
            className={`p-2.5 min-h-[42px] min-w-[42px] rounded-full transition-all duration-150 border shadow-sm cursor-pointer flex items-center justify-center ${
              isPrivacyModeEnabled
                ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--accent-primary)]/50 ring-2 ring-[var(--accent-primary)]/20'
                : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-solid)] hover:opacity-80'
            }`}
            aria-label={isPrivacyModeEnabled ? 'Disattiva Modalità Privacy' : 'Attiva Modalità Privacy (Sguardo Veloce)'}
            title={isPrivacyModeEnabled ? 'Modalità Privacy ATTIVA (Testi sfocati) - Clicca per disattivare' : 'Attiva Modalità Privacy (Sguardo Veloce)'}
          >
            {isPrivacyModeEnabled ? (
              <EyeOff className="w-4 h-4 text-[var(--accent-primary)] stroke-[2.5]" />
            ) : (
              <Eye className="w-4 h-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onToggleTheme}
          className="p-2.5 min-h-[42px] min-w-[42px] rounded-full text-[var(--text-primary)] bg-[var(--bg-surface)] hover:opacity-80 active:scale-95 transition-all duration-150 border border-[var(--border-solid)] shadow-sm cursor-pointer flex items-center justify-center"
          aria-label={isDark ? 'Passa a tema chiaro (Light Minimal)' : 'Passa a tema scuro (Scuro Neon)'}
          title={isDark ? 'Passa a tema chiaro (Light Minimal)' : 'Passa a tema scuro (Scuro Neon)'}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-[var(--accent-primary)]" />
          )}
        </button>

        <button
          type="button"
          onClick={onNewEntry}
          className="btn-primary inline-flex items-center space-x-1 px-3 sm:px-4 py-2 min-h-[42px] rounded-full shadow-md active:scale-95 transition-all duration-150 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="font-bold text-xs sm:text-sm">Nuova</span>
        </button>
      </div>
    </header>
  );
};

