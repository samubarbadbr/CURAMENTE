import React from 'react';
import { Brain } from 'lucide-react';

interface BrandLogoProps {
  className?: string;
  iconSize?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = 'w-10 h-10', iconSize = 24 }) => {
  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-sm border border-[var(--border-solid)] bg-[var(--bg-surface)] flex items-center justify-center shrink-0 ${className}`}
    >
      <Brain
        size={iconSize}
        className="w-6 h-6 text-[var(--accent-primary)]"
      />
    </div>
  );
};
