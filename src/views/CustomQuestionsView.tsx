import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Pencil,
  Trash2,
  MessageSquareQuote,
  HelpCircle,
  Heart,
  TrendingUp,
  Smile,
  Briefcase,
  Activity,
  Lightbulb,
  MoreHorizontal,
  AlignLeft,
  Sliders,
  ToggleLeft,
  Calendar,
  RotateCcw,
  CheckCircle2,
  ArrowLeft,
  Layers,
} from 'lucide-react';
import { CustomQuestion, QuestionCategory } from '../types';
import { CustomQuestionModal } from '../components/CustomQuestionModal';

interface CustomQuestionsViewProps {
  questions: CustomQuestion[];
  onCreateQuestion: (data: Omit<CustomQuestion, 'id' | 'createdAt' | 'isDefault'>) => void;
  onUpdateQuestion: (question: CustomQuestion) => void;
  onDeleteQuestion: (id: string) => void;
  onToggleQuestion: (id: string, isEnabled: boolean) => void;
  onResetDefaults: () => void;
  onBackToDiary?: () => void;
}

const CATEGORY_META: Record<
  QuestionCategory,
  { label: string; icon: React.FC<{ className?: string }> }
> = {
  Gratitudine: {
    label: 'Gratitudine',
    icon: Heart,
  },
  Crescita: {
    label: 'Crescita & Azione',
    icon: TrendingUp,
  },
  Mood: {
    label: 'Mood & Emozioni',
    icon: Smile,
  },
  Lavoro: {
    label: 'Lavoro & Focus',
    icon: Briefcase,
  },
  Salute: {
    label: 'Salute & Corpo',
    icon: Activity,
  },
  Riflessione: {
    label: 'Riflessione',
    icon: Lightbulb,
  },
  Altro: {
    label: 'Altro',
    icon: MoreHorizontal,
  },
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Ogni giorno',
  weekdays: 'Solo Feriali',
  weekend: 'Solo Weekend',
};

