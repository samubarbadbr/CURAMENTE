import React, { useState, useMemo } from 'react';
import { CbtEntry, CustomQuestion, Tag } from '../types';
import {
  TherapistReportFilterOptions,
  filterEntriesForReport,
  generateTherapistCsv,
  exportTherapistPdf,
} from '../services/therapistReportGenerator';
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
} from 'lucide-react';

interface TherapistExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: CbtEntry[];
  allTags: Tag[];
  customQuestions: CustomQuestion[];
  onShowToast: (msg: string) => void;
}

export const TherapistExportModal: React.FC<TherapistExportModalProps> = ({
  isOpen,
  onClose,
  entries,
  allTags,
  customQuestions,
  onShowToast,
}) => {
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

  // Filter entries in real-time
  const filteredEntries = useMemo(() => {
    return filterEntriesForReport(entries, filterOptions);
  }, [entries, filterOptions]);

  if (!isOpen) return null;

  // 1. Direct PDF Export (Download immediato del file PDF con schema clinico)
  const handleExportPdf = async () => {
    if (filteredEntries.length === 0) {
      onShowToast('Nessuna registrazione trovata per il periodo selezionato');
      return;
    }
    setIsExportingPdf(true);
    try {
      await exportTherapistPdf(filteredEntries, allTags, customQuestions, filterOptions, onShowToast);
    } catch (err) {
      console.error('Error during PDF export:', err);
      onShowToast('Errore durante la generazione del PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // 2. Direct CSV Export (Formattato con le medesime sezioni e colonne)
  const handleExportCsvData = async () => {
    if (filteredEntries.length === 0) {
      onShowToast('Nessuna registrazione da esportare');
      return;
    }

    const csv = generateTherapistCsv(filteredEntries, allTags, customQuestions, filterOptions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const filename = `diariamente-report-clinico-${new Date().toISOString().slice(0, 10)}.csv`;
    const csvFile = new File([blob], filename, { type: 'text/csv;charset=utf-8;' });

    // Web Share on mobile devices if supported
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [csvFile] })) {
      try {
        await navigator.share({
          files: [csvFile],
          title: filename,
        });
        onShowToast('File CSV salvato / condiviso con successo');
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.remove();
      URL.revokeObjectURL(url);
    }, 3000);
    onShowToast('File CSV/Excel scaricato con successo');
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-[var(--bg-surface)] border border-[var(--border-solid)] rounded-[24px] shadow-2xl overflow-hidden text-[var(--text-primary)] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-solid)] bg-[var(--bg-subtle)]/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5B67CA]/15 border border-[#5B67CA]/30 text-[#5B67CA] flex items-center justify-center shrink-0 shadow-sm">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)]">
                Esporta Report Clinico
              </h2>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">
                Struttura conforme allo schema operativo della terapeuta
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
        <div className="overflow-y-auto p-5 space-y-5 text-sm">
          
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
          <div className="space-y-3 p-4 rounded-2xl bg-[var(--bg-subtle)]/70 border border-[var(--border-solid)]">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[var(--text-secondary)]">
                <Calendar className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Periodo del Report</span>
              </label>
              <span className="text-[11px] font-bold text-[#5B67CA] bg-[#5B67CA]/10 px-2.5 py-0.5 rounded-full border border-[#5B67CA]/20">
                {filteredEntries.length} {filteredEntries.length === 1 ? 'registrazione' : 'registrazioni'}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--text-secondary)]">Data Inizio:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setPeriod('custom');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-solid)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-all"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-[var(--text-secondary)]">Data Fine:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setPeriod('custom');
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-solid)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-all"
                />
              </div>
            </div>

            {/* Last Session Date Configuration (saved in localStorage) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-[var(--text-secondary)] border-t border-[var(--border-solid)]/60">
              <span>Data di riferimento ultima seduta:</span>
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={lastSessionDate}
                  onChange={(e) => handleLastSessionDateChange(e.target.value)}
                  className="px-2 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-solid)] text-[11px] font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                  title="Modifica la data dell'ultima seduta col terapeuta"
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

        </div>

        {/* MODAL ACTIONS FOOTER: Avvio diretto download PDF e download CSV */}
        <div className="p-4 border-t border-[var(--border-solid)] bg-[var(--bg-subtle)]/70 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportCsvData}
            disabled={filteredEntries.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-solid)] hover:bg-[var(--bg-subtle)] text-xs font-black text-[var(--text-primary)] transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-xs"
            title="Avvia direttamente il download del file .csv con la struttura clinica"
          >
            <Table className="w-4 h-4 text-emerald-500 stroke-[2.2]" />
            <span>Scarica CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={filteredEntries.length === 0 || isExportingPdf}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-[#5B67CA] hover:bg-[#4A55B8] text-white text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Genera e avvia immediatamente il download del file PDF"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                <span>Generazione PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Scarica PDF</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
