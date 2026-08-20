import React, { useState } from 'react';
import { CbtEntry, Tag } from '../types';
import { CustomQuestionsService } from '../services/customQuestions';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  MapPin,
  Brain,
  Activity,
  ShieldCheck,
  HelpCircle,
  Ban,
  AlertCircle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Sparkles,
  Check,
  X,
} from 'lucide-react';

interface DetailViewProps {
  entry: CbtEntry;
  allTags: Tag[];
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const DetailView: React.FC<DetailViewProps> = ({
  entry,
  allTags,
  onBack,
  onEdit,
  onDelete,
}) => {
  const [isPhotoObscured, setIsPhotoObscured] = useState(false);
  const allQuestions = CustomQuestionsService.load();

  const getTagLabels = (tagIds: string[]) => {
    if (!tagIds || !tagIds.length) return [];
    return tagIds
      .map((id) => allTags.find((t) => t.id === id))
      .filter(Boolean)
      .map((t) => t!.label);
  };

  const emotionLabels = getTagLabels(entry.emotionTagIds);
  const physicalLabels = getTagLabels(entry.physicalSymptomTagIds);
  const formattedDate = new Date(entry.eventDatetime).toLocaleString('it-IT', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const customAnswerEntries = Object.entries(entry.customAnswers || {}).filter(
    ([_, val]) => val !== undefined && val !== ''
  );

  return (
    <div className="space-y-5 pb-28 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-[var(--text-primary)] text-xs font-black hover:bg-[var(--accent-btn)] hover:text-[var(--accent-btn-text)] transition-all active:scale-95 duration-150 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Indietro</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onEdit}
            className="p-2.5 rounded-full bg-[var(--accent-btn)] text-[var(--accent-btn-text)] shadow-sm hover:opacity-90 active:scale-95 transition-all duration-150 cursor-pointer"
            aria-label="Modifica voce"
            title="Modifica voce"
          >
            <Pencil className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-2.5 rounded-full bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:scale-95 transition-all duration-150 cursor-pointer"
            aria-label="Elimina voce"
            title="Elimina voce"
          >
            <Trash2 className="w-4 h-4 stroke-[2.5] text-white" />
          </button>
        </div>
      </div>

      {/* Hero Badge card for Anxiety */}
      <div className="glass-panel rounded-[20px] p-5 border border-[var(--border-solid)] shadow-md space-y-3 bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[var(--text-primary)] text-xs font-black">
            <Calendar className="w-4 h-4 text-[var(--accent-primary)]" />
            <span className="capitalize">{formattedDate}</span>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-black bg-[var(--accent-btn)] text-[var(--accent-btn-text)] shadow-sm">
            Ansia {entry.overallAnxietyLevel} / 100
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 rounded-full"
            style={{ width: `${entry.overallAnxietyLevel}%` }}
          />
        </div>
      </div>

      {/* SEZIONE A Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] px-1">
          ANALISI DELLA SITUAZIONE E DEI PENSIERI
        </h3>

        {/* Situazione */}
        <div className="glass-panel rounded-[20px] p-4 space-y-2.5 border border-[var(--border-solid)] bg-[var(--bg-surface)]">
          <div className="flex items-center space-x-2 text-xs font-black text-[var(--accent-primary)] uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5" />
            <span>Situazione</span>
          </div>
          <p className="text-sm font-bold text-[var(--text-primary)] leading-relaxed break-words whitespace-pre-wrap">
            {entry.situation || <span className="italic font-bold text-[var(--text-muted)]">Non specificata</span>}
          </p>

          {/* Foto allegata se presente */}
          {entry.photo && (
            <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[var(--text-primary)]">
                  <ImageIcon className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  <span>Foto Allegata</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPhotoObscured(!isPhotoObscured)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--accent-btn)] hover:text-[var(--accent-btn-text)] transition-all cursor-pointer"
                  title={isPhotoObscured ? 'Mostra foto' : 'Nascondi/Sfoca foto per privacy'}
                >
                  {isPhotoObscured ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Mostra</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Proteggi Privacy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-[var(--border-solid)] bg-black/5 dark:bg-black/30 flex items-center justify-center min-h-[140px] max-h-[320px]">
                <img
                  src={entry.photo}
                  alt="Foto allegata all'evento"
                  className={`w-full max-h-[320px] object-contain rounded-xl transition-all duration-200 ${
                    isPhotoObscured ? 'filter blur-xl opacity-20 scale-105' : 'filter-none opacity-100'
                  }`}
                />
                {isPhotoObscured && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/40 backdrop-blur-sm text-white">
                    <EyeOff className="w-6 h-6 mb-1 text-white/90" />
                    <span className="text-xs font-bold text-white/90">Foto oscurata per privacy</span>
                    <button
                      type="button"
                      onClick={() => setIsPhotoObscured(false)}
                      className="mt-2 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold backdrop-blur transition-all"
                    >
                      Tocca per visualizzare
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Trigger */}
        <div className="glass-panel rounded-[20px] p-4 space-y-1.5 border border-[var(--border-solid)] bg-[var(--bg-surface)]">
          <div className="flex items-center space-x-2 text-xs font-black text-amber-500 uppercase tracking-wider">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Fattori Scatenanti / Trigger</span>
          </div>
          <p className="text-sm font-bold text-[var(--text-primary)] leading-relaxed break-words whitespace-pre-wrap">
            {entry.triggerFactors || <span className="italic font-bold text-[var(--text-muted)]">Nessun trigger indicato</span>}
          </p>
        </div>

        {/* Emozioni */}
        <div className="glass-panel rounded-[20px] p-4 space-y-2 border border-[var(--border-solid)] bg-[var(--bg-surface)]">
          <span className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider block">
            Emozioni
          </span>
          <div className="flex flex-wrap gap-1.5">
            {emotionLabels.length > 0 ? (
              emotionLabels.map((lbl, idx) => (
                <span
                  key={`emo-${lbl}-${idx}`}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-solid)]"
                >
                  {lbl}
                </span>
              ))
            ) : (
              <span className="text-xs font-bold text-[var(--text-muted)] italic">Nessuna emozione selezionata</span>
            )}
          </div>
        </div>

        {/* Pensiero Negativo + Convinzione */}
        <div className="glass-panel rounded-[20px] p-4 space-y-2 border border-[var(--border-solid)] bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-black text-rose-500 uppercase tracking-wider">
              <Brain className="w-3.5 h-3.5" />
              <span>Pensiero Negativo Automatico</span>
            </div>
            <span className="text-xs font-black text-[var(--text-primary)] bg-[var(--bg-subtle)] px-2.5 py-0.5 rounded-full border border-[var(--border-solid)]">
              Convinzione {entry.thoughtBeliefLevel}%
            </span>
          </div>
          <p className="text-sm font-bold text-[var(--text-primary)] leading-relaxed break-words whitespace-pre-wrap">
            {entry.negativeThought || <span className="italic font-bold text-[var(--text-muted)]">Nessun pensiero specificato</span>}
          </p>
        </div>

        {/* Risposte alle Domande Custom */}
        {customAnswerEntries.length > 0 && (
          <div className="glass-panel rounded-[20px] p-4 space-y-3 border border-[var(--border-solid)] bg-[var(--bg-surface)]">
            <div className="flex items-center space-x-2 text-xs font-black text-indigo-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Riflessioni &amp; Domande Guidate</span>
            </div>

            <div className="space-y-3 pt-1">
              {customAnswerEntries.map(([qId, answer]) => {
                const question = allQuestions.find((q) => q.id === qId);
                const prompt = question?.prompt || 'Domanda Personalizzata';
                const category = question?.category || 'Riflessione';

                return (
                  <div
                    key={qId}
                    className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-black text-[var(--text-primary)] leading-tight">
                        {prompt}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shrink-0">
                        {category}
                      </span>
                    </div>

                    {/* Format response based on type */}
                    <div className="pt-0.5">
                      {typeof answer === 'boolean' ? (
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-black ${
                            answer
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30'
                          }`}
                        >
                          {answer ? <Check className="w-3 h-3 stroke-[3]" /> : <X className="w-3 h-3 stroke-[3]" />}
                          <span>{answer ? 'Sì' : 'No'}</span>
                        </span>
                      ) : typeof answer === 'number' ? (
                        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-xs font-black">
                          <span>Punteggio Valutazione:</span>
                          <span className="text-sm font-black text-white">{answer}</span>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-[var(--text-primary)] leading-relaxed break-words whitespace-pre-wrap">
                          {String(answer)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* SEZIONE B Cards */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)] px-1">
          Monitoraggio Sintomi e Comportamenti
        </h3>

        {/* Sintomi fisici */}
        <div className="glass-panel rounded-[20px] p-4 space-y-2 border border-[var(--border-solid)] bg-[var(--bg-surface)]">
          <div className="flex items-center space-x-2 text-xs font-black text-[var(--accent-primary)] uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            <span>Sintomi Fisici e Sensazioni</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {physicalLabels.length > 0 ? (
              physicalLabels.map((lbl, idx) => (
                <span
                  key={`phys-${lbl}-${idx}`}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-solid)]"
                >
                  {lbl}
                </span>
              ))
            ) : null}
          </div>
          {entry.physicalSymptomsText && (
            <p className="text-xs font-bold text-[var(--text-primary)] pt-1 leading-relaxed break-words whitespace-pre-wrap">
              {entry.physicalSymptomsText}
            </p>
          )}
        </div>

        {/* Pensieri estesi e Attenzione corporea */}
        {(entry.negativeThoughtsExtended || entry.negativeThoughtsIntensity > 0 || entry.bodyFocusedAttentionLevel > 0) && (
          <div className="glass-panel rounded-[20px] p-4 space-y-3 border border-[var(--border-solid)] bg-[var(--bg-surface)]">
            {entry.negativeThoughtsExtended && (
              <div>
                <span className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider block mb-1">
                  Pensieri Negativi (Approfondimento)
                </span>
                <p className="text-xs font-bold text-[var(--text-primary)] leading-relaxed break-words whitespace-pre-wrap">
                  {entry.negativeThoughtsExtended}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)]">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] block">Intensità Pensieri</span>
                <span className="text-sm font-black text-[var(--text-primary)]">{entry.negativeThoughtsIntensity} / 100</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)]">
                <span className="text-[11px] font-bold text-[var(--text-secondary)] block">Attenzione Focalizzata sul Corpo</span>
                <span className="text-sm font-black text-[var(--text-primary)]">{entry.bodyFocusedAttentionLevel} / 100</span>
              </div>
            </div>
          </div>
        )}

        {/* Comportamenti Protettivi / Sicurezza */}
        {(entry.safetyBehaviors || entry.avoidanceBehaviors) && (
          <div className="glass-panel rounded-[20px] p-4 space-y-3 border border-[var(--border-solid)] bg-[var(--bg-surface)]">
            {entry.safetyBehaviors && (
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs font-black text-[var(--accent-primary)] uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Comportamenti Protettivi / Sicurezza</span>
                </div>
                <p className="text-xs font-bold text-[var(--text-primary)] leading-relaxed break-words whitespace-pre-wrap">
                  {entry.safetyBehaviors}
                </p>
              </div>
            )}

            {entry.avoidanceBehaviors && (
              <div className="space-y-1 pt-1 border-t border-[var(--border-subtle)]">
                <div className="flex items-center space-x-2 text-xs font-black text-rose-500 uppercase tracking-wider">
                  <Ban className="w-3.5 h-3.5" />
                  <span>Evitamenti Messia in Atto</span>
                </div>
                <p className="text-xs font-bold text-[var(--text-primary)] leading-relaxed break-words whitespace-pre-wrap">
                  {entry.avoidanceBehaviors}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Ristrutturazione Cognitiva */}
        {(entry.evidenceForThought || entry.evidenceAgainstThought || entry.alternativeThought) && (
          <div className="glass-panel rounded-[20px] p-4 space-y-3 border border-[var(--border-solid)] bg-[var(--bg-surface)]">
            <div className="flex items-center space-x-2 text-xs font-black text-[var(--accent-primary)] uppercase tracking-wider">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Ristrutturazione Cognitiva</span>
            </div>

            {entry.evidenceForThought && (
              <div className="space-y-1">
                <span className="text-[11px] font-black text-[var(--text-secondary)] block">Prove a favore:</span>
                <p className="text-xs font-bold text-[var(--text-primary)] leading-relaxed break-words whitespace-pre-wrap">{entry.evidenceForThought}</p>
              </div>
            )}

            {entry.evidenceAgainstThought && (
              <div className="space-y-1">
                <span className="text-[11px] font-black text-[var(--text-secondary)] block">Prove contrarie:</span>
                <p className="text-xs font-bold text-[var(--text-primary)] leading-relaxed break-words whitespace-pre-wrap">{entry.evidenceAgainstThought}</p>
              </div>
            )}

            {entry.alternativeThought && (
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] space-y-1">
                <span className="text-[11px] font-black text-[var(--accent-primary)] block uppercase">Pensiero Alternativo:</span>
                <p className="text-xs font-black text-[var(--text-primary)] leading-relaxed break-words whitespace-pre-wrap">{entry.alternativeThought}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
