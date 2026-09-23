import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { CbtEntry, Tag, PeriodFilter, DiaryNote, DiaryNoteCategory } from '../types';
import {
  Calendar,
  Sparkles,
  ChevronRight,
  Activity,
  Brain,
  Heart,
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
  Download,
  Share2,
  Loader2,
  SlidersHorizontal,
  Filter,
} from 'lucide-react';
import { CustomDropdown } from '../components/CustomDropdown';
import { DiaryNoteCard } from '../components/DiaryNoteCard';
import { DiaryNoteModal } from '../components/DiaryNoteModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { exportDiaryNotesPdf, exportSingleDiaryNotePdf } from '../services/diaryReportGenerator';
import { DEFAULT_TAGS } from '../services/db';

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
  onShowToast?: (msg: string) => void;
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
  onShowToast,
}) => {
  // Active sub-tab
  const [activeSubView, setActiveSubView] = useState<SubViewType>('all');

  // Set of individual entry IDs revealed manually on touch/click
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  // Search and Tag filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmotionIds, setSelectedEmotionIds] = useState<string[]>([]);
  const [selectedSymptomIds, setSelectedSymptomIds] = useState<string[]>([]);
  const [selectedThoughtIds, setSelectedThoughtIds] = useState<string[]>([]);
  const [selectedCustomTagIds, setSelectedCustomTagIds] = useState<string[]>([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [combinationMode, setCombinationMode] = useState<'any' | 'all'>('any');
  const [selectedNoteCategory, setSelectedNoteCategory] = useState<DiaryNoteCategory | 'all'>('all');

  // Diary Note modal state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<DiaryNote | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  // Helper to parse dates safely across formats
  const parseSafeTime = (dateStr?: string): number => {
    if (!dateStr) return 0;
    const d = new Date(dateStr);
    const t = d.getTime();
    if (!isNaN(t)) return t;
    const d2 = new Date(dateStr.replace(' ', 'T'));
    const t2 = d2.getTime();
    return !isNaN(t2) ? t2 : 0;
  };

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
      .map((id) => {
        const found = allTags.find((t) => t.id === id || t.label.toLowerCase() === id.toLowerCase()) ||
          DEFAULT_TAGS.find((t) => t.id === id || t.label.toLowerCase() === id.toLowerCase());
        return found ? found.label : id;
      })
      .filter(Boolean);
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

  // Available Emotion Tags, Symptom Tags & Thought Tags
  const emotionTags = useMemo(() => {
    const list = allTags.filter((t) => t.category === 'emotion');
    if (list.length > 0) return list;
    return DEFAULT_TAGS.filter((t) => t.category === 'emotion');
  }, [allTags]);

  const symptomTags = useMemo(() => {
    const list = allTags.filter((t) => t.category === 'physical_symptom');
    if (list.length > 0) return list;
    return DEFAULT_TAGS.filter((t) => t.category === 'physical_symptom');
  }, [allTags]);

  const thoughtTags = useMemo(() => {
    const list = allTags.filter((t) => t.category === 'thought');
    if (list.length > 0) return list;
    return DEFAULT_TAGS.filter((t) => t.category === 'thought');
  }, [allTags]);

  // Counts of occurrences in currently loaded entries & notes for each tag
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const increment = (rawIdOrLabel: string) => {
      if (!rawIdOrLabel) return;
      const lower = rawIdOrLabel.trim().toLowerCase();
      const matched = allTags.find(
        (t) => t.id === rawIdOrLabel || t.label.toLowerCase() === lower
      );
      const key = matched ? matched.id : rawIdOrLabel;
      counts[key] = (counts[key] || 0) + 1;
    };

    entries.forEach((e) => {
      e.emotionTagIds?.forEach(increment);
      e.physicalSymptomTagIds?.forEach(increment);
      e.thoughtTagIds?.forEach(increment);
    });
    notes.forEach((n) => {
      n.tags?.forEach(increment);
    });
    return counts;
  }, [entries, notes, allTags]);

  // Patient Custom Tags list (from allTags with isCustom === 1 or created in notes)
  const customTags = useMemo(() => {
    const list: { id: string; label: string; count: number }[] = [];
    const seen = new Set<string>();

    allTags
      .filter((t) => t.isCustom === 1)
      .forEach((t) => {
        seen.add(t.label.toLowerCase());
        list.push({ id: t.id, label: t.label, count: tagCounts[t.id] ?? 0 });
      });

    // Also include any custom tags attached to notes
    notes.forEach((n) => {
      n.tags?.forEach((tStr) => {
        const lower = tStr.trim().toLowerCase();
        if (lower && !seen.has(lower)) {
          seen.add(lower);
          const found = allTags.find((t) => t.label.toLowerCase() === lower);
          list.push({
            id: found ? found.id : `note-tag-${lower}`,
            label: tStr.trim(),
            count: tagCounts[found?.id || `note-tag-${lower}`] ?? 0,
          });
        }
      });
    });

    return list;
  }, [allTags, notes, tagCounts]);

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

  const toggleThoughtTag = (tagId: string) => {
    setSelectedThoughtIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const toggleCustomTag = (tagId: string) => {
    setSelectedCustomTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedEmotionIds([]);
    setSelectedSymptomIds([]);
    setSelectedThoughtIds([]);
    setSelectedCustomTagIds([]);
    setSelectedNoteCategory('all');
    setCombinationMode('any');
  };

  const activeFilterCount =
    (selectedEmotionIds.length > 0 ? selectedEmotionIds.length : 0) +
    (selectedSymptomIds.length > 0 ? selectedSymptomIds.length : 0) +
    (selectedThoughtIds.length > 0 ? selectedThoughtIds.length : 0) +
    (selectedCustomTagIds.length > 0 ? selectedCustomTagIds.length : 0) +
    (selectedNoteCategory !== 'all' ? 1 : 0);

  const hasActiveFilters = searchQuery.trim().length > 0 || activeFilterCount > 0;

  // Filter CBT entries based on days period, search query, emotions, symptoms, and custom patient tags
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const queryWords = query ? query.split(/\s+/).filter(Boolean) : [];

    return entries.filter((entry) => {
      // 0. Robust Date Period filter check (covers the full days period from midnight)
      if (periodFilter !== 'all') {
        const days = parseInt(periodFilter, 10);
        if (!isNaN(days)) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          cutoff.setHours(0, 0, 0, 0); // Include entire start day
          const entryTime = parseSafeTime(entry.eventDatetime) || parseSafeTime(entry.createdAt);
          if (entryTime < cutoff.getTime()) return false;
        }
      }

      // Keyword Search filter
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

      const entryEmotionIds = entry.emotionTagIds || [];
      const entrySymptomIds = entry.physicalSymptomTagIds || [];
      const entryThoughtIds = entry.thoughtTagIds || [];

      const matchesEmotion = (tagId: string): boolean => {
        if (entryEmotionIds.includes(tagId)) return true;
        const tag = allTags.find((t) => t.id === tagId) || DEFAULT_TAGS.find((t) => t.id === tagId);
        if (!tag) return false;
        const lbl = tag.label.toLowerCase();
        return entryEmotionIds.some((id) => {
          const t = allTags.find((x) => x.id === id) || DEFAULT_TAGS.find((x) => x.id === id);
          return t?.label.toLowerCase() === lbl;
        });
      };

      const matchesSymptom = (tagId: string): boolean => {
        if (entrySymptomIds.includes(tagId)) return true;
        const tag = allTags.find((t) => t.id === tagId) || DEFAULT_TAGS.find((t) => t.id === tagId);
        if (!tag) return false;
        const lbl = tag.label.toLowerCase();
        if (
          entrySymptomIds.some((id) => {
            const t = allTags.find((x) => x.id === id) || DEFAULT_TAGS.find((x) => x.id === id);
            return t?.label.toLowerCase() === lbl;
          })
        ) {
          return true;
        }
        if (entry.physicalSymptomsText && entry.physicalSymptomsText.toLowerCase().includes(lbl)) {
          return true;
        }
        return false;
      };

      const matchesThought = (tagId: string): boolean => {
        if (entryThoughtIds.includes(tagId)) return true;
        const tag = allTags.find((t) => t.id === tagId) || DEFAULT_TAGS.find((t) => t.id === tagId);
        if (!tag) return false;
        const lbl = tag.label.toLowerCase();
        if (
          entryThoughtIds.some((id) => {
            const t = allTags.find((x) => x.id === id) || DEFAULT_TAGS.find((x) => x.id === id);
            return t?.label.toLowerCase() === lbl;
          })
        ) {
          return true;
        }
        const text = [entry.negativeThought || '', entry.negativeThoughtsExtended || ''].join(' ').toLowerCase();
        if (text.includes(lbl)) return true;
        return false;
      };

      const matchesCustomTag = (tagId: string): boolean => {
        if (
          entryEmotionIds.includes(tagId) ||
          entrySymptomIds.includes(tagId) ||
          entryThoughtIds.includes(tagId)
        ) {
          return true;
        }
        const tag = customTags.find((t) => t.id === tagId) || allTags.find((t) => t.id === tagId);
        if (!tag) return false;
        const lbl = tag.label.toLowerCase();
        const content = [
          entry.situation || '',
          entry.negativeThought || '',
          entry.negativeThoughtsExtended || '',
          entry.notes || '',
          entry.physicalSymptomsText || '',
        ].join(' ').toLowerCase();
        return content.includes(lbl);
      };

      const hasAnyEmotionSelected = selectedEmotionIds.length > 0;
      const hasAnySymptomSelected = selectedSymptomIds.length > 0;
      const hasAnyThoughtSelected = selectedThoughtIds.length > 0;
      const hasAnyCustomSelected = selectedCustomTagIds.length > 0;

      const hasAnyTagSelected =
        hasAnyEmotionSelected ||
        hasAnySymptomSelected ||
        hasAnyThoughtSelected ||
        hasAnyCustomSelected;

      // Note category filtering interaction:
      // If user is in "all" view and selected ONLY a note category without selecting any tags,
      // then they explicitly filtered for notes of that category, so CBT entries shouldn't show.
      // But if any tags are selected, CBT entries matching the tags should be shown.
      if (selectedNoteCategory !== 'all' && activeSubView === 'all' && !hasAnyTagSelected) {
        return false;
      }

      if (!hasAnyTagSelected) {
        return true;
      }

      if (combinationMode === 'any') {
        // "Almeno una (OR)": If entry has ANY of the selected tags (symptom, thought, emotion, or custom), SHOW IT!
        const matched =
          (hasAnyEmotionSelected && selectedEmotionIds.some(matchesEmotion)) ||
          (hasAnySymptomSelected && selectedSymptomIds.some(matchesSymptom)) ||
          (hasAnyThoughtSelected && selectedThoughtIds.some(matchesThought)) ||
          (hasAnyCustomSelected && selectedCustomTagIds.some(matchesCustomTag));

        return matched;
      } else {
        // "Tutte (AND)": All selected tags across active categories must be present
        const hasAllEmotions = !hasAnyEmotionSelected || selectedEmotionIds.every(matchesEmotion);
        const hasAllSymptoms = !hasAnySymptomSelected || selectedSymptomIds.every(matchesSymptom);
        const hasAllThoughts = !hasAnyThoughtSelected || selectedThoughtIds.every(matchesThought);
        const hasAllCustom = !hasAnyCustomSelected || selectedCustomTagIds.every(matchesCustomTag);

        return hasAllEmotions && hasAllSymptoms && hasAllThoughts && hasAllCustom;
      }
    });
  }, [
    entries,
    periodFilter,
    searchQuery,
    selectedEmotionIds,
    selectedCustomTagIds,
    selectedSymptomIds,
    selectedThoughtIds,
    selectedNoteCategory,
    activeSubView,
    combinationMode,
    allTags,
    customTags,
  ]);

  // Filter Diary Notes based on days period, category, custom tags, CBT tags, and keywords
  const filteredNotes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const queryWords = query ? query.split(/\s+/).filter(Boolean) : [];

    return notes.filter((note) => {
      // 0. Robust Period filter check for notes (exact midnight boundary)
      if (periodFilter !== 'all') {
        const days = parseInt(periodFilter, 10);
        if (!isNaN(days)) {
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - days);
          cutoff.setHours(0, 0, 0, 0); // Include entire start day
          const noteTime = parseSafeTime(note.createdAt);
          if (noteTime < cutoff.getTime()) return false;
        }
      }

      // Keyword search filter
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

      // Category filter check
      const matchesCategory = selectedNoteCategory === 'all' || note.category === selectedNoteCategory;

      const noteTagsLower = (note.tags || []).map((t) => t.toLowerCase());
      const noteText = [note.title || '', note.content || ''].join(' ').toLowerCase();

      const noteMatchesTag = (tagId: string): boolean => {
        if ((note.tags || []).includes(tagId)) return true;
        const tag = allTags.find((t) => t.id === tagId) || DEFAULT_TAGS.find((t) => t.id === tagId);
        if (tag) {
          const lbl = tag.label.toLowerCase();
          if (noteTagsLower.includes(lbl) || noteText.includes(lbl)) {
            return true;
          }
        }
        return false;
      };

      const hasAnyEmotionSelected = selectedEmotionIds.length > 0;
      const hasAnySymptomSelected = selectedSymptomIds.length > 0;
      const hasAnyThoughtSelected = selectedThoughtIds.length > 0;
      const hasAnyCustomSelected = selectedCustomTagIds.length > 0;

      const hasAnyTagSelected =
        hasAnyEmotionSelected ||
        hasAnySymptomSelected ||
        hasAnyThoughtSelected ||
        hasAnyCustomSelected;

      if (!hasAnyTagSelected) {
        return matchesCategory;
      }

      if (combinationMode === 'any') {
        const matchesAnyTag =
          (hasAnyEmotionSelected && selectedEmotionIds.some(noteMatchesTag)) ||
          (hasAnySymptomSelected && selectedSymptomIds.some(noteMatchesTag)) ||
          (hasAnyThoughtSelected && selectedThoughtIds.some(noteMatchesTag)) ||
          (hasAnyCustomSelected && selectedCustomTagIds.some(noteMatchesTag));

        if (selectedNoteCategory !== 'all') {
          return matchesCategory || matchesAnyTag;
        }
        return matchesAnyTag;
      } else {
        const hasAllTags =
          (!hasAnyEmotionSelected || selectedEmotionIds.every(noteMatchesTag)) &&
          (!hasAnySymptomSelected || selectedSymptomIds.every(noteMatchesTag)) &&
          (!hasAnyThoughtSelected || selectedThoughtIds.every(noteMatchesTag)) &&
          (!hasAnyCustomSelected || selectedCustomTagIds.every(noteMatchesTag));

        return matchesCategory && hasAllTags;
      }
    });
  }, [
    notes,
    periodFilter,
    selectedNoteCategory,
    selectedCustomTagIds,
    selectedEmotionIds,
    selectedSymptomIds,
    selectedThoughtIds,
    combinationMode,
    searchQuery,
    customTags,
    allTags,
  ]);

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

  const [isExportingNotesPdf, setIsExportingNotesPdf] = useState(false);

  const handleExportNotesDirect = async (action: 'download' | 'share' = 'download') => {
    if (filteredNotes.length === 0 || isExportingNotesPdf) return;
    setIsExportingNotesPdf(true);
    try {
      const patientName = localStorage.getItem('diariamente_patient_name') || 'Paziente';
      const periodLabel = periodOptions.find((p) => p.value === periodFilter)?.label || 'Tutti';
      await exportDiaryNotesPdf(
        filteredNotes,
        {
          patientName,
          categoryFilter: selectedNoteCategory,
          periodLabel,
        },
        (msg) => {
          if (onShowToast) onShowToast(msg);
        },
        action
      );
    } catch (err) {
      console.error('Notes export error:', err);
      if (onShowToast) onShowToast('Errore durante la generazione del PDF');
    } finally {
      setIsExportingNotesPdf(false);
    }
  };

  const handleExportSingleNote = async (note: DiaryNote) => {
    try {
      await exportSingleDiaryNotePdf(
        note,
        undefined,
        (msg) => {
          if (onShowToast) onShowToast(msg);
        },
        'auto'
      );
    } catch (err) {
      console.error('Notes export error:', err);
      if (onShowToast) onShowToast('Errore durante l\'esportazione del PDF');
    }
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      {/* Intro Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 pb-1">
        <div className="flex items-center space-x-2">
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Timeline</h2>
          {isPrivacyModeEnabled && (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30 animate-pulse">
              <EyeOff className="w-3 h-3 stroke-[2.5]" />
              <span>Privacy Attiva</span>
            </span>
          )}
        </div>

        {/* Action Controls (Filter dropdown) */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
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
      <div className="flex items-center p-1 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] max-w-full">
        <button
          type="button"
          onClick={() => setActiveSubView('all')}
          className={`flex-1 min-w-0 py-2.5 px-1.5 sm:px-3 min-h-[44px] rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeSubView === 'all'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-solid)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
          <span className="truncate hidden sm:inline">Tutto Insieme</span>
          <span className="truncate sm:hidden">Tutti</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] font-black shrink-0">
            {totalEntriesCount + totalNotesCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('entries')}
          className={`flex-1 min-w-0 py-2.5 px-1.5 sm:px-3 min-h-[44px] rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeSubView === 'entries'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-solid)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
          <span className="truncate hidden sm:inline">Schede CBT</span>
          <span className="truncate sm:hidden">CBT</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)] font-black shrink-0">
            {totalEntriesCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubView('notes')}
          className={`flex-1 min-w-0 py-2.5 px-1.5 sm:px-3 min-h-[44px] rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
            activeSubView === 'notes'
              ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-solid)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
          <span className="truncate hidden sm:inline">Diario & Appunti</span>
          <span className="truncate sm:hidden">Appunti</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] font-black shrink-0">
            {totalNotesCount}
          </span>
        </button>
      </div>

      {/* Search & Collapsible Filters Bar */}
      <div className="glass-panel rounded-[20px] p-3.5 sm:p-5 border border-[var(--border-solid)] bg-[var(--bg-surface)] space-y-3.5 shadow-sm">
        {/* Top Search & Filter Trigger Row */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 flex items-center">
            <div className="absolute left-3.5 pointer-events-none text-[var(--text-muted)] flex items-center">
              <Search className="w-4 h-4 stroke-[2.2]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeSubView === 'notes'
                  ? 'Cerca tra appunti, titoli, riflessioni...'
                  : activeSubView === 'entries'
                  ? 'Cerca per situazione, pensieri, tag, emozioni...'
                  : 'Cerca in tutto il diario (schede CBT & appunti)...'
              }
              className="w-full text-xs sm:text-sm font-medium pl-10 pr-9 py-2.5 min-h-[44px] rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
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

          {/* Procedure Trigger Button to Expand/Enable Filters */}
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen((prev) => !prev)}
            className={`inline-flex items-center space-x-1.5 px-3 sm:px-4 py-2.5 min-h-[44px] rounded-xl text-xs sm:text-sm font-bold border transition-all cursor-pointer shrink-0 ${
              isFilterPanelOpen || activeFilterCount > 0
                ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] border-[var(--accent-btn)] shadow-sm font-black'
                : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-solid)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
            title={isFilterPanelOpen ? 'Nascondi filtri' : 'Abilita filtri di ricerca e tag'}
            aria-expanded={isFilterPanelOpen}
          >
            <SlidersHorizontal className="w-4 h-4 stroke-[2.2] shrink-0" />
            <span className="hidden xs:inline sm:inline">Filtri</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 stroke-[2.5] transition-transform duration-200 shrink-0 ${
                isFilterPanelOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Compact Quick Summary of Active Filters when panel is closed */}
        {!isFilterPanelOpen && activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-[11px] font-bold text-[var(--text-muted)] mr-1">Filtri attivi:</span>
            {selectedNoteCategory !== 'all' && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--accent-btn)] text-[var(--accent-btn-text)]">
                <span>Cat: {selectedNoteCategory}</span>
                <button
                  type="button"
                  onClick={() => setSelectedNoteCategory('all')}
                  className="hover:opacity-75 cursor-pointer ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedSymptomIds.map((id) => {
              const tag = allTags.find((t) => t.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                >
                  <Activity className="w-3 h-3 stroke-[2.5]" />
                  <span>{tag?.label || id}</span>
                  <button
                    type="button"
                    onClick={() => toggleSymptomTag(id)}
                    className="hover:opacity-75 cursor-pointer ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {selectedThoughtIds.map((id) => {
              const tag = allTags.find((t) => t.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30"
                >
                  <Brain className="w-3 h-3 stroke-[2.5]" />
                  <span>{tag?.label || id}</span>
                  <button
                    type="button"
                    onClick={() => toggleThoughtTag(id)}
                    className="hover:opacity-75 cursor-pointer ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {selectedEmotionIds.map((id) => {
              const tag = allTags.find((t) => t.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                >
                  <Heart className="w-3 h-3 stroke-[2.5]" />
                  <span>{tag?.label || id}</span>
                  <button
                    type="button"
                    onClick={() => toggleEmotionTag(id)}
                    className="hover:opacity-75 cursor-pointer ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {selectedCustomTagIds.map((id) => {
              const tag = customTags.find((t) => t.id === id) || allTags.find((t) => t.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/40"
                >
                  <span>{tag?.label || id}</span>
                  <button
                    type="button"
                    onClick={() => toggleCustomTag(id)}
                    className="hover:opacity-75 cursor-pointer ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline ml-1 cursor-pointer"
            >
              Azzera
            </button>
          </div>
        )}

        {/* Expandable Filter Drawer Panel */}
        {isFilterPanelOpen && (
          <div className="space-y-4 pt-3 border-t border-[var(--border-subtle)] animate-fade-in">
            {/* Controllo Logica di combinazione filtri */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)]">
              <div className="text-xs font-bold text-[var(--text-secondary)] flex items-center space-x-1.5">
                <Filter className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span className="font-black text-[var(--text-primary)]">Logica combinazione filtri:</span>
                <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">
                  {combinationMode === 'any' ? '(mostra voci che contengono almeno un filtro)' : '(mostra voci che soddisfano tutti i filtri)'}
                </span>
              </div>
              <div className="inline-flex rounded-lg border border-[var(--border-solid)] p-0.5 bg-[var(--bg-subtle)] text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setCombinationMode('any')}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
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
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                    combinationMode === 'all'
                      ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] shadow-xs font-black'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Tutte (AND)
                </button>
              </div>
            </div>

            {/* 1. SEZIONE TAG PERSONALIZZATI */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-black text-[var(--text-primary)]">
                  <span>Tag Personalizzati:</span>
                  {selectedCustomTagIds.length > 0 && (
                    <span className="font-bold text-[var(--accent-primary)] text-[11px] ml-1.5">
                      ({selectedCustomTagIds.length} attivi)
                    </span>
                  )}
                </div>
                {selectedCustomTagIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCustomTagIds([])}
                    className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline cursor-pointer"
                  >
                    Deseleziona tag
                  </button>
                )}
              </div>

              {customTags.length === 0 ? (
                <div className="text-xs text-[var(--text-muted)] italic py-2 px-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)]">
                  Nessun tag personalizzato ancora creato. Quando aggiungi un tag personalizzato in una scheda o appunto, apparirà qui per filtrare.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomTagIds([])}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      selectedCustomTagIds.length === 0
                        ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] border-[var(--accent-btn)] shadow-xs font-black'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-solid)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className={selectedCustomTagIds.length === 0 ? 'text-[var(--accent-btn-text)]' : ''}>
                      Tutti i tag
                    </span>
                  </button>

                  {customTags.map((t) => {
                    const isSelected = selectedCustomTagIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleCustomTag(t.id)}
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-xs font-black'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-solid)] hover:text-[var(--text-primary)] hover:border-[var(--text-muted)]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        <span>{t.label}</span>
                        {t.count > 0 && (
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                              isSelected
                                ? 'bg-black/25 text-white'
                                : 'bg-[var(--border-solid)] text-[var(--text-muted)]'
                            }`}
                          >
                            {t.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. SEZIONE TAG SINTOMI (SCHEDE CBT) */}
            {(activeSubView === 'entries' || activeSubView === 'all') && symptomTags.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-[var(--text-secondary)]">
                    <Activity className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                    <span className="font-black text-[var(--text-primary)]">Tag Sintomi:</span>
                    {selectedSymptomIds.length > 0 && (
                      <span className="font-black text-emerald-500 text-[11px]">
                        ({selectedSymptomIds.length} selezionati)
                      </span>
                    )}
                  </div>

                  {selectedSymptomIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSymptomIds([])}
                      className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline cursor-pointer"
                    >
                      Deseleziona sintomi
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => setSelectedSymptomIds([])}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      selectedSymptomIds.length === 0
                        ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] border-[var(--accent-btn)] shadow-xs font-black'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-solid)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className={selectedSymptomIds.length === 0 ? 'text-[var(--accent-btn-text)]' : ''}>
                      Tutti i sintomi
                    </span>
                  </button>

                  {symptomTags.map((tag) => {
                    const isSelected = selectedSymptomIds.includes(tag.id);
                    const count = tagCounts[tag.id] ?? 0;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleSymptomTag(tag.id)}
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] border-[var(--accent-btn)] shadow-xs font-black'
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

            {/* 3. SEZIONE TAG PENSIERI (SCHEDE CBT) */}
            {(activeSubView === 'entries' || activeSubView === 'all') && thoughtTags.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-[var(--text-secondary)]">
                    <Brain className="w-3.5 h-3.5 text-purple-500 stroke-[2.5]" />
                    <span className="font-black text-[var(--text-primary)]">Tag Pensieri:</span>
                    {selectedThoughtIds.length > 0 && (
                      <span className="font-black text-purple-500 text-[11px]">
                        ({selectedThoughtIds.length} selezionati)
                      </span>
                    )}
                  </div>

                  {selectedThoughtIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedThoughtIds([])}
                      className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline cursor-pointer"
                    >
                      Deseleziona pensieri
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => setSelectedThoughtIds([])}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      selectedThoughtIds.length === 0
                        ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] border-[var(--accent-btn)] shadow-xs font-black'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-solid)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className={selectedThoughtIds.length === 0 ? 'text-[var(--accent-btn-text)]' : ''}>
                      Tutti i pensieri
                    </span>
                  </button>

                  {thoughtTags.map((tag) => {
                    const isSelected = selectedThoughtIds.includes(tag.id);
                    const count = tagCounts[tag.id] ?? 0;
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleThoughtTag(tag.id)}
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] border-[var(--accent-btn)] shadow-xs font-black'
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

            {/* 4. SEZIONE TAG EMOZIONI (SCHEDE CBT) */}
            {(activeSubView === 'entries' || activeSubView === 'all') && emotionTags.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-[var(--text-secondary)]">
                    <Heart className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
                    <span className="font-black text-[var(--text-primary)]">Tag Emozioni:</span>
                    {selectedEmotionIds.length > 0 && (
                      <span className="font-black text-rose-500 text-[11px]">
                        ({selectedEmotionIds.length} selezionate)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {(selectedEmotionIds.length + selectedSymptomIds.length + selectedThoughtIds.length) > 1 && (
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

                    {selectedEmotionIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedEmotionIds([])}
                        className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline cursor-pointer"
                      >
                        Deseleziona emozioni
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  <button
                    type="button"
                    onClick={() => setSelectedEmotionIds([])}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      selectedEmotionIds.length === 0
                        ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] border-[var(--accent-btn)] shadow-xs font-black'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-solid)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className={selectedEmotionIds.length === 0 ? 'text-[var(--accent-btn-text)]' : ''}>
                      Tutte le emozioni
                    </span>
                  </button>

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
                            ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] border-[var(--accent-btn)] shadow-xs font-black'
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

            {/* 5. SEZIONE CATEGORIA APPUNTI */}
            {(activeSubView === 'notes' || activeSubView === 'all') && (
              <div className="space-y-1.5 pt-2 border-t border-[var(--border-subtle)]">
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

            {/* Footer dell'area filtri con azioni di chiusura e reset */}
            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-muted)]">
                {activeFilterCount > 0 ? `${activeFilterCount} filtri attivi` : 'Nessun filtro attivo'}
              </span>
              <div className="flex items-center space-x-2">
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-xs font-bold text-red-500 hover:underline px-2 py-1 cursor-pointer"
                  >
                    Azzera filtri
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsFilterPanelOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-solid)] hover:bg-[var(--bg-surface)] cursor-pointer"
                >
                  Chiudi filtri
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VIEW: DIARY & NOTES TAB */}
      {/* ========================================================================= */}
      {activeSubView === 'notes' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Notes Therapist Export & Quick Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)]">
            <div className="flex items-center space-x-2 text-xs font-black text-[var(--text-primary)]">
              <BookOpen className="w-4 h-4 text-[var(--accent-primary)] stroke-[2.2] shrink-0" />
              <span>Diario Personale & Appunti ({filteredNotes.length})</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleExportNotesDirect('download')}
                disabled={filteredNotes.length === 0 || isExportingNotesPdf}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-black bg-[var(--bg-surface)] border border-[var(--border-solid)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all active:scale-95 shadow-xs disabled:opacity-40 cursor-pointer"
                title="Scarica PDF organizzato e formattato da condividere con la psicoterapeuta"
              >
                {isExportingNotesPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-[#5B67CA]" />
                )}
                <span>Scarica PDF</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportNotesDirect('share')}
                disabled={filteredNotes.length === 0 || isExportingNotesPdf}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-black bg-[#5B67CA] hover:bg-[#4A55B8] text-white shadow-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                title="Invia direttamente il report PDF su WhatsApp o email alla psicoterapeuta"
              >
                <Share2 className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Condividi (WhatsApp)</span>
              </button>
            </div>
          </div>

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
                    onExport={handleExportSingleNote}
                    onShowToast={onShowToast}
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
                        onExport={handleExportSingleNote}
                        onShowToast={onShowToast}
                        delayIndex={idx}
                      />
                    ))}
                  </div>
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
                      const symptomLabels = getTagLabels(entry.physicalSymptomTagIds || []);
                      const thoughtLabels = getTagLabels(entry.thoughtTagIds || []);
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
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                              <span className="text-xs font-black text-[var(--text-primary)] shrink-0">
                                {formatTime(entry.eventDatetime)}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--badge-border)] shrink-0">
                                Scheda CBT
                              </span>
                              {entry.photo && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--badge-border)] shrink-0" title="Foto allegata">
                                  <Camera className="w-3 h-3 stroke-[2.5]" />
                                  <span>Foto</span>
                                </span>
                              )}
                              {entry.audioNote && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0" title="Audio-nota vocale">
                                  <Mic className="w-3 h-3 stroke-[2.5]" />
                                  <span>Audio</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0 flex-wrap gap-y-1">
                              {isPrivacyModeEnabled && (
                                <button
                                  type="button"
                                  onClick={(e) => toggleRevealEntry(entry.id, e)}
                                  className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--accent-btn)] text-[var(--text-secondary)] hover:text-[var(--accent-btn-text)] transition-all duration-150 cursor-pointer flex items-center justify-center shrink-0"
                                  title={isRevealed ? 'Nascondi dettagli' : 'Rivelazione rapida testo'}
                                  aria-label="Alterna visibilità scheda"
                                >
                                  {isRevealed ? (
                                    <Eye className="w-4 h-4 stroke-[2.5]" />
                                  ) : (
                                    <EyeOff className="w-4 h-4 text-[var(--accent-primary)] stroke-[2.5]" />
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
                                  className="min-h-[44px] px-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[#5B67CA] text-[var(--text-secondary)] hover:text-white transition-all duration-150 cursor-pointer flex items-center space-x-1 border border-transparent hover:border-[#5B67CA] shrink-0"
                                  title="Esporta PDF dedicato"
                                  aria-label="Esporta PDF"
                                >
                                  <FileDown className="w-3.5 h-3.5 stroke-[2.2]" />
                                  <span className="text-xs font-bold">PDF</span>
                                </button>
                              )}

                              {onEditEntry && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditEntry(entry.id);
                                  }}
                                  className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--accent-btn)] text-[var(--text-primary)] hover:text-[var(--accent-btn-text)] transition-all duration-150 cursor-pointer flex items-center justify-center shrink-0"
                                  title="Modifica scheda"
                                  aria-label="Modifica scheda"
                                >
                                  <Pencil className="w-4 h-4 stroke-[2.5]" />
                                </button>
                              )}

                              <div className={`inline-flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-2.5 py-1 rounded-full text-xs font-black border shrink-0 ${anxietyBadgeStyle}`}>
                                <Activity className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                                <span>Ansia {anxiety}</span>
                                <div className="w-8 sm:w-10 h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden ml-0.5 sm:ml-1 hidden xs:block sm:block">
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
                              {emotionLabels.map((lbl, i) => (
                                <span
                                  key={`t-lbl-${lbl}-${i}`}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                >
                                  <Heart className="w-2.5 h-2.5 text-rose-500 stroke-[2.5] shrink-0 fill-rose-500/20" />
                                  <span>{lbl}</span>
                                </span>
                              ))}
                              {symptomLabels.map((lbl, i) => (
                                <span
                                  key={`t-sy-${lbl}-${i}`}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                >
                                  <Activity className="w-2.5 h-2.5 text-emerald-500 stroke-[2.5] shrink-0" />
                                  <span>{lbl}</span>
                                </span>
                              ))}
                              {thoughtLabels.map((lbl, i) => (
                                <span
                                  key={`t-th-${lbl}-${i}`}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                                >
                                  <Brain className="w-2.5 h-2.5 text-purple-500 stroke-[2.5] shrink-0" />
                                  <span>{lbl}</span>
                                </span>
                              ))}
                              {emotionLabels.length === 0 && symptomLabels.length === 0 && thoughtLabels.length === 0 && (
                                <span className="text-xs font-bold text-[var(--text-muted)] italic">Nessun tag</span>
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
          {/* Notes Therapist Export Bar in Unified All view if notes exist */}
          {filteredNotes.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)]">
              <div className="flex items-center space-x-2 text-xs font-black text-[var(--text-primary)]">
                <BookOpen className="w-4 h-4 text-[var(--accent-primary)] stroke-[2.2] shrink-0" />
                <span>Esportazione Appunti del Diario per Psicoterapeuta ({filteredNotes.length})</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleExportNotesDirect('download')}
                  disabled={isExportingNotesPdf}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-black bg-[var(--bg-surface)] border border-[var(--border-solid)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all active:scale-95 shadow-xs disabled:opacity-40 cursor-pointer"
                  title="Scarica PDF organizzato e formattato da condividere con la psicoterapeuta"
                >
                  {isExportingNotesPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5 text-[#5B67CA]" />
                  )}
                  <span>Scarica PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportNotesDirect('share')}
                  disabled={isExportingNotesPdf}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-black bg-[#5B67CA] hover:bg-[#4A55B8] text-white shadow-xs transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                  title="Invia direttamente il report PDF su WhatsApp o email alla psicoterapeuta"
                >
                  <Share2 className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Condividi (WhatsApp)</span>
                </button>
              </div>
            </div>
          )}

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
                    onExport={handleExportSingleNote}
                    onShowToast={onShowToast}
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
                              onExport={handleExportSingleNote}
                              onShowToast={onShowToast}
                              delayIndex={idx}
                            />
                          </div>
                        );
                      }

                      // Render CBT Entry Card
                      const entry = item.data;
                      const emotionLabels = getTagLabels(entry.emotionTagIds || []);
                      const symptomLabels = getTagLabels(entry.physicalSymptomTagIds || []);
                      const thoughtLabels = getTagLabels(entry.thoughtTagIds || []);
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
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                              <span className="text-xs font-black text-[var(--text-primary)] shrink-0">
                                {formatTime(entry.eventDatetime)}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--badge-border)] shrink-0">
                                Scheda CBT
                              </span>
                              {entry.photo && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[var(--badge-bg)] text-[var(--badge-text)] border border-[var(--badge-border)] shrink-0" title="Foto allegata">
                                  <Camera className="w-3 h-3 stroke-[2.5]" />
                                  <span>Foto</span>
                                </span>
                              )}
                              {entry.audioNote && (
                                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0" title="Audio-nota">
                                  <Mic className="w-3 h-3 stroke-[2.5]" />
                                  <span>Audio</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0 flex-wrap gap-y-1">
                              {isPrivacyModeEnabled && (
                                <button
                                  type="button"
                                  onClick={(e) => toggleRevealEntry(entry.id, e)}
                                  className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--accent-btn)] text-[var(--text-secondary)] hover:text-[var(--accent-btn-text)] transition-all duration-150 cursor-pointer flex items-center justify-center shrink-0"
                                  title={isRevealed ? 'Nascondi dettagli' : 'Rivelazione rapida testo'}
                                  aria-label="Alterna visibilità scheda"
                                >
                                  {isRevealed ? (
                                    <Eye className="w-4 h-4 stroke-[2.5]" />
                                  ) : (
                                    <EyeOff className="w-4 h-4 text-[var(--accent-primary)] stroke-[2.5]" />
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
                                  className="min-h-[44px] px-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[#5B67CA] text-[var(--text-secondary)] hover:text-white transition-all duration-150 cursor-pointer flex items-center space-x-1 border border-transparent hover:border-[#5B67CA] shrink-0"
                                  title="Esporta PDF dedicato"
                                  aria-label="Esporta PDF"
                                >
                                  <FileDown className="w-3.5 h-3.5 stroke-[2.2]" />
                                  <span className="text-xs font-bold">PDF</span>
                                </button>
                              )}

                              {onEditEntry && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditEntry(entry.id);
                                  }}
                                  className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--accent-btn)] text-[var(--text-primary)] hover:text-[var(--accent-btn-text)] transition-all duration-150 cursor-pointer flex items-center justify-center shrink-0"
                                  title="Modifica scheda"
                                  aria-label="Modifica scheda"
                                >
                                  <Pencil className="w-4 h-4 stroke-[2.5]" />
                                </button>
                              )}

                              <div className={`inline-flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-2.5 py-1 rounded-full text-xs font-black border shrink-0 ${anxietyBadgeStyle}`}>
                                <Activity className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                                <span>Ansia {anxiety}</span>
                                <div className="w-8 sm:w-10 h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden ml-0.5 sm:ml-1 hidden xs:block sm:block">
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
                              {emotionLabels.map((lbl, i) => (
                                <span
                                  key={`ut-lbl-${lbl}-${i}`}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                >
                                  <Heart className="w-2.5 h-2.5 text-rose-500 stroke-[2.5] shrink-0 fill-rose-500/20" />
                                  <span>{lbl}</span>
                                </span>
                              ))}
                              {symptomLabels.map((lbl, i) => (
                                <span
                                  key={`ut-sy-${lbl}-${i}`}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                >
                                  <Activity className="w-2.5 h-2.5 text-emerald-500 stroke-[2.5] shrink-0" />
                                  <span>{lbl}</span>
                                </span>
                              ))}
                              {thoughtLabels.map((lbl, i) => (
                                <span
                                  key={`ut-th-${lbl}-${i}`}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                                >
                                  <Brain className="w-2.5 h-2.5 text-purple-500 stroke-[2.5] shrink-0" />
                                  <span>{lbl}</span>
                                </span>
                              ))}
                              {emotionLabels.length === 0 && symptomLabels.length === 0 && thoughtLabels.length === 0 && (
                                <span className="text-xs font-bold text-[var(--text-muted)] italic">Nessun tag</span>
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
        onShowToast={onShowToast}
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
