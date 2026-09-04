import { CbtEntry, CustomQuestion, Tag } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface TherapistReportFilterOptions {
  patientName: string;
  period: 'last_session' | '7' | 'month' | '30' | 'custom' | 'all';
  customStartDate?: string; // YYYY-MM-DD
  customEndDate?: string;   // YYYY-MM-DD
  lastSessionDate?: string; // YYYY-MM-DD
  includeMetrics?: boolean;
  includeSituationTriggers?: boolean;
  includeThoughts?: boolean;
  includeEmotionsSymptoms?: boolean;
  includeBehaviors?: boolean;
  includeCustomQuestions?: boolean;
  includeNotes?: boolean;
  includeSummaryTable?: boolean;
  sortOrder: 'asc' | 'desc'; // 'asc': chronological (past -> present), 'desc': newest first
}

export interface ReportStats {
  totalEntries: number;
  avgAnxiety: number;
  avgBelief: number;
  avgIntensity: number;
  avgBodyAttention: number;
  avgNumericScore: number;
  totalChecks: number;
  totalReassurances: number;
  totalAvoidances: number;
  dateRangeText: string;
}

/**
 * Filter entries according to report filter options
 */
export function filterEntriesForReport(
  entries: CbtEntry[],
  options: TherapistReportFilterOptions
): CbtEntry[] {
  let filtered = [...entries];

  const now = new Date();

  if (options.period === 'last_session') {
    let sessionCutoff: Date;
    if (options.lastSessionDate) {
      sessionCutoff = new Date(options.lastSessionDate);
    } else {
      sessionCutoff = new Date();
      sessionCutoff.setDate(now.getDate() - 7);
    }
    sessionCutoff.setHours(0, 0, 0, 0);
    filtered = filtered.filter((e) => new Date(e.eventDatetime) >= sessionCutoff);
    if (options.customEndDate) {
      const end = new Date(options.customEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((e) => new Date(e.eventDatetime) <= end);
    }
  } else if (options.period === '7') {
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - 7);
    cutoff.setHours(0, 0, 0, 0);
    filtered = filtered.filter((e) => new Date(e.eventDatetime) >= cutoff);
  } else if (options.period === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    filtered = filtered.filter((e) => new Date(e.eventDatetime) >= startOfMonth);
  } else if (options.period === '30') {
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - 30);
    cutoff.setHours(0, 0, 0, 0);
    filtered = filtered.filter((e) => new Date(e.eventDatetime) >= cutoff);
  } else if (options.period === 'custom') {
    if (options.customStartDate) {
      const start = new Date(options.customStartDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((e) => new Date(e.eventDatetime) >= start);
    }
    if (options.customEndDate) {
      const end = new Date(options.customEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((e) => new Date(e.eventDatetime) <= end);
    }
  }

  // Sort
  filtered.sort((a, b) => {
    const timeA = new Date(a.eventDatetime).getTime();
    const timeB = new Date(b.eventDatetime).getTime();
    return options.sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
  });

  return filtered;
}

const MONTH_NAMES_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

/**
 * Format date range in polished Italian (e.g. "Dall'1 al 30 Settembre 2026")
 */
export function formatItalianDateRange(
  entries: CbtEntry[],
  options: TherapistReportFilterOptions
): string {
  if (entries.length === 0) {
    return 'Nessuna registrazione';
  }

  // Find min and max dates from entries or custom range
  let minDate: Date;
  let maxDate: Date;

  if (options.period === 'custom' && options.customStartDate && options.customEndDate) {
    minDate = new Date(options.customStartDate);
    maxDate = new Date(options.customEndDate);
  } else {
    const timestamps = entries.map((e) => new Date(e.eventDatetime).getTime());
    minDate = new Date(Math.min(...timestamps));
    maxDate = new Date(Math.max(...timestamps));
  }

  const minDay = minDate.getDate();
  const minMonth = MONTH_NAMES_IT[minDate.getMonth()];
  const minYear = minDate.getFullYear();

  const maxDay = maxDate.getDate();
  const maxMonth = MONTH_NAMES_IT[maxDate.getMonth()];
  const maxYear = maxDate.getFullYear();

  if (minDate.toDateString() === maxDate.toDateString()) {
    return `${minDay} ${minMonth} ${minYear}`;
  }

  const startPrefix = minDay === 1 ? "Dall'1" : `Dal ${minDay}`;

  if (minYear === maxYear) {
    if (minMonth === maxMonth) {
      return `${startPrefix} al ${maxDay} ${maxMonth} ${maxYear}`;
    }
    return `${startPrefix} ${minMonth} al ${maxDay} ${maxMonth} ${maxYear}`;
  }

  return `${startPrefix} ${minMonth} ${minYear} al ${maxDay} ${maxMonth} ${maxYear}`;
}

/**
 * Calculate quantitative statistics
 */
export function calculateReportStats(
  entries: CbtEntry[],
  options: TherapistReportFilterOptions
): ReportStats {
  if (entries.length === 0) {
    return {
      totalEntries: 0,
      avgAnxiety: 0,
      avgBelief: 0,
      avgIntensity: 0,
      avgBodyAttention: 0,
      avgNumericScore: 0,
      totalChecks: 0,
      totalReassurances: 0,
      totalAvoidances: 0,
      dateRangeText: 'Nessuna registrazione',
    };
  }

  const n = entries.length;
  let sumAnxiety = 0;
  let sumBelief = 0;
  let sumIntensity = 0;
  let sumBodyAttention = 0;
  let totalChecks = 0;
  let totalReassurances = 0;
  let totalAvoidances = 0;

  entries.forEach((e) => {
    sumAnxiety += Number(e.overallAnxietyLevel || 0);
    sumBelief += Number(e.thoughtBeliefLevel || 0);
    sumIntensity += Number(e.negativeThoughtsIntensity || 0);
    sumBodyAttention += Number(e.bodyFocusedAttentionLevel || 0);

    totalChecks += Number(e.symptomControlCount || 0);
    totalReassurances += Number(e.reassuranceSeekingCount || 0);
    totalAvoidances += Number(e.avoidanceCount || 0);
  });

  const avgAnxiety = Math.round(sumAnxiety / n);
  const avgBelief = Math.round(sumBelief / n);
  const avgIntensity = Math.round(sumIntensity / n);
  const avgBodyAttention = Math.round(sumBodyAttention / n);
  const avgNumericScore = Math.round((avgAnxiety + avgBelief + avgIntensity + avgBodyAttention) / 4);

  const dateRangeText = formatItalianDateRange(entries, options);

  return {
    totalEntries: n,
    avgAnxiety,
    avgBelief,
    avgIntensity,
    avgBodyAttention,
    avgNumericScore,
    totalChecks,
    totalReassurances,
    totalAvoidances,
    dateRangeText,
  };
}

/**
 * Escape HTML to prevent injection and rendering issues
 */
function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Helper to generate an anxiety value with color scaling and dark high-contrast text
 * Using pure inline styling and baseline alignment to guarantee exact horizontal alignment with the label
 */
function getAnxietyBadgeHtml(score: number): string {
  let colorClass = 'badge-score-low';
  let color = '#059669';
  if (score >= 70) {
    colorClass = 'badge-score-high';
    color = '#dc2626';
  } else if (score >= 40) {
    colorClass = 'badge-score-med';
    color = '#d97706';
  }
  return `<span class="${colorClass}" style="display: inline; font-size: 11.5px; font-weight: 900; color: ${color}; line-height: 1.2; vertical-align: baseline;">${score}/100</span>`;
}

/**
 * Helper to generate frequency score with dark high-contrast blue text
 */
function getFrequencyBadgeHtml(score: number): string {
  return `<span class="badge-freq-score" style="display: inline; font-size: 11.5px; font-weight: 900; color: #1e3a8a; line-height: 1.2; vertical-align: baseline;">${score}/100</span>`;
}

/**
 * Helper to generate body attention value with dark high-contrast purple text
 */
function getBodyAttentionBadgeHtml(score: number): string {
  return `<span class="badge-attention-score" style="display: inline; font-size: 11.5px; font-weight: 900; color: #6b21a8; line-height: 1.2; vertical-align: baseline;">${score}/100</span>`;
}

/**
 * Helper to generate soft count display for checks, reassurances, avoidances
 */
function getCountPillHtml(count: number, singular = 'volta', plural = 'volte'): string {
  const label = `${count} ${count === 1 ? singular : plural}`;
  if (count > 0) {
    return `<span class="badge-count-score" style="display: inline; font-size: 11.5px; font-weight: 900; color: #9a3412; line-height: 1.2; vertical-align: baseline;">${label}</span>`;
  }
  return `<span style="display: inline; font-size: 11px; font-weight: 600; color: #64748b; line-height: 1.2; vertical-align: baseline;">${label}</span>`;
}

/**
 * Generate full self-contained printable HTML document adhering strictly to the therapist's sheet
 * Symmetrical, centered A4 layout with clean typography, fixed table columns, and structured cards
 */
export function generateTherapistReportHtml(
  entries: CbtEntry[],
  allTags: Tag[],
  customQuestions: CustomQuestion[],
  options: TherapistReportFilterOptions
): string {
  const tagMap = new Map(allTags.map((t) => [t.id, t.label]));
  const dateRangeDisplay = formatItalianDateRange(entries, options);

  // SEZIONE 1: TABELLA ANALISI SITUAZIONALI (5 colonne fisse)
  // DATA (16%) | SITUAZIONE (27%) | FATTORI SCATENANTI (22%) | EMOZIONI (16%) | PENSIERO NEGATIVO (19%)
  const situationalTableRows = entries
    .map((e) => {
      const d = new Date(e.eventDatetime);
      const datePart = d.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const timePart = d.toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const emoLabels = (e.emotionTagIds || []).map((id) => tagMap.get(id) || id);
      const thought = e.negativeThought ? escapeHtml(e.negativeThought) : '—';
      const beliefLevel = e.thoughtBeliefLevel !== undefined ? e.thoughtBeliefLevel : 0;

      return `
        <tr style="background: #ffffff;">
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9; vertical-align: top;">
            <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; line-height: 1.3;">${datePart}</div>
            <div style="font-size: 10.5px; font-weight: 600; color: #64748b; margin-top: 2px;">ore ${timePart}</div>
          </td>
          <td style="padding: 10px 12px; color: #0f172a; font-weight: 500; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9; vertical-align: top; line-height: 1.45; word-break: break-word;">
            ${escapeHtml(e.situation || '—')}
          </td>
          <td style="padding: 10px 12px; color: #0f172a; font-weight: 500; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9; vertical-align: top; line-height: 1.45; word-break: break-word;">
            ${escapeHtml(e.triggerFactors || '—')}
          </td>
          <td style="padding: 10px 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9; vertical-align: top;">
            ${
              emoLabels.length > 0
                ? `<div style="font-size: 11px; font-weight: 700; color: #312e81; line-height: 1.4;">${emoLabels
                    .map((lbl) => escapeHtml(lbl))
                    .join(', ')}</div>`
                : '<span style="color: #94a3b8; font-style: italic;">—</span>'
            }
          </td>
          <td style="padding: 10px 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0; vertical-align: top; word-break: break-word;">
            <div style="font-weight: 700; color: #0f172a; margin-bottom: 6px; line-height: 1.4; font-size: 11px;">${thought}</div>
            <div style="margin-top: 4px; font-size: 10.5px; color: #4338ca; font-weight: 700; line-height: 1.2;">
              <span style="display: inline; vertical-align: baseline;">Quanto credo al pensiero:</span> <strong style="display: inline; font-size: 11px; font-weight: 900; color: #1e1b4b; vertical-align: baseline;">${beliefLevel}/100</strong>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  // SEZIONE 2: REGISTRO CLINICO DETTAGLIATO
  // Schede strutturate con header (Data/Ora e Ansia) e 6 righe cliniche distinte
  const detailedEntriesHtml = entries
    .map((e) => {
      const d = new Date(e.eventDatetime);
      const dateFormatted = d.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const physTags = (e.physicalSymptomTagIds || []).map((id) => tagMap.get(id) || id);
      const physDetail = e.physicalSymptomsText ? e.physicalSymptomsText.trim() : '';
      let physicalText = '';
      if (physTags.length > 0 && physDetail) {
        physicalText = `${physTags.join(', ')} — ${physDetail}`;
      } else if (physTags.length > 0) {
        physicalText = physTags.join(', ');
      } else if (physDetail) {
        physicalText = physDetail;
      } else {
        physicalText = 'Nessuno specificato';
      }

      const thoughtDesc = e.negativeThoughtsExtended || e.negativeThought || 'Nessuna descrizione';
      const thoughtFreq = e.negativeThoughtsIntensity ?? e.thoughtBeliefLevel ?? 0;

      const controlAction = e.symptomControlDescription ? e.symptomControlDescription.trim() : 'Nessuna azione specificata';
      const reassuranceType = e.reassuranceSeekingType ? e.reassuranceSeekingType.trim() : 'Nessuna richiesta specificata';
      const avoidanceType = e.avoidanceType ? e.avoidanceType.trim() : 'Nessun evitamento specificato';

      return `
        <div class="clinical-entry-card" style="margin-bottom: 20px; border: 1.5px solid #e2e8f0; border-radius: 12px; background: #ffffff; overflow: hidden; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);">
          
          <!-- Testata Scheda: Data a sinistra, Ansia Complessiva a destra -->
          <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-bottom: 1.5px solid #e2e8f0;">
            <tr>
              <td style="padding: 10px 16px; text-align: left; vertical-align: middle;">
                <span style="display: inline; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; line-height: 1.2; vertical-align: baseline; margin-right: 6px;">REGISTRAZIONE CLINICA:</span>
                <span style="display: inline; font-size: 11.5px; font-weight: 900; color: #0f172a; line-height: 1.2; vertical-align: baseline;">
                  ${escapeHtml(dateFormatted)}
                </span>
              </td>
              <td style="padding: 10px 16px; text-align: right; vertical-align: middle; white-space: nowrap;">
                <span style="display: inline; font-size: 10.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; line-height: 1.2; vertical-align: baseline; margin-right: 6px;">ANSIA COMPLESSIVA:</span>
                ${getAnxietyBadgeHtml(e.overallAnxietyLevel ?? 0)}
              </td>
            </tr>
          </table>
          
          <!-- Corpo Scheda: 6 blocchi clinici strutturati con metriche ancorate a destra -->
          <div style="padding: 2px 0;">
            
            <!-- 1. Sintomi fisici -->
            <div class="clinical-block" style="padding: 9px 16px; border-bottom: 1px solid #f1f5f9;">
              <div style="font-size: 11px; font-weight: 800; color: #0f172a; margin-bottom: 3px;">
                1. Sintomi fisici
              </div>
              <div style="font-size: 11.5px; color: ${physicalText === 'Nessuno specificato' ? '#94a3b8' : '#0f172a'}; font-weight: 500; line-height: 1.45; word-break: break-word;">
                ${escapeHtml(physicalText)}
              </div>
            </div>

            <!-- 2. Pensieri negativi -->
            <div class="clinical-block" style="padding: 9px 16px; border-bottom: 1px solid #f1f5f9;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
                <tr>
                  <td style="text-align: left; vertical-align: middle; font-size: 11px; font-weight: 800; color: #0f172a;">
                    2. Pensieri negativi
                  </td>
                  <td style="text-align: right; vertical-align: middle; white-space: nowrap;">
                    <span style="display: inline; font-size: 10.5px; font-weight: 700; color: #64748b; line-height: 1.2; vertical-align: baseline; margin-right: 6px;">Frequenza (0-100):</span>
                    ${getFrequencyBadgeHtml(thoughtFreq)}
                  </td>
                </tr>
              </table>
              <div style="font-size: 11.5px; color: #0f172a; font-weight: 500; line-height: 1.45; word-break: break-word;">
                ${escapeHtml(thoughtDesc)}
              </div>
            </div>

            <!-- 3. Attenzione focalizzata sul corpo -->
            <div class="clinical-block" style="padding: 9px 16px; border-bottom: 1px solid #f1f5f9;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="text-align: left; vertical-align: middle; font-size: 11px; font-weight: 800; color: #0f172a;">
                    3. Attenzione focalizzata sul corpo
                  </td>
                  <td style="text-align: right; vertical-align: middle; white-space: nowrap;">
                    <span style="display: inline; font-size: 10.5px; font-weight: 700; color: #64748b; line-height: 1.2; vertical-align: baseline; margin-right: 6px;">Frequenza (0-100):</span>
                    ${getBodyAttentionBadgeHtml(e.bodyFocusedAttentionLevel ?? 0)}
                  </td>
                </tr>
              </table>
            </div>

            <!-- 4. Controllo dei sintomi / Check -->
            <div class="clinical-block" style="padding: 9px 16px; border-bottom: 1px solid #f1f5f9;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
                <tr>
                  <td style="text-align: left; vertical-align: middle; font-size: 11px; font-weight: 800; color: #0f172a;">
                    4. Controllo dei sintomi / Check (azioni svolte)
                  </td>
                  <td style="text-align: right; vertical-align: middle; white-space: nowrap;">
                    ${getCountPillHtml(e.symptomControlCount ?? 0)}
                  </td>
                </tr>
              </table>
              <div style="font-size: 11.5px; color: ${controlAction === 'Nessuna azione specificata' ? '#94a3b8' : '#0f172a'}; font-weight: 500; line-height: 1.45; word-break: break-word;">
                ${escapeHtml(controlAction)}
              </div>
            </div>

            <!-- 5. Ricerca di rassicurazioni -->
            <div class="clinical-block" style="padding: 9px 16px; border-bottom: 1px solid #f1f5f9;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
                <tr>
                  <td style="text-align: left; vertical-align: middle; font-size: 11px; font-weight: 800; color: #0f172a;">
                    5. Ricerca di rassicurazioni (che tipo di richiesta e quante volte)
                  </td>
                  <td style="text-align: right; vertical-align: middle; white-space: nowrap;">
                    ${getCountPillHtml(e.reassuranceSeekingCount ?? 0)}
                  </td>
                </tr>
              </table>
              <div style="font-size: 11.5px; color: ${reassuranceType === 'Nessuna richiesta specificata' ? '#94a3b8' : '#0f172a'}; font-weight: 500; line-height: 1.45; word-break: break-word;">
                ${escapeHtml(reassuranceType)}
              </div>
            </div>

            <!-- 6. Evitamento -->
            <div class="clinical-block" style="padding: 9px 16px;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;">
                <tr>
                  <td style="text-align: left; vertical-align: middle; font-size: 11px; font-weight: 800; color: #0f172a;">
                    6. Evitamento (tipologia e situazioni)
                  </td>
                  <td style="text-align: right; vertical-align: middle; white-space: nowrap;">
                    ${getCountPillHtml(e.avoidanceCount ?? 0)}
                  </td>
                </tr>
              </table>
              <div style="font-size: 11.5px; color: ${avoidanceType === 'Nessun evitamento specificato' ? '#94a3b8' : '#0f172a'}; font-weight: 500; line-height: 1.45; word-break: break-word;">
                ${escapeHtml(avoidanceType)}
              </div>
            </div>

          </div>

        </div>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report Clinico - Diariamente - ${escapeHtml(dateRangeDisplay)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 10mm 10mm 10mm;
    }

    * {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #0f172a !important;
      color-scheme: light !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0 !important;
      padding: 0 !important;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    .report-container {
      width: 794px !important;
      max-width: 794px !important;
      margin: 0 auto !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      padding: 24px 28px !important;
      box-shadow: none !important;
      box-sizing: border-box !important;
    }

    header, .pdf-header {
      background: #ffffff !important;
      background-color: #ffffff !important;
      color: #0f172a !important;
    }

    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      html, body {
        background: #ffffff !important;
        background-color: #ffffff !important;
        color: #0f172a !important;
        padding: 0 !important;
        margin: 0 !important;
      }
      .report-container {
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
        background: #ffffff !important;
        background-color: #ffffff !important;
        box-shadow: none !important;
      }
      .clinical-entry-card {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .table-wrapper {
        page-break-inside: auto !important;
      }
      tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
    }

    .section-title {
      border-bottom: 2px solid #4f46e5;
      padding: 0 0 6px 0;
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #1e1b4b;
      margin: 24px 0 14px 0;
      display: block;
    }
  </style>
</head>
<body>

  <div class="report-container">
    
    <!-- HEADER PDF ESSENZIALE E MINIMALE -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2px solid #e2e8f0; background: #ffffff;">
      <tr>
        <td style="padding: 0 0 14px 0; text-align: left; vertical-align: middle;">
          <div class="report-header-title" style="font-size: 24px; color: #4f46e5; font-weight: 900; line-height: 1.15; letter-spacing: -0.02em;">
            DIARIAMENTE
          </div>
          <div class="report-subtitle" style="font-size: 11.5px; color: #475569; margin-top: 3px; font-weight: 600; line-height: 1.3;">
            Report Clinico di Psicoterapia Cognitivo-Comportamentale
          </div>
        </td>
        <td style="padding: 0 0 14px 0; text-align: right; vertical-align: middle; white-space: nowrap;">
          <div style="display: inline-block; text-align: left; border: 1.5px solid #cbd5e1; background: #ffffff; padding: 6px 14px; border-radius: 6px;">
            ${
              options.patientName
                ? `
              <div style="font-size: 11px; font-weight: 600; color: #475569; margin-bottom: 2px;">
                Paziente: <strong style="color: #0f172a; font-weight: 800;">${escapeHtml(options.patientName)}</strong>
              </div>
            `
                : ''
            }
            <div style="font-size: 11px; font-weight: 700; color: #0f172a;">
              Periodo: <strong style="color: #0f172a; font-weight: 800;">${escapeHtml(dateRangeDisplay)}</strong>
            </div>
          </div>
        </td>
      </tr>
    </table>

    <!-- SEZIONE 1: TABELLA ANALISI SITUAZIONALI -->
    <section>
      <div class="section-title">SEZIONE 1: TABELLA ANALISI SITUAZIONALI</div>
      
      ${
        entries.length > 0
          ? `
        <div class="table-wrapper" style="border-radius: 8px; overflow: hidden; border: 1.5px solid #cbd5e1; background: #ffffff; margin-bottom: 20px;">
          <table style="width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0; font-size: 11px;">
            <colgroup>
              <col style="width: 16%;">
              <col style="width: 27%;">
              <col style="width: 22%;">
              <col style="width: 16%;">
              <col style="width: 19%;">
            </colgroup>
            <thead>
              <tr style="background: #f1f5f9;">
                <th class="table-th" style="padding: 9px 12px; color: #0f172a; font-weight: 900; font-size: 10.5px; border-bottom: 1.5px solid #cbd5e1; text-align: left; text-transform: uppercase; letter-spacing: 0.04em;">DATA</th>
                <th class="table-th" style="padding: 9px 12px; color: #0f172a; font-weight: 900; font-size: 10.5px; border-bottom: 1.5px solid #cbd5e1; text-align: left; text-transform: uppercase; letter-spacing: 0.04em;">SITUAZIONE</th>
                <th class="table-th" style="padding: 9px 12px; color: #0f172a; font-weight: 900; font-size: 10.5px; border-bottom: 1.5px solid #cbd5e1; text-align: left; text-transform: uppercase; letter-spacing: 0.04em;">FATTORI SCATENANTI</th>
                <th class="table-th" style="padding: 9px 12px; color: #0f172a; font-weight: 900; font-size: 10.5px; border-bottom: 1.5px solid #cbd5e1; text-align: left; text-transform: uppercase; letter-spacing: 0.04em;">EMOZIONI</th>
                <th class="table-th" style="padding: 9px 12px; color: #0f172a; font-weight: 900; font-size: 10.5px; border-bottom: 1.5px solid #cbd5e1; text-align: left; text-transform: uppercase; letter-spacing: 0.04em;">PENSIERO NEGATIVO (0-100)</th>
              </tr>
            </thead>
            <tbody>
              ${situationalTableRows}
            </tbody>
          </table>
        </div>
      `
          : '<p style="color: #64748b; font-style: italic; padding: 10px 0;">Nessuna registrazione per il periodo selezionato.</p>'
      }
    </section>

    <!-- SEZIONE 2: REGISTRO CLINICO DETTAGLIATO -->
    <section>
      <div class="section-title">SEZIONE 2: REGISTRO CLINICO DETTAGLIATO</div>
      
      ${
        entries.length > 0
          ? detailedEntriesHtml
          : '<p style="color: #64748b; font-style: italic; padding: 10px 0;">Nessuna registrazione per il periodo selezionato.</p>'
      }
    </section>

  </div>

</body>
</html>`;
}

/**
 * Generate Raw Tabular CSV matching the exact sections and columns of the clinical sheet
 */
export function generateTherapistCsv(
  entries: CbtEntry[],
  allTags: Tag[],
  _customQuestions: CustomQuestion[],
  _options: TherapistReportFilterOptions
): string {
  const tagMap = new Map(allTags.map((t) => [t.id, t.label]));

  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel compatibility

  // SEZIONE 1: TABELLA ANALISI SITUAZIONALI
  csv += escapeCsv('SEZIONE 1: TABELLA ANALISI SITUAZIONALI') + '\r\n';
  csv += ['DATA', 'SITUAZIONE', 'FATTORI SCATENANTI', 'EMOZIONI', 'PENSIERO NEGATIVO (0-100)'].map(escapeCsv).join(',') + '\r\n';

  entries.forEach((e) => {
    const d = new Date(e.eventDatetime).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const situation = e.situation || '';
    const triggers = e.triggerFactors || '';
    const emoList = (e.emotionTagIds || []).map((id) => tagMap.get(id) || id).join(', ');
    const thoughtBelief = e.thoughtBeliefLevel !== undefined ? e.thoughtBeliefLevel : 0;
    const thoughtCell = e.negativeThought
      ? `${e.negativeThought} (Quanto credo al pensiero: ${thoughtBelief}/100)`
      : `(Quanto credo al pensiero: ${thoughtBelief}/100)`;

    csv += [d, situation, triggers, emoList, thoughtCell].map(escapeCsv).join(',') + '\r\n';
  });

  csv += '\r\n'; // Blank separator row

  // SEZIONE 2: REGISTRO CLINICO DETTAGLIATO
  csv += escapeCsv('SEZIONE 2: REGISTRO CLINICO DETTAGLIATO') + '\r\n';
  csv += [
    'DATA',
    'Sintomi fisici',
    'Pensieri negativi (descrizione e frequenza 0-100)',
    'Attenzione focalizzata sul corpo (frequenza)',
    'Controllo dei sintomi / Check (azioni svolte e numero di volte)',
    'Ricerca di rassicurazioni (che tipo di richiesta e quante volte)',
    'Evitamento (tipologia e numero di volte)',
    'Ansia complessiva (0-100)',
  ].map(escapeCsv).join(',') + '\r\n';

  entries.forEach((e) => {
    const d = new Date(e.eventDatetime).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const physTags = (e.physicalSymptomTagIds || []).map((id) => tagMap.get(id) || id);
    const physDetail = e.physicalSymptomsText ? e.physicalSymptomsText.trim() : '';
    let physicalText = '';
    if (physTags.length > 0 && physDetail) {
      physicalText = `${physTags.join(', ')} (${physDetail})`;
    } else if (physTags.length > 0) {
      physicalText = physTags.join(', ');
    } else if (physDetail) {
      physicalText = physDetail;
    } else {
      physicalText = 'Nessuno specificato';
    }

    const thoughtDesc = e.negativeThoughtsExtended || e.negativeThought || 'Nessuna descrizione';
    const thoughtFreq = e.negativeThoughtsIntensity ?? e.thoughtBeliefLevel ?? 0;
    const thoughtsCell = `${thoughtDesc} (Frequenza: ${thoughtFreq}/100)`;

    const bodyAttentionCell = `${e.bodyFocusedAttentionLevel ?? 0}/100`;

    const controlAction = e.symptomControlDescription ? e.symptomControlDescription.trim() : 'Nessuna azione specificata';
    const controlCount = `${e.symptomControlCount ?? 0} ${e.symptomControlCount === 1 ? 'volta' : 'volte'}`;
    const checkCell = `${controlAction} (${controlCount})`;

    const reassType = e.reassuranceSeekingType ? e.reassuranceSeekingType.trim() : 'Nessuna richiesta specificata';
    const reassCount = `${e.reassuranceSeekingCount ?? 0} ${e.reassuranceSeekingCount === 1 ? 'volta' : 'volte'}`;
    const reassuranceCell = `${reassType} (${reassCount})`;

    const avoidType = e.avoidanceType ? e.avoidanceType.trim() : 'Nessun evitamento specificato';
    const avoidCount = `${e.avoidanceCount ?? 0} ${e.avoidanceCount === 1 ? 'volta' : 'volte'}`;
    const avoidanceCell = `${avoidType} (${avoidCount})`;

    const anxietyCell = `${e.overallAnxietyLevel ?? 0}/100`;

    csv += [
      d,
      physicalText,
      thoughtsCell,
      bodyAttentionCell,
      checkCell,
      reassuranceCell,
      avoidanceCell,
      anxietyCell,
    ].map(escapeCsv).join(',') + '\r\n';
  });

  return csv;
}

/**
 * Generazione ed esportazione diretta del file PDF clinico (A4, multipagina con interruzioni pulite)
 * Nessun foglio bianco: il canvas viene renderizzato a piena opacità (1.0) con colori e contrasto esatti.
 */
export async function exportTherapistPdf(
  entries: CbtEntry[],
  allTags: Tag[],
  customQuestions: CustomQuestion[],
  options: TherapistReportFilterOptions,
  onToast?: (msg: string) => void
): Promise<void> {
  if (entries.length === 0) {
    onToast?.('Nessuna registrazione da esportare');
    return;
  }

  onToast?.('Generazione PDF in corso...');

  const html = generateTherapistReportHtml(entries, allTags, customQuestions, options);
  const dateIso = new Date().toISOString().slice(0, 10);
  const filename = `report-clinico-diariamente-${dateIso}.pdf`;

  // Contenitore scratchpad temporaneo ad alta fedeltà (794px = larghezza standard A4 a 96 DPI)
  const container = document.createElement('div');
  container.id = 'pdf-export-scratchpad';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.width = '794px';
  container.style.maxWidth = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.zIndex = '-9999';
  container.style.opacity = '1'; // 100% opaco: evita categoricamente fogli bianchi o trasparenti!
  container.style.visibility = 'visible';
  container.style.pointerEvents = 'none';
  container.style.margin = '0';
  container.style.padding = '0';
  container.style.boxSizing = 'border-box';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    // Attendi caricamento font di sistema e rendering completo del DOM
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await document.fonts.ready;
      } catch (_) {}
    }
    await new Promise((resolve) => setTimeout(resolve, 250));

    const isMobile =
      typeof navigator !== 'undefined' &&
      (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        (typeof window !== 'undefined' && window.innerWidth < 768));

    // Risoluzione 2x per desktop/tablet (200+ DPI), 1.5x su mobile per risparmiare memoria canvas
    let scale = isMobile ? 1.5 : 2;
    const containerHeight = container.offsetHeight || 2000;
    const maxSafeHeight = isMobile ? 8000 : 16000;
    if (containerHeight * scale > maxSafeHeight) {
      scale = Math.max(1, Math.floor((maxSafeHeight / containerHeight) * 10) / 10);
    }

    // Raccolta dei punti ideali di spezzatura (titoli sezioni, righe tabella, schede cliniche)
    const containerRect = container.getBoundingClientRect();
    interface BreakPoint {
      canvasY: number;
      priority: number;
    }
    const breakPoints: BreakPoint[] = [];

    // Priorità 1: Titoli di sezione
    container.querySelectorAll('.section-title').forEach((el) => {
      const rect = el.getBoundingClientRect();
      breakPoints.push({
        canvasY: Math.round((rect.top - containerRect.top - 6) * scale),
        priority: 1,
      });
    });

    // Priorità 1: Righe della tabella situazionale
    container.querySelectorAll('tbody tr').forEach((el) => {
      const rect = el.getBoundingClientRect();
      breakPoints.push({
        canvasY: Math.round((rect.top - containerRect.top) * scale),
        priority: 1,
      });
    });

    // Priorità 1: Schede cliniche del diario
    container.querySelectorAll('.clinical-entry-card').forEach((el) => {
      const rect = el.getBoundingClientRect();
      breakPoints.push({
        canvasY: Math.round((rect.top - containerRect.top - 6) * scale),
        priority: 1,
      });

      // Priorità 2: Blocchi interni per voci molto lunghe
      el.querySelectorAll('.clinical-block').forEach((bEl) => {
        const bRect = bEl.getBoundingClientRect();
        breakPoints.push({
          canvasY: Math.round((bRect.top - containerRect.top) * scale),
          priority: 2,
        });
      });
    });

    breakPoints.sort((a, b) => a.canvasY - b.canvasY);

    const canvas = await html2canvas(container, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
      width: 794,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
    });

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Errore durante la creazione del canvas');
    }

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const a4WidthMm = 210;
    const a4HeightMm = 297;
    // Il container ha già il padding perimetrale nativo di 28px/24px (8mm), quindi 210mm copre perfettamente l'A4
    const maxPageHeightPx = Math.floor((canvas.width * a4HeightMm) / a4WidthMm);

    let currentY = 0;
    let pageIndex = 0;

    while (currentY < canvas.height - 5) {
      if (pageIndex > 0) {
        pdf.addPage('a4', 'portrait');
      }

      const remainingPx = canvas.height - currentY;
      let sliceHeightPx: number;

      if (remainingPx <= maxPageHeightPx) {
        sliceHeightPx = remainingPx;
      } else {
        const targetY = currentY + maxPageHeightPx;
        const minAcceptableY = currentY + maxPageHeightPx * 0.4;

        let chosenY = -1;
        // Cerca prima punti priorità 1 (prima di una card o riga)
        for (let i = breakPoints.length - 1; i >= 0; i--) {
          const pt = breakPoints[i];
          if (pt.priority === 1 && pt.canvasY <= targetY && pt.canvasY >= minAcceptableY) {
            chosenY = pt.canvasY;
            break;
          }
        }

        // Se non trovato, cerca priorità 2 (tra blocchi interni)
        if (chosenY === -1) {
          for (let i = breakPoints.length - 1; i >= 0; i--) {
            const pt = breakPoints[i];
            if (pt.canvasY <= targetY && pt.canvasY >= minAcceptableY) {
              chosenY = pt.canvasY;
              break;
            }
          }
        }

        if (chosenY !== -1) {
          sliceHeightPx = chosenY - currentY;
        } else {
          sliceHeightPx = maxPageHeightPx;
        }
      }

      const sliceHeightMm = (sliceHeightPx * a4WidthMm) / canvas.width;

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeightPx;

      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          currentY,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          canvas.width,
          sliceHeightPx
        );

        const imgData = pageCanvas.toDataURL('image/jpeg', 0.96);
        pdf.addImage(imgData, 'JPEG', 0, 0, a4WidthMm, sliceHeightMm, undefined, 'FAST');
      }

      currentY += sliceHeightPx;
      pageIndex++;
    }

    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

    // 1. Condivisione nativa Web Share (dispositivi mobili iOS Safari / Android)
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: 'Report Clinico - DiariaMente',
          text: 'Report clinico CBT generato da DiariaMente',
        });
        onToast?.('PDF salvato / condiviso con successo!');
        return;
      } catch (shareErr: any) {
        if (shareErr?.name === 'AbortError') {
          return;
        }
        console.warn('Web Share non completato, fallback al download diretto:', shareErr);
      }
    }

    // 2. Download diretto del file .pdf nel browser
    try {
      pdf.save(filename);
      onToast?.('PDF scaricato con successo!');
    } catch (saveErr) {
      console.warn('pdf.save fallito, uso fallback blob URL:', saveErr);
      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(blobUrl);
      }, 4000);
      onToast?.('PDF scaricato con successo!');
    }
  } catch (err) {
    console.error('Errore durante la generazione del PDF con jsPDF/html2canvas:', err);
    // Fallback di emergenza: download del report HTML pronto da consultare o stampare
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `report-clinico-diariamente-${dateIso}.html`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(blobUrl);
    }, 4000);
    onToast?.('Scaricato report alternativo HTML (apribile e stampabile in PDF)');
  } finally {
    try {
      container.remove();
    } catch (_) {}
  }
}

/**
 * Apre il report clinico in una finestra/scheda pulita dedicata per la stampa o consultazione
 */
export function openPrintWindow(html: string): void {
  try {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (_) {}
      }, 250);
      return;
    }
  } catch (e) {
    console.warn('Impossibile aprire nuova finestra:', e);
  }
}

/**
 * Export a dedicated clinical report for a single journal entry directly to PDF
 */
export async function exportSingleEntryPdf(
  entry: CbtEntry,
  allTags: Tag[],
  customQuestions: CustomQuestion[],
  onToast?: (msg: string) => void
): Promise<void> {
  const patientName = (typeof localStorage !== 'undefined' && localStorage.getItem('diariamente_patient_name')) || '';
  const dateIso = entry.eventDatetime.slice(0, 10);

  const options: TherapistReportFilterOptions = {
    patientName,
    period: 'custom',
    customStartDate: dateIso,
    customEndDate: dateIso,
    sortOrder: 'asc',
  };

  await exportTherapistPdf([entry], allTags, customQuestions, options, onToast);
}
