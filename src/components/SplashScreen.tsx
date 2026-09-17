import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Brain } from 'lucide-react';

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
    const duration = 1900; // ~1.9s di caricamento fluido e costante
    let isFinished = false;

    const updateProgress = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Curva di avanzamento organica stile YouTube verso il 100%
      let p: number;
      if (t < 0.28) {
        p = (t / 0.28) * 32;
      } else if (t < 0.8) {
        const midT = (t - 0.28) / 0.52;
        p = 32 + midT * 53;
      } else {
        const endT = (t - 0.8) / 0.2;
        p = 85 + Math.pow(endT, 1.1) * 15;
      }

      const clampedProgress = Math.min(100, Math.max(0, p));
      setProgress(clampedProgress);

      if (t < 1) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        if (!isFinished) {
          isFinished = true;
          setIsMaxed(true);

          // Timer di tenuta al 100% della barra prima di entrare nell'app (~400ms)
          setTimeout(() => {
            handleFinish();
          }, 400);
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
        filter: 'blur(8px)',
        transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
      }}
      onClick={handleFinish}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-between bg-black text-white select-none cursor-pointer transition-colors duration-200 overflow-hidden"
      style={{ perspective: 1000 }}
    >
      {/* Sottile barra di avanzamento YouTube top-edge a filo schermo in bianco ottico puro */}
      <div className="w-full h-[2.5px] bg-transparent overflow-hidden z-20">
        <motion.div
          className={`h-full bg-white transition-shadow duration-150 ${
            isMaxed
              ? 'shadow-[0_0_16px_#FFFFFF] brightness-125'
              : 'shadow-[0_0_10px_rgba(255,255,255,0.9)]'
          }`}
          style={{ width: `${progress}%` }}
          transition={{ ease: 'linear', duration: 0.05 }}
        />
      </div>

      {/* Blocco Centrale: Nero Assoluto & Bianco Puro con rifrazione Glass ad alta definizione */}
      <div className="my-auto z-10 flex flex-col items-center justify-center space-y-6">
        {/* Emblema con rotazione, profilo in vetro nero satinato e bisellatura bianca nitida */}
        <div className="relative flex items-center justify-center">
          <motion.div
            initial={{
              scale: 0.25,
              rotate: -180,
              opacity: 0,
            }}
            animate={{
              scale: [0.25, 1.06, 1],
              rotate: [-180, 0],
              opacity: 1,
            }}
            transition={{
              duration: 1.1,
              times: [0, 0.84, 1],
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative z-10 w-22 h-22 sm:w-26 sm:h-26 rounded-3xl bg-black border border-white/50 shadow-[0_0_35px_rgba(255,255,255,0.08),inset_0_1.5px_2px_rgba(255,255,255,0.8),inset_0_-1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center p-4 overflow-hidden"
          >
            {/* Bagliore dinamico speculare (sheen) bianco puro che scorre sulla superficie durante la rotazione */}
            <motion.div
              initial={{ x: '-160%', opacity: 0 }}
              animate={{ x: '190%', opacity: [0, 0.85, 0] }}
              transition={{ delay: 0.3, duration: 0.7, ease: 'easeInOut' }}
              className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/50 to-transparent"
            />

            {/* Icona Brain in bianco ottico puro ad altissimo contrasto */}
            <Brain className="w-11 h-11 sm:w-13 sm:h-13 text-white stroke-[2.2] drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]" />
          </motion.div>
        </div>

        {/* Titolo Diariamente & Barra YouTube in puro bianco e nero */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-center space-y-3.5 z-10"
        >
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none">
            Diariamente
          </h1>

          {/* Barra di caricamento minimale stile YouTube in netto contrasto bianco/nero */}
          <div className="w-36 sm:w-44 h-[2.5px] mx-auto rounded-full bg-black border border-white/25 overflow-hidden relative">
            <motion.div
              className={`h-full rounded-full bg-white transition-all duration-150 ${
                isMaxed
                  ? 'shadow-[0_0_14px_#FFFFFF] brightness-125'
                  : 'shadow-[0_0_8px_rgba(255,255,255,0.9)]'
              }`}
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear', duration: 0.05 }}
            />
          </div>
        </motion.div>
      </div>

      {/* Spacer inferiore per centratura bilanciata */}
      <div className="w-full h-8 z-10" />
    </motion.div>
  );
};
