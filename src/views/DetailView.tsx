import React from 'react';
import { CbtEntry, Tag } from '../types';
import { ArrowLeft, Pencil, Trash2, Calendar, MapPin, Brain, Activity, ShieldCheck, HelpCircle, Ban, AlertCircle } from 'lucide-react';

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

  return (
    <div className="space-y-5 pb-28 animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#E8EFEA] dark:bg-[#2B3A31] border border-[#C8D4CB] dark:border-[#2B3A31] text-[#14241B] dark:text-[#EEF3EF] text-xs font-black hover:bg-[#5B67CA] hover:text-white transition-all active:scale-95 duration-150 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>Indietro</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onEdit}
            className="p-2.5 rounded-full bg-[#5B67CA] text-white shadow-sm hover:bg-[#4A55B8] active:scale-95 transition-all duration-150 cursor-pointer"
            aria-label="Modifica voce"
          >
            <Pencil className="w-4 h-4 stroke-[2.5] text-white" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-2.5 rounded-full bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:scale-95 transition-all duration-150 cursor-pointer"
            aria-label="Elimina voce"
          >
            <Trash2 className="w-4 h-4 stroke-[2.5] text-white" />
          </button>
        </div>
      </div>

      {/* Hero Badge card for Anxiety */}
      <div className="glass-panel-solid rounded-[20px] p-5 border border-[#C8D4CB] dark:border-[#2B3A31] shadow-md space-y-3 bg-white dark:bg-[#1B2520]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-[#14241B] dark:text-[#EEF3EF] text-xs font-black">
            <Calendar className="w-4 h-4 text-[#5B67CA] dark:text-[#9CA6DC]" />
            <span className="capitalize">{formattedDate}</span>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-black bg-[#5B67CA] text-white shadow-sm">
            Ansia {entry.overallAnxietyLevel} / 100
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2.5 rounded-full bg-[#E8EFEA] dark:bg-[#2B3A31] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#2D5C3E] via-[#5B67CA] to-rose-500 rounded-full"
            style={{ width: `${entry.overallAnxietyLevel}%` }}
          />
        </div>
      </div>

      {/* SEZIONE A Cards */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#14241B] dark:text-[#EEF3EF] px-1">
          Analisi della Situazione & Pensieri
        </h3>

        {/* Situazione */}
        <div className="glass-panel rounded-[20px] p-4 space-y-1.5 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
          <div className="flex items-center space-x-2 text-xs font-black text-[#14241B] dark:text-[#EEF3EF] uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5 text-[#5B67CA] dark:text-[#9CA6DC]" />
            <span>Situazione</span>
          </div>
          <p className="text-sm font-black text-[#14241B] dark:text-[#EEF3EF] leading-relaxed">
            {entry.situation || <span className="italic font-bold text-[#14241B] dark:text-[#A7B6AC]">Non specificata</span>}
          </p>
        </div>

        {/* Trigger */}
        <div className="glass-panel rounded-[20px] p-4 space-y-1.5 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
          <div className="flex items-center space-x-2 text-xs font-black text-[#14241B] dark:text-[#EEF3EF] uppercase tracking-wider">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Fattori Scatenanti / Trigger</span>
          </div>
          <p className="text-sm font-black text-[#14241B] dark:text-[#EEF3EF] leading-relaxed">
            {entry.triggerFactors || <span className="italic font-bold text-[#14241B] dark:text-[#A7B6AC]">Nessun trigger indicato</span>}
          </p>
        </div>

        {/* Emozioni */}
        <div className="glass-panel rounded-[20px] p-4 space-y-2 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
          <span className="text-xs font-black text-[#14241B] dark:text-[#EEF3EF] uppercase tracking-wider block">
            Emozioni
          </span>
          <div className="flex flex-wrap gap-1.5">
            {emotionLabels.length > 0 ? (
              emotionLabels.map((lbl) => (
                <span
                  key={lbl}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-[#E8EFEA] dark:bg-[#212E27] text-[#14241B] dark:text-[#EEF3EF] border border-[#C8D4CB] dark:border-[#2B3A31]"
                >
                  {lbl}
                </span>
              ))
            ) : (
              <span className="text-xs font-bold text-[#14241B] dark:text-[#A7B6AC] italic">Nessuna emozione selezionata</span>
            )}
          </div>
        </div>

        {/* Pensiero Negativo + Convinzione */}
        <div className="glass-panel rounded-[20px] p-4 space-y-2 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-black text-[#14241B] dark:text-[#EEF3EF] uppercase tracking-wider">
              <Brain className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Pensiero Negativo Automatico</span>
            </div>
            <span className="text-xs font-black text-[#14241B] dark:text-[#EEF3EF] bg-[#5B67CA]/20 px-2.5 py-0.5 rounded-full border border-[#5B67CA]/30">
              Convinzione {entry.thoughtBeliefLevel}%
            </span>
          </div>
          <p className="text-sm font-black text-[#14241B] dark:text-[#EEF3EF] leading-relaxed">
            {entry.negativeThought || <span className="italic font-bold text-[#14241B] dark:text-[#A7B6AC]">Nessun pensiero specificato</span>}
          </p>
        </div>
      </div>

      {/* SEZIONE B Cards */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#14241B] dark:text-[#EEF3EF] px-1">
          Monitoraggio Sintomi & Comportamenti
        </h3>

        {/* Sintomi fisici */}
        <div className="glass-panel rounded-[20px] p-4 space-y-2 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
          <div className="flex items-center space-x-2 text-xs font-black text-[#14241B] dark:text-[#EEF3EF] uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5 text-[#2D5C3E] dark:text-[#6A9C78]" />
            <span>Sintomi Fisici & Sensazioni</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {physicalLabels.length > 0 ? (
              physicalLabels.map((lbl) => (
                <span
                  key={lbl}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-[#2D5C3E]/15 text-[#14241B] dark:text-[#EEF3EF] border border-[#2D5C3E]/30"
                >
                  {lbl}
                </span>
              ))
            ) : null}
          </div>
          {entry.physicalSymptomsText && (
            <p className="text-xs font-bold text-[#14241B] dark:text-[#EEF3EF] pt-1 leading-relaxed">
              {entry.physicalSymptomsText}
            </p>
          )}
        </div>

        {/* Pensieri estesi e Attenzione corporea */}
        {(entry.negativeThoughtsExtended || entry.negativeThoughtsIntensity > 0 || entry.bodyFocusedAttentionLevel > 0) && (
          <div className="glass-panel rounded-[20px] p-4 space-y-3 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
            {entry.negativeThoughtsExtended && (
              <div>
                <span className="text-xs font-black text-[#14241B] dark:text-[#EEF3EF] uppercase tracking-wider block mb-1">
                  Pensieri Negativi (Approfondimento)
                </span>
                <p className="text-xs font-bold text-[#14241B] dark:text-[#EEF3EF] leading-relaxed">
                  {entry.negativeThoughtsExtended}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#C8D4CB] dark:border-[#2B3A31]">
              <div className="text-center p-2 rounded-xl bg-[#E8EFEA] dark:bg-[#121915]">
                <span className="block text-[10px] text-[#14241B] dark:text-[#EEF3EF] uppercase font-black">Intensità Pensieri</span>
                <span className="text-base font-black text-[#5B67CA] dark:text-[#9CA6DC]">{entry.negativeThoughtsIntensity}%</span>
              </div>
              <div className="text-center p-2 rounded-xl bg-[#E8EFEA] dark:bg-[#121915]">
                <span className="block text-[10px] text-[#14241B] dark:text-[#EEF3EF] uppercase font-black">Attenzione Corpo</span>
                <span className="text-base font-black text-[#2D5C3E] dark:text-[#6A9C78]">{entry.bodyFocusedAttentionLevel}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Comportamenti (Controllo, Rassicurazioni, Evitamenti) */}
        <div className="grid grid-cols-1 gap-3">
          {/* Controllo Sintomi */}
          <div className="glass-panel rounded-[20px] p-4 space-y-1.5 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-black text-[#14241B] dark:text-[#EEF3EF] uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5B67CA] dark:text-[#9CA6DC]" />
                <span>Controllo Sintomi</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#5B67CA]/20 text-[#14241B] dark:text-[#EEF3EF] border border-[#5B67CA]/30">
                {entry.symptomControlCount} check
              </span>
            </div>
            <p className="text-xs font-bold text-[#14241B] dark:text-[#EEF3EF]">
              {entry.symptomControlDescription || <span className="italic font-bold text-[#14241B] dark:text-[#A7B6AC]">Nessuna azione indicata</span>}
            </p>
          </div>

          {/* Rassicurazioni */}
          <div className="glass-panel rounded-[20px] p-4 space-y-1.5 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-black text-[#14241B] dark:text-[#EEF3EF] uppercase tracking-wider">
                <HelpCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Ricerca Rassicurazioni</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-[#14241B] dark:text-[#EEF3EF] border border-amber-500/30">
                {entry.reassuranceSeekingCount} volte
              </span>
            </div>
            <p className="text-xs font-bold text-[#14241B] dark:text-[#EEF3EF]">
              {entry.reassuranceSeekingType || <span className="italic font-bold text-[#14241B] dark:text-[#A7B6AC]">Nessuna rassicurazione indicata</span>}
            </p>
          </div>

          {/* Evitamenti */}
          <div className="glass-panel rounded-[20px] p-4 space-y-1.5 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-black text-[#14241B] dark:text-[#EEF3EF] uppercase tracking-wider">
                <Ban className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Evitamenti</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/20 text-[#14241B] dark:text-[#EEF3EF] border border-rose-500/30">
                {entry.avoidanceCount} volte
              </span>
            </div>
            <p className="text-xs font-bold text-[#14241B] dark:text-[#EEF3EF]">
              {entry.avoidanceType || <span className="italic font-bold text-[#14241B] dark:text-[#A7B6AC]">Nessun evitamento indicato</span>}
            </p>
          </div>
        </div>

        {/* Note */}
        {entry.notes && (
          <div className="glass-panel rounded-[20px] p-4 space-y-1 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
            <span className="text-xs font-black text-[#14241B] dark:text-[#EEF3EF] uppercase tracking-wider block">
              Note Aggiuntive
            </span>
            <p className="text-xs font-bold text-[#14241B] dark:text-[#EEF3EF] leading-relaxed">
              {entry.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
