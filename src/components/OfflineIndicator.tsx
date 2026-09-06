import React, { useEffect, useState } from 'react';
import { WifiOff, ShieldCheck } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 sm:left-6 z-40 flex items-center space-x-2.5 rounded-2xl bg-amber-950/90 text-amber-200 border border-amber-500/30 px-3.5 py-2 text-xs font-medium shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-[calc(100vw-2rem)]">
      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
      <div className="flex items-center space-x-1.5 truncate">
        <WifiOff className="w-3.5 h-3.5 shrink-0 text-amber-400" />
        <span className="truncate">Modalità Offline — Diario e PIN attivi al 100% in locale</span>
      </div>
    </div>
  );
};
