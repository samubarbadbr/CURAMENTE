import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DiaryNote, DiaryNoteCategory, DiaryNoteMood } from '../types';
import {
  X,
  Save,
  Pin,
  Camera,
  Trash2,
  Calendar,
  Cloud,
  Mic,
  BookOpen,
  FileDown,
  Share2,
  Loader2,
} from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { exportSingleDiaryNotePdf } from '../services/diaryReportGenerator';

interface DiaryNoteModalProps {
  isOpen: boolean;
  initialNote?: DiaryNote | null;
  onSave: (note: DiaryNote) => void;
  onClose: () => void;
  isSyncConfigured?: boolean;
  onShowToast?: (msg: string) => void;
}

const CATEGORIES: { value: DiaryNoteCategory; label: string; icon: string; style: string }[] = [
  { value: 'Riflessione', label: 'Riflessione', icon: '🔮', style: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
  { value: 'Gratitudine', label: 'Gratitudine', icon: '🌟', style: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { value: 'Pensiero', label: 'Pensiero', icon: '💡', style: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  { value: 'Obiettivo', label: 'Obiettivo', icon: '🎯', style: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  { value: 'Promemoria', label: 'Promemoria', icon: '📌', style: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  { value: 'Altro', label: 'Altro', icon: '📝', style: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' },
];

const MOODS: { value: DiaryNoteMood; label: string; fullLabel: string; emoji: string }[] = [
  { value: 'sereno', label: 'Sereno', fullLabel: 'Sereno', emoji: '😊' },
  { value: 'grato', label: 'Grato', fullLabel: 'Grato', emoji: '🌟' },
  { value: 'calmo', label: 'Calmo', fullLabel: 'Calmo', emoji: '🌿' },
  { value: 'riflessivo', label: 'Riflessivo', fullLabel: 'Riflessivo', emoji: '🤔' },
  { value: 'energico', label: 'Energico', fullLabel: 'Energico', emoji: '⚡' },
  { value: 'ansioso', label: 'Ansioso', fullLabel: 'Ansioso', emoji: '🌪️' },
  { value: 'triste', label: 'Giù', fullLabel: 'Giù di corda', emoji: '💙' },
];

export const DiaryNoteModal: React.FC<DiaryNoteModalProps> = ({
  isOpen,
  initialNote,
  onSave,
  onClose,
  isSyncConfigured = false,
  onShowToast,
}) => {
  // Lock body scrolling when modal is open so the background cannot scroll up/down
  useBodyScrollLock(isOpen);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<DiaryNoteCategory>('Riflessione');
  const [mood, setMood] = useState<DiaryNoteMood>('sereno');
  const [pinned, setPinned] = useState(false);
  const [eventDatetime, setEventDatetime] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [audioNote, setAudioNote] = useState<string | undefined>(undefined);
  const [audioDuration, setAudioDuration] = useState<number | undefined>(undefined);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialNote) {
        setTitle(initialNote.title || '');
        setContent(initialNote.content || '');
        setCategory(initialNote.category || 'Riflessione');
        setMood(initialNote.mood || 'sereno');
        setPinned(!!initialNote.pinned);
        setPhoto(initialNote.photo);
        setAudioNote(initialNote.audioNote);
        setAudioDuration(initialNote.audioDuration);
        setShowAudioRecorder(!!initialNote.audioNote);

        try {
          const d = new Date(initialNote.createdAt);
          const offset = d.getTimezoneOffset() * 60000;
          const localIso = new Date(d.getTime() - offset).toISOString().slice(0, 16);
          setEventDatetime(localIso);
        } catch {
          const now = new Date();
          const offset = now.getTimezoneOffset() * 60000;
          setEventDatetime(new Date(now.getTime() - offset).toISOString().slice(0, 16));
        }
      } else {
        setTitle('');
        setContent('');
        setCategory('Riflessione');
        setMood('sereno');
        setPinned(false);
        setPhoto(undefined);
        setAudioNote(undefined);
        setAudioDuration(undefined);
        setShowAudioRecorder(false);

        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        setEventDatetime(new Date(now.getTime() - offset).toISOString().slice(0, 16));
      }
      setErrorMsg('');
    }
  }, [isOpen, initialNote]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('La foto selezionata supera 2MB. Scegli un file più piccolo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhoto(undefined);
  };

  const handleExportPdf = async (mode: 'download' | 'share') => {
    if (!content.trim() && !title.trim() && !audioNote) {
      setErrorMsg('Inserisci almeno un contenuto prima di esportare il PDF.');
      return;
    }

    setIsExportingPdf(true);
    const tempNote: DiaryNote = {
      id: initialNote ? initialNote.id : `note-temp-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      createdAt: eventDatetime ? new Date(eventDatetime).toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category,
      mood,
      pinned,
      photo,
      audioNote,
      audioDuration,
    };

    try {
      await exportSingleDiaryNotePdf(
        tempNote,
        undefined,
        (msg) => onShowToast?.(msg),
        mode
      );
    } catch (err) {
      console.error('Errore export PDF appunto:', err);
      onShowToast?.('Errore durante la generazione del PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() && !title.trim() && !audioNote) {
      setErrorMsg('Inserisci almeno un testo, un titolo o un audio per salvare la nota.');
      return;
    }

    const noteToSave: DiaryNote = {
      id: initialNote ? initialNote.id : `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      title: title.trim(),
      content: content.trim(),
      createdAt: eventDatetime ? new Date(eventDatetime).toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category,
      mood,
      pinned,
      photo,
      audioNote,
      audioDuration,
    };

    onSave(noteToSave);
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-hidden overscroll-contain"
      onClick={onClose}
      style={{ isolation: 'isolate' }}
    >
      <div
        className="relative w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[92vh] flex flex-col bg-[var(--bg-surface)] sm:rounded-2xl border-0 sm:border border-[var(--border-solid)] shadow-2xl overflow-hidden overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-[var(--border-solid)] bg-[var(--bg-subtle)]/70 shrink-0 gap-2">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] shrink-0">
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-[var(--text-primary)] truncate">
                {initialNote ? 'Modifica Appunto' : 'Nuovo Appunto nel Diario'}
              </h3>
              <div className="flex items-center space-x-1.5 text-[10px] sm:text-[11px] font-bold text-[var(--text-secondary)]">
                <Cloud className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5] shrink-0" />
                <span className="truncate">
                  {isSyncConfigured
                    ? 'Salvato in locale e sincronizzato su Supabase'
                    : 'Salvato in locale'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Direct Quick PDF Button in Header */}
            {(content.trim() || title.trim()) && (
              <button
                type="button"
                onClick={() => handleExportPdf('download')}
                disabled={isExportingPdf}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-black bg-[var(--bg-surface)] border border-[var(--border-solid)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer shadow-2xs"
                title="Esporta subito questo appunto in PDF per la psicoterapeuta"
              >
                {isExportingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5 text-[#5B67CA] stroke-[2.5]" />
                )}
                <span className="text-[11px]">PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer shrink-0"
              aria-label="Chiudi"
            >
              <X className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4 touch-pan-y"
        >
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Date & Pinned switch */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
              <input
                type="datetime-local"
                value={eventDatetime}
                onChange={(e) => setEventDatetime(e.target.value)}
                className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>

            <button
              type="button"
              onClick={() => setPinned(!pinned)}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                pinned
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs'
                  : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-solid)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Pin className={`w-3.5 h-3.5 stroke-[2.5] ${pinned ? 'fill-amber-500' : ''}`} />
              <span>{pinned ? 'In evidenza 📌' : 'Fissa in alto'}</span>
            </button>
          </div>

          {/* Category Chips */}
          <div>
            <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Categoria
            </label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center space-x-1.5 ${
                      isSelected
                        ? `${cat.style} font-black shadow-xs ring-1 ring-current`
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-solid)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mood Selector */}
          <div>
            <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Come ti senti? (Umore)
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
              {MOODS.map((m) => {
                const isSelected = mood === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMood(m.value)}
                    className={`p-2 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 min-h-[54px] ${
                      isSelected
                        ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--accent-primary)] font-black shadow-xs ring-1 ring-[var(--accent-primary)]'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-solid)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                    }`}
                    title={m.fullLabel}
                  >
                    <span className="text-xl sm:text-2xl leading-none">{m.emoji}</span>
                    <span className="text-[11px] font-bold leading-tight">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title Field (Optional) */}
          <div>
            <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              Titolo (opzionale)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Riflessione serale, Idea importante, Pensiero positivo..."
              className="w-full text-sm font-bold px-3.5 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
          </div>

          {/* Content Field with break-words */}
          <div>
            <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              Cosa vuoi appuntarti? <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Scrivi liberamente: un pensiero, un momento speciale, una riflessione dopo una conversazione, un promemoria per la prossima seduta..."
              className="w-full text-sm font-medium leading-relaxed p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors resize-y min-h-[140px] break-words"
              style={{ overflowWrap: 'anywhere' }}
            />
          </div>

          {/* Audio Note Recorder Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowAudioRecorder(!showAudioRecorder)}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>{showAudioRecorder ? 'Nascondi registrazione vocale' : 'Aggiungi nota vocale'}</span>
                {audioNote && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
              {audioNote && (
                <button
                  type="button"
                  onClick={() => {
                    setAudioNote(undefined);
                    setAudioDuration(undefined);
                  }}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Elimina audio</span>
                </button>
              )}
            </div>

            {showAudioRecorder && (
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)]">
                <AudioRecorder
                  audioNote={audioNote}
                  audioDuration={audioDuration}
                  onChange={(b64, dur) => {
                    setAudioNote(b64);
                    setAudioDuration(dur);
                  }}
                />
              </div>
            )}
          </div>

          {/* Photo Attachment Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="inline-flex items-center space-x-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer">
                <Camera className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Allega un'immagine o foto</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              {photo && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Rimuovi foto</span>
                </button>
              )}
            </div>

            {photo && (
              <div className="relative rounded-xl overflow-hidden border border-[var(--border-solid)] max-h-48 bg-black/10">
                <img
                  src={photo}
                  alt="Allegato appunto"
                  className="w-full h-auto max-h-48 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions with Direct Therapist PDF Export & Safe Area padding */}
        <div className="p-3 sm:p-4 border-t border-[var(--border-solid)] bg-[var(--bg-surface)] shrink-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-4 shadow-lg">
          {/* PDF export buttons for therapist */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => handleExportPdf('download')}
              disabled={isExportingPdf || (!content.trim() && !title.trim())}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-40 transition-all cursor-pointer"
              title="Scarica questo appunto formattato in PDF per la psicoterapeuta"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4 text-[#5B67CA] stroke-[2.2]" />
              )}
              <span>Esporta PDF</span>
            </button>
            <button
              type="button"
              onClick={() => handleExportPdf('share')}
              disabled={isExportingPdf || (!content.trim() && !title.trim())}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-1.5 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-[#5B67CA]/15 text-[#5B67CA] hover:bg-[#5B67CA]/25 border border-[#5B67CA]/30 disabled:opacity-40 transition-all cursor-pointer"
              title="Condividi via WhatsApp o email con la terapeuta"
            >
              <Share2 className="w-4 h-4 stroke-[2.2]" />
              <span>Invia WhatsApp</span>
            </button>
          </div>

          {/* Form Confirm / Cancel */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center justify-center"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              className="flex-1 sm:flex-initial px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-black bg-[var(--accent-btn)] text-[var(--accent-btn-text)] hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer border border-[var(--border-solid)]"
            >
              <Save className="w-4 h-4 stroke-[2.5] text-[var(--accent-btn-text)]" />
              <span className="text-[var(--accent-btn-text)]">Salva nel Diario</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
