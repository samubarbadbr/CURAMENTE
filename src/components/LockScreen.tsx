import React, { useEffect, useState } from 'react';
import { Delete, ShieldAlert, Brain, ScanFace } from 'lucide-react';
import { verifyBiometrics } from '../lib/biometrics';

interface LockScreenProps {
  correctPin: string;
  biometricsEnabled?: boolean;
  biometricCredentialId?: string;
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  correctPin,
  biometricsEnabled = false,
  biometricCredentialId,
  onUnlock,
}) => {
  const [pinAttempt, setPinAttempt] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isVerifyingBio, setIsVerifyingBio] = useState(false);

  // Trigger biometric check on mount if enabled
  useEffect(() => {
    if (biometricsEnabled) {
      handleBiometricUnlock();
    }
  }, [biometricsEnabled]);

  const handleBiometricUnlock = async () => {
    setIsVerifyingBio(true);
    try {
      const res = await verifyBiometrics(biometricCredentialId);
      if (res.success) {
        onUnlock();
      }
    } catch (err) {
      console.warn('Biometric unlock cancelled or failed:', err);
    } finally {
      setIsVerifyingBio(false);
    }
  };

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
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl shadow-xl border border-[var(--border-solid)] bg-[var(--bg-surface)] mx-auto">
          <Brain className="w-10 h-10 text-[var(--accent-primary)]" />
        </div>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--text-primary)]">Diariamente</h1>
          <p className="text-sm font-bold opacity-80 text-[var(--text-secondary)] mt-1">
            {biometricsEnabled ? 'Sblocca con Face ID o inserisci il PIN' : 'Inserisci il PIN a 4 cifre per accedere'}
          </p>
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
                    ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)] scale-110 shadow-sm'
                    : 'border-[var(--border-solid)] bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {hasError && (
          <div className="flex items-center justify-center text-rose-500 text-xs font-black space-x-1 animate-pulse">
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
              className="w-16 h-16 mx-auto rounded-full bg-[var(--bg-surface)] border border-[var(--border-solid)] text-xl font-black text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] active:scale-90 transition-all duration-150 flex items-center justify-center shadow-md cursor-pointer"
            >
              {num}
            </button>
          ))}

          {/* Bottom Left: Face ID / Biometrics button */}
          {biometricsEnabled ? (
            <button
              type="button"
              onClick={handleBiometricUnlock}
              disabled={isVerifyingBio}
              className="w-16 h-16 mx-auto rounded-full bg-[var(--bg-surface)] border border-[var(--border-solid)] text-[var(--accent-primary)] hover:bg-[var(--bg-subtle)] active:scale-90 transition-all duration-150 flex items-center justify-center shadow-md cursor-pointer disabled:opacity-50"
              aria-label="Sblocca con Face ID o Impronta"
              title="Sblocca con Face ID"
            >
              <ScanFace className={`w-7 h-7 stroke-[2.2] ${isVerifyingBio ? 'animate-pulse' : ''}`} />
            </button>
          ) : (
            <div className="w-16 h-16" />
          )}

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="w-16 h-16 mx-auto rounded-full bg-[var(--bg-surface)] border border-[var(--border-solid)] text-xl font-black text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] active:scale-90 transition-all duration-150 flex items-center justify-center shadow-md cursor-pointer"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="w-16 h-16 mx-auto rounded-full bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90 transition-all duration-150 flex items-center justify-center cursor-pointer"
            aria-label="Cancella cifra"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
