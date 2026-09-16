import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { CbtEntry, Tag, PeriodFilter, DiaryNote, DiaryNoteCategory } from '../types';
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
  BookOpen,
  ClipboardList,
  Layers,
  Plus,
  Pin,
  Cloud,
} from 'lucide-react';
import { CustomDropdown } from '../components/CustomDropdown';
import { DiaryNoteCard } from '../components/DiaryNoteCard';
import { DiaryNoteModal } from '../components/DiaryNoteModal';
import { ConfirmModal } from '../components/ConfirmModal';

interface TimelineViewProps {
  entries: CbtEntry[];
  allTags: Tag[];
  notes?: DiaryNote[];
  onSaveNote?: (note: DiaryNote) => Promise<void> | void;
  onDeleteNote?: (noteId: string) => Promise<void> | void;
  onTogglePinNote?: (noteId: string) => Promise<void> | void;
  onNewNote?: () => void;
  periodFilter: PeriodFilter;
  onFilterChange: (period: PeriodFilter) => void;
  onSelectEntry: (entryId: string) => void;
  onEditEntry?: (entryId: string) => void;
  onExportEntry?: (entry: CbtEntry) => void;
  onNewEntry: () => void;
  isPrivacyModeEnabled?: boolean;
  onTogglePrivacyMode?: () => void;
  isSyncConfigured?: boolean;
}

type SubViewType = 'entries' | 'notes' | 'all';

