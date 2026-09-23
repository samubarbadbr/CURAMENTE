import { CbtEntry, CustomQuestion, Tag } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  isMobileDevice,
  canSharePdfFiles,
  downloadPdfBlob,
  sharePdfBlob,
  SharePdfResult,
} from './pdfSharingUtils';

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
 * Remove emoji characters from strings for clean, formal clinical presentations
 */
export function removeEmojis(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    // Remove Unicode emojis, pictographs, symbols, flags and modifier sequences
    .replace(
      /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]|[\uFE00-\uFE0F])/gu,
      ''
    )
    .replace(/[\u{1F000}-\u{1FAFF}]/gu, '')
    // Normalize any repeated whitespace
    .replace(/\s{2,}/g, ' ')
    .trim();
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
 * Helper to generate anxiety score: text color with subtle underline for clinical look (no circles/pills)
 */
function getAnxietyBadgeHtml(score: number): string {
  let color = '#059669';
  let underlineColor = '#a7f3d0';
  if (score >= 70) {
    color = '#dc2626';
    underlineColor = '#fecaca';
  } else if (score >= 40) {
    color = '#d97706';
    underlineColor = '#fed7aa';
  }
  return `<span class="badge-score" style="display: inline-block; font-size: 11.5px; font-weight: 900; color: ${color}; border-bottom: 1.5px solid ${underlineColor}; padding-bottom: 1px; line-height: 1.2; vertical-align: baseline;">${score}/100</span>`;
}

/**
 * Helper to generate frequency score: deep navy text color with subtle underline
 */
function getFrequencyBadgeHtml(score: number): string {
  return `<span class="badge-freq-score" style="display: inline-block; font-size: 11.5px; font-weight: 900; color: #1e3a8a; border-bottom: 1.5px solid #bfdbfe; padding-bottom: 1px; line-height: 1.2; vertical-align: baseline;">${score}/100</span>`;
}

/**
 * Helper to generate body attention score: rich purple text color with subtle underline
 */
function getBodyAttentionBadgeHtml(score: number): string {
  return `<span class="badge-attention-score" style="display: inline-block; font-size: 11.5px; font-weight: 900; color: #6b21a8; border-bottom: 1.5px solid #e9d5ff; padding-bottom: 1px; line-height: 1.2; vertical-align: baseline;">${score}/100</span>`;
}

/**
 * Helper to generate behavior occurrence count with clear text coloring (no circles/pills)
 */
function getCountPillHtml(count: number, singular = 'volta', plural = 'volte'): string {
  const label = `${count} ${count === 1 ? singular : plural}`;
  if (count > 0) {
    return `<span class="badge-count-score" style="display: inline-block; font-size: 11.5px; font-weight: 900; color: #9a3412; border-bottom: 1.5px solid #fed7aa; padding-bottom: 1px; line-height: 1.2; vertical-align: baseline;">${label}</span>`;
  }
  return `<span style="display: inline-block; font-size: 11px; font-weight: 600; color: #64748b; line-height: 1.2; vertical-align: baseline;">${label}</span>`;
}

/**
 * Generate full self-contained printable HTML document adhering strictly to the therapist's sheet
 * Perfectly centered A4 layout with clean typography, fixed table columns, subtle underlines and no emojis
 */
