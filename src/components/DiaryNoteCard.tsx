import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DiaryNote, DiaryNoteCategory, DiaryNoteMood } from '../types';
import {
  Pin,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Mic,
  Camera,
  Play,
  Pause,
  Clock,
  Sparkles,
  FileDown,
  Loader2,
} from 'lucide-react';
import { exportSingleDiaryNotePdf } from '../services/diaryReportGenerator';

interface DiaryNoteCardProps {
  note: DiaryNote;
  isPrivacyModeEnabled?: boolean;
  onEdit: (note: DiaryNote) => void;
  onDelete: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  onExport?: (note: DiaryNote) => void;
  onShowToast?: (msg: string) => void;
  delayIndex?: number;
}

const CATEGORY_STYLES: Record<DiaryNoteCategory, { icon: string; style: string }> = {
  Riflessione: { icon: '🔮', style: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' },
  Gratitudine: { icon: '🌟', style: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  Pensiero: { icon: '💡', style: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  Obiettivo: { icon: '🎯', style: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  Promemoria: { icon: '📌', style: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' },
  Altro: { icon: '📝', style: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30' },
};

const MOOD_EMOJIS: Record<DiaryNoteMood, { emoji: string; label: string }> = {
  sereno: { emoji: '😊', label: 'Sereno' },
  grato: { emoji: '🌟', label: 'Grato' },
  calmo: { emoji: '🌿', label: 'Calmo' },
  riflessivo: { emoji: '🤔', label: 'Riflessivo' },
  energico: { emoji: '⚡', label: 'Energico' },
  ansioso: { emoji: '🌪️', label: 'Ansioso' },
  triste: { emoji: '💙', label: 'Giù' },
};

export const DiaryNoteCard: React.FC<DiaryNoteCardProps> = ({
  note,
  isPrivacyModeEnabled = false,
  onEdit,
  onDelete,
  onTogglePin,
  onExport,
  onShowToast,
  delayIndex = 0,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const shouldBlur = isPrivacyModeEnabled && !isRevealed;

  const handleExportPdf = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onExport) {
      onExport(note);
      return;
    }
    setIsExportingPdf(true);
    try {
      await exportSingleDiaryNotePdf(note, undefined, onShowToast, 'auto');
    } catch (err) {
      console.error('Errore export PDF appunto:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleCopyText = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fullText = `${note.title ? note.title + '\n\n' : ''}${note.content}`;
    navigator.clipboard?.writeText(fullText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const categoryInfo = note.category ? CATEGORY_STYLES[note.category] : CATEGORY_STYLES.Riflessione;
  const moodInfo = note.mood ? MOOD_EMOJIS[note.mood] : undefined;

  const staggerDelay = Math.min(delayIndex * 0.04, 0.25);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.35,
          delay: staggerDelay,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={`privacy-card glass-panel rounded-[20px] p-4 sm:p-5 transition-all duration-150 border bg-[var(--bg-surface)] hover:shadow-md space-y-3 group ${
          note.pinned
            ? 'border-amber-500/40 bg-gradient-to-br from-[var(--bg-surface)] to-amber-500/5 ring-1 ring-amber-500/20'
            : 'border-[var(--border-solid)]'
        } ${isRevealed ? 'privacy-revealed' : ''}`}
      >
        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="text-xs font-black text-[var(--text-primary)] flex items-center space-x-1 shrink-0">
              <Clock className="w-3 h-3 text-[var(--text-secondary)]" />
              <span>{formatTime(note.createdAt)}</span>
            </span>

            {note.pinned && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-2xs shrink-0">
                <Pin className="w-3 h-3 fill-amber-500 stroke-[2.5]" />
                <span>In evidenza</span>
              </span>
            )}

            {note.category && (
              <span className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border shrink-0 ${categoryInfo.style}`}>
                <span>{categoryInfo.icon}</span>
                <span>{note.category}</span>
              </span>
            )}

            {moodInfo && (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-solid)] shrink-0">
                <span>{moodInfo.emoji}</span>
                <span>{moodInfo.label}</span>
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0 flex-wrap gap-y-1">
            {isPrivacyModeEnabled && (
              <button
                type="button"
                onClick={() => setIsRevealed(!isRevealed)}
                className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--accent-btn)] text-[var(--text-secondary)] hover:text-[var(--accent-btn-text)] transition-colors cursor-pointer flex items-center justify-center shrink-0"
                title={isRevealed ? 'Nascondi' : 'Mostra'}
                aria-label="Privacy toggle"
              >
                {isRevealed ? (
                  <Eye className="w-4 h-4 stroke-[2.5]" />
                ) : (
                  <EyeOff className="w-4 h-4 text-[var(--accent-primary)] stroke-[2.5]" />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyText}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--accent-btn)] text-[var(--text-secondary)] hover:text-[var(--accent-btn-text)] transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Copia testo"
              aria-label="Copia testo appunto"
            >
              {isCopied ? (
                <Check className="w-4 h-4 text-emerald-500 stroke-[3]" />
              ) : (
                <Copy className="w-4 h-4 stroke-[2.2]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onTogglePin(note.id)}
              className={`min-h-[44px] min-w-[44px] rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0 ${
                note.pinned
                  ? 'bg-amber-500/20 text-amber-500'
                  : 'bg-[var(--bg-subtle)] hover:bg-[var(--accent-btn)] text-[var(--text-secondary)] hover:text-[var(--accent-btn-text)]'
              }`}
              title={note.pinned ? 'Rimuovi dai fissati' : 'Fissa in evidenza'}
              aria-label="Fissa in alto"
            >
              <Pin className={`w-4 h-4 stroke-[2.5] ${note.pinned ? 'fill-amber-500' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="min-h-[44px] px-2.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[#5B67CA] text-[var(--text-secondary)] hover:text-white transition-all duration-150 cursor-pointer flex items-center space-x-1 border border-transparent hover:border-[#5B67CA] shrink-0"
              title="Esporta appunto in PDF per la psicoterapeuta"
              aria-label="Esporta PDF appunto"
            >
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4 stroke-[2.2]" />
              )}
              <span className="text-xs font-bold">PDF</span>
            </button>

            <button
              type="button"
              onClick={() => onEdit(note)}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--accent-btn)] text-[var(--text-primary)] hover:text-[var(--accent-btn-text)] transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Modifica appunto"
              aria-label="Modifica"
            >
              <Pencil className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              type="button"
              onClick={() => onDelete(note.id)}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-[var(--bg-subtle)] hover:bg-rose-500/20 text-rose-500 hover:text-rose-600 transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Elimina appunto"
              aria-label="Elimina"
            >
              <Trash2 className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Title (if present) */}
        {note.title && (
          <h4
            className={`text-base font-black text-[var(--text-primary)] tracking-tight ${
              shouldBlur ? 'privacy-blurred' : ''
            }`}
            onClick={() => {
              if (isPrivacyModeEnabled && !isRevealed) setIsRevealed(true);
            }}
          >
            {note.title}
          </h4>
        )}

        {/* Content */}
        {note.content && (
          <p
            className={`text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed ${
              shouldBlur ? 'privacy-blurred' : ''
            }`}
            onClick={() => {
              if (isPrivacyModeEnabled && !isRevealed) setIsRevealed(true);
            }}
          >
            {note.content}
          </p>
        )}

        {/* Audio Note Player */}
        {note.audioNote && (
          <div className="pt-1">
            <div className="flex items-center space-x-2 p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] max-w-sm">
              <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-500">
                <Mic className="w-4 h-4 stroke-[2.5]" />
              </div>
              <audio
                controls
                src={note.audioNote}
                className="h-8 w-full max-w-[240px] focus:outline-none"
              />
              {note.audioDuration && (
                <span className="text-[10px] font-black text-[var(--text-secondary)] whitespace-nowrap">
                  {Math.floor(note.audioDuration)}s
                </span>
              )}
            </div>
          </div>
        )}

        {/* Photo Attachment Preview */}
        {note.photo && (
          <div className="pt-1">
            <div
              className="relative inline-block rounded-xl overflow-hidden border border-[var(--border-solid)] cursor-pointer group/photo max-h-48"
              onClick={() => setShowPhotoModal(true)}
            >
              <img
                src={note.photo}
                alt="Foto allegata"
                className="max-h-40 w-auto rounded-xl object-cover transition-transform group-hover/photo:scale-102"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold space-x-1">
                <Camera className="w-4 h-4" />
                <span>Ingrandisci</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Photo Modal */}
      {showPhotoModal && note.photo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowPhotoModal(false)}
        >
          <div className="relative max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl">
            <img
              src={note.photo}
              alt="Foto allegata"
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </>
  );
};
