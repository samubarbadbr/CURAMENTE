import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
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
  Check,
} from 'lucide-react';
import { CustomQuestion, QuestionCategory, QuestionResponseType, QuestionFrequency } from '../types';

interface CustomQuestionModalProps {
  isOpen: boolean;
  questionToEdit?: CustomQuestion | null;
  onSave: (data: {
    prompt: string;
    category: QuestionCategory;
    responseType: QuestionResponseType;
    frequency: QuestionFrequency;
    isEnabled: boolean;
  }) => void;
  onClose: () => void;
}

const CATEGORIES: { id: QuestionCategory; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'Gratitudine', label: 'Gratitudine', icon: Heart },
  { id: 'Crescita', label: 'Crescita & Azione', icon: TrendingUp },
  { id: 'Mood', label: 'Mood & Emozioni', icon: Smile },
  { id: 'Lavoro', label: 'Lavoro & Focus', icon: Briefcase },
  { id: 'Salute', label: 'Salute & Corpo', icon: Activity },
  { id: 'Riflessione', label: 'Riflessione', icon: Lightbulb },
  { id: 'Altro', label: 'Altro', icon: MoreHorizontal },
];

const FREQUENCIES: { id: QuestionFrequency; label: string; sub: string }[] = [
  { id: 'daily', label: 'Ogni giorno', sub: '7 giorni su 7' },
  { id: 'weekdays', label: 'Solo Feriali', sub: 'Lunedì - Venerdì' },
  { id: 'weekend', label: 'Solo Weekend', sub: 'Sabato e Domenica' },
];

