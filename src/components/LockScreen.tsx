import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Delete,
  ShieldAlert,
  Brain,
  ScanFace,
  Lock,
  HelpCircle,
  Mail,
  CheckCircle2,
  Loader2,
  KeyRound,
  X,
  ArrowRight,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { verifyBiometrics } from '../lib/biometrics';
import { sendPinRecoveryEmail } from '../lib/supabase';

interface LockScreenProps {
  correctPin: string;
  recoveryEmail?: string;
  biometricsEnabled?: boolean;
  biometricCredentialId?: string;
  onUnlock: () => void;
  onResetPinSuccess?: (newPin: string) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({
  correctPin,
  recoveryEmail = '',
  biometricsEnabled = false,
  biometricCredentialId,
  onUnlock,
  onResetPinSuccess,
}) => {
  const [pinAttempt, setPinAttempt] = useState('');
  const [hasError, setHasError] = useState(false);
  const [isVerifyingBio, setIsVerifyingBio] = useState(false);

  // Recovery PIN Modal States
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmailInput, setRecoveryEmailInput] = useState(
    recoveryEmail || 'samuele.lavoroba@gmail.com'
  );
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState('');
  const [recoveryErrorMsg, setRecoveryErrorMsg] = useState('');

  // Reset PIN State
  const [newResetPin, setNewResetPin] = useState('');
  const [confirmResetPin, setConfirmResetPin] = useState('');
  const [resetPinError, setResetPinError] = useState('');
  const [revealedPin, setRevealedPin] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Synchronize recovery email if prop changes
  useEffect(() => {
    if (recoveryEmail) {
      setRecoveryEmailInput(recoveryEmail);
    }
  }, [recoveryEmail]);

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