export function generateTherapistReportHtml(
  entries: CbtEntry[],
  allTags: Tag[],
  _customQuestions: CustomQuestion[],
  options: TherapistReportFilterOptions
): string {
  const tagMap = new Map(allTags.map((t) => [t.id, removeEmojis(t.label)]));
  const dateRangeDisplay = removeEmojis(formatItalianDateRange(entries, options));
  const cleanPatientName = removeEmojis(options.patientName);

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

      const emoLabels = (e.emotionTagIds || [])
        .map((id) => tagMap.get(id))
        .filter((label): label is string => Boolean(label && !label.startsWith('tag-')));
      const rawThought = e.negativeThought ? removeEmojis(e.negativeThought) : '—';
      const thought = escapeHtml(rawThought);
      const beliefLevel = e.thoughtBeliefLevel !== undefined ? e.thoughtBeliefLevel : 0;

      return `
        <tr style="background: #ffffff;">
          <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9; vertical-align: top;">
            <div style="font-size: 11.5px; font-weight: 800; color: #0f172a; line-height: 1.3;">${datePart}</div>
            <div style="font-size: 10.5px; font-weight: 600; color: #64748b; margin-top: 2px;">ore ${timePart}</div>
          </td>
          <td style="padding: 10px 12px; color: #0f172a; font-weight: 500; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9; vertical-align: top; line-height: 1.45; word-break: break-word;">
            ${escapeHtml(removeEmojis(e.situation) || '—')}
          </td>
          <td style="padding: 10px 12px; color: #0f172a; font-weight: 500; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9; vertical-align: top; line-height: 1.45; word-break: break-word;">
            ${escapeHtml(removeEmojis(e.triggerFactors) || '—')}
          </td>
          <td style="padding: 10px 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #f1f5f9; vertical-align: top;">
            ${
              emoLabels.length > 0
                ? `<div style="font-size: 11px; line-height: 1.45;">
                    ${emoLabels
                      .map(
                        (lbl) =>
                          `<span style="color: #4338ca; font-weight: 700; border-bottom: 1px solid #c7d2fe; padding-bottom: 1px; margin-right: 4px; display: inline-block;">${escapeHtml(lbl)}</span>`
                      )
                      .join(' ')}
                  </div>`
                : '<span style="color: #94a3b8; font-style: italic;">—</span>'
            }
          </td>
          <td style="padding: 10px 12px; color: #0f172a; border-bottom: 1px solid #e2e8f0; vertical-align: top; word-break: break-word;">
            <div style="margin-bottom: 6px; line-height: 1.45; font-size: 11px;">
              <span style="font-weight: 700; color: #1e1b4b; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 1px;">${thought}</span>
            </div>
            <div style="margin-top: 4px; font-size: 10.5px; color: #4338ca; font-weight: 700; line-height: 1.2;">
              <span style="display: inline; vertical-align: baseline;">Grado di convinzione:</span> <strong style="display: inline; font-size: 11px; font-weight: 900; color: #1e1b4b; vertical-align: baseline; border-bottom: 1px dotted #818cf8;">${beliefLevel}/100</strong>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');

  // SEZIONE 2: REGISTRO CLINICO DETTAGLIATO
  // Schede strutturate con header (Data/Ora e Ansia) e 6 blocchi clinici distinti
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

      const physTags = (e.physicalSymptomTagIds || [])
        .map((id) => tagMap.get(id))
        .filter((label): label is string => Boolean(label && !label.startsWith('tag-')));
      const physDetail = removeEmojis(e.physicalSymptomsText ? e.physicalSymptomsText.trim() : '');
      let physicalHtml = '';
      if (physTags.length > 0 && physDetail) {
        physicalHtml = `
          <div style="font-size: 11px; line-height: 1.4;">
            ${physTags
              .map(
                (lbl) =>
                  `<span style="color: #3730a3; font-weight: 700; border-bottom: 1px solid #c7d2fe; padding-bottom: 1px; margin-right: 6px; display: inline-block;">${escapeHtml(lbl)}</span>`
              )
              .join(' ')}
          </div>
          <div style="margin-top: 4px; color: #334155; line-height: 1.45; word-break: break-word;">${escapeHtml(physDetail)}</div>
        `;
      } else if (physTags.length > 0) {
        physicalHtml = `
          <div style="font-size: 11px; line-height: 1.4;">
            ${physTags
              .map(
                (lbl) =>
                  `<span style="color: #3730a3; font-weight: 700; border-bottom: 1px solid #c7d2fe; padding-bottom: 1px; margin-right: 6px; display: inline-block;">${escapeHtml(lbl)}</span>`
              )
              .join(' ')}
          </div>
        `;
      } else if (physDetail) {
        physicalHtml = `<div style="color: #334155; line-height: 1.45; word-break: break-word;">${escapeHtml(physDetail)}</div>`;
      } else {
        physicalHtml = '<span style="color: #94a3b8; font-style: italic;">Nessuno specificato</span>';
      }

      const thoughtDesc = removeEmojis(e.negativeThoughtsExtended || e.negativeThought || 'Nessuna descrizione');
      const thoughtFreq = e.negativeThoughtsIntensity ?? e.thoughtBeliefLevel ?? 0;
      const thoughtTags = (e.thoughtTagIds || [])
        .map((id) => tagMap.get(id))
        .filter((label): label is string => Boolean(label && !label.startsWith('tag-')));

      const controlAction = removeEmojis(e.symptomControlDescription ? e.symptomControlDescription.trim() : 'Nessuna azione specificata');
      const reassuranceType = removeEmojis(e.reassuranceSeekingType ? e.reassuranceSeekingType.trim() : 'Nessuna richiesta specificata');
      const avoidanceType = removeEmojis(e.avoidanceType ? e.avoidanceType.trim() : 'Nessun evitamento specificato');

      return `
        <div class="clinical-entry-card" style="margin-bottom: 18px; border: 1px solid #cbd5e1; border-left: 3px solid #4338ca; border-radius: 4px; background: #ffffff; overflow: hidden; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);">
          
          <!-- Testata Scheda: Data a sinistra, Ansia Complessiva a destra -->
          <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <tr>
              <td style="padding: 9px 14px; text-align: left; vertical-align: middle;">
                <span style="display: inline; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; line-height: 1.2; vertical-align: baseline; margin-right: 6px;">REGISTRAZIONE CLINICA:</span>
                <span style="display: inline; font-size: 11px; font-weight: 900; color: #0f172a; line-height: 1.2; vertical-align: baseline;">
                  ${escapeHtml(dateFormatted)}
                </span>
              </td>
              <td style="padding: 9px 14px; text-align: right; vertical-align: middle; white-space: nowrap;">
                <span style="display: inline; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; line-height: 1.2; vertical-align: baseline; margin-right: 6px;">ANSIA COMPLESSIVA:</span>
                ${getAnxietyBadgeHtml(e.overallAnxietyLevel ?? 0)}
              </td>
            </tr>
          </table>
          
          <!-- Corpo Scheda: 6 blocchi clinici strutturati con metriche ancorate a destra -->
          <div style="padding: 2px 0;">
            
            <!-- 1. Sintomi fisici -->
            <div class="clinical-block" style="padding: 9px 16px; border-bottom: 1px solid #f1f5f9;">
              <div style="font-size: 10.5px; font-weight: 800; color: #0f172a; margin-bottom: 3px;">
                1. Sintomi fisici
              </div>
              <div style="font-size: 11px; font-weight: 500; line-height: 1.45; word-break: break-word;">
                ${physicalHtml}
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
              <div style="font-size: 11.5px; line-height: 1.5; word-break: break-word;">
                <span style="font-weight: 700; color: #1e1b4b; border-bottom: 1.5px solid #cbd5e1; padding-bottom: 1px;">
                  ${escapeHtml(thoughtDesc)}
                </span>
              </div>
              ${
                thoughtTags.length > 0
                  ? `
                <div style="margin-top: 6px; font-size: 10.5px; line-height: 1.4;">
                  <span style="color: #64748b; font-weight: 600; margin-right: 4px;">Schemi di pensiero:</span>
                  ${thoughtTags
                    .map(
                      (t) =>
                        `<span style="color: #4f46e5; font-weight: 700; border-bottom: 1px solid #e0e7ff; padding-bottom: 1px; margin-right: 6px; display: inline-block;">${escapeHtml(
                          t
                        )}</span>`
                    )
                    .join(' ')}
                </div>
              `
                  : ''
              }
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
                    5. Ricerca di rassicurazioni (tipo di richiesta e frequenza)
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

            ${
              e.alternativeThought
                ? `
              <!-- Ristrutturazione Cognitiva / Pensiero Alternativo -->
              <div class="clinical-block" style="padding: 9px 16px; border-top: 1px solid #f1f5f9; background: #f8fafc;">
                <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #047857; margin-bottom: 3px;">
                  Pensiero alternativo / Ristrutturazione
                </div>
                <div style="font-size: 11px; font-weight: 600; line-height: 1.45; word-break: break-word;">
                  <span style="color: #065f46; border-bottom: 1px solid #a7f3d0; padding-bottom: 1px;">
                    ${escapeHtml(removeEmojis(e.alternativeThought))}
                  </span>
                </div>
              </div>
            `
                : ''
            }

            ${
              e.notes && e.notes.trim()
                ? `
              <!-- Note aggiuntive -->
              <div class="clinical-block" style="padding: 9px 16px; border-top: 1px solid #f1f5f9; background: #fdfdfd;">
                <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #64748b; margin-bottom: 3px;">
                  Note cliniche
                </div>
                <div style="font-size: 11px; color: #334155; font-weight: 500; line-height: 1.45; word-break: break-word;">
                  ${escapeHtml(removeEmojis(e.notes))}
                </div>
              </div>
            `
                : ''
            }

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
  <title>Report Clinico - DiariaMente - ${escapeHtml(dateRangeDisplay)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
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
      margin: 0 auto !important;
      padding: 0 !important;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      display: flex !important;
      justify-content: center !important;
      width: 100% !important;
    }

    .report-container {
      width: 100% !important;
      max-width: 794px !important;
      margin: 0 auto !important;
      background: #ffffff !important;
      background-color: #ffffff !important;
      padding: 16px 24px 20px 24px !important;
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
        margin: 0 auto !important;
        display: block !important;
      }
      .report-container {
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 auto !important;
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
      border-bottom: 2px solid #4338ca;
      padding: 0 0 6px 0;
      font-size: 11.5px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #1e1b4b;
      margin: 20px 0 12px 0;
      display: block;
    }
  </style>
</head>
<body>

  <div class="report-container">
    
    <!-- HEADER PDF CLINICO PROFESSIONALE, CENTRATO ED ELEGANTE -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 22px; border-bottom: 2px solid #e2e8f0; background: #ffffff;">
      <tr>
        <td style="padding: 4px 0 16px 0; text-align: left; vertical-align: middle;">
          <div class="report-header-title" style="font-size: 21px; color: #4338ca; font-weight: 900; line-height: 1.15; letter-spacing: 0.04em;">
            DIARIAMENTE
          </div>
          <div class="report-subtitle" style="font-size: 11px; color: #475569; margin-top: 6px; font-weight: 600; line-height: 1.3; letter-spacing: 0.01em;">
            Report Clinico di Psicoterapia Cognitivo-Comportamentale
          </div>
        </td>
        <td style="padding: 4px 0 16px 0; text-align: right; vertical-align: middle; white-space: nowrap;">
          ${
            cleanPatientName
              ? `
            <div style="display: inline-block; text-align: right; border-bottom: 2px solid #4338ca; padding: 2px 4px 4px 12px;">
              <div style="font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; line-height: 1.1;">
                Paziente
              </div>
              <div style="font-size: 13px; font-weight: 900; color: #1e1b4b; line-height: 1.2; margin-top: 2px;">
                ${escapeHtml(cleanPatientName)}
              </div>
            </div>
          `
              : ''
          }
        </td>
      </tr>
    </table>

    <!-- SEZIONE 1: TABELLA ANALISI SITUAZIONALI -->
    <section>
      <div class="section-title" style="margin-top: 4px;">SEZIONE 1: TABELLA ANALISI SITUAZIONALI</div>
      
      ${
        entries.length > 0
          ? `
        <div class="table-wrapper" style="border-radius: 4px; overflow: hidden; border: 1.5px solid #cbd5e1; background: #ffffff; margin-bottom: 20px;">
          <table style="width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0; font-size: 11px; margin: 0 auto;">
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
          : '<p style="color: #64748b; font-style: italic; padding: 10px 0; text-align: center;">Nessuna registrazione per il periodo selezionato.</p>'
      }
    </section>

    <!-- SEZIONE 2: REGISTRO CLINICO DETTAGLIATO -->
    <section>
      <div class="section-title">SEZIONE 2: REGISTRO CLINICO DETTAGLIATO</div>
      
      ${
        entries.length > 0
          ? detailedEntriesHtml
          : '<p style="color: #64748b; font-style: italic; padding: 10px 0; text-align: center;">Nessuna registrazione per il periodo selezionato.</p>'
      }
    </section>

  </div>

</body>
</html>`;
}

/**
 * Generate Raw Tabular CSV matching the exact sections and columns of the clinical sheet without emojis
 */
export function generateTherapistCsv(
  entries: CbtEntry[],
  allTags: Tag[],
  _customQuestions: CustomQuestion[],
  _options: TherapistReportFilterOptions
): string {
  const tagMap = new Map(allTags.map((t) => [t.id, removeEmojis(t.label)]));

  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const s = removeEmojis(String(val)).replace(/"/g, '""');
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
    const situation = removeEmojis(e.situation || '');
    const triggers = removeEmojis(e.triggerFactors || '');
    const emoList = (e.emotionTagIds || [])
      .map((id) => tagMap.get(id))
      .filter((label): label is string => Boolean(label && !label.startsWith('tag-')))
      .join(', ');
    const thoughtBelief = e.thoughtBeliefLevel !== undefined ? e.thoughtBeliefLevel : 0;
    const cleanThought = removeEmojis(e.negativeThought || '');
    const thoughtCell = cleanThought
      ? `${cleanThought} (Grado di convinzione: ${thoughtBelief}/100)`
      : `(Grado di convinzione: ${thoughtBelief}/100)`;

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
    'Ricerca di rassicurazioni (tipo di richiesta e frequenza)',
    'Evitamento (tipologia e frequenza)',
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

    const physTags = (e.physicalSymptomTagIds || [])
      .map((id) => tagMap.get(id))
      .filter((label): label is string => Boolean(label && !label.startsWith('tag-')));
    const physDetail = removeEmojis(e.physicalSymptomsText ? e.physicalSymptomsText.trim() : '');
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

    const thoughtDesc = removeEmojis(e.negativeThoughtsExtended || e.negativeThought || 'Nessuna descrizione');
    const thoughtFreq = e.negativeThoughtsIntensity ?? e.thoughtBeliefLevel ?? 0;
    const thoughtsCell = `${thoughtDesc} (Frequenza: ${thoughtFreq}/100)`;

    const bodyAttentionCell = `${e.bodyFocusedAttentionLevel ?? 0}/100`;

    const controlAction = removeEmojis(e.symptomControlDescription ? e.symptomControlDescription.trim() : 'Nessuna azione specificata');
    const controlCount = `${e.symptomControlCount ?? 0} ${e.symptomControlCount === 1 ? 'volta' : 'volte'}`;
    const checkCell = `${controlAction} (${controlCount})`;

    const reassType = removeEmojis(e.reassuranceSeekingType ? e.reassuranceSeekingType.trim() : 'Nessuna richiesta specificata');
    const reassCount = `${e.reassuranceSeekingCount ?? 0} ${e.reassuranceSeekingCount === 1 ? 'volta' : 'volte'}`;
    const reassuranceCell = `${reassType} (${reassCount})`;

    const avoidType = removeEmojis(e.avoidanceType ? e.avoidanceType.trim() : 'Nessun evitamento specificato');
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
 * Generazione ed esportazione diretta del file PDF clinico (A4, multipagina con interruzioni pulite e perfetto allineamento centrato)
 * Il PDF viene centrato con margini simmetrici esatti da 10 mm a sinistra e destra, senza emoji e con sottolineature sottili professionali.
 */
export async function exportTherapistPdf(
  entries: CbtEntry[],
  allTags: Tag[],
  customQuestions: CustomQuestion[],
  options: TherapistReportFilterOptions,
  onToast?: (msg: string) => void,
  exportMode: 'download' | 'share' | 'auto' = 'download'
): Promise<SharePdfResult | 'downloaded' | 'failed'> {
  if (entries.length === 0) {
    onToast?.('Nessuna registrazione da esportare');
    return 'failed';
  }

  onToast?.('Generazione PDF in corso...');

  const dateRangeDisplay = removeEmojis(formatItalianDateRange(entries, options));
  const cleanPatientName = removeEmojis(options.patientName);
  const html = generateTherapistReportHtml(entries, allTags, customQuestions, options);
  const dateIso = new Date().toISOString().slice(0, 10);
  const filename = `report-clinico-diariamente-${dateIso}.pdf`;

  // Contenitore scratchpad temporaneo ad alta fedeltà (794px = larghezza standard A4 a 96 DPI)
  const container = document.createElement('div');
  container.id = 'pdf-export-scratchpad';
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '0';
  container.style.right = '0';
  container.style.margin = '0 auto';
  container.style.width = '794px';
  container.style.maxWidth = '794px';
  container.style.backgroundColor = '#ffffff';
  container.style.color = '#0f172a';
  container.style.zIndex = '-9999';
  container.style.opacity = '1'; // 100% opaco: garantisce contrasto elevato e colori nitidi
  container.style.visibility = 'visible';
  container.style.pointerEvents = 'none';
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

    // Priorità 1: Schede cliniche del diario (l'intera scheda viene preservata integra)
    container.querySelectorAll('.clinical-entry-card').forEach((el) => {
      const rect = el.getBoundingClientRect();
      breakPoints.push({
        canvasY: Math.round((rect.top - containerRect.top - 6) * scale),
        priority: 1,
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
    // Larghezza contenuto impostata a 190 mm: lascia esattamente 10 mm a sinistra e 10 mm a destra (perfettamente centrato)
    const contentWidthMm = 190;
    const marginSideMm = (a4WidthMm - contentWidthMm) / 2; // Esattamente 10.0 mm

    // Suddivisione in fette di pagina calcolando i breakpoint per evitare tagli antiestetici
    interface PageSlice {
      startY: number;
      sliceHeightPx: number;
      isFirstPage: boolean;
    }
    const slices: PageSlice[] = [];
    let currentY = 0;

    while (currentY < canvas.height - 4) {
      const isFirst = slices.length === 0;
      // Pagina 1 ha 272mm utili (12mm top, 13mm bottom). Pagine successive 265mm (18mm top per testata, 14mm bottom)
      const availHeightMm = isFirst ? 272 : 265;
      const maxSlicePx = Math.floor((canvas.width * availHeightMm) / contentWidthMm);

      const remainingPx = canvas.height - currentY;
      let sliceHeightPx: number;

      if (remainingPx <= maxSlicePx) {
        sliceHeightPx = remainingPx;
      } else {
        const targetY = currentY + maxSlicePx;
        // Accetta di spezzare prima di una nuova scheda se la pagina ha raggiunto almeno il 20% della capienza
        const minAcceptableY = currentY + Math.floor(maxSlicePx * 0.2);

        let chosenY = -1;
        for (let i = breakPoints.length - 1; i >= 0; i--) {
          const pt = breakPoints[i];
          if (pt.canvasY <= targetY && pt.canvasY >= minAcceptableY) {
            chosenY = pt.canvasY;
            break;
          }
        }

        if (chosenY !== -1) {
          sliceHeightPx = chosenY - currentY;
        } else {
          sliceHeightPx = maxSlicePx;
        }
      }

      slices.push({
        startY: currentY,
        sliceHeightPx,
        isFirstPage: isFirst,
      });

      currentY += sliceHeightPx;
    }

    const totalPages = slices.length;

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
      const slice = slices[pageIndex];
      if (pageIndex > 0) {
        pdf.addPage('a4', 'portrait');
      }

      const sliceHeightMm = (slice.sliceHeightPx * contentWidthMm) / canvas.width;
      const topMm = slice.isFirstPage ? 12 : 18;

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = slice.sliceHeightPx;

      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          slice.startY,
          canvas.width,
          slice.sliceHeightPx,
          0,
          0,
          canvas.width,
          slice.sliceHeightPx
        );

        // Compressione bilanciata: genera un file PDF leggero e nitidissimo
        const imgData = pageCanvas.toDataURL('image/jpeg', 0.9);
        pdf.addImage(imgData, 'JPEG', marginSideMm, topMm, contentWidthMm, sliceHeightMm, undefined, 'FAST');
      }

      // Testata superiore di continuazione (dalla pagina 2 in poi) perfettamente centrata/allineata sui 10 mm
      if (pageIndex > 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(71, 85, 105);
        pdf.text('DiariaMente — Report Clinico CBT', marginSideMm, 10.5);
        const rightSubtitle = cleanPatientName ? `Paziente: ${cleanPatientName}` : '';
        if (rightSubtitle) {
          pdf.text(rightSubtitle, a4WidthMm - marginSideMm, 10.5, { align: 'right' });
        }
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.25);
        pdf.line(marginSideMm, 13.5, a4WidthMm - marginSideMm, 13.5);
      }

      // Piè di pagina professionale su tutte le pagine, simmetricamente spaziato
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.25);
      pdf.line(marginSideMm, 287, a4WidthMm - marginSideMm, 287);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Documento ad uso clinico e psicoterapeutico riservato', marginSideMm, 291.5);
      pdf.text(`Pagina ${pageIndex + 1} di ${totalPages}`, a4WidthMm - marginSideMm, 291.5, { align: 'right' });
    }

    // Creazione del Blob binario con tipo MIME esplicito
    const arrayBuffer = pdf.output('arraybuffer');
    const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });

    const shouldShare =
      exportMode === 'share' ||
      (exportMode === 'auto' && isMobileDevice() && canSharePdfFiles());

    if (shouldShare) {
      onToast?.('Apertura condivisione...');
      const shareResult = await sharePdfBlob(
        pdfBlob,
        filename,
        'Report Clinico CBT — DiariaMente',
        cleanPatientName
          ? `Report clinico CBT per il paziente ${cleanPatientName} (periodo: ${dateRangeDisplay}).`
          : `Report clinico CBT DiariaMente (periodo: ${dateRangeDisplay}).`
      );

      if (shareResult === 'shared') {
        onToast?.('Condivisione completata con successo!');
      } else if (shareResult === 'fallback_downloaded') {
        onToast?.('PDF scaricato con successo!');
      }
      return shareResult;
    } else {
      // Download diretto e affidabile (URL mantenuto valido per 60 secondi)
      downloadPdfBlob(pdfBlob, filename);
      onToast?.('PDF scaricato con successo!');
      return 'downloaded';
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
    }, 60000);
    onToast?.('Scaricato report alternativo HTML (apribile e stampabile in PDF)');
    return 'failed';
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
 * Export a dedicated clinical report for a single journal entry directly to PDF.
 * Su mobile, la modalità 'auto' avvia automaticamente la condivisione nativa (es. WhatsApp),
 * mentre su desktop o se non supportato effettua il download sicuro.
 */
export async function exportSingleEntryPdf(
  entry: CbtEntry,
  allTags: Tag[],
  customQuestions: CustomQuestion[],
  onToast?: (msg: string) => void,
  exportMode: 'download' | 'share' | 'auto' = 'auto'
): Promise<SharePdfResult | 'downloaded' | 'failed'> {
  const patientName = (typeof localStorage !== 'undefined' && localStorage.getItem('diariamente_patient_name')) || '';
  const dateIso = entry.eventDatetime.slice(0, 10);

  const options: TherapistReportFilterOptions = {
    patientName,
    period: 'custom',
    customStartDate: dateIso,
    customEndDate: dateIso,
    sortOrder: 'asc',
  };

  return await exportTherapistPdf([entry], allTags, customQuestions, options, onToast, exportMode);
}
