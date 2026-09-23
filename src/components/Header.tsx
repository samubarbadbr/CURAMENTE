import React from 'react';
import { Plus, Sun, Moon, WifiOff, EyeOff, Eye, BookOpen } from 'lucide-react';
import { ViewType, ThemeMode } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import { BrandLogo } from './BrandLogo';
import { useUnsavedAudio } from '../hooks/useUnsavedAudio';

interface HeaderProps {
  currentView: ViewType;
  themeMode: ThemeMode;
  onToggleTheme: () => void;
  onNewEntry: () => void;
  onNewNote?: () => void;
  isOnline: boolean;
  isPrivacyModeEnabled?: boolean;
  onTogglePrivacyMode?: () => void;
  onShowSplash?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  themeMode,
  onToggleTheme,
  onNewEntry,
  onNewNote,
  isOnline,
  isPrivacyModeEnabled = false,
  onTogglePrivacyMode,
  onShowSplash,
}) => {
  const { hasUnsavedAudio, isRecording, isFormDirty, interceptNavigation } = useUnsavedAudio();

  const isDark =
    themeMode === 'cyber' ||
    themeMode === 'midnight' ||
    themeMode === 'violet' ||
    (themeMode === 'auto' &&
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  return (
    <header className="sticky top-0 z-30 w-full glass-header px-4 sm:px-6 pb-3 pt-[calc(0.875rem+env(safe-area-inset-top,0px))] flex items-center justify-between border-b transition-colors duration-200 relative">
      {/* Elastic Overscroll Cover: prevents any scrolled content from leaking above the header on iOS / Mobile */}
      <div
        className="absolute bottom-full left-0 right-0 h-48 bg-[var(--bg-surface)] backdrop-blur-2xl pointer-events-none -z-10"
        aria-hidden="true"
      />
      {/* Top Left: Unified Sophisticated & Larger Brand Element */}
      <div className="flex items-center min-w-0">
        {onShowSplash ? (
          <button
            type="button"
            id="header-home-btn"
            onClick={(e) => {
              if (hasUnsavedAudio || isRecording || isFormDirty) {
                e.preventDefault();
                e.stopPropagation();
              }
              interceptNavigation(() => onShowSplash(), e);
            }}
            className="flex items-center space-x-2 sm:space-x-3 py-1.5 px-2 -ml-2 rounded-2xl hover:bg-[var(--bg-subtle)] active:scale-97 transition-all duration-150 cursor-pointer group select-none"
            aria-label="Torna alla copertina iniziale"
            title="Torna alla copertina"
          >
            <BrandLogo className="w-9 h-9 sm:w-10 sm:h-10 group-hover:scale-105 transition-all duration-150 shrink-0" />
            <div className="flex items-center space-x-2 min-w-0">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-[var(--text-primary)] leading-none truncate">
                Diariamente
              </h1>
              {!isOnline && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 shrink-0">
                  <WifiOff className="w-3 h-3" />
                  <span className="hidden sm:inline">Offline</span>
                </span>
              )}
            </div>
          </button>
        ) : (
          <div className="flex items-center space-x-2 sm:space-x-3 py-1.5 select-none min-w-0">
            <BrandLogo className="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
            <div className="flex items-center space-x-2 min-w-0">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-[var(--text-primary)] leading-none truncate">
                Diariamente
              </h1>
              {!isOnline && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 shrink-0">
                  <WifiOff className="w-3 h-3" />
                  <span className="hidden sm:inline">Offline</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons (Top Right) */}
      <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
        <PWAInstallButton variant="header" />

        {onTogglePrivacyMode && (
          <button
            type="button"
            onClick={onTogglePrivacyMode}
            className={`p-2.5 min-h-[44px] min-w-[44px] rounded-full transition-all duration-150 border shadow-sm cursor-pointer flex items-center justify-center ${
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
          className="p-2.5 min-h-[44px] min-w-[44px] rounded-full text-[var(--text-primary)] bg-[var(--bg-surface)] hover:opacity-80 active:scale-95 transition-all duration-150 border border-[var(--border-solid)] shadow-sm cursor-pointer flex items-center justify-center"
          aria-label={isDark ? 'Passa a tema chiaro (Light Minimal)' : 'Passa a tema scuro (Scuro Neon)'}
          title={isDark ? 'Passa a tema chiaro (Light Minimal)' : 'Passa a tema scuro (Scuro Neon)'}
        >
          {isDark ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-[var(--accent-primary)]" />
          )}
        </button>

        {/* Pulsante Appunto Diario (Secondario ma importante per la terapia) */}
        {onNewNote && (
          <button
            type="button"
            onClick={(e) => {
              if (hasUnsavedAudio || isRecording || isFormDirty) {
                e.preventDefault();
                e.stopPropagation();
              }
              interceptNavigation(() => onNewNote(), e);
            }}
            className="inline-flex items-center space-x-1.5 px-3 sm:px-3.5 py-2.5 min-h-[44px] rounded-full text-xs sm:text-sm font-bold text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] active:scale-95 transition-all duration-150 border border-[var(--border-solid)] shadow-sm cursor-pointer shrink-0"
            title="Aggiungi appunto o riflessione nel diario"
            aria-label="Aggiungi appunto diario"
          >
            <BookOpen className="w-4 h-4 stroke-[2.5] text-[var(--accent-primary)] shrink-0" />
            <span className="hidden sm:inline">Appunto Diario</span>
            <span className="sm:hidden">Appunto</span>
          </button>
        )}

        {/* Pulsante + Nuova (Azione Principale Primaria ad alta enfasi) */}
        <button
          type="button"
          onClick={(e) => {
            if (hasUnsavedAudio || isRecording || isFormDirty) {
              e.preventDefault();
              e.stopPropagation();
            }
            interceptNavigation(() => onNewEntry(), e);
          }}
          className="btn-primary inline-flex items-center space-x-1.5 px-4 sm:px-5 py-2.5 min-h-[44px] rounded-full shadow-lg shadow-[var(--accent-btn)]/25 active:scale-95 transition-all duration-150 cursor-pointer shrink-0 bg-[var(--accent-btn)] text-[var(--accent-btn-text)] ring-2 ring-[var(--accent-btn)]/30 hover:brightness-110"
          title="Nuova scheda clinica CBT (Scheda ABCDE)"
          aria-label="Nuova scheda clinica CBT"
        >
          <Plus className="w-4 h-4 stroke-[3] text-[var(--accent-btn-text)] shrink-0" />
          <span className="font-black text-xs sm:text-sm tracking-wide text-[var(--accent-btn-text)]">
            Nuova
          </span>
        </button>
      </div>
    </header>
  );
};