  const handleSendRecoveryEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = recoveryEmailInput.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setRecoveryErrorMsg('Inserisci un indirizzo email valido');
      return;
    }

    setIsSendingRecovery(true);
    setRecoveryErrorMsg('');
    setIsRateLimited(false);

    try {
      const res = await sendPinRecoveryEmail(cleanEmail);
      if (res.success) {
        setRecoverySent(true);
        setRecoverySuccessMsg(
          'Email di recupero inviata! Controlla la tua casella di posta (e la cartella Spam se non la trovi subito).'
        );
      } else {
        setRecoveryErrorMsg(
          "Impossibile inviare l'email al momento. Riprova tra qualche istante o verifica la tua connessione."
        );
      }
    } catch {
      setRecoveryErrorMsg(
        "Impossibile inviare l'email al momento. Riprova tra qualche istante o verifica la tua connessione."
      );
    } finally {
      setIsSendingRecovery(false);
    }
  };

  const isEmailMatchingConfigured =
    recoveryEmailInput.trim().toLowerCase() === (recoveryEmail || 'samuele.lavoroba@gmail.com').trim().toLowerCase();

  const handleConfirmNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    setResetPinError('');

    if (!/^\d{4}$/.test(newResetPin)) {
      setResetPinError('Il nuovo PIN deve contenere esattamente 4 cifre numeriche');
      return;
    }

    if (newResetPin !== confirmResetPin) {
      setResetPinError('I due PIN inseriti non coincidono');
      return;
    }

    if (onResetPinSuccess) {
      onResetPinSuccess(newResetPin);
    }
    onUnlock();
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
      className="fixed inset-0 z-50 flex flex-col justify-between items-center bg-[#050508] text-[#EDEDED] px-4 py-6 sm:py-10 select-none overflow-y-auto"
    >
      {/* Top spacer */}
      <div className="w-full h-1" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md mx-auto my-auto flex flex-col items-center justify-center space-y-4 sm:space-y-5">
        {/* Glowing Brain Frosted Card with Intense Halo Glow Reflector */}
        <div className="relative flex items-center justify-center shrink-0">
          {/* Cerchio Luminoso di Sfondo (Halo Glow Reflector: 600px x 600px) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full z-0"
            style={{
              background:
                'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(200, 210, 255, 0.4) 40%, transparent 70%)',
              filter: 'blur(35px)',
            }}
            aria-hidden="true"
          />

          {/* Frosted Glass Icon Card */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-[28px] sm:rounded-[32px] flex flex-col items-center justify-center shadow-2xl overflow-hidden"
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
              <Brain className="w-12 h-12 sm:w-14 sm:h-14 text-white stroke-[1.8] drop-shadow-[0_4px_12px_rgba(255,255,255,0.3)] z-10" />

              {/* Refined Glassmorphic Ring under the brain */}
              <div
                className="w-16 h-4 sm:w-18 sm:h-4.5 rounded-full border border-white/40 -mt-2.5 z-0"
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
            {biometricsEnabled
              ? 'Sblocca con Face ID o inserisci il PIN'
              : 'Inserisci il PIN a 4 cifre per accedere'}
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
                boxShadow:
                  '0 4px 15px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
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
                boxShadow:
                  '0 4px 15px rgba(139, 92, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              }}
              aria-label="Sblocca con Face ID o Impronta"
              title="Sblocca con Face ID"
            >
              <ScanFace
                className={`w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2] ${
                  isVerifyingBio ? 'animate-pulse' : ''
                }`}
              />
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
              boxShadow:
                '0 4px 15px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
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

        {/* Sotto il tastierino numerico: Pulsante "PIN Dimenticato?" */}
        <div className="pt-2 flex flex-col items-center">
          <motion.button
            type="button"
            id="forgot-pin-btn"
            onClick={() => {
              setShowRecoveryModal(true);
              setRecoverySent(false);
              setRecoveryErrorMsg('');
              setResetPinError('');
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            className="text-xs font-semibold text-zinc-400 hover:text-white transition-all duration-150 py-2 px-4 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 flex items-center space-x-1.5 cursor-pointer select-none shadow-sm"
          >
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>PIN Dimenticato?</span>
          </motion.button>
        </div>
      </div>

      {/* Bottom Security Footer */}
      <div className="relative z-10 flex items-center justify-center space-x-1.5 text-zinc-400 text-[11px] font-medium tracking-wide pt-2">
        <Lock className="w-3 h-3 stroke-[2] text-zinc-400" />
        <span>Protetto &amp; Privato • Diariamente</span>
      </div>

      {/* PIN RECOVERY MODAL (Glassmorphism, Dark #050508) */}
      <AnimatePresence>
        {showRecoveryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#050508]/85 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.92, y: 16, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 12, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md rounded-3xl p-6 sm:p-7 border border-white/20 shadow-2xl text-white overflow-hidden"
              style={{
                background: 'rgba(18, 20, 28, 0.85)',
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                boxShadow:
                  '0 25px 60px rgba(0,0,0,0.85), inset 0 1px 1px rgba(255,255,255,0.25)',
              }}
            >
              {/* Glow Accent */}
              <div
                className="pointer-events-none absolute -top-20 -right-20 w-48 h-48 rounded-full z-0"
                style={{
                  background:
                    'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
                  filter: 'blur(20px)',
                }}
              />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setShowRecoveryModal(false);
                  setRecoverySent(false);
                  setRecoveryErrorMsg('');
                }}
                className="absolute top-4 right-4 p-2 rounded-full text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 transition-all cursor-pointer z-10"
                aria-label="Chiudi recupero PIN"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative z-10 space-y-4">
                {/* Header */}
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner shrink-0">
                    <Mail className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-white">
                      Recupero PIN di Accesso
                    </h3>
                    <p className="text-xs text-zinc-300">
                      Invia le istruzioni via email collegate a Supabase
                    </p>
                  </div>
                </div>

                {/* Form or Sent state */}
                {!recoverySent ? (
                  <form onSubmit={handleSendRecoveryEmail} className="space-y-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-300">
                        Indirizzo Email di Recupero:
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          required
                          value={recoveryEmailInput}
                          onChange={(e) => {
                            setRecoveryEmailInput(e.target.value);
                            setRecoveryErrorMsg('');
                          }}
                          placeholder="es. nome@email.com"
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-zinc-500 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                        <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
                      </div>

                      <p className="text-[11px] text-zinc-400 leading-relaxed pt-0.5">
                        Riceverai un link sicuro per verificare la tua identità e reimpostare il tuo PIN di accesso.
                      </p>
                    </div>

                    {recoveryErrorMsg && (
                      <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md text-zinc-200 text-xs flex items-start space-x-2.5 shadow-lg">
                        <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                        <span className="font-medium text-zinc-300 leading-relaxed">{recoveryErrorMsg}</span>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={isSendingRecovery}
                        className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white text-xs sm:text-sm font-black transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                      >
                        {isSendingRecovery ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                            <span>Invio in corso...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-4 h-4 stroke-[2.2]" />
                            <span>Invia Email di Recupero</span>
                          </>
                        )}
                      </button>

                      {/* Immediate verification option if user knows the email */}
                      {isEmailMatchingConfigured && (
                        <button
                          type="button"
                          onClick={() => {
                            setRecoverySent(true);
                            setRecoverySuccessMsg("Identità verificata tramite email registrata!");
                          }}
                          className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 active:scale-98 border border-white/20 text-white text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                          title="Se non ricevi la mail, puoi reimpostare il PIN subito confermando l'email"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Reimposta subito</span>
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  /* POST-SEND RECOVERY STATE WITH DISCREET GLASSMORPHISM NOTIFICATION */
                  <div className="space-y-4 pt-1">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md text-zinc-200 text-xs space-y-2 shadow-xl">
                      <div className="flex items-start space-x-2.5">
                        <CheckCircle2 className="w-4 h-4 text-white stroke-[2.2] shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-sm font-bold text-white leading-snug">
                          {recoverySuccessMsg || "Email di recupero inviata! Controlla la tua casella di posta (e la cartella Spam se non la trovi subito)."}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 pl-6.5 leading-relaxed">
                        Le istruzioni sono state inviate a <strong className="text-zinc-200 font-semibold">{recoveryEmailInput}</strong>. Se non trovi il messaggio entro pochi istanti, controlla anche la cartella Spam.
                      </p>
                    </div>

                    {/* Reveal current PIN button or Reset PIN Form */}
                    {correctPin && (
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                        <div>
                          <span className="block text-xs font-bold text-zinc-300">
                            Hai solo dimenticato il codice?
                          </span>
                          <span className="block text-[10px] text-zinc-400">
                            Email verificata con successo
                          </span>
                        </div>
                        {revealedPin ? (
                          <div className="flex items-center space-x-2 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
                            <span className="text-[10px] text-emerald-300 font-bold">PIN:</span>
                            <span className="text-base font-mono font-black text-white tracking-widest">
                              {revealedPin}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRevealedPin(correctPin)}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer"
                          >
                            Rivela PIN Attuale
                          </button>
                        )}
                      </div>
                    )}

                    {/* Direct In-App PIN Reset Form so the user can immediately regain access */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                      <div className="flex items-center space-x-2 text-xs font-bold text-zinc-200">
                        <KeyRound className="w-4 h-4 text-indigo-400" />
                        <span>Reimposta Nuovo PIN a 4 Cifre:</span>
                      </div>

                      <form onSubmit={handleConfirmNewPin} className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                              Nuovo PIN
                            </label>
                            <input
                              type="password"
                              maxLength={4}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={newResetPin}
                              onChange={(e) => {
                                setNewResetPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                                setResetPinError('');
                              }}
                              placeholder="••••"
                              className="w-full text-center px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-base font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                              Conferma PIN
                            </label>
                            <input
                              type="password"
                              maxLength={4}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              value={confirmResetPin}
                              onChange={(e) => {
                                setConfirmResetPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                                setResetPinError('');
                              }}
                              placeholder="••••"
                              className="w-full text-center px-3 py-2 rounded-xl bg-white/5 border border-white/15 text-white text-base font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>

                        {resetPinError && (
                          <p className="text-[11px] font-bold text-rose-400 text-center">
                            {resetPinError}
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={newResetPin.length !== 4 || confirmResetPin.length !== 4}
                          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-xs font-black transition-all flex items-center justify-center space-x-2 shadow-md cursor-pointer disabled:opacity-40"
                        >
                          <span>Salva Nuovo PIN e Sblocca Diariamente</span>
                          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      </form>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRecoverySent(false);
                          setRecoveryErrorMsg('');
                          setRevealedPin(null);
                        }}
                        className="text-[11px] font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        Reinvia email
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShowRecoveryModal(false);
                          setRecoverySent(false);
                          setRevealedPin(null);
                        }}
                        className="text-[11px] font-bold text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        Torna al tastierino
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
