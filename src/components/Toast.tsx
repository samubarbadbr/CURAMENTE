import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2.5 bg-[#14241B] dark:bg-[#EEF3EF] text-[#FFFFFF] dark:text-[#14241B] px-5 py-2.5 rounded-full text-xs font-black shadow-2xl border border-[#14241B] dark:border-[#EEF3EF] animate-fade-in">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
      <span>{message}</span>
    </div>
  );
};
