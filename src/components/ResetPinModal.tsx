import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface ResetPinModalProps {
  isOpen: boolean;
  onClose?: () => void;
  recoveryEmail?: string;
  onSaveNewPin: (newPin: string) => Promise<boolean> | boolean;
}

export const ResetPinModal: React.FC<ResetPinModalProps> = ({
  isOpen,
  onClose,
  recoveryEmail,
  onSaveNewPin,
}) => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanNew = newPin.trim();
    const cleanConfirm = confirmPin.trim();

    if (!cleanNew || cleanNew.length !== 4 || !/^\d{4}$/.test(cleanNew)) {
      setErrorMsg('Il PIN deve essere composto esattamente da 4 numeri.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setErrorMsg('I due PIN inseriti non corrispondono.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await onSaveNewPin(cleanNew);
      if (ok) {
        setIsSuccess(true);
        setTimeout(() => {
          if (onClose) onClose();
        }, 1200);
      } else {
        setErrorMsg('Errore durante il salvataggio del PIN. Riprova.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Errore durante il salvataggio del PIN.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="w-full max-w-md bg-zinc-900 border border-white/15 rounded-3xl shadow-2xl p-6 sm:p-7 relative overflow-hidden"
        >
          {/* Top Decorative Glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-emerald-400 to-indigo-500" />

          {/* Success State */}
          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 text-center space-y-4"
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">
                  PIN aggiornato con successo!
                </h3>
                <p className="text-sm text-zinc-300">
                  Accesso all'applicazione completato...
                </p>
              </div>
            </motion.div>
          ) : (
            /* Main Form */
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
                  <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Imposta Nuovo PIN
                  </h3>
                  <p className="text-xs text-zinc-300">
                    Accesso confermato via email. Scegli il tuo codice a 4 cifre.
                  </p>
                </div>
              </div>

              {recoveryEmail && (
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-300 flex items-center justify-between">
                  <span className="text-zinc-400">Account verificato:</span>
                  <span className="font-mono font-semibold text-emerald-400">{recoveryEmail}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                {/* 4-digit PIN Inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-bold text-zinc-300">
                        Nuovo PIN
                      </label>
                    </div>
                    <input
                      type={showPin ? 'text' : 'password'}
                      autoFocus
                      required
                      maxLength={4}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={newPin}
                      onChange={(e) => {
                        setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                        setErrorMsg('');
                      }}
                      placeholder="••••"
                      className="w-full text-center py-2.5 px-3 rounded-xl bg-white/5 border border-white/15 text-white text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[11px] font-bold text-zinc-300">
                        Conferma PIN
                      </label>
                    </div>
                    <input
                      type={showPin ? 'text' : 'password'}
                      required
                      maxLength={4}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={confirmPin}
                      onChange={(e) => {
                        setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4));
                        setErrorMsg('');
                      }}
                      placeholder="••••"
                      className="w-full text-center py-2.5 px-3 rounded-xl bg-white/5 border border-white/15 text-white text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Show / Hide Toggle */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-[11px] font-bold text-zinc-400 hover:text-white flex items-center space-x-1.5 cursor-pointer transition-colors"
                  >
                    {showPin ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Nascondi cifre</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Mostra cifre in chiaro</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2 text-rose-300 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting || newPin.length !== 4 || confirmPin.length !== 4}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white text-sm font-black transition-all flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                        <span>Salvataggio in corso...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4 stroke-[2.2]" />
                        <span>Salva Nuovo PIN e Accedi</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.2]" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
