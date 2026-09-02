import { CbtEntry, CustomQuestion, Tag } from '../types';

export interface TherapistReportFilterOptions {
  patientName: string;
  period: '7' | '30' | 'custom' | 'all';
  customStartDate?: string; // YYYY-MM-DD
  customEndDate?: string;   // YYYY-MM-DD
  includeMetrics: boolean;
  includeSituationTriggers: boolean;
  includeThoughts: boolean;
  includeEmotionsSymptoms: boolean;
  includeBehaviors: boolean;
  includeCustomQuestions: boolean;
  includeNotes: boolean;
  includeSummaryTable: boolean;
  sortOrder: 'asc' | 'desc'; // 'asc': chronological (past -> present), 'desc': newest first
}

export interface ReportStats {
  totalEntries: number;
  avgAnxiety: number;
  avgBelief: number;
  avgIntensity: number;
  avgBodyAttention: number;
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

  if (options.period === '7') {
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - 7);
    cutoff.setHours(0, 0, 0, 0);
    filtered = filtered.filter((e) => new Date(e.eventDatetime) >= cutoff);
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
      totalChecks: 0,
      totalReassurances: 0,
      totalAvoidances: 0,
      dateRangeText: 'Nessuna data',
    };
  }

  const sumAnxiety = entries.reduce((acc, e) => acc + (e.overallAnxietyLevel || 0), 0);
  const sumBelief = entries.reduce((acc, e) => acc + (e.thoughtBeliefLevel || 0), 0);
  const sumIntensity = entries.reduce((acc, e) => acc + (e.negativeThoughtsIntensity || 0), 0);
  const sumBody = entries.reduce((acc, e) => acc + (e.bodyFocusedAttentionLevel || 0), 0);
  const totalChecks = entries.reduce((acc, e) => acc + (e.symptomControlCount || 0), 0);
  const totalReassurances = entries.reduce((acc, e) => acc + (e.reassuranceSeekingCount || 0), 0);
  const totalAvoidances = entries.reduce((acc, e) => acc + (e.avoidanceCount || 0), 0);

  return {
    totalEntries: entries.length,
    avgAnxiety: Math.round(sumAnxiety / entries.length),
    avgBelief: Math.round(sumBelief / entries.length),
    avgIntensity: Math.round(sumIntensity / entries.length),
    avgBodyAttention: Math.round(sumBody / entries.length),
    totalChecks,
    totalReassurances,
    totalAvoidances,
    dateRangeText: formatItalianDateRange(entries, options),
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
 * Generate full self-contained printable HTML document
 */
export function generateTherapistReportHtml(
  entries: CbtEntry[],
  allTags: Tag[],
  customQuestions: CustomQuestion[],
  options: TherapistReportFilterOptions
): string {
  const stats = calculateReportStats(entries, options);
  const tagMap = new Map(allTags.map((t) => [t.id, t.label]));
  const questionMap = new Map(customQuestions.map((q) => [q.id, q]));

  const generatedAt = new Date().toLocaleString('it-IT', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  // Summary Table Rows
  const summaryTableRows = entries
    .map((e, idx) => {
      const d = new Date(e.eventDatetime).toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const emoList = (e.emotionTagIds || []).map((id) => tagMap.get(id) || id).slice(0, 3).join(', ');
      const behaviorsSummary = [
        e.symptomControlCount ? `${e.symptomControlCount} check` : null,
        e.reassuranceSeekingCount ? `${e.reassuranceSeekingCount} rass.` : null,
        e.avoidanceCount ? `${e.avoidanceCount} evit.` : null,
      ].filter(Boolean).join(' • ') || '—';

      const anxietyColor =
        e.overallAnxietyLevel > 70 ? '#b91c1c' : e.overallAnxietyLevel > 40 ? '#b45309' : '#047857';

      return `
        <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 9px 12px; font-weight: 700; white-space: nowrap;">${d}</td>
          <td style="padding: 9px 12px; text-align: center;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-weight: 800; font-size: 11px; background: ${anxietyColor}15; color: ${anxietyColor}; border: 1px solid ${anxietyColor}40;">
              ${e.overallAnxietyLevel}/100
            </span>
          </td>
          <td style="padding: 9px 12px; text-align: center; font-weight: 600;">${e.thoughtBeliefLevel}%</td>
          <td style="padding: 9px 12px; text-align: center; font-weight: 600;">${e.negativeThoughtsIntensity}%</td>
          <td style="padding: 9px 12px; text-align: center; font-weight: 600;">${e.bodyFocusedAttentionLevel}%</td>
          <td style="padding: 9px 12px; font-size: 11px; color: #334155;">${escapeHtml(emoList || '—')}</td>
          <td style="padding: 9px 12px; font-size: 11px; color: #475569;">${escapeHtml(behaviorsSummary)}</td>
        </tr>
      `;
    })
    .join('');

  // Daily Detailed Entries Cards
  const detailedEntriesHtml = entries
    .map((e, idx) => {
      const dateFormatted = new Date(e.eventDatetime).toLocaleString('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const emotionLabels = (e.emotionTagIds || []).map((id) => tagMap.get(id) || id);
      const symptomLabels = (e.physicalSymptomTagIds || []).map((id) => tagMap.get(id) || id);

      const customAnswersList = Object.entries(e.customAnswers || {}).filter(
        ([_, val]) => val !== undefined && val !== ''
      );

      return `
        <article class="day-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 22px; margin-bottom: 22px; page-break-inside: avoid; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
          
          <!-- Day Header & Inline Metrics Bar -->
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid #f1f5f9; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 8px; height: 8px; border-radius: 50%; background: #4f46e5;"></div>
              <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0f172a; text-transform: capitalize;">
                ${escapeHtml(dateFormatted)}
              </h3>
              <span style="font-size: 11px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 2px 8px; border-radius: 6px;">#${entries.length - idx}</span>
            </div>

            ${
              options.includeMetrics
                ? `
              <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center;">
                <span style="font-size: 11px; font-weight: 800; background: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 6px; border: 1px solid #dbeafe;">
                  Ansia: ${e.overallAnxietyLevel}/100
                </span>
                <span style="font-size: 11px; font-weight: 700; background: #f8fafc; color: #334155; padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                  Credenza: ${e.thoughtBeliefLevel}%
                </span>
                <span style="font-size: 11px; font-weight: 700; background: #f8fafc; color: #334155; padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                  Intensità Pensiero: ${e.negativeThoughtsIntensity}%
                </span>
                <span style="font-size: 11px; font-weight: 700; background: #f8fafc; color: #334155; padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
                  Attenzione Corpo: ${e.bodyFocusedAttentionLevel}%
                </span>
              </div>
            `
                : ''
            }
          </div>

          <!-- Content Grid -->
          <div style="display: flex; flex-direction: column; gap: 14px;">

            ${
              options.includeSituationTriggers && (e.situation || e.triggerFactors)
                ? `
              <div style="background: #f8fafc; border-left: 3px solid #3b82f6; border-radius: 6px; padding: 12px 14px;">
                ${
                  e.situation
                    ? `
                  <div style="margin-bottom: ${e.triggerFactors ? '8px' : '0'};">
                    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #1e40af; display: block; margin-bottom: 2px;">Situazione &amp; Contesto</span>
                    <p style="margin: 0; font-size: 13px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${escapeHtml(e.situation)}</p>
                  </div>
                `
                    : ''
                }
                ${
                  e.triggerFactors
                    ? `
                  <div>
                    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #b45309; display: block; margin-bottom: 2px;">Fattori Scatenanti (Trigger)</span>
                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #334155; white-space: pre-wrap;">${escapeHtml(e.triggerFactors)}</p>
                  </div>
                `
                    : ''
                }
              </div>
            `
                : ''
            }

            ${
              options.includeThoughts && (e.negativeThought || e.negativeThoughtsExtended || (e as any).alternativeThought)
                ? `
              <div style="background: #fff1f2; border-left: 3px solid #f43f5e; border-radius: 6px; padding: 12px 14px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                  <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #9f1239;">Pensiero Automatico Negativo</span>
                  <span style="font-size: 11px; font-weight: 700; color: #be123c;">Convinzione: ${e.thoughtBeliefLevel}%</span>
                </div>
                <p style="margin: 0; font-size: 13px; font-weight: 600; line-height: 1.6; color: #881337; white-space: pre-wrap;">${escapeHtml(e.negativeThought || 'N/D')}</p>
                ${
                  e.negativeThoughtsExtended
                    ? `
                  <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed #fecdd3;">
                    <span style="font-size: 10px; font-weight: 700; color: #9f1239; display: block; margin-bottom: 2px;">Approfondimento pensieri:</span>
                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #4c0519; white-space: pre-wrap;">${escapeHtml(e.negativeThoughtsExtended)}</p>
                  </div>
                `
                    : ''
                }
                ${
                  (e as any).alternativeThought
                    ? `
                  <div style="margin-top: 8px; padding: 8px 10px; background: #ffffff; border-radius: 6px; border: 1px solid #fbcfe8;">
                    <span style="font-size: 10px; font-weight: 800; color: #047857; text-transform: uppercase; display: block; margin-bottom: 2px;">Pensiero Alternativo Ristrutturato:</span>
                    <p style="margin: 0; font-size: 12px; font-weight: 600; line-height: 1.5; color: #064e3b; white-space: pre-wrap;">${escapeHtml((e as any).alternativeThought)}</p>
                  </div>
                `
                    : ''
                }
              </div>
            `
                : ''
            }

            ${
              options.includeEmotionsSymptoms && (emotionLabels.length > 0 || symptomLabels.length > 0 || e.physicalSymptomsText)
                ? `
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;">
                ${
                  emotionLabels.length > 0
                    ? `
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;">
                    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; display: block; margin-bottom: 6px;">Emozioni Provate</span>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                      ${emotionLabels
                        .map(
                          (lbl) => `
                        <span style="display: inline-block; font-size: 11px; font-weight: 700; color: #1e293b; background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">${escapeHtml(lbl)}</span>
                      `
                        )
                        .join('')}
                    </div>
                  </div>
                `
                    : ''
                }
                ${
                  symptomLabels.length > 0 || e.physicalSymptomsText
                    ? `
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;">
                    <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; display: block; margin-bottom: 6px;">Sintomi Fisici &amp; Corporei</span>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: ${e.physicalSymptomsText ? '6px' : '0'};">
                      ${symptomLabels
                        .map(
                          (lbl) => `
                        <span style="display: inline-block; font-size: 11px; font-weight: 700; color: #0f172a; background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">${escapeHtml(lbl)}</span>
                      `
                        )
                        .join('')}
                    </div>
                    ${
                      e.physicalSymptomsText
                        ? `<p style="margin: 0; font-size: 11px; color: #334155; line-height: 1.4; white-space: pre-wrap;">${escapeHtml(e.physicalSymptomsText)}</p>`
                        : ''
                    }
                  </div>
                `
                    : ''
                }
              </div>
            `
                : ''
            }

            ${
              options.includeBehaviors &&
              (e.symptomControlCount > 0 ||
                e.reassuranceSeekingCount > 0 ||
                e.avoidanceCount > 0 ||
                e.symptomControlDescription ||
                e.reassuranceSeekingType ||
                e.avoidanceType)
                ? `
              <div style="background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 8px; padding: 10px 12px;">
                <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #78716c; display: block; margin-bottom: 6px;">Comportamenti di Controllo, Rassicurazione &amp; Evitamento</span>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; color: #292524;">
                  ${
                    e.symptomControlCount > 0 || e.symptomControlDescription
                      ? `<div style="background: #ffffff; padding: 4px 8px; border-radius: 6px; border: 1px solid #d6d3d1;"><strong>Check Sintomi:</strong> ${e.symptomControlCount} volte ${e.symptomControlDescription ? `(${escapeHtml(e.symptomControlDescription)})` : ''}</div>`
                      : ''
                  }
                  ${
                    e.reassuranceSeekingCount > 0 || e.reassuranceSeekingType
                      ? `<div style="background: #ffffff; padding: 4px 8px; border-radius: 6px; border: 1px solid #d6d3d1;"><strong>Rassicurazioni:</strong> ${e.reassuranceSeekingCount} volte ${e.reassuranceSeekingType ? `(${escapeHtml(e.reassuranceSeekingType)})` : ''}</div>`
                      : ''
                  }
                  ${
                    e.avoidanceCount > 0 || e.avoidanceType
                      ? `<div style="background: #ffffff; padding: 4px 8px; border-radius: 6px; border: 1px solid #d6d3d1;"><strong>Evitamenti:</strong> ${e.avoidanceCount} volte ${e.avoidanceType ? `(${escapeHtml(e.avoidanceType)})` : ''}</div>`
                      : ''
                  }
                </div>
              </div>
            `
                : ''
            }

            ${
              options.includeCustomQuestions && customAnswersList.length > 0
                ? `
              <div style="background: #fdf4ff; border-left: 3px solid #c026d3; border-radius: 6px; padding: 12px 14px;">
                <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #86198f; display: block; margin-bottom: 8px;">Riflessioni &amp; Domande Guidate</span>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                  ${customAnswersList
                    .map(([qId, answer]) => {
                      const q = questionMap.get(qId);
                      const prompt = q?.prompt || 'Domanda Personalizzata';
                      const category = q?.category || 'Riflessione';
                      let answerFormatted = escapeHtml(String(answer));
                      if (typeof answer === 'boolean') {
                        answerFormatted = answer ? 'Sì (Confermato)' : 'No';
                      } else if (typeof answer === 'number') {
                        answerFormatted = `Punteggio: ${answer}`;
                      }
                      return `
                      <div style="font-size: 12px;">
                        <span style="font-weight: 700; color: #701a75;">[${escapeHtml(category)}] ${escapeHtml(prompt)}</span>
                        <div style="margin-top: 2px; color: #0f172a; white-space: pre-wrap; font-weight: 500;">${answerFormatted}</div>
                      </div>
                    `;
                    })
                    .join('')}
                </div>
              </div>
            `
                : ''
            }

            ${
              options.includeNotes && e.notes
                ? `
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 12px;">
                <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #166534; display: block; margin-bottom: 4px;">Note Personali &amp; Spunti per la Seduta</span>
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #14532d; white-space: pre-wrap;">${escapeHtml(e.notes)}</p>
              </div>
            `
                : ''
            }

          </div>
        </article>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report Psicoterapia - Diariamente - ${escapeHtml(stats.dateRangeText)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm 15mm 15mm 15mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background-color: #f8fafc;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
    }

    .report-container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      padding: 36px 40px;
      border-radius: 16px;
      box-shadow: 0 4px 20px -2px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }

    /* Print specific reset */
    @media print {
      body {
        background-color: #ffffff;
        padding: 0;
      }
      .report-container {
        box-shadow: none;
        border: none;
        padding: 0;
        max-width: 100%;
      }
      .no-print {
        display: none !important;
      }
      .day-card {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }

    /* Action bar on screen */
    .action-bar {
      position: sticky;
      top: 12px;
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 10px 25px -5px rgba(15,23,42,0.3);
    }

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.15s ease;
      text-decoration: none;
    }

    .action-btn-primary {
      background: #4f46e5;
      color: #ffffff;
    }
    .action-btn-primary:hover {
      background: #4338ca;
    }

    .action-btn-secondary {
      background: #334155;
      color: #f8fafc;
    }
    .action-btn-secondary:hover {
      background: #475569;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 12px;
      margin: 20px 0 28px 0;
    }

    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
    }

    .kpi-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 4px;
    }

    .kpi-value {
      font-size: 24px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.1;
    }

    .kpi-sub {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      margin-top: 4px;
    }

    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 28px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }

    table.data-table th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.05em;
      padding: 10px 12px;
      text-align: left;
      border-bottom: 2px solid #cbd5e1;
    }
  </style>
</head>
<body>

  <!-- Floating screen control bar (hidden in print) -->
  <div class="action-bar no-print">
    <div style="display: flex; align-items: center; gap: 10px;">
      <span style="font-size: 13px; font-weight: 800;">Diariamente — Report per Terapeuta</span>
      <span style="font-size: 11px; background: rgba(255,255,255,0.15); padding: 2px 8px; border-radius: 4px;">
        ${stats.totalEntries} registrazioni
      </span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="action-btn action-btn-primary" onclick="window.print()">
        🖨️ Stampa o Salva PDF
      </button>
      <button class="action-btn action-btn-secondary" onclick="downloadSelfHtml()">
        📥 Scarica HTML
      </button>
      <button class="action-btn action-btn-secondary" onclick="window.close()">
        ✕ Chiudi
      </button>
    </div>
  </div>

  <div class="report-container">
    
    <!-- HEADER SECTION -->
    <header style="border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;">
        <div>
          <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #4f46e5; display: block; margin-bottom: 4px;">
            DIARIAMENTE • MONITORAGGIO &amp; PSICOTERAPIA
          </span>
          <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: -0.02em;">
            Report di Monitoraggio per la Seduta
          </h1>
          <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 16px; font-size: 13px; color: #334155;">
            ${options.patientName ? `<div><strong>Paziente / Utente:</strong> ${escapeHtml(options.patientName)}</div>` : ''}
            <div><strong>Periodo:</strong> ${escapeHtml(stats.dateRangeText)}</div>
          </div>
        </div>

        <div style="text-align: right; font-size: 11px; color: #64748b; background: #f8fafc; padding: 10px 14px; border-radius: 10px; border: 1px solid #e2e8f0;">
          <div><strong>Data Generazione:</strong></div>
          <div style="font-weight: 700; color: #0f172a; margin-top: 2px;">${escapeHtml(generatedAt)}</div>
          <div style="margin-top: 4px; color: #047857; font-weight: 800;">● Dati locali verificati</div>
        </div>
      </div>
    </header>

    <!-- KPI STATS & AVERAGES (IN TESTATA COME RICHIESTO) -->
    <section>
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <h2 style="margin: 0; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">
          Sintesi Clinica &amp; Medie del Periodo
        </h2>
        <span style="font-size: 11px; font-weight: 700; color: #64748b;">
          ${stats.totalEntries} registrazioni nel periodo
        </span>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card" style="border-top: 3px solid #3b82f6;">
          <div class="kpi-title">Media Ansia</div>
          <div class="kpi-value" style="color: ${stats.avgAnxiety > 60 ? '#b91c1c' : '#1d4ed8'};">
            ${stats.avgAnxiety}<span style="font-size: 14px; font-weight: 600; color: #64748b;">/100</span>
          </div>
          <div class="kpi-sub">
            ${stats.avgAnxiety > 65 ? 'Fascia elevata' : stats.avgAnxiety > 35 ? 'Fascia moderata' : 'Fascia contenuta'}
          </div>
        </div>

        <div class="kpi-card" style="border-top: 3px solid #f43f5e;">
          <div class="kpi-title">Credenza Pensiero</div>
          <div class="kpi-value">
            ${stats.avgBelief}<span style="font-size: 14px; font-weight: 600; color: #64748b;">%</span>
          </div>
          <div class="kpi-sub">Grado di convinzione</div>
        </div>

        <div class="kpi-card" style="border-top: 3px solid #8b5cf6;">
          <div class="kpi-title">Intensità Pensiero</div>
          <div class="kpi-value">
            ${stats.avgIntensity}<span style="font-size: 14px; font-weight: 600; color: #64748b;">%</span>
          </div>
          <div class="kpi-sub">Impatto cognitivo</div>
        </div>

        <div class="kpi-card" style="border-top: 3px solid #10b981;">
          <div class="kpi-title">Attenzione al Corpo</div>
          <div class="kpi-value">
            ${stats.avgBodyAttention}<span style="font-size: 14px; font-weight: 600; color: #64748b;">%</span>
          </div>
          <div class="kpi-sub">Ipervigilanza somatica</div>
        </div>

        <div class="kpi-card" style="border-top: 3px solid #f59e0b;">
          <div class="kpi-title">Comportamenti</div>
          <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 4px;">
            ${stats.totalChecks} check
          </div>
          <div class="kpi-sub" style="margin-top: 2px;">
            ${stats.totalReassurances} rassicurazioni • ${stats.totalAvoidances} evitamenti
          </div>
        </div>
      </div>
    </section>

    <!-- SUMMARY TABLE -->
    ${
      options.includeSummaryTable && entries.length > 0
        ? `
      <section style="margin-bottom: 32px;">
        <h2 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">
          Tabella Panoramica delle Valutazioni
        </h2>
        <div style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Data &amp; Ora</th>
                <th style="text-align: center;">Ansia</th>
                <th style="text-align: center;">Credenza</th>
                <th style="text-align: center;">Intensità</th>
                <th style="text-align: center;">Attenzione</th>
                <th>Emozioni Principali</th>
                <th>Check / Evitamenti</th>
              </tr>
            </thead>
            <tbody>
              ${summaryTableRows}
            </tbody>
          </table>
        </div>
      </section>
    `
        : ''
    }

    <!-- DETAILED DAILY LOGS -->
    <section>
      <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 18px;">
        <h2 style="margin: 0; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #475569;">
          Registro Dettagliato Giorno per Giorno
        </h2>
      </div>

      ${
        entries.length > 0
          ? detailedEntriesHtml
          : '<p style="color: #64748b; font-style: italic; padding: 20px 0;">Nessuna registrazione trovata per il periodo e i filtri selezionati.</p>'
      }
    </section>

    <!-- FOOTER -->
    <footer style="margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b;">
      <div>
        <strong>Diariamente</strong> — Documento clinico strettamente riservato elaborato in locale su dispositivo dell'utente.
      </div>
      <div>
        Pagina di monitoraggio per uso psicoterapeutico
      </div>
    </footer>

  </div>

  <script>
    function downloadSelfHtml() {
      const htmlContent = '<!DOCTYPE html>' + document.documentElement.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'report-clinico-diariamente-' + new Date().toISOString().slice(0, 10) + '.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  </script>
</body>
</html>`;
}

/**
 * Generate Raw Tabular CSV (Data | Domanda | Risposta | Valore 0-100)
 */
export function generateTherapistCsv(
  entries: CbtEntry[],
  allTags: Tag[],
  customQuestions: CustomQuestion[],
  options: TherapistReportFilterOptions
): string {
  const tagMap = new Map(allTags.map((t) => [t.id, t.label]));
  const questionMap = new Map(customQuestions.map((q) => [q.id, q]));

  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  // Header row as requested: Data | Domanda | Risposta | Valore 0-100
  // We also add Evento_ID and Categoria for pristine sorting and filtering in Excel
  let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel compatibility
  csv += ['Data e Ora', 'Categoria', 'Domanda o Metrica', 'Risposta o Dettaglio', 'Valore (0-100)'].map(escapeCsv).join(',') + '\r\n';

  entries.forEach((e) => {
    const d = e.eventDatetime;

    // Helper to push row
    const addRow = (cat: string, question: string, answer: string, val100: number | string = '') => {
      csv += [d, cat, question, answer, val100].map(escapeCsv).join(',') + '\r\n';
    };

    if (options.includeMetrics) {
      addRow('Valutazioni', 'Livello di Ansia Complessiva', `${e.overallAnxietyLevel} su 100`, e.overallAnxietyLevel);
      addRow('Valutazioni', 'Credenza nel Pensiero Automatico', `${e.thoughtBeliefLevel}%`, e.thoughtBeliefLevel);
      addRow('Valutazioni', 'Intensità del Pensiero Negativo', `${e.negativeThoughtsIntensity}%`, e.negativeThoughtsIntensity);
      addRow('Valutazioni', 'Attenzione Focalizzata sul Corpo', `${e.bodyFocusedAttentionLevel}%`, e.bodyFocusedAttentionLevel);
    }

    if (options.includeSituationTriggers) {
      if (e.situation) addRow('Situazione', 'Situazione e Contesto', e.situation, '');
      if (e.triggerFactors) addRow('Situazione', 'Fattori Scatenanti (Trigger)', e.triggerFactors, '');
    }

    if (options.includeThoughts) {
      if (e.negativeThought) addRow('Pensieri', 'Pensiero Automatico Negativo', e.negativeThought, e.thoughtBeliefLevel);
      if (e.negativeThoughtsExtended) addRow('Pensieri', 'Approfondimento Pensieri Negativi', e.negativeThoughtsExtended, e.negativeThoughtsIntensity);
      if ((e as any).alternativeThought) addRow('Pensieri', 'Pensiero Alternativo / Ristrutturazione', (e as any).alternativeThought, '');
    }

    if (options.includeEmotionsSymptoms) {
      const emotions = (e.emotionTagIds || []).map((id) => tagMap.get(id) || id).join(', ');
      if (emotions) addRow('Emozioni', 'Emozioni Provate', emotions, '');

      const symptoms = (e.physicalSymptomTagIds || []).map((id) => tagMap.get(id) || id).join(', ');
      if (symptoms) addRow('Sintomi', 'Sintomi Fisici', symptoms, '');
      if (e.physicalSymptomsText) addRow('Sintomi', 'Dettaglio Sintomi Fisici', e.physicalSymptomsText, '');
    }

    if (options.includeBehaviors) {
      if (e.symptomControlCount > 0 || e.symptomControlDescription) {
        addRow('Comportamenti', 'Check di Controllo Sintomi', `${e.symptomControlCount} volte - ${e.symptomControlDescription || 'Senza descrizione'}`, '');
      }
      if (e.reassuranceSeekingCount > 0 || e.reassuranceSeekingType) {
        addRow('Comportamenti', 'Rassicurazioni Cercate', `${e.reassuranceSeekingCount} volte - ${e.reassuranceSeekingType || 'Senza dettaglio'}`, '');
      }
      if (e.avoidanceCount > 0 || e.avoidanceType) {
        addRow('Comportamenti', 'Evitamenti Messi in Atto', `${e.avoidanceCount} volte - ${e.avoidanceType || 'Senza dettaglio'}`, '');
      }
    }

    if (options.includeCustomQuestions && e.customAnswers) {
      Object.entries(e.customAnswers).forEach(([qId, val]) => {
        if (val === undefined || val === '') return;
        const q = questionMap.get(qId);
        const prompt = q?.prompt || 'Domanda Personalizzata';
        const cat = q?.category || 'Riflessione';
        const numVal = typeof val === 'number' ? val : '';
        const strVal = typeof val === 'boolean' ? (val ? 'Sì' : 'No') : String(val);
        addRow(`Custom: ${cat}`, prompt, strVal, numVal);
      });
    }

    if (options.includeNotes && e.notes) {
      addRow('Note', 'Note e Riflessioni Personali', e.notes, '');
    }
  });

  return csv;
}
