import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Lock } from 'lucide-react';

interface SplashScreenProps {
  onStart?: () => void;
  onComplete?: () => void;
  isReady?: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onStart,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);

  const handleFinish = () => {
    if (onComplete) {
      onComplete();
    } else if (onStart) {
      onStart();
    }
  };

  useEffect(() => {
    let animationFrameId: number;
    const startTime = performance.now();
    const duration = 1600; // Fluid ~1.6s duration
    let finished = false;

    const updateProgress = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Smooth ease-out cubic curve
      const easedProgress = Math.min(
        100,
        Math.round((1 - Math.pow(1 - t, 2.5)) * 100)
      );

      setProgress(easedProgress);

      if (t < 1) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        if (!finished) {
          finished = true;
          setTimeout(() => {
            handleFinish();
          }, 240);
        }
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  let statusText = 'Caricamento del diario...';
  if (progress >= 38 && progress < 82) {
    statusText = 'Sincronizzazione dati locale...';
  } else if (progress >= 82) {
    statusText = 'Pronto!';
  }

  return (
    <motion.div
      key="splash-screen"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        y: -30,
        filter: 'blur(12px)',
        scale: 1.02,
        transition: { duration: 0.5, ease: [0.32, 0.72, 0, 1] },
      }}
      className="fixed inset-0 z-[60] flex flex-col justify-between items-center bg-[#050508] text-[#EDEDED] px-6 py-10 sm:py-14 select-none overflow-hidden"
    >
      {/* Top Spacer */}
      <div className="w-full h-2" />

      {/* Main Glassmorphic Composition */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md mx-auto my-auto flex flex-col items-center justify-center">
        {/* Cerchio Luminoso di Sfondo (Halo Glow Reflector: 600px x 600px ad alto contrasto) */}
        <motion.div
          animate={{
            scale: [0.96, 1.04, 0.96],
            opacity: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[540px] h-[540px] sm:w-[620px] sm:h-[620px] rounded-full z-0"
          style={{
            background:
              'radial-gradient(circle, rgba(255, 255, 255, 0.85) 0%, rgba(200, 215, 255, 0.45) 35%, transparent 70%)',
            filter: 'blur(35px)',
          }}
          aria-hidden="true"
        />

        {/* Accentuated Frosted Glass Logo Card (Glassmorph prominente come prima) */}
        <motion.div
          animate={{
            scale: [1, 1.03, 1],
            opacity: [0.96, 1, 0.96],
          }}
          transition={{
            duration: 2.6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative z-10 w-40 h-40 sm:w-48 sm:h-48 rounded-[32px] sm:rounded-[38px] flex flex-col items-center justify-center shadow-2xl overflow-hidden"
          style={{
            background: 'rgba(18, 20, 28, 0.50)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid rgba(255, 255, 255, 0.38)',
            boxShadow:
              '0 25px 60px rgba(0, 0, 0, 0.75), inset 0 1px 2px rgba(255, 255, 255, 0.55), inset 0 -1px 2px rgba(0, 0, 0, 0.6)',
          }}
        >
          {/* Brain Icon with Crisp White & Reflection Ring */}
          <div className="relative flex flex-col items-center justify-center">
            <Brain className="w-18 h-18 sm:w-20 sm:h-20 text-white stroke-[1.8] drop-shadow-[0_4px_16px_rgba(255,255,255,0.4)] z-10" />

            {/* Refined Glassmorphic Ring under the brain */}
            <div
              className="w-20 h-4.5 sm:w-24 sm:h-5 rounded-full border border-white/45 -mt-3 z-0"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.1) 60%, transparent 80%)',
                boxShadow: '0 0 12px rgba(255, 255, 255, 0.45)',
              }}
            />
          </div>
        </motion.div>

        {/* Title and Subtitle with Metallic Finish */}
        <div className="text-center space-y-1.5 mt-7 sm:mt-8">
          <h1
            className="text-3xl sm:text-4xl font-black tracking-tight drop-shadow-md select-none"
            style={{
              background:
                'linear-gradient(115deg, #FFFFFF 0%, #FFFFFF 50%, #E2E8F0 75%, #CBD5E1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.025em',
            }}
          >
            Diariamente
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 font-normal tracking-wide">
            Il tuo spazio quotidiano per riflettere e crescere
          </p>
        </div>

        {/* Refined Minimalist Glass Light-Bar & Status */}
        <div className="w-52 sm:w-60 flex flex-col items-center space-y-3 mt-7 sm:mt-8">
          {/* Ultra-sleek frosted glass light track */}
          <div className="w-full h-[3px] rounded-full bg-white/10 backdrop-blur-md border border-white/20 overflow-hidden relative shadow-[inset_0_1px_1px_rgba(0,0,0,0.5)]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-white/40 via-white/90 to-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear', duration: 0.05 }}
            />
          </div>

          {/* Dynamic Status Text with Glowing Pulse Indicator */}
          <div className="h-5 flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={statusText}
                initial={{ opacity: 0, y: 2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -2 }}
                transition={{ duration: 0.16 }}
                className="flex items-center space-x-2 text-[11px] sm:text-xs font-medium text-zinc-300 tracking-wider uppercase select-none"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)]"></span>
                </span>
                <span>{statusText}</span>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Discrete Bottom Footnote */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="relative z-10 flex items-center justify-center space-x-1.5 text-zinc-400 text-[11px] font-medium tracking-wider uppercase"
      >
        <Lock className="w-3 h-3 stroke-[2] text-zinc-400" />
        <span>100% Privato &amp; Locale</span>
      </motion.div>
    </motion.div>
  );
};
