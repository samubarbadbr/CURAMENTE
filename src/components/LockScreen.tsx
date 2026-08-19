import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Delete, ShieldAlert, Brain, ScanFace, Lock } from 'lucide-react';
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
    <motion.div
      key="lock-screen"
      initial={{ opacity: 0, scale: 1.01, filter: 'blur(6px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{
        opacity: 0,
        scale: 1.05,
        filter: 'blur(12px)',
        transition: { duration: 0.38, ease: [0.32, 0.72, 0, 1] },
      }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex flex-col justify-between items-center bg-[#07080B] text-[#EDEDED] px-4 py-6 sm:py-10 select-none overflow-y-auto"
    >
      {/* Top spacer */}
      <div className="w-full h-1" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md mx-auto my-auto flex flex-col items-center justify-center space-y-5">
        
        {/* Glowing Brain Frosted Card identical to Splash Screen */}
        <div className="relative flex items-center justify-center shrink-0">
          {/* Defined Circular Halo Ring */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] sm:w-[260px] sm:h-[260px] rounded-full z-0"
            style={{
              background:
                'radial-gradient(circle, transparent 40%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.85) 64%, rgba(255, 255, 255, 0.5) 72%, transparent 80%)',
              filter: 'blur(16px)',
            }}
            aria-hidden="true"
          />

          {/* Sharp Circular Ring Core */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[190px] h-[190px] sm:w-[230px] sm:h-[230px] rounded-full z-0 border-[12px] sm:border-[15px] border-white/80"
            style={{
              filter: 'blur(8px)',
              boxShadow: '0 0 28px rgba(255, 255, 255, 0.75), inset 0 0 20px rgba(255, 255, 255, 0.45)',
            }}
            aria-hidden="true"
          />

          {/* Frosted Glass Icon Card */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-28 h-28 sm:w-34 sm:h-34 rounded-[28px] sm:rounded-[32px] flex flex-col items-center justify-center shadow-2xl overflow-hidden"
            style={{
              background: 'rgba(18, 20, 28, 0.55)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              boxShadow:
                '0 20px 50px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.4), inset 0 -1px 1px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Brain Icon with thin, subtle glassmorphic ring reflection */}
            <div className="relative flex flex-col items-center justify-center">
              <Brain className="w-12 h-12 sm:w-15 sm:h-15 text-white stroke-[1.8] drop-shadow-[0_4px_12px_rgba(255,255,255,0.3)] z-10" />

              {/* Refined Glassmorphic Ring under the brain */}
              <div
                className="w-16 h-4 sm:w-20 sm:h-4.5 rounded-full border border-white/40 -mt-2.5 z-0"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.1) 60%, transparent 80%)',
                  boxShadow: '0 0 8px rgba(255, 255, 255, 0.4)',
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* Title and Subtitle with Metallic Finish */}
        <div className="text-center space-y-1">
          <h1
            className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-md select-none"
            style={{
              background:
                'linear-gradient(115deg, #FFFFFF 0%, #FFFFFF 45%, #E2E8F0 70%, #94A3B8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.03em',
            }}
          >
            Diariamente
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 font-normal tracking-tight">
            {biometricsEnabled ? 'Sblocca con Face ID o inserisci il PIN' : 'Inserisci il PIN a 4 cifre per accedere'}
          </p>
        </div>

        {/* PIN Dot Indicators */}
        <div className="flex justify-center items-center space-x-3.5 py-1">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = idx < pinAttempt.length;
            return (
              <motion.div
                key={idx}
                animate={
                  hasError
                    ? { x: [-6, 6, -5, 5, -2, 2, 0] }
                    : isFilled
                    ? { scale: [1, 1.25, 1.1] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.25 }}
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-all duration-150 ${
                  hasError
                    ? 'border-2 border-rose-500 bg-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.6)]'
                    : isFilled
                    ? 'border border-white bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] scale-110'
                    : 'border border-white/30 bg-white/5'
                }`}
              />
            );
          })}
        </div>

        {/* Error Alert feedback */}
        {hasError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center text-rose-400 text-xs font-bold space-x-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>PIN errato, riprova</span>
          </motion.div>
        )}

        {/* Keypad with Frosted Glass Buttons */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-1 w-full max-w-[280px] sm:max-w-[300px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <motion.button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              whileTap={{ scale: 0.9 }}
              className="w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-full bg-[#12141C]/80 hover:bg-[#1A1D28]/95 border border-white/20 hover:border-white/50 text-xl sm:text-2xl font-bold text-white shadow-lg transition-all duration-150 flex items-center justify-center cursor-pointer select-none"
              style={{
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
              }}
            >
              {num}
            </motion.button>
          ))}

          {/* Bottom Left: Face ID / Biometrics Button */}
          {biometricsEnabled ? (
            <motion.button
              type="button"
              onClick={handleBiometricUnlock}
              disabled={isVerifyingBio}
              whileTap={{ scale: 0.9 }}
              className="w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-full bg-violet-950/40 hover:bg-violet-900/60 border border-violet-400/40 hover:border-violet-300 text-violet-300 shadow-lg transition-all duration-150 flex items-center justify-center cursor-pointer disabled:opacity-50 select-none"
              style={{
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 4px 15px rgba(139, 92, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
              aria-label="Sblocca con Face ID o Impronta"
              title="Sblocca con Face ID"
            >
              <ScanFace className={`w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2] ${isVerifyingBio ? 'animate-pulse' : ''}`} />
            </motion.button>
          ) : (
            <div className="w-16 h-16 sm:w-18 sm:h-18" />
          )}

          {/* Key 0 */}
          <motion.button
            type="button"
            onClick={() => handleKeyPress('0')}
            whileTap={{ scale: 0.9 }}
            className="w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-full bg-[#12141C]/80 hover:bg-[#1A1D28]/95 border border-white/20 hover:border-white/50 text-xl sm:text-2xl font-bold text-white shadow-lg transition-all duration-150 flex items-center justify-center cursor-pointer select-none"
            style={{
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            }}
          >
            0
          </motion.button>

          {/* Key Delete / Backspace */}
          <motion.button
            type="button"
            onClick={handleDelete}
            whileTap={{ scale: 0.9 }}
            className="w-16 h-16 sm:w-18 sm:h-18 mx-auto rounded-full bg-transparent text-zinc-400 hover:text-white transition-all duration-150 flex items-center justify-center cursor-pointer select-none"
            aria-label="Cancella cifra"
          >
            <Delete className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2]" />
          </motion.button>
        </div>
      </div>

      {/* Bottom Security Footer */}
      <div className="relative z-10 flex items-center justify-center space-x-1.5 text-zinc-400 text-[11px] font-medium tracking-wide pt-2">
        <Lock className="w-3 h-3 stroke-[2] text-zinc-400" />
        <span>Protetto &amp; Privato</span>
      </div>
    </motion.div>
  );
};