export const TimelineView: React.FC<TimelineViewProps> = ({
  entries,
  allTags,
  notes = [],
  onSaveNote,
  onDeleteNote,
  onTogglePinNote,
  onNewNote,
  periodFilter,
  onFilterChange,
  onSelectEntry,
  onEditEntry,
  onExportEntry,
  onNewEntry,
  isPrivacyModeEnabled = false,
  onTogglePrivacyMode,
  isSyncConfigured = false,
}) => {
  // Active sub-tab
  const [activeSubView, setActiveSubView] = useState<SubViewType>('all');

  // Set of individual entry IDs revealed manually on touch/click
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Search and Tag filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmotionIds, setSelectedEmotionIds] = useState<string[]>([]);
  const [selectedSymptomIds, setSelectedSymptomIds] = useState<string[]>([]);
  const [combinationMode, setCombinationMode] = useState<'any' | 'all'>('any');
  const [showSymptomsSection, setShowSymptomsSection] = useState(false);
  const [selectedNoteCategory, setSelectedNoteCategory] = useState<DiaryNoteCategory | 'all'>('all');

  // Diary Note modal state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<DiaryNote | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

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
    try {
      const date = new Date(dateIso);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      const isSameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

      if (isSameDay(date, today)) return 'Oggi';
      if (isSameDay(date, yesterday)) return 'Ieri';

      return date.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch {
      return 'Recenti';
    }
  };

  const formatTime = (dateIso: string) => {
    try {
      return new Date(dateIso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
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
      e.thoughtTagIds?.forEach((id) => {
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
    setSelectedNoteCategory('all');
    setCombinationMode('any');
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedEmotionIds.length > 0 ||
    selectedSymptomIds.length > 0 ||
    selectedNoteCategory !== 'all';

  // Filter CBT entries based on search query, emotion combinations, and symptom tags
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const queryWords = query ? query.split(/\s+/).filter(Boolean) : [];

    return entries.filter((entry) => {
      // 1. Emotion combination filter
      if (selectedEmotionIds.length > 0) {
        const entryEmotions = entry.emotionTagIds || [];
        if (combinationMode === 'all') {
          const hasAll = selectedEmotionIds.every((id) => entryEmotions.includes(id));
          if (!hasAll) return false;
        } else {
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

      // 3. Keyword Search filter
      if (queryWords.length > 0) {
        const emotionLabels = getTagLabels(entry.emotionTagIds || []);
        const symptomLabels = getTagLabels(entry.physicalSymptomTagIds || []);
        const thoughtLabels = getTagLabels(entry.thoughtTagIds || []);
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
          ...thoughtLabels,
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

  // Filter Diary Notes
  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const queryWords = query ? query.split(/\s+/).filter(Boolean) : [];

    return notes.filter((note) => {
      // Period filter check for notes
      if (periodFilter !== 'all') {
        const days = parseInt(periodFilter, 10);
        if (!isNaN(days)) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          if (new Date(note.createdAt) < cutoff) return false;
        }
      }

      // Category filter
      if (selectedNoteCategory !== 'all' && note.category !== selectedNoteCategory) {
        return false;
      }

      // Search keyword filter
      if (queryWords.length > 0) {
        const searchableContent = [
          note.title || '',
          note.content || '',
          note.category || '',
          note.mood || '',
          ...(note.tags || []),
        ]
          .join(' ')
          .toLowerCase();

        const matchesAll = queryWords.every((w) => searchableContent.includes(w));
        if (!matchesAll) return false;
      }

      return true;
    });
  }, [notes, periodFilter, selectedNoteCategory, searchQuery]);

  // Separate pinned vs standard notes
  const { pinnedNotes, unpinnedNotes } = useMemo(() => {
    const pinned: DiaryNote[] = [];
    const unpinned: DiaryNote[] = [];
    filteredNotes.forEach((n) => {
      if (n.pinned) pinned.push(n);
      else unpinned.push(n);
    });
    return { pinnedNotes: pinned, unpinnedNotes: unpinned };
  }, [filteredNotes]);

  // Group CBT entries by day header
  const entryGroups: { dayLabel: string; items: CbtEntry[] }[] = useMemo(() => {
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
    return groups;
  }, [filteredEntries]);

  // Group Diary notes by day header
  const noteGroups: { dayLabel: string; items: DiaryNote[] }[] = useMemo(() => {
    const groups: { dayLabel: string; items: DiaryNote[] }[] = [];
    unpinnedNotes.forEach((note) => {
      const label = formatDateHeader(note.createdAt);
      let group = groups.find((g) => g.dayLabel === label);
      if (!group) {
        group = { dayLabel: label, items: [] };
        groups.push(group);
      }
      group.items.push(note);
    });
    return groups;
  }, [unpinnedNotes]);

  // Group unified items (both CBT entries and Diary notes) by day header
  type UnifiedItem = { type: 'entry'; data: CbtEntry } | { type: 'note'; data: DiaryNote };

  const unifiedGroups: { dayLabel: string; items: UnifiedItem[] }[] = useMemo(() => {
    const allItems: { type: 'entry' | 'note'; timestamp: number; data: CbtEntry | DiaryNote }[] = [];

    filteredEntries.forEach((entry) => {
      allItems.push({
        type: 'entry',
        timestamp: new Date(entry.eventDatetime).getTime(),
        data: entry,
      });
    });

    filteredNotes.forEach((note) => {
      allItems.push({
        type: 'note',
        timestamp: new Date(note.createdAt).getTime(),
        data: note,
      });
    });

    // Sort descending
    allItems.sort((a, b) => b.timestamp - a.timestamp);

    const groups: { dayLabel: string; items: UnifiedItem[] }[] = [];
    allItems.forEach((item) => {
      const dateIso = item.type === 'entry' ? (item.data as CbtEntry).eventDatetime : (item.data as DiaryNote).createdAt;
      const label = formatDateHeader(dateIso);
      let group = groups.find((g) => g.dayLabel === label);
      if (!group) {
        group = { dayLabel: label, items: [] };
        groups.push(group);
      }
      group.items.push(item as UnifiedItem);
    });

    return groups;
  }, [filteredEntries, filteredNotes]);

  // Handlers for Diary Notes
  const handleOpenNewNoteModal = () => {
    if (onNewNote) {
      onNewNote();
    } else {
      setEditingNote(null);
      setIsNoteModalOpen(true);
    }
  };

  const handleEditNote = (note: DiaryNote) => {
    setEditingNote(note);
    setIsNoteModalOpen(true);
  };

  const handleConfirmDeleteNote = async () => {
    if (deletingNoteId && onDeleteNote) {
      await onDeleteNote(deletingNoteId);
      setDeletingNoteId(null);
    }
  };

  const handleTogglePin = (noteId: string) => {
    if (onTogglePinNote) {
      onTogglePinNote(noteId);
    }
  };

  const totalEntriesCount = entries.length;
  const totalNotesCount = notes.length;

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Intro Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-black text-[var(--text-primary)]">Timeline</h2>
            {isPrivacyModeEnabled && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 animate-pulse">
                <EyeOff className="w-3 h-3 stroke-[2.5]" />
                <span>Privacy Attiva</span>
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2 text-xs text-[var(--text-secondary)] font-medium">
            <span className="flex items-center space-x-1">
              <Cloud className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
              <span>{isSyncConfigured ? 'Sincronizzazione Supabase attiva' : 'Salvataggio locale & Cloud'}</span>
            </span>
          </div>
        </div>

        {/* Action Controls (Privacy Toggle + Filter dropdown + New note button) */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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
                  : 'Attiva Modalità Privacy per sfocare i testi personali in pubblico'
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

          {/* Quick Note CTA */}
          <button
            type="button"
            onClick={handleOpenNewNoteModal}
            className="inline-flex items-center space-x-1.5 px-3 py-2 min-h-[42px] rounded-xl text-xs font-black bg-[var(--accent-btn)] text-[var(--accent-btn-text)] hover:opacity-90 active:scale-95 transition-all shadow-sm cursor-pointer shrink-0 border border-[var(--border-solid)]"
            title="Aggiungi un appunto libero o riflessione nel diario"
          >
            <BookOpen className="w-3.5 h-3.5 stroke-[2.5] text-[var(--accent-btn-text)]" />
            <span className="text-[var(--accent-btn-text)]">+ Appunto Diario</span>
          </button>

          <div className="flex-1 sm:w-auto sm:flex-initial shrink-0">
            <CustomDropdown
              value={periodFilter}
              onChange={onFilterChange}
              options={periodOptions}
            />
          </div>
        </div>
      </div>

      {/* Segmented Sub-View Switcher (Schede CBT | Diario Libero | Tutto Insieme) */}
      <div className="flex items-center p-1 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] max-w-full overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubView('all')}
          className={`flex-1 min-w-[110px] sm:min-w-0 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeSubView === 'all'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-solid)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5 stroke-[2.2]" />
          <span>Tutto Insieme</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] font-black">
            {totalEntriesCount + totalNotesCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('entries')}
          className={`flex-1 min-w-[110px] sm:min-w-0 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeSubView === 'entries'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-solid)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5 stroke-[2.2]" />
          <span>Schede CBT</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] font-black">
            {totalEntriesCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('notes')}
          className={`flex-1 min-w-[110px] sm:min-w-0 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-2 cursor-pointer ${
            activeSubView === 'notes'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-solid)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 stroke-[2.2]" />
          <span>Diario & Appunti</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-black">
            {totalNotesCount}
          </span>
        </button>
      </div>

      {/* Quick Add Banner for Journal Notes */}
      {(activeSubView === 'notes' || activeSubView === 'all') && (
        <div
          onClick={handleOpenNewNoteModal}
          className="glass-panel rounded-[20px] p-4 sm:p-5 border border-dashed border-[var(--accent-primary)]/40 hover:border-[var(--accent-primary)] bg-gradient-to-r from-[var(--bg-surface)] via-[var(--bg-surface)] to-[var(--accent-primary)]/5 transition-all duration-150 hover:shadow-md cursor-pointer group flex items-center justify-between gap-3"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] flex items-center justify-center group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[var(--text-primary)]">
                Hai qualcosa da appuntarti oggi?
              </h4>
              <p className="text-xs font-bold text-[var(--text-secondary)] line-clamp-1">
                Scrivi un appunto, una riflessione, gratitudine o un promemoria salvato su cloud
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-black bg-[var(--accent-btn)] text-[var(--accent-btn-text)] shadow-xs group-hover:opacity-95 shrink-0 border border-[var(--border-solid)]"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3] text-[var(--accent-btn-text)]" />
            <span className="hidden sm:inline text-[var(--accent-btn-text)]">Scrivi Appunto</span>
            <span className="sm:hidden text-[var(--accent-btn-text)]">Scrivi</span>
          </button>
        </div>
      )}

      {/* Search & Tag / Category Filter Bar */}
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
            placeholder={
              activeSubView === 'notes'
                ? 'Cerca tra appunti, titoli, riflessioni o parole chiave...'
                : activeSubView === 'entries'
                ? 'Cerca per situazione, pensieri, tag, emozioni...'
                : 'Cerca per parole chiave in tutto il diario (schede CBT & appunti)...'
            }
            className="w-full text-xs sm:text-sm font-medium pl-10 pr-9 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1 rounded-md transition-colors cursor-pointer"
              title="Cancella testo"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills when on Notes view */}
        {(activeSubView === 'notes' || activeSubView === 'all') && (
          <div className="space-y-1.5 pt-1">
            <div className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-wider">
              Filtra categoria appunto:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'Riflessione', 'Gratitudine', 'Pensiero', 'Obiettivo', 'Promemoria', 'Altro'] as const).map((cat) => {
                const isSelected = selectedNoteCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedNoteCategory(cat)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] border-[var(--accent-btn)] shadow-xs font-black'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-solid)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className={isSelected ? 'text-[var(--accent-btn-text)]' : ''}>
                      {cat === 'all' ? 'Tutte le categorie' : cat}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Emotion Pills when on CBT Entries view or All view */}
        {(activeSubView === 'entries' || activeSubView === 'all') && emotionTags.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-[var(--text-secondary)]">
                <TagIcon className="w-3.5 h-3.5" />
                <span>Emozioni Schede CBT:</span>
                {selectedEmotionIds.length > 0 && (
                  <span className="font-black text-[var(--accent-primary)]">
                    ({selectedEmotionIds.length} selezionate)
                  </span>
                )}
              </div>

              {selectedEmotionIds.length > 1 && (
                <div className="inline-flex rounded-lg border border-[var(--border-solid)] p-0.5 bg-[var(--bg-subtle)] text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setCombinationMode('any')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      combinationMode === 'any'
                        ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] shadow-xs font-black'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Almeno una (OR)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCombinationMode('all')}
                    className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      combinationMode === 'all'
                        ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] shadow-xs font-black'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Tutte (AND)
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
              {emotionTags.map((tag) => {
                const isSelected = selectedEmotionIds.includes(tag.id);
                const count = tagCounts[tag.id] ?? 0;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleEmotionTag(tag.id)}
                    className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] border-[var(--accent-btn)] shadow-xs scale-102 font-black'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border-[var(--border-solid)]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3] text-[var(--accent-btn-text)]" />}
                    <span className={isSelected ? 'text-[var(--accent-btn-text)]' : ''}>{tag.label}</span>
                    {count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                          isSelected
                            ? 'bg-black/20 text-[var(--accent-btn-text)]'
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
          </div>
        )}

        {/* Active Filter Counter */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-medium">
            <span>Filtri attivi</span>
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

      {/* ========================================================================= */}
      {/* VIEW: DIARY & NOTES TAB */}
      {/* ========================================================================= */}
      {activeSubView === 'notes' && (
        <div className="space-y-6">
          {/* Pinned Notes Section */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-black text-amber-500 uppercase tracking-wider">
                <Pin className="w-3.5 h-3.5 fill-amber-500 stroke-[2.5]" />
                <span>Appunti in evidenza ({pinnedNotes.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pinnedNotes.map((note, idx) => (
                  <DiaryNoteCard
                    key={note.id}
                    note={note}
                    isPrivacyModeEnabled={isPrivacyModeEnabled}
                    onEdit={handleEditNote}
                    onDelete={(id) => setDeletingNoteId(id)}
                    onTogglePin={handleTogglePin}
                    delayIndex={idx}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Notes Grouped by Date */}
          {filteredNotes.length === 0 ? (
            <div className="glass-panel rounded-[20px] p-6 sm:p-8 text-center space-y-4 my-6 border border-dashed border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
                <BookOpen className="w-7 h-7 stroke-[2]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-[var(--text-primary)]">
                  {notes.length === 0 ? 'Nessun appunto nel diario' : 'Nessun appunto con i filtri correnti'}
                </h3>
                <p className="text-xs font-bold text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
                  {notes.length === 0
                    ? 'Usa questo diario personale per annotare riflessioni libere, pensieri, gratitudine e promemoria salvati sul tuo Cloud Supabase.'
                    : 'Prova a modificare o resettare le parole chiave o la categoria selezionata.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenNewNoteModal}
                className="btn-primary inline-flex items-center space-x-2 px-6 py-3 min-h-[48px] rounded-full shadow-md active:scale-95 transition-all duration-150 cursor-pointer bg-[var(--accent-btn)] text-[var(--accent-btn-text)]"
              >
                <Sparkles className="w-4 h-4 stroke-[2.5] text-[var(--accent-btn-text)]" />
                <span className="font-bold text-[var(--accent-btn-text)]">Scrivi il tuo primo appunto</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {noteGroups.map((group) => (
                <div key={`notegroup-${group.dayLabel}`} className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider capitalize">
                      {group.dayLabel}
                    </span>
                    <div className="flex-1 h-px bg-[var(--border-solid)]" />
                    <span className="text-[11px] font-bold text-[var(--text-muted)]">
                      {group.items.length} {group.items.length === 1 ? 'appunto' : 'appunti'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {group.items.map((note, idx) => (
                      <DiaryNoteCard
                        key={note.id}
                        note={note}
                        isPrivacyModeEnabled={isPrivacyModeEnabled}
                        onEdit={handleEditNote}
                        onDelete={(id) => setDeletingNoteId(id)}
                        onTogglePin={handleTogglePin}
                        delayIndex={idx}
                      />
                    ))}
                  </div>

                  {/* Inline Quick Add button directly under day notes */}
                  <button
                    type="button"
                    onClick={handleOpenNewNoteModal}
                    className="w-full py-2.5 px-4 rounded-full border border-dashed border-[var(--border-solid)] hover:border-[var(--accent-primary)] bg-[var(--bg-surface)] hover:bg-[var(--accent-primary)]/5 text-[var(--text-primary)] hover:text-[var(--accent-primary)] font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs active:scale-98 mt-2"
                  >
                    <BookOpen className="w-4 h-4 stroke-[2.2]" />
                    <span>+ Aggiungi appunto diario</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW: CBT ENTRIES TAB */}
      {/* ========================================================================= */}
      {activeSubView === 'entries' && (
        <div className="space-y-6">
          {entries.length === 0 ? (
            <div className="glass-panel rounded-[20px] p-6 sm:p-8 text-center space-y-4 my-6 border border-dashed border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--badge-border)]">
                <Calendar className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-[var(--text-primary)]">
                  Nessuna scheda CBT registrata
                </h3>
                <p className="text-xs font-bold text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
                  Inizia a monitorare i tuoi pensieri e il tuo stato emotivo premendo il pulsante "+".
                </p>
              </div>
              <button
                type="button"
                onClick={onNewEntry}
                className="btn-primary inline-flex items-center space-x-2 px-6 py-3 min-h-[48px] rounded-full shadow-md active:scale-95 transition-all duration-150 cursor-pointer bg-[var(--accent-btn)] text-[var(--accent-btn-text)]"
              >
                <Sparkles className="w-4 h-4 stroke-[2.5] text-[var(--accent-btn-text)]" />
                <span className="font-bold text-[var(--accent-btn-text)]">Registra Prima Scheda</span>
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
                  Nessuna scheda corrisponde alle parole chiave o alla combinazione di emozioni selezionate.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-[var(--border-solid)] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resetta Filtri</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {entryGroups.map((group) => (
                <div key={`entrygroup-${group.dayLabel}`} className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider capitalize">
                      {group.dayLabel}
                    </span>
                    <div className="flex-1 h-px bg-[var(--border-solid)]" />
                    <span className="text-[11px] font-bold text-[var(--text-muted)]">
                      {group.items.length} {group.items.length === 1 ? 'scheda' : 'schede'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {group.items.map((entry, idx) => {
                      const emotionLabels = getTagLabels(entry.emotionTagIds || []);
                      const anxiety = entry.overallAnxietyLevel ?? 0;
                      const isRevealed = revealedIds.has(entry.id);
                      const shouldBlur = isPrivacyModeEnabled && !isRevealed;

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
                        <motion.div
                          key={entry.id}
                          initial={{ opacity: 0, y: 14, scale: 0.985 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            duration: 0.35,
                            delay: Math.min(idx * 0.04, 0.25),
                            ease: [0.16, 1, 0.3, 1],
                          }}
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
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--badge-border)]">
                                Scheda CBT
                              </span>
                              {entry.photo && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--badge-border)]" title="Foto allegata">
                                  <Camera className="w-3 h-3 stroke-[2.5]" />
                                  <span>Foto</span>
                                </span>
                              )}
                              {entry.audioNote && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30" title="Audio-nota vocale">
                                  <Mic className="w-3 h-3 stroke-[2.5]" />
                                  <span>Audio</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
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
                                  title="Esporta PDF dedicato"
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
                                emotionLabels.map((lbl, i) => (
                                  <span
                                    key={`t-lbl-${lbl}-${i}`}
                                    className="px-2.5 py-1 rounded-full text-xs font-bold border bg-[var(--bg-subtle)] text-[var(--text-primary)] border-[var(--border-solid)]"
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
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW: UNIFIED ALL-IN-ONE TIMELINE */}
      {/* ========================================================================= */}
      {activeSubView === 'all' && (
        <div className="space-y-6">
          {/* Pinned Notes in Unified View */}
          {pinnedNotes.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-xs font-black text-amber-500 uppercase tracking-wider">
                <Pin className="w-3.5 h-3.5 fill-amber-500 stroke-[2.5]" />
                <span>Appunti in evidenza ({pinnedNotes.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pinnedNotes.map((note, idx) => (
                  <DiaryNoteCard
                    key={`pinned-unified-${note.id}`}
                    note={note}
                    isPrivacyModeEnabled={isPrivacyModeEnabled}
                    onEdit={handleEditNote}
                    onDelete={(id) => setDeletingNoteId(id)}
                    onTogglePin={handleTogglePin}
                    delayIndex={idx}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredEntries.length === 0 && filteredNotes.length === 0 ? (
            <div className="glass-panel rounded-[20px] p-6 sm:p-8 text-center space-y-4 my-6 border border-dashed border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--badge-border)]">
                <Calendar className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-[var(--text-primary)]">
                  Nessuna voce trovata nella timeline
                </h3>
                <p className="text-xs font-bold text-[var(--text-secondary)] max-w-xs mx-auto leading-relaxed">
                  Inizia registrando una scheda CBT o scrivendo un appunto di riflessione nel tuo diario.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onNewEntry}
                  className="btn-primary inline-flex items-center space-x-2 px-5 py-2.5 rounded-full shadow-md cursor-pointer bg-[var(--accent-btn)] text-[var(--accent-btn-text)]"
                >
                  <Sparkles className="w-4 h-4 stroke-[2.5] text-[var(--accent-btn-text)]" />
                  <span className="font-bold text-[var(--accent-btn-text)]">Nuova Scheda CBT</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenNewNoteModal}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 font-bold hover:bg-[var(--accent-primary)]/25 transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 stroke-[2.2]" />
                  <span>Nuovo Appunto Diario</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {unifiedGroups.map((group) => (
                <div key={`unified-${group.dayLabel}`} className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider capitalize">
                      {group.dayLabel}
                    </span>
                    <div className="flex-1 h-px bg-[var(--border-solid)]" />
                    <span className="text-[11px] font-bold text-[var(--text-muted)]">
                      {group.items.length} {group.items.length === 1 ? 'evento' : 'eventi'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((item, idx) => {
                      if (item.type === 'note') {
                        // Skip if already rendered in pinned
                        if (item.data.pinned && pinnedNotes.some((p) => p.id === item.data.id)) {
                          return null;
                        }
                        return (
                          <div key={`unote-${item.data.id}`}>
                            <DiaryNoteCard
                              note={item.data}
                              isPrivacyModeEnabled={isPrivacyModeEnabled}
                              onEdit={handleEditNote}
                              onDelete={(id) => setDeletingNoteId(id)}
                              onTogglePin={handleTogglePin}
                              delayIndex={idx}
                            />
                          </div>
                        );
                      }

                      // Render CBT Entry Card
                      const entry = item.data;
                      const emotionLabels = getTagLabels(entry.emotionTagIds || []);
                      const anxiety = entry.overallAnxietyLevel ?? 0;
                      const isRevealed = revealedIds.has(entry.id);
                      const shouldBlur = isPrivacyModeEnabled && !isRevealed;

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
                        <motion.div
                          key={`uentry-${entry.id}`}
                          initial={{ opacity: 0, y: 14, scale: 0.985 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            duration: 0.35,
                            delay: Math.min(idx * 0.04, 0.25),
                            ease: [0.16, 1, 0.3, 1],
                          }}
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
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--badge-border)]">
                                Scheda CBT
                              </span>
                              {entry.photo && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--badge-border)]" title="Foto allegata">
                                  <Camera className="w-3 h-3 stroke-[2.5]" />
                                  <span>Foto</span>
                                </span>
                              )}
                              {entry.audioNote && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30" title="Audio-nota">
                                  <Mic className="w-3 h-3 stroke-[2.5]" />
                                  <span>Audio</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-2">
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
                                  title="Esporta PDF dedicato"
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
                                emotionLabels.map((lbl, i) => (
                                  <span
                                    key={`ut-lbl-${lbl}-${i}`}
                                    className="px-2.5 py-1 rounded-full text-xs font-bold border bg-[var(--bg-subtle)] text-[var(--text-primary)] border-[var(--border-solid)]"
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
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Inline action button for this day */}
                  <button
                    type="button"
                    onClick={handleOpenNewNoteModal}
                    className="w-full py-2.5 px-4 rounded-full border border-dashed border-[var(--border-solid)] hover:border-[var(--accent-primary)] bg-[var(--bg-surface)] hover:bg-[var(--accent-primary)]/5 text-[var(--text-primary)] hover:text-[var(--accent-primary)] font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs active:scale-98 mt-2"
                  >
                    <BookOpen className="w-4 h-4 stroke-[2.2]" />
                    <span>+ Aggiungi appunto diario</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create or Edit Diary Note */}
      <DiaryNoteModal
        isOpen={isNoteModalOpen}
        initialNote={editingNote}
        onSave={async (savedNote) => {
          if (onSaveNote) {
            await onSaveNote(savedNote);
          }
          setIsNoteModalOpen(false);
          setEditingNote(null);
        }}
        onClose={() => {
          setIsNoteModalOpen(false);
          setEditingNote(null);
        }}
        isSyncConfigured={isSyncConfigured}
      />

      {/* Delete Note Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deletingNoteId}
        title="Elimina appunto dal diario"
        message="Sei sicuro di voler eliminare questo appunto? Verrà rimosso sia dal database locale che dalla sincronizzazione Cloud Supabase."
        confirmLabel="Elimina definitivamente"
        cancelLabel="Annulla"
        isDanger={true}
        onConfirm={handleConfirmDeleteNote}
        onCancel={() => setDeletingNoteId(null)}
      />
    </div>
  );
};