export const CustomQuestionsView: React.FC<CustomQuestionsViewProps> = ({
  questions,
  onCreateQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onToggleQuestion,
  onResetDefaults,
  onBackToDiary,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<CustomQuestion | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [questionToDelete, setQuestionToDelete] = useState<CustomQuestion | null>(null);

  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (q: CustomQuestion) => {
    setEditingQuestion(q);
    setIsModalOpen(true);
  };

  const handleSaveModal = (data: {
    prompt: string;
    category: QuestionCategory;
    responseType: any;
    frequency: any;
    isEnabled: boolean;
  }) => {
    if (editingQuestion) {
      onUpdateQuestion({
        ...editingQuestion,
        ...data,
      });
    } else {
      onCreateQuestion(data);
    }
  };

  const activeCount = questions.filter((q) => q.isEnabled).length;
  const filteredQuestions =
    filterCategory === 'all'
      ? questions
      : questions.filter((q) => q.category === filterCategory);

  return (
    <div className="space-y-6 pb-28 animate-fade-in">
      {/* Top Header Row with Metallic Nuova Domanda button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            {onBackToDiary && (
              <button
                type="button"
                onClick={onBackToDiary}
                className="p-2 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] active:scale-95 transition-all cursor-pointer mr-1"
                title="Torna al diario"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              </button>
            )}
            <div className="w-10 h-10 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-solid)] flex items-center justify-center shadow-sm shrink-0">
              <HelpCircle className="w-5.5 h-5.5 text-[var(--accent-primary)] stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tracking-tight">
                Editor Domande Custom
              </h2>
              <p className="text-xs font-bold text-[var(--text-secondary)]">
                {activeCount} su {questions.length} domande attive nel diario quotidiano
              </p>
            </div>
          </div>
        </div>

        {/* Action button: Metallic Silver / Platinum Gradient like Home Screen */}
        <motion.button
          type="button"
          onClick={handleOpenCreate}
          whileHover={{ scale: 1.03, filter: 'brightness(1.08)' }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-full text-[#090A0E] text-xs sm:text-sm font-black tracking-tight cursor-pointer select-none transition-all duration-200"
          style={{
            background:
              'linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 25%, #E2E8F0 55%, #CBD5E1 85%, #94A3B8 100%)',
            border: '1px solid rgba(255, 255, 255, 0.85)',
            boxShadow:
              '0 4px 18px rgba(0, 0, 0, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.9), inset 0 -1px 2px rgba(0, 0, 0, 0.15)',
          }}
        >
          <Plus className="w-4 h-4 stroke-[3] text-[#090A0E]" />
          <span>Nuova Domanda</span>
        </motion.button>
      </div>

      {/* Categories Filter Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
        <button
          type="button"
          onClick={() => setFilterCategory('all')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer shrink-0 ${
            filterCategory === 'all'
              ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] shadow-xs'
              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-solid)]'
          }`}
        >
          Tutte ({questions.length})
        </button>
        {Object.keys(CATEGORY_META).map((cat) => {
          const count = questions.filter((q) => q.category === cat).length;
          if (count === 0 && filterCategory !== cat) return null;
          const isSelected = filterCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer shrink-0 flex items-center space-x-1.5 ${
                isSelected
                  ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-solid)]'
              }`}
            >
              <span>{cat}</span>
              <span className="opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Questions List of Frosted Glass Cards */}
      <div className="space-y-3.5">
        <AnimatePresence>
          {filteredQuestions.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-[24px] p-8 text-center space-y-4 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-md"
            >
              <div className="p-3.5 rounded-3xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-[var(--text-secondary)] w-14 h-14 mx-auto flex items-center justify-center">
                <HelpCircle className="w-7 h-7 stroke-[1.8]" />
              </div>
              <div>
                <h4 className="text-base font-black text-[var(--text-primary)]">
                  Nessuna domanda presente in questa categoria
                </h4>
                <p className="text-xs font-bold text-[var(--text-secondary)] mt-1 max-w-sm mx-auto">
                  Crea la tua prima domanda personalizzata oppure ripristina il set iniziale di default.
                </p>
              </div>
              <div className="flex items-center justify-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-full text-[#090A0E] text-xs font-black tracking-tight cursor-pointer select-none transition-all duration-200"
                  style={{
                    background:
                      'linear-gradient(135deg, #FFFFFF 0%, #F1F5F9 25%, #E2E8F0 55%, #CBD5E1 85%, #94A3B8 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.85)',
                    boxShadow:
                      '0 4px 18px rgba(0, 0, 0, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.9), inset 0 -1px 2px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3] text-[#090A0E]" />
                  <span>Nuova Domanda</span>
                </button>
                <button
                  type="button"
                  onClick={onResetDefaults}
                  className="px-4 py-2 rounded-full border border-[var(--border-solid)] text-[var(--text-primary)] text-xs font-bold hover:bg-[var(--bg-subtle)] transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Ripristina Default</span>
                </button>
              </div>
            </motion.div>
          ) : (
            filteredQuestions.map((q) => {
              const meta = CATEGORY_META[q.category] || CATEGORY_META.Altro;
              const CategoryIcon = meta.icon;

              return (
                <motion.div
                  key={q.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`glass-panel rounded-[22px] p-5 border transition-all duration-200 relative overflow-hidden ${
                    q.isEnabled
                      ? 'border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-md'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)]/50 opacity-60'
                  }`}
                  style={{
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    {/* Left Details */}
                    <div className="space-y-3 flex-1 min-w-0">
                      {/* Badges Row */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Category Badge */}
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[11px] font-black border border-[var(--border-solid)] bg-[var(--bg-subtle)] text-[var(--text-primary)]">
                          <CategoryIcon className="w-3.5 h-3.5 stroke-[2.2] text-[var(--accent-primary)]" />
                          <span>{meta.label}</span>
                        </span>

                        {/* Response Type Badge */}
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-solid)]">
                          {q.responseType === 'text' && (
                            <>
                              <AlignLeft className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                              <span>Testo Libero</span>
                            </>
                          )}
                          {q.responseType === 'scale_5' && (
                            <>
                              <Sliders className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                              <span>Scala 1 - 5</span>
                            </>
                          )}
                          {q.responseType === 'scale_10' && (
                            <>
                              <Sliders className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                              <span>Scala 1 - 10</span>
                            </>
                          )}
                          {q.responseType === 'boolean' && (
                            <>
                              <ToggleLeft className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                              <span>Scelta Si / No</span>
                            </>
                          )}
                        </span>

                        {/* Frequency Badge */}
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-solid)]">
                          <Calendar className="w-3 h-3" />
                          <span>{FREQUENCY_LABELS[q.frequency] || q.frequency}</span>
                        </span>

                        {q.isDefault && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-solid)]">
                            Predefinita
                          </span>
                        )}
                      </div>

                      {/* Question Text */}
                      <p className="text-sm sm:text-base font-black text-[var(--text-primary)] leading-relaxed tracking-tight break-words">
                        {q.prompt}
                      </p>
                    </div>

                    {/* Right Controls: Quick On/Off Switch + Pencil + Trash */}
                    <div className="flex items-center space-x-2.5 sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--border-subtle)] justify-between sm:justify-end">
                      {/* On/Off Switch */}
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                          {q.isEnabled ? 'Attiva' : 'Nascosta'}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.isEnabled}
                            onChange={(e) => onToggleQuestion(q.id, e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[var(--bg-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-solid)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5B67CA] border border-[var(--border-solid)] shadow-inner" />
                        </label>
                      </div>

                      <div className="h-4 w-px bg-[var(--border-solid)]" />

                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(q)}
                        className="p-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-solid)] shadow-xs transition-all active:scale-95 cursor-pointer"
                        title="Modifica domanda"
                        aria-label="Modifica domanda"
                      >
                        <Pencil className="w-4 h-4 stroke-[2.2]" />
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => setQuestionToDelete(q)}
                        className="p-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-rose-500/15 text-[var(--text-secondary)] hover:text-rose-500 border border-[var(--border-solid)] hover:border-rose-500/40 shadow-xs transition-all active:scale-95 cursor-pointer"
                        title="Elimina domanda"
                        aria-label="Elimina domanda"
                      >
                        <Trash2 className="w-4 h-4 stroke-[2.2]" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Footer Helper Note & Reset defaults */}
      <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2 text-[var(--text-secondary)]">
          <HelpCircle className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
          <span>
            Le domande attive verranno proposte automaticamente quando crei o modifichi una voce nel diario.
          </span>
        </div>
        <button
          type="button"
          onClick={onResetDefaults}
          className="text-xs font-bold text-[var(--text-primary)] hover:underline flex items-center space-x-1 shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Ripristina domande predefinite</span>
        </button>
      </div>

      {/* Creation & Editing Modal */}
      <CustomQuestionModal
        isOpen={isModalOpen}
        questionToEdit={editingQuestion}
        onSave={handleSaveModal}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Confirmation Modal for Deletion */}
      {questionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setQuestionToDelete(null)}
            className="fixed inset-0 bg-black/75 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-sm rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-solid)] p-6 space-y-4 text-[var(--text-primary)] shadow-2xl backdrop-blur-2xl"
          >
            <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 w-12 h-12 flex items-center justify-center border border-rose-500/40">
              <Trash2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-base font-black">Eliminare questa domanda?</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                "{questionToDelete.prompt}" non comparirà più nei nuovi inserimenti del diario. Le risposte passate salvate rimarranno intatte.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setQuestionToDelete(null)}
                className="px-4 py-2 rounded-full border border-[var(--border-solid)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteQuestion(questionToDelete.id);
                  setQuestionToDelete(null);
                }}
                className="px-5 py-2 rounded-full bg-rose-600 text-white text-xs font-black shadow-md hover:bg-rose-700"
              >
                Elimina
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
