import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';

export interface CollapsibleFieldProps {
  id?: string;
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  isOptional?: boolean;
  statusBadge?: React.ReactNode;
  extraAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * CollapsibleCard: Full glass-panel container with smooth Framer Motion height & opacity animations.
 * Used for top-level optional cards in CBT forms (Trigger, Questions, Section B in-depth fields).
 */
export const CollapsibleCard: React.FC<CollapsibleFieldProps> = ({
  id,
  title,
  icon,
  isOpen,
  onToggle,
  isOptional = true,
  statusBadge,
  extraAction,
  children,
  className = '',
}) => {
  return (
    <div
      id={id}
      className={`glass-panel rounded-[20px] p-4 border border-[var(--border-solid)] bg-[var(--bg-surface)] transition-all duration-150 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex-1 flex items-center justify-between text-left cursor-pointer group py-1 focus:outline-none select-none min-h-[44px]"
        >
          <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
            <div className="text-[var(--accent-primary)] shrink-0">{icon}</div>
            <span className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
              {title}
            </span>
            {isOptional && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-solid)]">
                Opzionale
              </span>
            )}
            {statusBadge}
          </div>

          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors pl-2 shrink-0">
            <span className="hidden sm:inline text-[10px]">{isOpen ? 'Comprimi' : 'Espandi'}</span>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="shrink-0"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </div>
        </button>

        {extraAction && (
          <div className="shrink-0 pl-1.5 border-l border-[var(--border-subtle)]">
            {extraAction}
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="collapsible-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: {
                height: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.2, delay: 0.04 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.15 },
              },
            }}
            className="overflow-hidden"
          >
            <div className="pt-3 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * CollapsibleSubSection: Sub-section embedded within an existing card (e.g. Photo & Audio inside Situazione, Thought tags).
 * Smoothly opens and closes with Framer Motion transitions.
 */
export const CollapsibleSubSection: React.FC<CollapsibleFieldProps> = ({
  id,
  title,
  icon,
  isOpen,
  onToggle,
  isOptional = true,
  statusBadge,
  extraAction,
  children,
  className = '',
}) => {
  return (
    <div id={id} className={`pt-2.5 border-t border-[var(--border-subtle)] ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex-1 flex items-center justify-between text-left cursor-pointer group py-1 focus:outline-none select-none min-h-[30px]"
        >
          <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
            <div className="text-[var(--accent-primary)] shrink-0">{icon}</div>
            <span className="text-xs font-black text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
              {title}
            </span>
            {isOptional && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-solid)]">
                Opzionale
              </span>
            )}
            {statusBadge}
          </div>

          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors pl-2 shrink-0">
            <span className="hidden sm:inline text-[10px]">{isOpen ? 'Comprimi' : 'Espandi'}</span>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="shrink-0"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </motion.div>
          </div>
        </button>

        {extraAction && (
          <div className="shrink-0 pl-1.5 border-l border-[var(--border-subtle)]">
            {extraAction}
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="collapsible-sub-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: {
                height: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.2, delay: 0.04 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
                opacity: { duration: 0.15 },
              },
            }}
            className="overflow-hidden"
          >
            <div className="pt-2.5 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
