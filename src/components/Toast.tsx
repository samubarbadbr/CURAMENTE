import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  const isError = message.toLowerCase().includes('errore') || message.toLowerCase().includes('fallito');

  return (
    <div
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2.5 px-5 py-3 rounded-full text-xs font-black shadow-2xl border animate-fade-in pointer-events-none max-w-[90vw] text-center ${
        isError
          ? 'bg-rose-950 text-rose-100 border-rose-500/60'
          : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-solid)] shadow-lg'
      }`}
    >
      {isError ? (
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 stroke-[2.5]" />
      ) : (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.5]" />
      )}
      <span className="font-extrabold tracking-wide">{message}</span>
    </div>
  );
};