export const CustomQuestionModal: React.FC<CustomQuestionModalProps> = ({
  isOpen,
  questionToEdit,
  onSave,
  onClose,
}) => {
  const [prompt, setPrompt] = useState('');
  const [category, setCategory] = useState<QuestionCategory>('Gratitudine');
  const [responseType, setResponseType] = useState<QuestionResponseType>('text');
  const [scaleMax, setScaleMax] = useState<5 | 10>(10);
  const [frequency, setFrequency] = useState<QuestionFrequency>('daily');
  const [isEnabled, setIsEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (questionToEdit) {
        setPrompt(questionToEdit.prompt);
        setCategory(questionToEdit.category);
        if (questionToEdit.responseType === 'scale_5') {
          setResponseType('scale_5');
          setScaleMax(5);
        } else if (questionToEdit.responseType === 'scale_10') {
          setResponseType('scale_10');
          setScaleMax(10);
        } else {
          setResponseType(questionToEdit.responseType);
          setScaleMax(10);
        }
        setFrequency(questionToEdit.frequency);
        setIsEnabled(questionToEdit.isEnabled);
      } else {
        setPrompt('');
        setCategory('Gratitudine');
        setResponseType('text');
        setScaleMax(10);
        setFrequency('daily');
        setIsEnabled(false);
      }
      setError(null);
    }
  }, [isOpen, questionToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError('Inserisci il testo della domanda per continuare.');
      return;
    }

    const finalResponseType: QuestionResponseType =
      responseType === 'scale_5' || responseType === 'scale_10'
        ? scaleMax === 5
          ? 'scale_5'
          : 'scale_10'
        : responseType;

    onSave({
      prompt: prompt.trim(),
      category,
      responseType: finalResponseType,
      frequency,
      isEnabled,
    });
    onClose();
  };

  const isScaleSelected = responseType === 'scale_5' || responseType === 'scale_10';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[28px] border border-[var(--border-solid)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-[0_25px_70px_rgba(0,0,0,0.6)] backdrop-blur-2xl p-5 sm:p-7 space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-[var(--border-solid)] pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5 text-[var(--accent-primary)] stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-[var(--text-primary)]">
                  {questionToEdit ? 'Modifica Domanda Custom' : 'Nuova Domanda Custom'}
                </h3>
                <p className="text-xs font-bold text-[var(--text-secondary)]">
                  Configura testo, categoria e tipo di risposta per il diario
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Prompt Text Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase tracking-wider text-[var(--text-secondary)]">
                Testo della Domanda <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  if (error) setError(null);
                }}
                rows={2}
                placeholder="es. Per cosa provo gratitudine o soddisfazione oggi?"
                className="w-full rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent transition-all shadow-inner"
              />
              {error && <p className="text-xs font-bold text-rose-400">{error}</p>}
            </div>

            {/* 2. Category Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-[var(--text-secondary)]">
                Categoria
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center space-x-2.5 transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'border-[var(--accent-primary)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold shadow-xs'
                          : 'border-[var(--border-solid)] bg-[var(--bg-subtle)]/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`} />
                      <span className="text-xs truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Response Type Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-[var(--text-secondary)]">
                Tipo di Risposta
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Free Text */}
                <button
                  type="button"
                  onClick={() => setResponseType('text')}
                  className={`p-3 rounded-2xl border text-left space-y-1 transition-all duration-150 cursor-pointer ${
                    responseType === 'text'
                      ? 'border-[var(--accent-primary)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold shadow-xs'
                      : 'border-[var(--border-solid)] bg-[var(--bg-subtle)]/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <AlignLeft className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span className="text-xs font-black">Testo Libero</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)]">Riflessione aperta</p>
                </button>

                {/* Rating Scale */}
                <button
                  type="button"
                  onClick={() => {
                    setResponseType(scaleMax === 5 ? 'scale_5' : 'scale_10');
                  }}
                  className={`p-3 rounded-2xl border text-left space-y-1 transition-all duration-150 cursor-pointer ${
                    isScaleSelected
                      ? 'border-[var(--accent-primary)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold shadow-xs'
                      : 'border-[var(--border-solid)] bg-[var(--bg-subtle)]/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Sliders className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span className="text-xs font-black">Scala di Valutazione</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)]">Punteggio numerico</p>
                </button>

                {/* Boolean / Yes-No */}
                <button
                  type="button"
                  onClick={() => setResponseType('boolean')}
                  className={`p-3 rounded-2xl border text-left space-y-1 transition-all duration-150 cursor-pointer ${
                    responseType === 'boolean'
                      ? 'border-[var(--accent-primary)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold shadow-xs'
                      : 'border-[var(--border-solid)] bg-[var(--bg-subtle)]/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <ToggleLeft className="w-4 h-4 text-[var(--accent-primary)]" />
                    <span className="text-xs font-black">Scelta Singola Si / No</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-secondary)]">Toggle rapido</p>
                </button>
              </div>

              {/* Sub-selector for Scale Max (1-5 vs 1-10) */}
              {isScaleSelected && (
                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] flex items-center justify-between mt-2 animate-fade-in">
                  <span className="text-xs font-bold text-[var(--text-primary)]">Intervallo della scala:</span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setScaleMax(5);
                        setResponseType('scale_5');
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        scaleMax === 5
                          ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] font-black shadow-xs'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-solid)]'
                      }`}
                    >
                      Da 1 a 5
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setScaleMax(10);
                        setResponseType('scale_10');
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        scaleMax === 10
                          ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] font-black shadow-xs'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-solid)]'
                      }`}
                    >
                      Da 1 a 10
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. Frequency Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-[var(--text-secondary)]">
                Frequenza di Comparsa
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {FREQUENCIES.map((freq) => {
                  const isSelected = frequency === freq.id;
                  return (
                    <button
                      key={freq.id}
                      type="button"
                      onClick={() => setFrequency(freq.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all duration-150 cursor-pointer ${
                        isSelected
                          ? 'border-[var(--accent-primary)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold shadow-xs'
                          : 'border-[var(--border-solid)] bg-[var(--bg-subtle)]/40 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                        <span className="text-xs font-black">{freq.label}</span>
                      </div>
                      <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">{freq.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Status Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)]">
              <div>
                <span className="block text-xs font-black text-[var(--text-primary)]">Attiva nel diario</span>
                <span className="block text-[10px] text-[var(--text-secondary)]">
                  Se disattivata, la domanda rimarrà salvata ma non verrà proposta nei nuovi inserimenti
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEnabled}
                  onChange={(e) => setIsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--bg-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-solid)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5B67CA] border border-[var(--border-solid)] shadow-inner" />
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[var(--border-solid)]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-full border border-[var(--border-solid)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] text-xs font-bold transition-all cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-full bg-[var(--accent-btn)] text-[var(--accent-btn-text)] text-xs font-black shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center space-x-2"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Salva Domanda</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
