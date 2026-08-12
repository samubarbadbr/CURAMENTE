import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2.5 bg-[#15251C] dark:bg-[#1B2520] text-white dark:text-[#EEF3EF] px-5 py-3 rounded-full text-xs font-black shadow-2xl border border-[#2C3E35] dark:border-[#2B3A31] animate-fade-in pointer-events-none">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.5]" />
      <span className="text-white dark:text-[#EEF3EF] font-extrabold tracking-wide">{message}</span>
    </div>
  );
};
