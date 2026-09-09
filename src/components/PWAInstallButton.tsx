import React, { useState } from 'react';
import { Download, Smartphone, CheckCircle2, Share2, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { BrandLogo } from './BrandLogo';

interface PWAInstallButtonProps {
  variant?: 'header' | 'card' | 'minimal';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running inside standalone PWA
  if (isInstalled) {
    if (variant === 'card') {
      return (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center space-x-3 text-emerald-400">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-emerald-300">App già installata</p>
            <p className="text-emerald-400/80">
              Diariamente è in esecuzione come applicazione standalone nativa 100% offline.
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  // If neither installable directly nor iOS, still provide helpful install instructions in the settings card variant
  const canPrompt = isInstallable || isIOS;

  const handleClick = () => {
    if (isInstallable) {
      install();
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // General browser tip
      alert(
        "Per installare l'app: apri il menu del browser (i 3 puntini o l'icona del browser) e seleziona 'Aggiungi a schermata Home' o 'Installa app'."
      );
    }
  };

  // Header compact button
  if (variant === 'header') {
    if (!canPrompt) return null;

    return (
      <>
        <button
          type="button"
          id="header-pwa-install-btn"
          onClick={handleClick}
          className={`inline-flex items-center space-x-1.5 px-3 py-1.5 min-h-[38px] rounded-full text-xs font-bold border shadow-sm transition-all duration-150 cursor-pointer ${
            isIOS
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-solid)] hover:opacity-80'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent'
          } ${className}`}
          title="Installa l'app sulla schermata iniziale"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span className="hidden sm:inline">Installa App</span>
          <span className="sm:hidden">Installa</span>
        </button>

        {showIOSGuide && (
          <IOSInstallModal onClose={() => setShowIOSGuide(false)} />
        )}
      </>
    );
  }

  // Settings Card Variant
  if (variant === 'card') {
    return (
      <>
        <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-solid)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BrandLogo className="w-11 h-11" iconSize={24} />
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  Installa Diariamente sul dispositivo
                </h4>
                <p className="text-xs text-[var(--text-muted)]">
                  Icona su Home screen, avvio istantaneo e 100% offline
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClick}
              className="btn-primary px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer shadow-sm active:scale-95 transition-all shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Installa</span>
            </button>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Funziona a schermo intero come app autonoma, attiva anche in aereo o senza connessione.
          </p>
        </div>

        {showIOSGuide && (
          <IOSInstallModal onClose={() => setShowIOSGuide(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[var(--border-solid)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installa su Schermata Home</span>
      </button>

      {showIOSGuide && (
        <IOSInstallModal onClose={() => setShowIOSGuide(false)} />
      )}
    </>
  );
};

const IOSInstallModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-solid)] p-6 shadow-2xl text-[var(--text-primary)] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-solid)]">
          <div className="flex items-center space-x-2.5">
            <BrandLogo className="w-8 h-8 rounded-xl" iconSize={18} />
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">Installa su iPhone / iPad</h3>
              <p className="text-[10px] text-[var(--text-muted)] leading-none">Aggiungi Diariamente alla Home</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          Su Safari per iOS puoi aggiungere Diariamente direttamente alla schermata Home in due semplici passaggi:
        </p>

        <div className="space-y-3 text-xs bg-[var(--bg-subtle)] p-3.5 rounded-2xl border border-[var(--border-solid)]">
          <div className="flex items-start space-x-2.5">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
              1
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
                Tocca il pulsante <Share2 className="w-3.5 h-3.5 text-indigo-400 inline" /> Condividi
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Si trova nella barra inferiore di Safari (o superiore su iPad).
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2.5">
            <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[11px]">
              2
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)] flex items-center gap-1">
                Seleziona <PlusSquare className="w-3.5 h-3.5 text-indigo-400 inline" /> "Aggiungi a schermata Home"
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Scorri l'elenco delle opzioni e tocca "Aggiungi" in alto a destra.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors"
        >
          Ho capito
        </button>
      </div>
    </div>
  );
};
