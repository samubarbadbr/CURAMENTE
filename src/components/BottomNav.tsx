import React from 'react';
import { Clock, BarChart3, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { ViewType } from '../types';

interface BottomNavProps {
  currentView: ViewType;
  onSelectView: (view: ViewType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onSelectView }) => {
  const navItems = [
    { id: 'timeline' as ViewType, label: 'Timeline', icon: Clock },
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: BarChart3 },
    { id: 'settings' as ViewType, label: 'Impostazioni', icon: Settings },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 w-full max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 pt-2 pointer-events-none"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="glass-nav rounded-full p-1.5 flex items-center justify-around shadow-2xl border border-[var(--border-solid)] bg-[var(--bg-surface)] backdrop-blur-2xl pointer-events-auto relative">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`flex-1 flex flex-col items-center py-2 px-3 min-h-[48px] justify-center rounded-full text-xs transition-all duration-200 relative cursor-pointer select-none ${
                isActive
                  ? 'nav-item-active font-bold'
                  : 'nav-item-inactive hover:text-[var(--text-primary)] font-medium'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="nav-active-pill absolute inset-0 bg-[var(--nav-active-bg)] rounded-full shadow-md"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                />
              )}
              <motion.div
                animate={{ scale: isActive ? 1.04 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="z-10 flex flex-col items-center justify-center relative"
              >
                <Icon className="w-5 h-5 mb-0.5 stroke-[2]" />
                <span className="text-[11px] tracking-tight">{item.label}</span>
              </motion.div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
