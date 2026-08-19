import React, { useState } from 'react';
import { CbtEntry, Tag, PeriodFilter } from '../types';
import { Calendar, Sparkles, ChevronRight, Activity, Pencil, Camera, EyeOff, Eye } from 'lucide-react';
import { CustomDropdown } from '../components/CustomDropdown';

interface TimelineViewProps {
  entries: CbtEntry[];
  allTags: Tag[];
  periodFilter: PeriodFilter;
  onFilterChange: (period: PeriodFilter) => void;
  onSelectEntry: (entryId: string) => void;
  onEditEntry?: (entryId: string) => void;
  onNewEntry: () => void;
  isPrivacyModeEnabled?: boolean;
  onTogglePrivacyMode?: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  entries,
  allTags,
  periodFilter,
  onFilterChange,
  onSelectEntry,
  onEditEntry,
  onNewEntry,
  isPrivacyModeEnabled = false,
  onTogglePrivacyMode,
}) => {
  // Set of individual entry IDs revealed manually on touch/click
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  const toggleRevealEntry = (entryId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

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
      {/* Intro Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-black text-[var(--text-primary)]">Timeline</h2>
            {isPrivacyModeEnabled && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 animate-pulse">
                <EyeOff className="w-3 h-3 stroke-[2.5]" />
                <span>Privacy Attiva</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Controls (Privacy Toggle + Filter dropdown) */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onTogglePrivacyMode && (
            <button
              type="button"
              onClick={onTogglePrivacyMode}
              className={`inline-flex items-center space-x-1.5 px-3 py-2 min-h-[42px] rounded-xl text-xs font-bold transition-all duration-150 border cursor-pointer shrink-0 ${
                isPrivacyModeEnabled
                  ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--accent-primary)]/50 shadow-sm'
                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-solid)] hover:opacity-80'
              }`}
              title={
                isPrivacyModeEnabled
                  ? 'Modalità Privacy attiva: i dettagli personali sono sfocati. Clicca per mostrare'
                  : 'Attiva Modalità Privacy (Sguardo Veloce) per sfocare i testi personali in pubblico'
              }
            >
              {isPrivacyModeEnabled ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-[var(--accent-primary)] stroke-[2.5]" />
                  <span>Privacy On</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <span>Privacy</span>
                </>
              )}
            </button>
          )}

          <div className="flex-1 sm:w-auto sm:flex-initial shrink-0">
            <CustomDropdown
              value={periodFilter}
              onChange={onFilterChange}
              options={periodOptions}
            />
          </div>
        </div>
      </div>

      {/* Empty State */}
      {entries.length === 0 ? (
        <div className="glass-panel rounded-[20px] p-6 sm:p-8 text-center space-y-4 my-6 border border-dashed border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--badge-border)]">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-[var(--text-primary)]">
              Nessuna voce trovata
            </h3>
            <p className="text-xs font-bold text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
              Inizia a monitorare i tuoi pensieri e il tuo stato emotivo premendo il pulsante "+".
            </p>
          </div>
          <button
            type="button"
            onClick={onNewEntry}
            className="btn-primary inline-flex items-center space-x-2 px-6 py-3 min-h-[48px] rounded-full shadow-md active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 stroke-[2.5]" />
            <span className="font-bold">Registra Prima Voce</span>
          </button>
        </div>
      ) : (
        /* Timeline List Grouped by Day */
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.dayLabel} className="space-y-3">
              <div className="flex items-center space-x-2 px-1">
                <span className="text-xs font-black uppercase tracking-wider text-[var(--accent-primary)]">
                  {group.dayLabel}
                </span>
                <div className="flex-1 h-px bg-[var(--border-solid)]" />
              </div>

              <div className="space-y-3">
                {group.items.map((entry) => {
                  const emotionLabels = getTagLabels(entry.emotionTagIds);
                  const anxiety = entry.overallAnxietyLevel ?? 0;
                  const isRevealed = revealedIds.has(entry.id);
                  const shouldBlur = isPrivacyModeEnabled && !isRevealed;

                  // Dynamic badge styling based on anxiety
                  let anxietyBadgeStyle = 'bg-emerald-500/15 text-[var(--text-primary)] border-emerald-500/30';
                  let barColor = 'bg-emerald-500';
                  if (anxiety > 35 && anxiety <= 68) {
                    anxietyBadgeStyle = 'bg-amber-500/15 text-[var(--text-primary)] border-amber-500/30';
                    barColor = 'bg-amber-500';
                  } else if (anxiety > 68) {
                    anxietyBadgeStyle = 'bg-rose-500/15 text-[var(--text-primary)] border-rose-500/30';
                    barColor = 'bg-rose-500';
                  }

                  return (
                    <div
                      key={entry.id}
                      onClick={() => onSelectEntry(entry.id)}
                      className={`privacy-card glass-panel rounded-[20px] p-4 sm:p-5 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5 active:scale-98 cursor-pointer border border-[var(--border-solid)] bg-[var(--bg-surface)] group space-y-3 ${
                        isRevealed ? 'privacy-revealed' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-black text-[var(--text-primary)]">
                            {formatTime(entry.eventDatetime)}
                          </span>
                          {entry.photo && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--badge-border)]" title="Foto allegata">
                              <Camera className="w-3 h-3 stroke-[2.5]" />
                              <span>Foto</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {/* Quick single-card reveal/conceal toggle in Privacy Mode */}
                          {isPrivacyModeEnabled && (
                            <button
                              type="button"
                              onClick={(e) => toggleRevealEntry(entry.id, e)}
                              className="p-1.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--accent-btn)] text-[var(--text-secondary)] hover:text-[var(--accent-btn-text)] transition-all duration-150 cursor-pointer"
                              title={isRevealed ? 'Nascondi dettagli' : 'Rivelazione rapida testo'}
                              aria-label="Alterna visibilità scheda"
                            >
                              {isRevealed ? (
                                <Eye className="w-3.5 h-3.5 stroke-[2.5]" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 text-[var(--accent-primary)] stroke-[2.5]" />
                              )}
                            </button>
                          )}

                          {onEditEntry && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditEntry(entry.id);
                              }}
                              className="p-1.5 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--accent-btn)] text-[var(--text-primary)] hover:text-[var(--accent-btn-text)] transition-all duration-150 cursor-pointer"
                              title="Modifica scheda"
                              aria-label="Modifica scheda"
                            >
                              <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          )}

                          <div className={`inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-black border ${anxietyBadgeStyle}`}>
                            <Activity className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                            <span>Ansia {anxiety}</span>
                            <div className="w-10 h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden ml-1">
                              <div
                                className={`h-full rounded-full ${barColor}`}
                                style={{ width: `${anxiety}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Personal sensitive text: purely visual CSS blur when privacy is active */}
                      <p
                        className={`text-sm font-black text-[var(--text-primary)] line-clamp-2 leading-relaxed ${
                          shouldBlur ? 'privacy-blurred' : ''
                        }`}
                        onClick={(e) => {
                          if (isPrivacyModeEnabled && !isRevealed) {
                            e.stopPropagation();
                            toggleRevealEntry(entry.id);
                          }
                        }}
                      >
                        {entry.situation || <span className="italic font-bold text-[var(--text-muted)]">Nessuna descrizione della situazione</span>}
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex flex-wrap gap-1.5">
                          {emotionLabels.length > 0 ? (
                            emotionLabels.map((lbl, idx) => (
                              <span
                                key={`t-lbl-${lbl}-${idx}`}
                                className="px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-solid)]"
                              >
                                {lbl}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs font-bold text-[var(--text-muted)] italic">Nessuna emozione</span>
                          )}
                        </div>

                        <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] group-hover:text-[var(--accent-primary)] transition-colors shrink-0" />
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
