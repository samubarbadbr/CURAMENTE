import React from 'react';
import { motion } from 'motion/react';
import { Brain, Lock } from 'lucide-react';

interface SplashScreenProps {
  onStart: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  return (
    <motion.div
      key="splash-screen"
      initial={{ opacity: 0, scale: 1.02, filter: 'blur(8px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      exit={{
        opacity: 0,
        scale: 1.06,
        filter: 'blur(14px)',
        transition: { duration: 0.42, ease: [0.32, 0.72, 0, 1] },
      }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 flex flex-col justify-between items-center bg-[#07080B] text-[#EDEDED] px-6 py-8 sm:py-12 select-none overflow-hidden"
    >
      {/* Top Spacer */}
      <div className="w-full h-2" />

      {/* Main Composition: Halo + Icon Card on Left, Title + Subtitle + Button on Right */}
      <div className="relative z-10 w-full max-w-4xl mx-auto my-auto flex flex-col md:flex-row items-center justify-center gap-8 md:gap-14 px-4">
        {/* Left Section: Glass Card with Brain Icon & Defined Circular Halo Ring */}
        <div className="relative flex items-center justify-center shrink-0">
          {/* Defined Circular Halo Ring with crisp geometry */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.15, filter: 'blur(30px)' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[290px] h-[290px] sm:w-[360px] sm:h-[360px] rounded-full z-0"
            style={{
              background:
                'radial-gradient(circle, transparent 40%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.9) 64%, rgba(255, 255, 255, 0.6) 72%, transparent 80%)',
              filter: 'blur(18px)',
            }}
            aria-hidden="true"
          />

          {/* Sharp Circular Ring Core defining the crisp circular stroke */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.15, filter: 'blur(20px)' }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] sm:w-[330px] sm:h-[330px] rounded-full z-0 border-[14px] sm:border-[18px] border-white/80"
            style={{
              filter: 'blur(10px)',
              boxShadow: '0 0 35px rgba(255, 255, 255, 0.8), inset 0 0 25px rgba(255, 255, 255, 0.5)',
            }}
            aria-hidden="true"
          />

          {/* Frosted Glass Icon Card */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.92, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{
              opacity: 0,
              y: -16,
              scale: 0.94,
              filter: 'blur(10px)',
              transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] },
            }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-44 h-44 sm:w-52 sm:h-52 rounded-[32px] sm:rounded-[36px] flex flex-col items-center justify-center shadow-2xl overflow-hidden"
            style={{
              background: 'rgba(18, 20, 28, 0.52)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.28)',
              boxShadow:
                '0 25px 60px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.35), inset 0 -1px 1px rgba(0, 0, 0, 0.5)',
            }}
          >
            {/* Brain Icon with thin, subtle glassmorphic ring reflection */}
            <div className="relative flex flex-col items-center justify-center">
              <Brain className="w-18 h-18 sm:w-22 sm:h-22 text-white stroke-[1.8] drop-shadow-[0_4px_12px_rgba(255,255,255,0.25)] z-10" />

              {/* Refined & Thinner Glassmorphic Ring under the brain */}
              <div
                className="w-22 h-5 sm:w-26 sm:h-6 rounded-full border border-white/40 -mt-3.5 z-0"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.08) 60%, transparent 80%)',
                  boxShadow: '0 0 10px rgba(255, 255, 255, 0.4)',
                }}
              />
            </div>
          </motion.div>
        </div>

        {/* Right Section: Title with Metallic Gradient, Subtitle, Pill Button */}
        <motion.div
          initial={{ opacity: 0, x: 20, filter: 'blur(6px)' }}
          animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, x: 20, filter: 'blur(8px)', transition: { duration: 0.35 } }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center md:items-start text-center md:text-left space-y-4 max-w-md"
        >
          <div className="space-y-2">
            {/* Title with Gradient (Pure White to Metallic Silver/Grey as in Photo) */}
            <h1
              className="text-4xl sm:text-5xl lg:text-[54px] font-black tracking-tight drop-shadow-md select-none"
              style={{
                background:
                  'linear-gradient(115deg, #FFFFFF 0%, #FFFFFF 40%, #E2E8F0 65%, #94A3B8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.03em',
              }}
            >
              Diariamente
            </h1>
            <p className="text-sm sm:text-base text-zinc-300 font-normal tracking-tight leading-relaxed max-w-xs sm:max-w-sm">
              Il tuo spazio quotidiano per riflettere e crescere
            </p>
          </div>

          {/* Pill Outline Inizia Button */}
          <div className="pt-2">
            <motion.button
              type="button"
              id="splash-start-button"
              onClick={onStart}
              whileHover={{ scale: 1.03, borderColor: 'rgba(255, 255, 255, 0.85)' }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="px-9 py-2.5 rounded-full border border-white/40 bg-[#12141C]/80 hover:bg-[#1A1D28]/90 text-white text-xs sm:text-sm font-semibold tracking-wide backdrop-blur-md shadow-lg transition-all duration-150 cursor-pointer select-none"
              style={{
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
              }}
            >
              Inizia
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Discrete Quality Footnote */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="relative z-10 flex items-center justify-center space-x-1.5 text-zinc-400 text-[11px] font-medium tracking-wide"
      >
        <Lock className="w-3 h-3 stroke-[2] text-zinc-400" />
        <span>Protetto &amp; Privato</span>
      </motion.div>
    </motion.div>
  );
};
