import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Brain } from 'lucide-react';
import liquidGlassBg from '../assets/images/liquid_glass_sculpture_1789655785143.jpg';

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
  const [isMaxed, setIsMaxed] = useState(false);

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
    const duration = 2100; // ~2.1s di caricamento continuo, fluido a 60/120 FPS
    let isFinished = false;

    const updateProgress = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Curva continua C1 morbida e omogenea
      const easedT = 1 - Math.pow(1 - t, 2.8);
      const currentProgress = Math.min(100, Math.max(0, easedT * 100));

      setProgress(currentProgress);

      if (t < 1) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        if (!isFinished) {
          isFinished = true;
          setProgress(100);
          setIsMaxed(true);

          // Attende esattamente 1 secondo (1000ms) a barra piena (100%) prima di entrare nell'app
          setTimeout(() => {
            handleFinish();
          }, 1000);
        }
      }
    };

    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <motion.div
      key="splash-screen"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{
        opacity: 0,
        scale: 1.025,
        filter: 'blur(10px)',
        transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
      }}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-between bg-black text-white select-none cursor-default touch-none overscroll-none transition-colors duration-200 overflow-hidden h-[100dvh]"
      style={{ perspective: 1200 }}
    >
      {/* Sfondo: Scultura 3D Liquid Glass & Chrome fotorealistica (Autentico stile Glassmorphism di riferimento) */}
      <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden">
        <img
          src={liquidGlassBg}
          alt=""
          className="w-full h-full object-cover object-center opacity-85 scale-105 transition-transform duration-1000"
          aria-hidden="true"
        />
        {/* Vignettatura scura perimetrale per massimo contrasto */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/80 pointer-events-none" />
        <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/40 to-black pointer-events-none" />
      </div>

      {/* Lastra Centrale in Vetro Satinato (Frosted Glassmorphism Plate, come nella foto di riferimento) */}
      <div className="my-auto z-10 flex flex-col items-center justify-center px-4 w-full max-w-[310px] sm:max-w-[340px]">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.94 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: isMaxed ? 1.02 : 1,
          }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full rounded-[36px] bg-white/[0.07] backdrop-blur-[48px] saturate-[200%] border border-white/40 shadow-[0_32px_80px_rgba(0,0,0,0.85),inset_0_2px_3px_rgba(255,255,255,0.8),inset_0_-1px_2px_rgba(255,255,255,0.2)] p-8 sm:p-9 flex flex-col items-center justify-between space-y-7 overflow-hidden"
        >
          {/* Specchio di luce diagonale sulla lastra di vetro smerigliato */}
          <div
            className="pointer-events-none absolute -top-20 -left-20 w-52 h-52 rounded-full bg-gradient-to-br from-white/30 via-white/10 to-transparent blur-xl"
            aria-hidden="true"
          />

          {/* Emblema Superiore: Icona Brain in vetro lucido con rotazione YouTube snap */}
          <div className="relative flex items-center justify-center pt-2">
            <motion.div
              initial={{
                scale: 0.3,
                rotate: -180,
                opacity: 0,
              }}
              animate={{
                scale: [0.3, 1.08, 1],
                rotate: [-180, 0],
                opacity: 1,
              }}
              transition={{
                duration: 1.15,
                times: [0, 0.84, 1],
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative z-10 w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-white/[0.14] backdrop-blur-2xl border border-white/50 shadow-[0_14px_32px_rgba(0,0,0,0.6),inset_0_2px_3px_rgba(255,255,255,0.9),inset_0_-1px_1.5px_rgba(0,0,0,0.3)] flex items-center justify-center p-4 overflow-hidden"
            >
              {/* Bagliore speculare che scorre sul logo durante l'apertura */}
              <motion.div
                initial={{ x: '-160%', opacity: 0 }}
                animate={{ x: '190%', opacity: [0, 0.9, 0] }}
                transition={{ delay: 0.35, duration: 0.75, ease: 'easeInOut' }}
                className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/65 to-transparent"
              />

              <Brain className="w-10 h-10 sm:w-11 sm:h-11 text-white stroke-[2.2] drop-shadow-[0_2px_10px_rgba(255,255,255,0.5)]" />
            </motion.div>
          </div>

          {/* Sezione Tipografica & Barra YouTube: allineata, diritta e perfettamente centrata */}
          <div className="w-full text-center space-y-4 z-10 pointer-events-none select-none pb-1">
            <h1
              className="text-2xl sm:text-[27px] font-black tracking-tight leading-none no-underline"
              style={{
                color: '#FFFFFF',
                WebkitTextFillColor: '#FFFFFF',
                textDecoration: 'none',
              }}
            >
              <span style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF' }}>Diaria</span>
              <span style={{ color: '#FFFFFF', WebkitTextFillColor: '#FFFFFF' }}>mente</span>
            </h1>

            {/* Barra YouTube in netto contrasto, perfettamente diritta */}
            <div className="w-full max-w-[180px] h-[3px] mx-auto rounded-full bg-black/50 border border-white/30 overflow-hidden relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]">
              <div
                className={`h-full rounded-full bg-white will-change-[width] transition-shadow duration-200 ${
                  isMaxed
                    ? 'shadow-[0_0_14px_#FFFFFF] brightness-125'
                    : 'shadow-[0_0_8px_rgba(255,255,255,0.9)]'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Spacer inferiore per centratura verticale impeccabile */}
      <div className="w-full h-8 z-10" />
    </motion.div>
  );
};
