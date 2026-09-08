import React, { useState, useMemo } from 'react';
import { CbtEntry, PeriodFilter } from '../types';
import {
  DashboardReportOptions,
  exportDashboardPdf,
  generateDashboardCsv,
  computeDashboardStats,
} from '../services/dashboardReportGenerator';
import { CustomDatePicker } from './CustomDatePicker';
import {
  X,
  FileSpreadsheet,
  Download,
  Loader2,
  Calendar,
  Activity,
  TrendingUp,
  ShieldAlert,
  HeartHandshake,
  Ban,
  User,
} from 'lucide-react';

interface DashboardExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: CbtEntry[];
  dashPeriod: PeriodFilter;
  onShowToast: (msg: string) => void;
}

export const DashboardExportModal: React.FC<DashboardExportModalProps> = ({
  isOpen,
  onClose,
  entries,
  dashPeriod,
  onShowToast,
}) => {
  const [patientName, setPatientName] = useState(() => {
    return localStorage.getItem('diariamente_patient_name') || '';
  });

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter | 'custom'>(dashPeriod);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const initialStartStr = useMemo(() => {
    const d = new Date();
    const days = dashPeriod === 'all' ? 365 : parseInt(dashPeriod, 10) || 30;
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }, [dashPeriod]);

  const [customStartDate, setCustomStartDate] = useState(initialStartStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handlePatientNameChange = (val: string) => {
    setPatientName(val);
    localStorage.setItem('diariamente_patient_name', val);
  };

  // Filter entries based on period
  const filteredEntries = useMemo(() => {
    if (selectedPeriod === 'all') {
      return entries;
    }

    if (selectedPeriod === 'custom') {
      const start = new Date(customStartDate + 'T00:00:00').getTime();
      const end = new Date(customEndDate + 'T23:59:59').getTime();
      return entries.filter((e) => {
        const t = new Date(e.eventDatetime).getTime();
        return t >= start && t <= end;
      });
    }

    const days = parseInt(selectedPeriod, 10);
    if (isNaN(days)) return entries;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);

    return entries.filter((e) => new Date(e.eventDatetime) >= cutoff);
  }, [entries, selectedPeriod, customStartDate, customEndDate]);

  const stats = useMemo(() => computeDashboardStats(filteredEntries), [filteredEntries]);

  if (!isOpen) return null;

  const handleExportPdf = async () => {
    if (filteredEntries.length === 0) {
      onShowToast('Nessuna voce registrata da esportare per il periodo selezionato');
      return;
    }

    setIsExportingPdf(true);
    try {
      const options: DashboardReportOptions = {
        patientName: patientName.trim(),
        period: selectedPeriod,
        startDate: selectedPeriod === 'custom' ? customStartDate : undefined,
        endDate: selectedPeriod === 'custom' ? customEndDate : undefined,
      };
      await exportDashboardPdf(filteredEntries, options, onShowToast);
      onClose();
    } catch (err) {
      console.error('Error during Dashboard PDF export:', err);
      onShowToast('Errore durante la generazione del PDF');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredEntries.length === 0) {
      onShowToast('Nessuna voce registrata da esportare');
      return;
    }

    const options: DashboardReportOptions = {
      patientName: patientName.trim(),
      period: selectedPeriod,
      startDate: selectedPeriod === 'custom' ? customStartDate : undefined,
      endDate: selectedPeriod === 'custom' ? customEndDate : undefined,
    };
    const csv = generateDashboardCsv(filteredEntries, options);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const filename = `diariamente-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
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
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[24px] bg-[var(--bg-surface)] border border-[var(--border-solid)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]">
              <FileSpreadsheet className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)]">
                Esporta Report Dashboard Seduta
              </h2>
              <p className="text-xs font-bold text-[var(--text-secondary)]">
                Sintesi dei progressi, trend ansia ed evitamenti del periodo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Patient Name field */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Nome Paziente (opzionale per intestazione report):</span>
            </label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => handlePatientNameChange(e.target.value)}
              placeholder="Es. Mario Rossi"
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          {/* Period selector */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[var(--text-secondary)]">
              Periodo di esportazione:
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: '7', label: '7 Giorni' },
                { val: '14', label: '14 Giorni' },
                { val: '30', label: '30 Giorni' },
                { val: '90', label: '90 Giorni' },
                { val: 'all', label: 'Tutto' },
                { val: 'custom', label: 'Personalizzato' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setSelectedPeriod(opt.val as any)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center whitespace-nowrap overflow-hidden text-ellipsis ${
                    selectedPeriod === opt.val
                      ? 'bg-[var(--accent-btn)] text-[var(--accent-btn-text)] border-[var(--accent-btn)] shadow-sm font-black'
                      : 'bg-[var(--bg-subtle)] border-[var(--border-solid)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Pickers using CustomDatePicker */}
          {selectedPeriod === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 relative z-20">
              <div>
                <CustomDatePicker
                  label="Data Inizio:"
                  value={customStartDate}
                  onChange={(val) => setCustomStartDate(val)}
                />
              </div>
              <div>
                <CustomDatePicker
                  label="Data Fine:"
                  value={customEndDate}
                  onChange={(val) => setCustomEndDate(val)}
                />
              </div>
            </div>
          )}

          {/* Real-time KPI Summary Box */}
          <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] space-y-2.5">
            <div className="text-[11px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
              Dati inclusi nel Report ({filteredEntries.length} registrazioni):
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-solid)]/60">
                <span className="block text-base font-black text-[var(--accent-primary)]">
                  {stats.totalEntries}
                </span>
                <span className="block text-[10px] font-bold text-[var(--text-secondary)]">Voci</span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-solid)]/60">
                <span className="block text-base font-black text-rose-500">
                  {stats.avgAnxiety}
                </span>
                <span className="block text-[10px] font-bold text-[var(--text-secondary)]">Ansia Med.</span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-solid)]/60">
                <span className="block text-base font-black text-[var(--accent-primary)]">
                  {stats.totalControl}
                </span>
                <span className="block text-[10px] font-bold text-[var(--text-secondary)]">Controlli</span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-solid)]/60">
                <span className="block text-base font-black text-amber-500">
                  {stats.totalReassurance}
                </span>
                <span className="block text-[10px] font-bold text-[var(--text-secondary)]">Rassicuraz.</span>
              </div>

              <div className="p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-solid)]/60 col-span-2 sm:col-span-1">
                <span className="block text-base font-black text-rose-500">
                  {stats.totalAvoidance}
                </span>
                <span className="block text-[10px] font-bold text-[var(--text-secondary)]">Evitamenti</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[var(--border-subtle)] flex items-center justify-end space-x-2.5 bg-[var(--bg-subtle)]/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-[var(--border-solid)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
          >
            Annulla
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-full border border-[var(--border-solid)] bg-[var(--bg-surface)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel / CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf || filteredEntries.length === 0}
            className="btn-primary px-5 py-2 rounded-full text-xs font-black shadow-md flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {isExportingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                <span>Generazione PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Scarica PDF Dashboard</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
