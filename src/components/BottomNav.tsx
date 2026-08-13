import React from 'react';
import { Clock, BarChart3, Settings } from 'lucide-react';
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
      className="fixed bottom-0 left-0 right-0 z-30 w-full max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 pt-2"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="glass-nav rounded-full px-3 py-2 flex items-center justify-around shadow-lg border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectView(item.id)}
              className={`flex-1 flex flex-col items-center py-2 px-3 min-h-[48px] justify-center rounded-full text-xs transition-all duration-150 active:scale-95 relative cursor-pointer ${
                isActive
                  ? 'nav-item-active text-[#5B67CA] dark:text-[#9CA6DC] font-black'
                  : 'nav-item-inactive text-[#37493D] dark:text-[#A7B6AC] hover:text-[#15251C] dark:hover:text-[#EEF3EF] font-bold'
              }`}
            >
              {isActive && (
                <div className="nav-active-pill absolute inset-0 bg-[#E0E6FD] dark:bg-[#9CA6DC]/20 rounded-full" />
              )}
              <Icon className={`w-5 h-5 mb-0.5 z-10 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="z-10 text-[11px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
