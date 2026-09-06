import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Check, X, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react';
import { correctDiaryText } from '../services/aiTextCorrection';

interface TextImproveModalProps {
  isOpen: boolean;
  initialText: string;
  fieldTitle?: string;
  onApply: (improvedText: string) => void;
  onClose: () => void;
}

export const TextImproveModal: React.FC<TextImproveModalProps> = ({
  isOpen,
  initialText,
  fieldTitle = 'Testo del diario',
  onApply,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [correctedText, setCorrectedText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runCorrection = async (textToCorrect: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setCorrectedText('');

    const res = await correctDiaryText(textToCorrect);
    setIsLoading(false);

    if (res.success) {
      setCorrectedText(res.corrected);
    } else {
      setErrorMsg(res.error || 'Errore imprevisto durante la correzione.');
    }
  };

  useEffect(() => {
    if (isOpen && initialText.trim()) {
      runCorrection(initialText);
    }
  }, [isOpen, initialText]);

  // Lock background scrolling and prevent touch interactions while modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const isIdentical = correctedText.trim() === initialText.trim();

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto select-none"
      onClick={(e) => {
        // Block closing during loading
        if (!isLoading && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-solid)] shadow-2xl text-[var(--text-primary)] overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-solid)] flex items-center justify-between shrink-0 bg-[var(--bg-subtle)]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
              <Sparkles className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-[var(--text-primary)]">
                Correzione Testo con AI
              </h3>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                {fieldTitle} • Refusi, grammatica e fluidità
              </p>
            </div>
          </div>
          {!isLoading ? (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
              aria-label="Chiudi"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <div className="p-1.5 opacity-30 cursor-not-allowed">
              <X className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {isLoading && (
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
                <Sparkles className="w-4 h-4 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-black text-[var(--text-primary)]">
                  Correzione in corso...
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Verifico grammatica, ortografia e scorrevolezza senza alterare il tuo messaggio.
                </p>
              </div>
            </div>
          )}

          {errorMsg && !isLoading && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2.5 text-rose-400">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-black text-rose-300">Impossibile correggere il testo</p>
                  <p className="text-rose-400/90 leading-relaxed">{errorMsg}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => runCorrection(initialText)}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold transition-all cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Riprova</span>
              </button>
            </div>
          )}

          {!isLoading && !errorMsg && correctedText && (
            <div className="space-y-4">
              {/* Prima Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                    Prima (Testo Originale)
                  </span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-xs text-[var(--text-muted)] leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                  {initialText}
                </div>
              </div>

              {/* Transition arrow */}
              <div className="flex items-center justify-center text-[var(--text-muted)]">
                <ArrowRight className="w-4 h-4 rotate-90 sm:rotate-0" />
              </div>

              {/* Dopo Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                      Dopo (Testo Corretto)
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-400">
                      Migliorato ✨
                    </span>
                  </div>
                  {isIdentical && (
                    <span className="text-[10px] font-bold text-indigo-400">
                      Nessun errore trovato
                    </span>
                  )}
                </div>
                <div className="p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/30 text-xs text-[var(--text-primary)] font-medium leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto ring-1 ring-emerald-500/20 shadow-inner">
                  {correctedText}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 sm:p-5 border-t border-[var(--border-solid)] flex items-center justify-end space-x-2.5 bg-[var(--bg-subtle)] shrink-0">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[var(--border-solid)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            Annulla
          </button>
          <button
            type="button"
            disabled={isLoading || !!errorMsg || !correctedText}
            onClick={() => {
              if (correctedText) {
                onApply(correctedText);
                onClose();
              }
            }}
            className="btn-primary px-5 py-2.5 rounded-xl text-xs font-black shadow-md inline-flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Applica Correzione</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
