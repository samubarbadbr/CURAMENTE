import React, { useState, useMemo } from 'react';
import { CbtEntry, CustomQuestion, Tag } from '../types';
import {
  TherapistReportFilterOptions,
  filterEntriesForReport,
  calculateReportStats,
  generateTherapistReportHtml,
  generateTherapistCsv,
} from '../services/therapistReportGenerator';
import {
  X,
  Printer,
  FileText,
  Table,
  Calendar,
  User,
  CheckSquare,
  Square,
  Sparkles,
  ArrowUpDown,
  Download,
  FileCheck,
  AlertCircle,
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

  // Category filters
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [includeSituationTriggers, setIncludeSituationTriggers] = useState(true);
  const [includeThoughts, setIncludeThoughts] = useState(true);
  const [includeEmotionsSymptoms, setIncludeEmotionsSymptoms] = useState(true);
  const [includeBehaviors, setIncludeBehaviors] = useState(true);
  const [includeCustomQuestions, setIncludeCustomQuestions] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);

  // Document options
  const [includeSummaryTable, setIncludeSummaryTable] = useState(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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
      includeMetrics,
      includeSituationTriggers,
      includeThoughts,
      includeEmotionsSymptoms,
      includeBehaviors,
      includeCustomQuestions,
      includeNotes,
      includeSummaryTable,
      sortOrder,
    }),
    [
      patientName,
      period,
      customStartDate,
      customEndDate,
      lastSessionDate,
      includeMetrics,
      includeSituationTriggers,
      includeThoughts,
      includeEmotionsSymptoms,
      includeBehaviors,
      includeCustomQuestions,
      includeNotes,
      includeSummaryTable,
      sortOrder,
    ]
  );

  // Filter entries in real-time
  const filteredEntries = useMemo(() => {
    return filterEntriesForReport(entries, filterOptions);
  }, [entries, filterOptions]);

  // Real-time stats
  const stats = useMemo(() => {
    return calculateReportStats(filteredEntries, filterOptions);
  }, [filteredEntries, filterOptions]);

  if (!isOpen) return null;

  // 1. Generate & Open PDF / Printable HTML
  const handleGeneratePrintableReport = () => {
    if (filteredEntries.length === 0) {
      onShowToast('Nessuna registrazione trovata per il periodo selezionato');
      return;
    }

    const html = generateTherapistReportHtml(filteredEntries, allTags, customQuestions, filterOptions);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);

    // Try window.open
    const printWin = window.open(blobUrl, '_blank');
    if (!printWin) {
      // Fallback if popup blocked by iframe: trigger direct file download
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `report-clinico-diariamente-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      onShowToast('Popup bloccato: Report scaricato come file HTML');
    } else {
      onShowToast('Report per il terapeuta aperto in nuova scheda');
    }
  };

  // 2. Download Standalone HTML file directly
  const handleDownloadHtmlFile = () => {
    if (filteredEntries.length === 0) {
      onShowToast('Nessuna registrazione da esportare');
      return;
    }

    const html = generateTherapistReportHtml(filteredEntries, allTags, customQuestions, filterOptions);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-clinico-diariamente-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    onShowToast('File HTML del report scaricato');
  };

  // 3. Export Raw CSV Tabular
  const handleExportCsvData = () => {
    if (filteredEntries.length === 0) {
      onShowToast('Nessuna registrazione da esportare');
      return;
    }

    const csv = generateTherapistCsv(filteredEntries, allTags, customQuestions, filterOptions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diariamente-tabella-seduta-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    onShowToast('File CSV/Excel scaricato con successo');
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[var(--bg-surface)] border border-[var(--border-solid)] rounded-[24px] shadow-2xl overflow-hidden text-[var(--text-primary)] animate-scale-up"
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
                Report per il Terapeuta
              </h2>
              <p className="text-xs font-semibold text-[var(--text-secondary)]">
                Configura periodo e sezioni per consultazione in seduta o stampa PDF
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
              <span>Nome Paziente / Utente (per intestazione)</span>
            </label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => handlePatientNameChange(e.target.value)}
              placeholder="Es. Samuele (oppure lascia vuoto per privacy)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] text-sm font-medium"
            />
          </div>

          {/* DATE RANGE FILTER & SHORTCUTS */}
          <div className="space-y-3 p-4 rounded-2xl bg-[var(--bg-subtle)]/70 border border-[var(--border-solid)]">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[var(--text-secondary)]">
                <Calendar className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                <span>Intervallo Date &amp; Scorciatoie Rapide</span>
              </label>
              <span className="text-[11px] font-bold text-[#5B67CA] bg-[#5B67CA]/10 px-2.5 py-0.5 rounded-full border border-[#5B67CA]/20">
                {stats.dateRangeText}
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

          {/* SINTESI INIZIALE - ANTEPRIMA MEDIE NUMERICHE (0-100 / MOOD) */}
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-900/50 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border-solid)] pb-2.5">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400"></div>
                <span className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
                  Sintesi Iniziale • Medie (0-100 / Mood)
                </span>
              </div>
              <span className="text-[11px] font-black text-[var(--text-secondary)]">
                {filteredEntries.length} {filteredEntries.length === 1 ? 'voce' : 'voci'}
              </span>
            </div>

            {filteredEntries.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
                <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-center">
                  <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Ansia / Mood</div>
                  <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
                    {stats.avgAnxiety}<span className="text-[10px] text-[var(--text-muted)] font-bold">/100</span>
                  </div>
                  <div className="text-[9px] font-semibold text-[var(--text-secondary)]">
                    {stats.avgAnxiety > 65 ? 'Elevata' : stats.avgAnxiety > 35 ? 'Moderata' : 'Contenuta'}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-center">
                  <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Convinzione</div>
                  <div className="text-lg font-black text-[var(--text-primary)] mt-0.5">
                    {stats.avgBelief}<span className="text-[10px] text-[var(--text-muted)] font-bold">%</span>
                  </div>
                  <div className="text-[9px] font-semibold text-[var(--text-secondary)]">Credenza</div>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-center">
                  <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Intensità</div>
                  <div className="text-lg font-black text-[var(--text-primary)] mt-0.5">
                    {stats.avgIntensity}<span className="text-[10px] text-[var(--text-muted)] font-bold">%</span>
                  </div>
                  <div className="text-[9px] font-semibold text-[var(--text-secondary)]">Pensiero</div>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-center">
                  <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase">Att. Corpo</div>
                  <div className="text-lg font-black text-[var(--text-primary)] mt-0.5">
                    {stats.avgBodyAttention}<span className="text-[10px] text-[var(--text-muted)] font-bold">%</span>
                  </div>
                  <div className="text-[9px] font-semibold text-[var(--text-secondary)]">Soma</div>
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-center col-span-2 sm:col-span-1">
                  <div className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase">Globale</div>
                  <div className="text-lg font-black text-indigo-950 dark:text-indigo-200 mt-0.5">
                    {stats.avgNumericScore}<span className="text-[10px] text-indigo-500 font-bold">/100</span>
                  </div>
                  <div className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400">Media periodo</div>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center text-rose-500 text-xs font-bold flex items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Nessuna registrazione trovata nell'intervallo di date selezionato</span>
              </div>
            )}
          </div>

          {/* CATEGORIES SELECTION (CHECKBOXES) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)] block">
                Sezioni e Categorie di Domande da Includere
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIncludeMetrics(true);
                    setIncludeSituationTriggers(true);
                    setIncludeThoughts(true);
                    setIncludeEmotionsSymptoms(true);
                    setIncludeBehaviors(true);
                    setIncludeCustomQuestions(true);
                    setIncludeNotes(true);
                  }}
                  className="text-[10px] font-bold text-[#5B67CA] hover:underline cursor-pointer"
                >
                  Tutte
                </button>
                <span className="text-[10px] text-[var(--text-muted)]">•</span>
                <button
                  type="button"
                  onClick={() => {
                    setIncludeMetrics(true);
                    setIncludeSituationTriggers(false);
                    setIncludeThoughts(false);
                    setIncludeEmotionsSymptoms(false);
                    setIncludeBehaviors(false);
                    setIncludeCustomQuestions(false);
                    setIncludeNotes(false);
                  }}
                  className="text-[10px] font-bold text-[var(--text-secondary)] hover:underline cursor-pointer"
                >
                  Solo Valutazioni
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                {
                  id: 'metrics',
                  label: 'Valutazioni & Mood (Scala 0-100)',
                  desc: 'Ansia, convinzione, intensità e attenzione al corpo',
                  checked: includeMetrics,
                  setter: setIncludeMetrics,
                },
                {
                  id: 'thoughts',
                  label: 'Pensieri & Ristrutturazione',
                  desc: 'Pensiero automatico negativo e pensiero alternativo',
                  checked: includeThoughts,
                  setter: setIncludeThoughts,
                },
                {
                  id: 'situation',
                  label: 'Situazione & Fattori Scatenanti',
                  desc: 'Contesto dell’evento e trigger rilevati',
                  checked: includeSituationTriggers,
                  setter: setIncludeSituationTriggers,
                },
                {
                  id: 'emotions',
                  label: 'Emozioni & Sintomi Fisici',
                  desc: 'Tag emotivi e manifestazioni corporee',
                  checked: includeEmotionsSymptoms,
                  setter: setIncludeEmotionsSymptoms,
                },
                {
                  id: 'behaviors',
                  label: 'Comportamenti Protettivi',
                  desc: 'Check sintomi, rassicurazioni ed evitamenti',
                  checked: includeBehaviors,
                  setter: setIncludeBehaviors,
                },
                {
                  id: 'custom_questions',
                  label: 'Domande Custom & Gratitudine',
                  desc: 'Risposte alle domande personalizzate',
                  checked: includeCustomQuestions,
                  setter: setIncludeCustomQuestions,
                },
                {
                  id: 'notes',
                  label: 'Note & Riflessioni Personali',
                  desc: 'Appunti e considerazioni per la seduta',
                  checked: includeNotes,
                  setter: setIncludeNotes,
                },
                {
                  id: 'summary_table',
                  label: 'Tabella Riassuntiva in Testata',
                  desc: 'Panoramica tabellare delle date e valutazioni',
                  checked: includeSummaryTable,
                  setter: setIncludeSummaryTable,
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => item.setter(!item.checked)}
                  className={`flex items-start space-x-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    item.checked
                      ? 'bg-[var(--bg-subtle)] border-[var(--accent-primary)]/40 shadow-xs'
                      : 'bg-[var(--bg-surface)] border-[var(--border-solid)] opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="mt-0.5 text-[var(--accent-primary)] shrink-0">
                    {item.checked ? (
                      <CheckSquare className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <Square className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                  </div>
                  <div>
                    <span className="block text-xs font-black text-[var(--text-primary)] leading-tight">
                      {item.label}
                    </span>
                    <span className="block text-[10px] font-semibold text-[var(--text-secondary)] mt-0.5">
                      {item.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* SORT ORDER & PRESENTATION */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-solid)]">
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

        {/* MODAL ACTIONS FOOTER */}
        <div className="p-4 border-t border-[var(--border-solid)] bg-[var(--bg-subtle)]/70 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Secondary Actions */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleExportCsvData}
              disabled={filteredEntries.length === 0}
              className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-solid)] hover:bg-[var(--bg-subtle)] text-xs font-black text-[var(--text-primary)] transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-xs"
              title="Esporta foglio di calcolo con colonne: Data | Categoria | Domanda | Risposta | Valore"
            >
              <Table className="w-4 h-4 text-emerald-500 stroke-[2.2]" />
              <span>Esporta CSV / Excel</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadHtmlFile}
              disabled={filteredEntries.length === 0}
              className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-solid)] hover:bg-[var(--bg-subtle)] text-xs font-black text-[var(--text-primary)] transition-all active:scale-95 disabled:opacity-40 cursor-pointer shadow-xs"
              title="Scarica documento autonomo offline (.html)"
            >
              <Download className="w-4 h-4 text-sky-500 stroke-[2.2]" />
              <span>Scarica HTML</span>
            </button>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleGeneratePrintableReport}
            disabled={filteredEntries.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl bg-[#5B67CA] hover:bg-[#4A55B8] text-white text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
          >
            <Printer className="w-4 h-4 stroke-[2.5]" />
            <span>Genera Report Clinico (PDF / Stampa)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
