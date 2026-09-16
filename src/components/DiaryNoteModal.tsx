import React, { useState, useEffect } from 'react';
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
  Sparkles,
  Smile,
  BookOpen,
} from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';

interface DiaryNoteModalProps {
  isOpen: boolean;
  initialNote?: DiaryNote | null;
  onSave: (note: DiaryNote) => void;
  onClose: () => void;
  isSyncConfigured?: boolean;
}

const CATEGORIES: { value: DiaryNoteCategory; label: string; icon: string; style: string }[] = [
  { value: 'Riflessione', label: 'Riflessione', icon: '🔮', style: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
  { value: 'Gratitudine', label: 'Gratitudine', icon: '🌟', style: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { value: 'Pensiero', label: 'Pensiero', icon: '💡', style: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  { value: 'Obiettivo', label: 'Obiettivo', icon: '🎯', style: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  { value: 'Promemoria', label: 'Promemoria', icon: '📌', style: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  { value: 'Altro', label: 'Altro', icon: '📝', style: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' },
];

const MOODS: { value: DiaryNoteMood; label: string; emoji: string }[] = [
  { value: 'sereno', label: 'Sereno', emoji: '😊' },
  { value: 'grato', label: 'Grato', emoji: '🌟' },
  { value: 'calmo', label: 'Calmo', emoji: '🌿' },
  { value: 'riflessivo', label: 'Riflessivo', emoji: '🤔' },
  { value: 'energico', label: 'Energico', emoji: '⚡' },
  { value: 'ansioso', label: 'Ansioso', emoji: '🌪️' },
  { value: 'triste', label: 'Giù di corda', emoji: '💙' },
];

export const DiaryNoteModal: React.FC<DiaryNoteModalProps> = ({
  isOpen,
  initialNote,
  onSave,
  onClose,
  isSyncConfigured = false,
}) => {
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

        // Convert ISO string to local input format "YYYY-MM-DDTHH:mm"
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-solid)] shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border-solid)] bg-[var(--bg-subtle)]/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
              <BookOpen className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)]">
                {initialNote ? 'Modifica Appunto' : 'Nuovo Appunto nel Diario'}
              </h3>
              <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[var(--text-secondary)]">
                <Cloud className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                <span>
                  {isSyncConfigured
                    ? 'Salvato in locale e sincronizzato su Supabase'
                    : 'Salvato in locale (connetti Supabase per il backup cloud)'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          {/* Date & Pinned switch */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[var(--text-secondary)]" />
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
            <div className="flex flex-wrap gap-1.5">
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
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
              {MOODS.map((m) => {
                const isSelected = mood === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMood(m.value)}
                    className={`p-2 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center space-y-0.5 ${
                      isSelected
                        ? 'bg-[var(--accent-primary)]/15 border-[var(--accent-primary)] text-[var(--accent-primary)] font-black shadow-xs ring-1 ring-[var(--accent-primary)]'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-solid)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                    }`}
                    title={m.label}
                  >
                    <span className="text-xl">{m.emoji}</span>
                    <span className="text-[10px] font-bold truncate max-w-full">{m.label}</span>
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

          {/* Content Field */}
          <div>
            <label className="block text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              Cosa vuoi appuntarti? <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Scrivi liberamente: un pensiero, un momento speciale, una riflessione dopo una conversazione, un promemoria per la prossima seduta..."
              className="w-full text-sm font-medium leading-relaxed p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors resize-y min-h-[140px]"
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

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-3 p-4 sm:p-5 border-t border-[var(--border-solid)] bg-[var(--bg-subtle)]/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-[var(--accent-primary)] text-white hover:opacity-90 active:scale-95 transition-all shadow-md flex items-center space-x-2 cursor-pointer"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>Salva nel Diario</span>
          </button>
        </div>
      </div>
    </div>
  );
};
