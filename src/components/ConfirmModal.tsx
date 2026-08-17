import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Conferma azione',
  message,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
  isDanger = true,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-[20px] bg-[var(--bg-surface)] border border-[var(--border-solid)] shadow-2xl p-6 space-y-4 text-[var(--text-primary)]">
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
            <h3 className="text-lg font-black text-[var(--text-primary)]">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="text-[var(--text-secondary)] hover:text-rose-500 p-1 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm font-bold text-[var(--text-secondary)] leading-relaxed">{message}</p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 min-h-[44px] text-xs font-black rounded-full border border-[var(--border-solid)] bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all duration-150 active:scale-95 cursor-pointer"
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
