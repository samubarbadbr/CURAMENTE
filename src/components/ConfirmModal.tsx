import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dismissLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDismiss?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Conferma azione',
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  dismissLabel,
  isDanger = true,
  onConfirm,
  onCancel,
  onDismiss,
}) => {
  if (!isOpen) return null;

  const handleDismiss = onDismiss || onCancel;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in backdrop-blur-xs">
      <div className="w-full max-w-sm sm:max-w-md rounded-[20px] bg-[var(--bg-surface)] border border-[var(--border-solid)] shadow-2xl p-5 sm:p-6 space-y-4 text-[var(--text-primary)]">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2.5 rounded-2xl ${
                isDanger
                  ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                  : 'bg-[var(--accent-btn)]/15 text-[var(--accent-primary)] border border-[var(--border-solid)]'
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-[var(--text-primary)]">{title}</h3>
          </div>
          <button
            onClick={handleDismiss}
            className="text-[var(--text-secondary)] hover:text-rose-500 p-1.5 rounded-full transition-colors cursor-pointer"
            aria-label="Chiudi finestra"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs sm:text-sm font-bold text-[var(--text-secondary)] leading-relaxed">{message}</p>

        <div className="flex items-center justify-end flex-wrap gap-2.5 pt-2">
          {dismissLabel && (
            <button
              type="button"
              onClick={handleDismiss}
              className="mr-auto px-3 py-2 min-h-[44px] text-xs font-bold rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
            >
              {dismissLabel}
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 min-h-[44px] text-xs font-black rounded-full border border-[var(--border-solid)] bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] hover:text-rose-500 transition-all duration-150 active:scale-95 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 min-h-[44px] text-xs font-black rounded-full text-white shadow-md transition-all duration-150 active:scale-95 cursor-pointer ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'btn-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
