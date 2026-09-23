import React, { useState, useMemo } from 'react';
import { CbtEntry, CustomQuestion, Tag, DiaryNote } from '../types';
import {
  TherapistReportFilterOptions,
  filterEntriesForReport,
  generateTherapistCsv,
  exportTherapistPdf,
} from '../services/therapistReportGenerator';
import { exportDiaryNotesPdf, filterNotesForReport } from '../services/diaryReportGenerator';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { CustomDatePicker } from './CustomDatePicker';
import {
  X,
  FileText,
  Table,
  Calendar,
  User,
  ArrowUpDown,
  AlertCircle,
  Loader2,
  Download,
  ListChecks,
  Share2,
  BookOpen,
  Layers,
} from 'lucide-react';
import { canSharePdfFiles, isMobileDevice } from '../services/pdfSharingUtils';

interface TherapistExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: CbtEntry[];
  notes?: DiaryNote[];
  allTags: Tag[];
  customQuestions: CustomQuestion[];
  onShowToast: (msg: string) => void;
  initialExportScope?: 'cbt' | 'notes' | 'all';
}

export const TherapistExportModal: React.FC<TherapistExportModalProps> = ({
  isOpen,
  onClose,
  entries,
  notes = [],
  allTags,
  customQuestions,
  onShowToast,
  initialExportScope = 'cbt',
}) => {
  // Lock background scroll when modal is open
  useBodyScrollLock(isOpen);

  // Export scope: 'cbt', 'notes', or 'all'
  const [exportScope, setExportScope] = useState<'cbt' | 'notes' | 'all'>(initialExportScope);

  // Saved patient name in localStorage
  const [patientName, setPatientName] = useState(() => {
    return localStorage.getItem('diariamente_patient_name') || '';
  });

  const [period, setPeriod] = useState<'last_session' | '7' | 'month' | '30' | 'custom' | 'all'>('7');

  // Saved last session date
  const [lastSessionDate, setLastSessionDate] = useState(() => {
    const saved = localStorage.getItem('diariamente_last_session_date');
    if (saved) return saved;
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });

  // Today string
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const sevenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, []);

  const [customStartDate, setCustomStartDate] = useState(sevenDaysAgoStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSharingPdf, setIsSharingPdf] = useState(false);

  // Handle patient name change with persistent storage
  const handlePatientNameChange = (val: string) => {
    setPatientName(val);
    localStorage.setItem('diariamente_patient_name', val);
  };

  // Handle last session date change
  const handleLastSessionDateChange = (val: string) => {
    setLastSessionDate(val);
    localStorage.setItem('diariamente_last_session_date', val);
    if (period === 'last_session') {
      setCustomStartDate(val);
    }
  };

  // Quick shortcut handlers
  const handleSelectLastSession = () => {
    setPeriod('last_session');
    setCustomStartDate(lastSessionDate);
    setCustomEndDate(todayStr);
  };

  const handleSelect7Days = () => {
    setPeriod('7');
    const d = new Date();
    d.setDate(d.getDate() - 7);
    setCustomStartDate(d.toISOString().slice(0, 10));
    setCustomEndDate(todayStr);
  };

  const handleSelectCurrentMonth = () => {
    setPeriod('month');
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    setCustomStartDate(d.toISOString().slice(0, 10));
    setCustomEndDate(todayStr);
  };

  const handleSelectAll = () => {
    setPeriod('all');
    if (entries.length > 0) {
      const sorted = [...entries].sort(
        (a, b) => new Date(a.eventDatetime).getTime() - new Date(b.eventDatetime).getTime()
      );
      setCustomStartDate(sorted[0].eventDatetime.slice(0, 10));
    } else {
      setCustomStartDate('2025-01-01');
    }
    setCustomEndDate(todayStr);
  };

  // Build filter options object
  const filterOptions: TherapistReportFilterOptions = useMemo(
    () => ({
      patientName: patientName.trim(),
      period,
      customStartDate,
      customEndDate,
      lastSessionDate,
      sortOrder,
    }),
    [patientName, period, customStartDate, customEndDate, lastSessionDate, sortOrder]
  );

  // Filter entries and notes in real-time
  const filteredEntries = useMemo(() => {
    return filterEntriesForReport(entries, filterOptions);
  }, [entries, filterOptions]);

  const filteredNotes = useMemo(() => {
    return filterNotesForReport(notes, {
      patientName: patientName.trim(),
      period,
      customStartDate,
      customEndDate,
      lastSessionDate,
      sortOrder,
    });
  }, [notes, patientName, period, customStartDate, customEndDate, lastSessionDate, sortOrder]);

  const totalSelectedItems = useMemo(() => {
    if (exportScope === 'cbt') return filteredEntries.length;
    if (exportScope === 'notes') return filteredNotes.length;
    return filteredEntries.length + filteredNotes.length;
  }, [exportScope, filteredEntries.length, filteredNotes.length]);

  if (!isOpen) return null;

  // 1. Direct PDF Export (Download immediato del file PDF nel dispositivo)
  const handleExportPdf = async () => {
    if (totalSelectedItems === 0) {
      onShowToast('Nessuna registrazione trovata per il periodo selezionato');
      return;
    }
    setIsExportingPdf(true);
    try {
      if (exportScope === 'notes') {
        await exportDiaryNotesPdf(
          filteredNotes,
          {
            patientName: patientName.trim(),
            period,
            customStartDate,
            customEndDate,
            lastSessionDate,
            sortOrder,
          },
          onShowToast,
          'download'
        );
      } else if (exportScope === 'cbt') {
        await exportTherapistPdf(filteredEntries, allTags, customQuestions, filterOptions, onShowToast, 'download');
      } else {
        // Both: first CBT entries, then Notes
        if (filteredEntries.length > 0) {
          await exportTherapistPdf(filteredEntries, allTags, customQuestions, filterOptions, onShowToast, 'download');
        }
        if (filteredNotes.length > 0) {
          await exportDiaryNotesPdf(
            filteredNotes,
            {
              patientName: patientName.trim(),
              period,
              customStartDate,
              customEndDate,
              lastSessionDate,
              sortOrder,
            },
            onShowToast,
            'download'
          );
        }
      }
    } catch (err) {
      console.error('Error during PDF export:', err);
      onShowToast('Errore durante la generazione del PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // 2. Direct PDF Sharing (Ideale per WhatsApp, Telegram, Email su smartphone)
  const handleSharePdf = async () => {
    if (totalSelectedItems === 0) {
      onShowToast('Nessuna registrazione trovata per il periodo selezionato');
      return;
    }
    setIsSharingPdf(true);
    try {
      if (exportScope === 'notes') {
        await exportDiaryNotesPdf(
          filteredNotes,
          {
            patientName: patientName.trim(),
            period,
            customStartDate,
            customEndDate,
            lastSessionDate,
            sortOrder,
          },
          onShowToast,
          'share'
        );
      } else if (exportScope === 'cbt') {
        await exportTherapistPdf(filteredEntries, allTags, customQuestions, filterOptions, onShowToast, 'share');
      } else {
        // Share notes if only notes exist, or CBT if only CBT exist, or CBT first
        if (filteredEntries.length > 0) {
          await exportTherapistPdf(filteredEntries, allTags, customQuestions, filterOptions, onShowToast, 'share');
        } else if (filteredNotes.length > 0) {
          await exportDiaryNotesPdf(
            filteredNotes,
            {
              patientName: patientName.trim(),
              period,
              customStartDate,
              customEndDate,
              lastSessionDate,
              sortOrder,
            },
            onShowToast,
            'share'
          );
        }
      }
    } catch (err) {
      console.error('Error during PDF share:', err);
      onShowToast('Errore durante la condivisione del PDF');
    } finally {
      setIsSharingPdf(false);
    }
  };

  // 3. Direct CSV Export (Formattato con le medesime sezioni e colonne)
  const handleExportCsvData = async () => {
    if (filteredEntries.length === 0) {
      onShowToast('Nessuna scheda CBT da esportare in formato CSV');
      return;
    }

    const csv = generateTherapistCsv(filteredEntries, allTags, customQuestions, filterOptions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const filename = `diariamente-report-clinico-${new Date().toISOString().slice(0, 10)}.csv`;

    // Direct download con timeout esteso a 60s per evitare chiusure precoci
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        link.remove();
        URL.revokeObjectURL(url);
      } catch (_) {}
    }, 60000);
    onShowToast('File CSV/Excel scaricato con successo');
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in overscroll-contain"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[90vh] sm:max-h-[92vh] flex flex-col bg-[var(--bg-surface)] border border-[var(--border-solid)] rounded-[24px] shadow-2xl overflow-hidden text-[var(--text-primary)] animate-scale-up overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[var(--border-solid)] bg-[var(--bg-subtle)]/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5B67CA]/15 border border-[#5B67CA]/30 text-[#5B67CA] flex items-center justify-center shrink-0 shadow-sm">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-[var(--text-primary)]">
                Esporta Report Clinico
              </h2>
              <p className="text-[11px] sm:text-xs font-semibold text-[var(--text-secondary)]">
                Report professionale per la seduta con la terapeuta
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] active:scale-95 transition-all cursor-pointer"
            title="Chiudi"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5 text-sm touch-pan-y">
          
          {/* EXPORT SCOPE SELECTOR */}
          <div className="space-y-1.5">
            <label className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[var(--text-secondary)]">
              <Layers className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Cosa desideri esportare?</span>
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center space-y-0.5 ${
                  exportScope === 'all'
                    ? 'bg-[#5B67CA]/15 text-[#5B67CA] border-[#5B67CA]/50 font-black shadow-xs ring-1 ring-[#5B67CA]'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-solid)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Tutto</span>
                </div>
                <span className="text-[10px] opacity-80">({filteredEntries.length + filteredNotes.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('cbt')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center space-y-0.5 ${
                  exportScope === 'cbt'
                    ? 'bg-[#5B67CA]/15 text-[#5B67CA] border-[#5B67CA]/50 font-black shadow-xs ring-1 ring-[#5B67CA]'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-solid)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <ListChecks className="w-3.5 h-3.5" />
                  <span>Schede CBT</span>
                </div>
                <span className="text-[10px] opacity-80">({filteredEntries.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setExportScope('notes')}
                className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center justify-center space-y-0.5 ${
                  exportScope === 'notes'
                    ? 'bg-[#5B67CA]/15 text-[#5B67CA] border-[#5B67CA]/50 font-black shadow-xs ring-1 ring-[#5B67CA]'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-[var(--border-solid)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex items-center space-x-1">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Appunti</span>
                </div>
                <span className="text-[10px] opacity-80">({filteredNotes.length})</span>
              </button>
            </div>
          </div>

          {/* PATIENT NAME FIELD */}
          <div className="space-y-1.5">
            <label className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[var(--text-secondary)]">
              <User className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
              <span>Nome Paziente (per intestazione)</span>
            </label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => handlePatientNameChange(e.target.value)}
              placeholder="Es. Samuele (oppure lascia vuoto)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm font-medium"
            />
          </div>

          {/* DATE RANGE FILTER & SHORTCUTS */}
          <div className="space-y-3 p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-subtle)]/70 border border-[var(--border-solid)]">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[var(--text-secondary)]">
                <Calendar className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Periodo del Report</span>
              </label>
              <span className="text-[11px] font-bold text-[#5B67CA] bg-[#5B67CA]/10 px-2.5 py-0.5 rounded-full border border-[#5B67CA]/20">
                {exportScope === 'cbt'
                  ? `${filteredEntries.length} ${filteredEntries.length === 1 ? 'scheda CBT' : 'schede CBT'}`
                  : exportScope === 'notes'
                  ? `${filteredNotes.length} ${filteredNotes.length === 1 ? 'appunto' : 'appunti'}`
                  : `${filteredEntries.length} schede + ${filteredNotes.length} appunti`}
              </span>
            </div>

            {/* Quick Shortcuts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={handleSelectLastSession}
                className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center border ${
                  period === 'last_session'
                    ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] border-transparent shadow-sm'
                    : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-solid)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                Dall'ultima seduta
              </button>

              <button
                type="button"
                onClick={handleSelect7Days}
                className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center border ${
                  period === '7'
                    ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] border-transparent shadow-sm'
                    : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-solid)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                Ultimi 7 giorni
              </button>

              <button
                type="button"
                onClick={handleSelectCurrentMonth}
                className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center border ${
                  period === 'month'
                    ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] border-transparent shadow-sm'
                    : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-solid)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                Mese corrente
              </button>

              <button
                type="button"
                onClick={handleSelectAll}
                className={`py-2 px-2 rounded-xl text-xs font-black transition-all cursor-pointer text-center border ${
                  period === 'all'
                    ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] border-transparent shadow-sm'
                    : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-solid)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                Tutto lo storico
              </button>
            </div>

            {/* Date Pickers: Data Inizio & Data Fine */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 relative z-20">
              <div>
                <CustomDatePicker
                  label="Data Inizio:"
                  value={customStartDate}
                  onChange={(val) => {
                    setCustomStartDate(val);
                    setPeriod('custom');
                  }}
                />
              </div>
              <div>
                <CustomDatePicker
                  label="Data Fine:"
                  value={customEndDate}
                  onChange={(val) => {
                    setCustomEndDate(val);
                    setPeriod('custom');
                  }}
                />
              </div>
            </div>

            {/* Last Session Date Configuration (saved in localStorage) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-[var(--text-secondary)] border-t border-[var(--border-solid)]/60 relative z-20">
              <span>Data di riferimento ultima seduta:</span>
              <div className="w-44">
                <CustomDatePicker
                  value={lastSessionDate}
                  onChange={(val) => handleLastSessionDateChange(val)}
                />
              </div>
            </div>
          </div>

          {/* SCHEMA OPERATIVO DEL REPORT CLINICO */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/40 space-y-3">
            <div className="flex items-center space-x-2 text-indigo-900 dark:text-indigo-300">
              <ListChecks className="w-4 h-4 stroke-[2.5]" />
              <span className="text-xs font-black uppercase tracking-wider">
                Schema Strutturale del Report
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-900/50">
                <div className="font-bold text-slate-900 dark:text-white mb-1">
                  Sezione 1: Tabella Analisi Situazionali (5 colonne)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  DATA • SITUAZIONE • FATTORI SCATENANTI • EMOZIONI • PENSIERO NEGATIVO (0-100)
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-900/50">
                <div className="font-bold text-slate-900 dark:text-white mb-1">
                  Sezione 2: Registro Clinico Dettagliato (per ogni data)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Sintomi fisici, Pensieri negativi (0-100), Attenzione al corpo, Controllo dei sintomi / Check, Ricerca di rassicurazioni, Evitamento, Ansia complessiva (0-100).
                </div>
              </div>
            </div>

            {filteredEntries.length === 0 && (
              <div className="py-2 text-center text-rose-500 text-xs font-bold flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Nessuna registrazione trovata nell'intervallo di date selezionato</span>
              </div>
            )}
          </div>

          {/* SORT ORDER */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5" /> Ordinamento cronologico:
            </span>
            <div className="flex items-center space-x-1 p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)]">
              <button
                type="button"
                onClick={() => setSortOrder('asc')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  sortOrder === 'asc'
                    ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Cronologico (Crescente)
              </button>
              <button
                type="button"
                onClick={() => setSortOrder('desc')}
                className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  sortOrder === 'desc'
                    ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Dal più recente
              </button>
            </div>
          </div>

          {/* GUIDA INVIO WHATSAPP SU SMARTPHONE */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-xs space-y-1.5">
            <div className="flex items-center space-x-2 text-indigo-700 dark:text-indigo-300 font-black">
              <Share2 className="w-4 h-4 text-[#5B67CA] shrink-0" />
              <span>Invio del PDF su WhatsApp (da smartphone)</span>
            </div>
            <div className="text-[11.5px] text-[var(--text-secondary)] leading-relaxed space-y-1">
              <p>
                • <strong className="text-[var(--text-primary)]">Consigliato:</strong> Tocca <strong>&quot;Condividi PDF&quot;</strong> qui sotto per selezionare subito la chat WhatsApp della terapeuta.
              </p>
              <p>
                • <strong className="text-[var(--text-primary)]">Se invece usi &quot;Scarica PDF&quot;:</strong> Per inviarlo da WhatsApp apri la chat, tocca l&apos;icona <strong>📎 (Graffetta) &gt; Documento</strong> e seleziona il PDF dai file scaricati (evita il tasto &quot;Condividi&quot; dalla notifica di download del browser, che su Android può causare l&apos;errore &quot;impossibile inviare il documento&quot;).
              </p>
            </div>
          </div>

        </div>

        {/* MODAL ACTIONS FOOTER: Avvio diretto download PDF, condivisione e download CSV */}
        <div className="p-3.5 sm:p-4 border-t border-[var(--border-solid)] bg-[var(--bg-subtle)]/70 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCsvData}
            disabled={filteredEntries.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-solid)] hover:bg-[var(--bg-subtle)] text-xs font-black text-[var(--text-primary)] transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-xs"
            title="Avvia direttamente il download del file .csv con la struttura clinica"
          >
            <Table className="w-4 h-4 text-emerald-500 stroke-[2.2]" />
            <span>Scarica CSV (CBT)</span>
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={totalSelectedItems === 0 || isExportingPdf || isSharingPdf}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 min-h-[44px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-solid)] hover:bg-[var(--bg-subtle)] text-xs font-black text-[var(--text-primary)] transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
              title="Scarica il file PDF direttamente nella cartella Download del dispositivo"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                  <span>Download in corso...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 stroke-[2.5] text-[#5B67CA]" />
                  <span>Scarica PDF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSharePdf}
              disabled={totalSelectedItems === 0 || isExportingPdf || isSharingPdf}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#5B67CA] hover:bg-[#4A55B8] text-white text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              title="Condividi direttamente il PDF con WhatsApp, Email o altre app"
            >
              {isSharingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                  <span>Condivisione...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Condividi PDF (WhatsApp)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
