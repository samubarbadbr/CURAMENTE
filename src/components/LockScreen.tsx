import React, { useState } from 'react';
import { Delete, ShieldAlert } from 'lucide-react';
import { APP_LOGO } from '../assets/logo';

interface LockScreenProps {
  correctPin: string;
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ correctPin, onUnlock }) => {
  const [pinAttempt, setPinAttempt] = useState('');
  const [hasError, setHasError] = useState(false);

  const handleKeyPress = (num: string) => {
    setHasError(false);
    if (pinAttempt.length < 4) {
      const next = pinAttempt + num;
      setPinAttempt(next);

      if (next.length === 4) {
        if (next === correctPin) {
          onUnlock();
        } else {
          setHasError(true);
          setTimeout(() => {
            setPinAttempt('');
            setHasError(false);
          }, 600);
        }
      }
    }
  };

  const handleDelete = () => {
    setHasError(false);
    setPinAttempt((prev) => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[var(--bg-page)] text-[var(--text-primary)]">
      <div className="w-full max-w-sm text-center space-y-6 animate-fade-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl overflow-hidden shadow-2xl border-2 border-[var(--border-solid)] bg-black mx-auto">
          <img
            src={APP_LOGO}
            alt="Diariamente Logo"
            className="w-full h-full object-cover"
          />
        </div>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Diariamente</h1>
          <p className="text-sm font-bold opacity-80 text-[var(--text-secondary)] mt-1">Inserisci il PIN a 4 cifre per accedere</p>
        </div>

        {/* PIN Dot Indicators */}
        <div className="flex justify-center items-center space-x-4 py-2">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = idx < pinAttempt.length;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  hasError
                    ? 'border-rose-500 bg-rose-500/30 animate-bounce'
                    : isFilled
                    ? 'border-[#5B67CA] dark:border-[#9CA6DC] bg-[#5B67CA] dark:bg-[#8B95C9] scale-110 shadow-sm'
                    : 'border-[#C8D4CB] dark:border-[#2B3A31] bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {hasError && (
          <div className="flex items-center justify-center text-rose-600 dark:text-rose-400 text-xs font-black space-x-1 animate-pulse">
            <ShieldAlert className="w-4 h-4" />
            <span>PIN errato, riprova.</span>
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 pt-2 max-w-xs mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="w-16 h-16 mx-auto rounded-full bg-white dark:bg-[#1B2520] border border-[#C8D4CB] dark:border-[#2B3A31] text-xl font-black text-[#14241B] dark:text-[#EEF3EF] hover:bg-[#E8EFEA] dark:hover:bg-[#2B3A31] active:scale-90 transition-all duration-150 flex items-center justify-center shadow-md cursor-pointer"
            >
              {num}
            </button>
          ))}
          <div className="w-16 h-16" />
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="w-16 h-16 mx-auto rounded-full bg-white dark:bg-[#1B2520] border border-[#C8D4CB] dark:border-[#2B3A31] text-xl font-black text-[#14241B] dark:text-[#EEF3EF] hover:bg-[#E8EFEA] dark:hover:bg-[#2B3A31] active:scale-90 transition-all duration-150 flex items-center justify-center shadow-md cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="w-16 h-16 mx-auto rounded-full bg-transparent text-[#14241B] dark:text-[#A7B6AC] hover:text-[#14241B] dark:hover:text-[#EEF3EF] active:scale-90 transition-all duration-150 flex items-center justify-center cursor-pointer"
            aria-label="Cancella cifra"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
