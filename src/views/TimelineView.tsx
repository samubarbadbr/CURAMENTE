import React, { useState, useMemo } from 'react';
import { CbtEntry, Tag, PeriodFilter } from '../types';
import {
  Calendar,
  Sparkles,
  ChevronRight,
  Activity,
  Pencil,
  Camera,
  EyeOff,
  Eye,
  FileDown,
  Search,
  X,
  Tag as TagIcon,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
  Mic,
} from 'lucide-react';
import { CustomDropdown } from '../components/CustomDropdown';

interface TimelineViewProps {
  entries: CbtEntry[];
  allTags: Tag[];
  periodFilter: PeriodFilter;
  onFilterChange: (period: PeriodFilter) => void;
  onSelectEntry: (entryId: string) => void;
  onEditEntry?: (entryId: string) => void;
  onExportEntry?: (entry: CbtEntry) => void;
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
  onExportEntry,
  onNewEntry,
  isPrivacyModeEnabled = false,
  onTogglePrivacyMode,
}) => {
  // Set of individual entry IDs revealed manually on touch/click
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Search and Tag filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmotionIds, setSelectedEmotionIds] = useState<string[]>([]);
  const [selectedSymptomIds, setSelectedSymptomIds] = useState<string[]>([]);
  const [combinationMode, setCombinationMode] = useState<'any' | 'all'>('any');
  const [showSymptomsSection, setShowSymptomsSection] = useState(false);

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

  // Available Emotion Tags & Symptom Tags
  const emotionTags = useMemo(() => {
    const list = allTags.filter((t) => t.category === 'emotion');
    if (list.length > 0) return list;
    return allTags;
  }, [allTags]);

  const symptomTags = useMemo(() => {
    return allTags.filter((t) => t.category === 'physical_symptom');
  }, [allTags]);

  // Counts of occurrences in currently loaded entries for each tag
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach((e) => {
      e.emotionTagIds?.forEach((id) => {
        counts[id] = (counts[id] || 0) + 1;
      });
      e.physicalSymptomTagIds?.forEach((id) => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    return counts;
  }, [entries]);

  const toggleEmotionTag = (tagId: string) => {
    setSelectedEmotionIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const toggleSymptomTag = (tagId: string) => {
    setSelectedSymptomIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedEmotionIds([]);
    setSelectedSymptomIds([]);
    setCombinationMode('any');
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedEmotionIds.length > 0 ||
    selectedSymptomIds.length > 0;

  // Filter entries based on search query, emotion combinations, and symptom tags
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const queryWords = query ? query.split(/\s+/).filter(Boolean) : [];

    return entries.filter((entry) => {
      // 1. Emotion combination filter
      if (selectedEmotionIds.length > 0) {
        const entryEmotions = entry.emotionTagIds || [];
        if (combinationMode === 'all') {
          // Must include all selected emotions (AND)
          const hasAll = selectedEmotionIds.every((id) => entryEmotions.includes(id));
          if (!hasAll) return false;
        } else {
          // Must include at least one selected emotion (OR)
          const hasAny = selectedEmotionIds.some((id) => entryEmotions.includes(id));
          if (!hasAny) return false;
        }
      }

      // 2. Symptom tags filter
      if (selectedSymptomIds.length > 0) {
        const entrySymptoms = entry.physicalSymptomTagIds || [];
        const hasAnySymptom = selectedSymptomIds.some((id) => entrySymptoms.includes(id));
        if (!hasAnySymptom) return false;
      }

      // 3. Keyword Search filter across multiple text fields and tag names
      if (queryWords.length > 0) {
        const emotionLabels = getTagLabels(entry.emotionTagIds || []);
        const symptomLabels = getTagLabels(entry.physicalSymptomTagIds || []);
        const customAnswersText = entry.customAnswers
          ? Object.values(entry.customAnswers).join(' ')
          : '';

        const searchableContent = [
          entry.situation || '',
          entry.negativeThought || '',
          entry.negativeThoughtsExtended || '',
          entry.triggerFactors || '',
          entry.notes || '',
          entry.physicalSymptomsText || '',
          entry.symptomControlDescription || '',
          entry.reassuranceSeekingType || '',
          entry.avoidanceType || '',
          entry.safetyBehaviors || '',
          entry.avoidanceBehaviors || '',
          entry.alternativeThought || '',
          entry.evidenceForThought || '',
          entry.evidenceAgainstThought || '',
          ...emotionLabels,
          ...symptomLabels,
          customAnswersText,
        ]
          .join(' ')
          .toLowerCase();

        const matchesAllWords = queryWords.every((word) => searchableContent.includes(word));
        if (!matchesAllWords) return false;
      }

      return true;
    });
  }, [entries, searchQuery, selectedEmotionIds, selectedSymptomIds, combinationMode, allTags]);

  // Group filtered entries by day header
  const groups: { dayLabel: string; items: CbtEntry[] }[] = [];
  filteredEntries.forEach((entry) => {
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

      {/* Search & Tag Filter Bar (visible when entries exist) */}
      {entries.length > 0 && (
        <div className="glass-panel rounded-[20px] p-4 sm:p-5 border border-[var(--border-solid)] bg-[var(--bg-surface)] space-y-3.5 shadow-sm">
          {/* Search Input */}
          <div className="relative flex items-center">
            <div className="absolute left-3.5 pointer-events-none text-[var(--text-muted)] flex items-center">
              <Search className="w-4 h-4 stroke-[2.2]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca per parole chiave (situazione, pensieri, note)..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-color)]/30 focus:border-[var(--accent-primary)] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all cursor-pointer"
                title="Cancella testo"
                aria-label="Cancella testo ricerca"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}
          </div>

          {/* Emotion Tag Filters */}
          <div className="space-y-2 pt-1 border-t border-[var(--border-subtle)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-1.5 text-xs font-black text-[var(--text-primary)]">
                <TagIcon className="w-3.5 h-3.5 text-[var(--text-secondary)] stroke-[2.2]" />
                <span>Filtra per Emozioni:</span>
                {selectedEmotionIds.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-[var(--accent-primary)] text-[var(--accent-btn-text)]">
                    {selectedEmotionIds.length} selezionat{selectedEmotionIds.length === 1 ? 'a' : 'e'}
                  </span>
                )}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center space-x-1 text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 stroke-[2.2]" />
                  <span>Azzera tutti i filtri</span>
                </button>
              )}
            </div>

            {/* Emotion Chips */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {emotionTags.map((tag) => {
                const isSelected = selectedEmotionIds.includes(tag.id);
                const count = tagCounts[tag.id] ?? 0;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleEmotionTag(tag.id)}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[var(--accent-primary)] text-[var(--accent-btn-text)] border-[var(--accent-primary)] shadow-xs scale-102'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border-[var(--border-solid)]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    <span>{tag.label}</span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                          isSelected
                            ? 'bg-black/20 text-current'
                            : 'bg-[var(--border-solid)] text-[var(--text-muted)]'
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Combination Mode Toggle (when 2+ emotions selected) */}
            {selectedEmotionIds.length > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs border-t border-[var(--border-subtle)]">
                <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                  Combinazione emozioni:
                </span>
                <div className="inline-flex rounded-lg bg-[var(--bg-subtle)] p-0.5 border border-[var(--border-solid)]">
                  <button
                    type="button"
                    onClick={() => setCombinationMode('any')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      combinationMode === 'any'
                        ? 'bg-[var(--accent-primary)] text-[var(--accent-btn-text)] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Almeno una (OR)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCombinationMode('all')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      combinationMode === 'all'
                        ? 'bg-[var(--accent-primary)] text-[var(--accent-btn-text)] shadow-xs'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Tutte insieme (AND)
                  </button>
                </div>
              </div>
            )}

            {/* Optional Physical Symptoms Accordion */}
            {symptomTags.length > 0 && (
              <div className="pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowSymptomsSection((prev) => !prev)}
                  className="inline-flex items-center space-x-1 text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {showSymptomsSection ? (
                    <ChevronUp className="w-3 h-3 stroke-[2.2]" />
                  ) : (
                    <ChevronDown className="w-3 h-3 stroke-[2.2]" />
                  )}
                  <span>
                    {showSymptomsSection ? 'Nascondi sintomi fisici' : 'Filtra anche per sintomi fisici'}
                    {selectedSymptomIds.length > 0 && ` (${selectedSymptomIds.length} attivi)`}
                  </span>
                </button>

                {showSymptomsSection && (
                  <div className="flex flex-wrap gap-1.5 pt-2 animate-fade-in">
                    {symptomTags.map((tag) => {
                      const isSelected = selectedSymptomIds.includes(tag.id);
                      const count = tagCounts[tag.id] ?? 0;
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleSymptomTag(tag.id)}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[var(--accent-primary)] text-[var(--accent-btn-text)] border-[var(--accent-primary)] shadow-xs scale-102'
                              : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border-[var(--border-solid)]'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          <span>{tag.label}</span>
                          {count > 0 && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                                isSelected
                                  ? 'bg-black/20 text-current'
                                  : 'bg-[var(--border-solid)] text-[var(--text-muted)]'
                              }`}
                            >
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Active Filter Counter */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-medium">
              <span>
                Mostrando <strong className="text-[var(--text-primary)] font-black">{filteredEntries.length}</strong> su <strong className="text-[var(--text-primary)] font-black">{entries.length}</strong> voci registrate
              </span>
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-bold text-[var(--text-primary)] underline hover:opacity-80 cursor-pointer"
              >
                Rimuovi tutti i filtri
              </button>
            </div>
          )}
        </div>
      )}

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
      ) : filteredEntries.length === 0 ? (
        <div className="glass-panel rounded-[20px] p-6 sm:p-8 text-center space-y-4 my-6 border border-dashed border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--badge-border)]">
            <Search className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-black text-[var(--text-primary)]">
              Nessun risultato con i filtri correnti
            </h3>
            <p className="text-xs font-bold text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
              Nessuna voce di diario corrisponde alle parole chiave o alla combinazione di emozioni selezionate.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearFilters}
            className="btn-primary inline-flex items-center space-x-2 px-5 py-2.5 min-h-[42px] rounded-full shadow-md active:scale-95 transition-all duration-150 cursor-pointer mx-auto"
          >
            <RotateCcw className="w-4 h-4 stroke-[2.5]" />
            <span className="font-bold">Azzera Filtri di Ricerca</span>
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
                          {entry.audioNote && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30" title="Audio-nota vocale allegata">
                              <Mic className="w-3 h-3 stroke-[2.5]" />
                              <span>Audio</span>
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

                          {onExportEntry && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onExportEntry(entry);
                              }}
                              className="p-1.5 px-2 rounded-lg bg-[var(--bg-subtle)] hover:bg-[#5B67CA] text-[var(--text-secondary)] hover:text-white transition-all duration-150 cursor-pointer flex items-center space-x-1 border border-transparent hover:border-[#5B67CA]"
                              title="Esporta PDF dedicato per questa registrazione"
                              aria-label="Esporta PDF"
                            >
                              <FileDown className="w-3.5 h-3.5 stroke-[2.2]" />
                              <span className="text-[11px] font-bold">PDF</span>
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
                            emotionLabels.map((lbl, idx) => {
                              const isTagSelected = selectedEmotionIds.some((id) => {
                                const found = allTags.find((t) => t.id === id);
                                return found && found.label.toLowerCase() === lbl.toLowerCase();
                              });
                              return (
                                <span
                                  key={`t-lbl-${lbl}-${idx}`}
                                  className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
                                    isTagSelected
                                      ? 'bg-[var(--accent-primary)] text-[var(--accent-btn-text)] border-[var(--accent-primary)] font-black shadow-xs'
                                      : 'bg-[var(--bg-subtle)] text-[var(--text-primary)] border-[var(--border-solid)]'
                                  }`}
                                >
                                  {lbl}
                                </span>
                              );
                            })
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
