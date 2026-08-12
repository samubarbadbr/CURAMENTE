import React from 'react';
import { CbtEntry, Tag, PeriodFilter } from '../types';
import { Calendar, Sparkles, ChevronRight, Activity } from 'lucide-react';
import { CustomDropdown } from '../components/CustomDropdown';

interface TimelineViewProps {
  entries: CbtEntry[];
  allTags: Tag[];
  periodFilter: PeriodFilter;
  onFilterChange: (period: PeriodFilter) => void;
  onSelectEntry: (entryId: string) => void;
  onNewEntry: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  entries,
  allTags,
  periodFilter,
  onFilterChange,
  onSelectEntry,
  onNewEntry,
}) => {
  const getTagLabels = (tagIds: string[]) => {
    if (!tagIds || !tagIds.length) return [];
    return tagIds
      .map((id) => allTags.find((t) => t.id === id))
      .filter(Boolean)
      .map((t) => t!.label);
  };

  const formatDateHeader = (dateIso: string) => {
    const date = new Date(dateIso);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    if (isSameDay(date, today)) return 'Oggi';
    if (isSameDay(date, yesterday)) return 'Ieri';

    return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const formatTime = (dateIso: string) => {
    return new Date(dateIso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const periodOptions: { value: PeriodFilter; label: string }[] = [
    { value: '7', label: 'Ultimi 7 giorni' },
    { value: '14', label: 'Ultimi 14 giorni' },
    { value: '30', label: 'Ultimi 30 giorni' },
    { value: '90', label: 'Ultimi 90 giorni' },
    { value: 'all', label: 'Tutto il periodo' },
  ];

  // Group entries by day header
  const groups: { dayLabel: string; items: CbtEntry[] }[] = [];
  entries.forEach((entry) => {
    const label = formatDateHeader(entry.eventDatetime);
    let group = groups.find((g) => g.dayLabel === label);
    if (!group) {
      group = { dayLabel: label, items: [] };
      groups.push(group);
    }
    group.items.push(entry);
  });

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Intro Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        <div className="space-y-0.5">
          <h2 className="text-2xl font-black text-[#15251C] dark:text-[#EEF3EF]">Timeline</h2>
          <p className="text-xs font-bold text-[#2C3E35] dark:text-[#D5E0D8]">
            Le tue registrazioni CBT, dalla più recente
          </p>
        </div>

        {/* Filter dropdown */}
        <div className="w-full sm:w-auto shrink-0">
          <CustomDropdown
            value={periodFilter}
            onChange={onFilterChange}
            options={periodOptions}
          />
        </div>
      </div>

      {/* Empty State */}
      {entries.length === 0 ? (
        <div className="glass-panel rounded-[20px] p-6 sm:p-8 text-center space-y-4 my-6 border border-dashed border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] shadow-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#5B67CA]/15 text-[#5B67CA] dark:text-[#9CA6DC] border border-[#5B67CA]/30">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-[#15251C] dark:text-[#EEF3EF]">
              Nessuna voce trovata
            </h3>
            <p className="text-xs font-bold text-[#2C3E35] dark:text-[#D5E0D8] max-w-xs mx-auto leading-relaxed">
              Inizia a monitorare i tuoi pensieri e sintomi CBT premendo il pulsante "+".
            </p>
          </div>
          <button
            type="button"
            onClick={onNewEntry}
            className="btn-primary inline-flex items-center space-x-2 px-6 py-3 min-h-[48px] rounded-full bg-[#5B67CA] hover:bg-[#4A55B8] text-white text-xs font-bold shadow-md active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-white stroke-[2.5]" />
            <span className="text-white font-bold">Registra Prima Voce</span>
          </button>
        </div>
      ) : (
        /* Timeline List Grouped by Day */
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.dayLabel} className="space-y-3">
              <div className="flex items-center space-x-2 px-1">
                <span className="text-xs font-black uppercase tracking-wider text-[#5B67CA] dark:text-[#9CA6DC]">
                  {group.dayLabel}
                </span>
                <div className="flex-1 h-px bg-[#C8D5CB] dark:bg-[#2B3A31]" />
              </div>

              <div className="space-y-3">
                {group.items.map((entry) => {
                  const emotionLabels = getTagLabels(entry.emotionTagIds);
                  const anxiety = entry.overallAnxietyLevel ?? 0;

                  // Dynamic badge styling based on anxiety
                  let anxietyBadgeStyle = 'bg-[#2D5C3E]/15 text-[#15251C] dark:text-[#EEF3EF] border-[#2D5C3E]/30';
                  let barColor = 'bg-[#2D5C3E]';
                  if (anxiety > 35 && anxiety <= 68) {
                    anxietyBadgeStyle = 'bg-[#5B67CA]/15 text-[#15251C] dark:text-[#EEF3EF] border-[#5B67CA]/30';
                    barColor = 'bg-[#5B67CA]';
                  } else if (anxiety > 68) {
                    anxietyBadgeStyle = 'bg-rose-500/15 text-[#15251C] dark:text-[#EEF3EF] border-rose-500/30';
                    barColor = 'bg-rose-500';
                  }

                  return (
                    <div
                      key={entry.id}
                      onClick={() => onSelectEntry(entry.id)}
                      className="glass-panel rounded-[20px] p-4 sm:p-5 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 active:scale-98 cursor-pointer border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] group space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[#15251C] dark:text-[#EEF3EF]">
                          {formatTime(entry.eventDatetime)}
                        </span>

                        <div className={`inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-black border ${anxietyBadgeStyle}`}>
                          <Activity className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                          <span>Ansia {anxiety}</span>
                          <div className="w-10 h-1.5 rounded-full bg-[#EBF0EC] dark:bg-[#2B3A31] overflow-hidden ml-1">
                            <div
                              className={`h-full rounded-full ${barColor}`}
                              style={{ width: `${anxiety}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <p className="text-sm font-black text-[#15251C] dark:text-[#EEF3EF] line-clamp-2 leading-relaxed">
                        {entry.situation || <span className="italic font-bold text-[#2C3E35] dark:text-[#A7B6AC]">Nessuna descrizione della situazione</span>}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex flex-wrap gap-1.5">
                          {emotionLabels.length > 0 ? (
                            emotionLabels.map((lbl) => (
                              <span
                                key={lbl}
                                className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#EBF0EC] dark:bg-[#212E27] text-[#15251C] dark:text-[#EEF3EF] border border-[#C8D5CB] dark:border-[#2B3A31]"
                              >
                                {lbl}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs font-bold text-[#2C3E35] dark:text-[#A7B6AC] italic">Nessuna emozione</span>
                          )}
                        </div>

                        <ChevronRight className="w-4 h-4 text-[#15251C] dark:text-[#EEF3EF] group-hover:text-[#5B67CA] transition-colors shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
