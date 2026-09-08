import { CbtEntry, PeriodFilter, Tag } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface DashboardReportOptions {
  patientName: string;
  period: PeriodFilter | 'custom';
  startDate?: string;
  endDate?: string;
}

export function computeDashboardStats(entries: CbtEntry[]) {
  const chronEntries = [...entries].sort(
    (a, b) => new Date(a.eventDatetime).getTime() - new Date(b.eventDatetime).getTime()
  );

  const totalEntries = chronEntries.length;
  const anxietyEntries = chronEntries.filter((e) => typeof e.overallAnxietyLevel === 'number');
  const avgAnxiety = anxietyEntries.length > 0
    ? Math.round(anxietyEntries.reduce((s, e) => s + (e.overallAnxietyLevel || 0), 0) / anxietyEntries.length)
    : 0;

  const maxAnxiety = anxietyEntries.length > 0
    ? Math.max(...anxietyEntries.map((e) => e.overallAnxietyLevel || 0))
    : 0;

  const totalControl = chronEntries.reduce((s, e) => s + (Number(e.symptomControlCount) || 0), 0);
  const totalReassurance = chronEntries.reduce((s, e) => s + (Number(e.reassuranceSeekingCount) || 0), 0);

  const avoidanceCounts: Record<string, number> = {};
  let totalAvoidance = 0;

  chronEntries.forEach((e) => {
    let count = 0;
    if (typeof e.avoidanceCount === 'number' && e.avoidanceCount > 0) {
      count = e.avoidanceCount;
    } else if (e.avoidanceType && e.avoidanceType.trim().length > 0) {
      count = 1;
    }

    if (count > 0) {
      const type = (e.avoidanceType || 'Altro / Non specificato').trim();
      avoidanceCounts[type] = (avoidanceCounts[type] || 0) + count;
      totalAvoidance += count;
    }
  });

  const avoidanceList = Object.entries(avoidanceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      count,
      percent: totalAvoidance > 0 ? Math.round((count / totalAvoidance) * 100) : 0,
    }));

  return {
    totalEntries,
    avgAnxiety,
    maxAnxiety,
    totalControl,
    totalReassurance,
    totalAvoidance,
    avoidanceList,
    chronEntries,
  };
}

export function generateDashboardCsv(
  entries: CbtEntry[],
  options: DashboardReportOptions
): string {
  const stats = computeDashboardStats(entries);
  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel compatibility

  // TITOLO & RIEPILOGO
  csv += escapeCsv('REPORT SINTESI CLINICA DASHBOARD SEDUTA - DIARIAMENTE') + '\r\n';
  if (options.patientName) {
    csv += escapeCsv(`Paziente: ${options.patientName}`) + '\r\n';
  }
  csv += escapeCsv(`Data Report: ${new Date().toLocaleDateString('it-IT')}`) + '\r\n';
  csv += '\r\n';

  // METRICHE CHIAVE
  csv += escapeCsv('METRICHE CHIAVE DEL PERIODO') + '\r\n';
  csv += ['Voci Registrate', 'Ansia Media (0-100)', 'Picco Massimo Ansia', 'Controlli Sintomi Totali', 'Rassicurazioni Totali', 'Evitamenti Totali']
    .map(escapeCsv)
    .join(',') + '\r\n';
  csv += [
    stats.totalEntries,
    stats.avgAnxiety,
    stats.maxAnxiety,
    stats.totalControl,
    stats.totalReassurance,
    stats.totalAvoidance,
  ].map(escapeCsv).join(',') + '\r\n';
  csv += '\r\n';

  // CLASSIFICA EVITAMENTI
  csv += escapeCsv('CLASSIFICA EVITAMENTI PER TIPOLOGIA') + '\r\n';
  csv += ['Tipologia Evitamento', 'Frequenza (Volte)', 'Percentuale (%)'].map(escapeCsv).join(',') + '\r\n';
  stats.avoidanceList.forEach((a) => {
    csv += [a.type, a.count, `${a.percent}%`].map(escapeCsv).join(',') + '\r\n';
  });
  csv += '\r\n';

  // REGISTRO DETTAGLIATO EPISODI
  csv += escapeCsv('REGISTRO EPISODI DELLA DASHBOARD') + '\r\n';
  csv += ['Data & Ora', 'Situazione / Contesto', 'Livello Ansia (0-100)', 'Controlli Sintomi', 'Richieste Rassicurazione', 'Evitamenti', 'Fattori Scatenanti']
    .map(escapeCsv)
    .join(',') + '\r\n';

  stats.chronEntries.forEach((e) => {
    const d = new Date(e.eventDatetime).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const avoidanceText = e.avoidanceType
      ? `${e.avoidanceType}${e.avoidanceCount ? ` (${e.avoidanceCount} volte)` : ''}`
      : 'Nessuno';

    csv += [
      d,
      e.situation || '',
      e.overallAnxietyLevel ?? '-',
      e.symptomControlCount ?? 0,
      e.reassuranceSeekingCount ?? 0,
      avoidanceText,
      e.triggerFactors || '',
    ].map(escapeCsv).join(',') + '\r\n';
  });

  return csv;
}

export async function exportDashboardPdf(
  entries: CbtEntry[],
  options: DashboardReportOptions,
  onToast?: (msg: string) => void
): Promise<void> {
  const stats = computeDashboardStats(entries);

  // Period label text
  let periodText = 'Periodo selezionato';
  if (options.period === '7') periodText = 'Ultimi 7 giorni';
  else if (options.period === '14') periodText = 'Ultimi 14 giorni';
  else if (options.period === '30') periodText = 'Ultimi 30 giorni';
  else if (options.period === '90') periodText = 'Ultimi 90 giorni';
  else if (options.period === 'all') periodText = 'Tutto il periodo storico';
  else if (options.startDate && options.endDate) {
    periodText = `Dal ${options.startDate} al ${options.endDate}`;
  }

  // Build avoidance table rows
  const avoidanceRowsHtml = stats.avoidanceList.length > 0
    ? stats.avoidanceList.map((a) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 8px 12px; font-weight: 700; color: #1e293b; vertical-align: middle; word-break: break-word;">${escapeHtml(a.type)}</td>
          <td style="padding: 8px 12px; text-align: center; vertical-align: middle;">
            <span style="font-weight: 800; font-size: 11px; color: #4338ca; font-variant-numeric: tabular-nums;">${a.count}</span>
          </td>
          <td style="padding: 8px 12px; text-align: center; vertical-align: middle;">
            <span style="font-weight: 800; font-size: 11px; color: #e11d48; font-variant-numeric: tabular-nums;">${a.percent}%</span>
          </td>
        </tr>
      `).join('')
    : `<tr><td colspan="3" style="padding: 12px; text-align: center; color: #64748b; font-style: italic;">Nessun evitamento registrato nel periodo selezionato.</td></tr>`;

  // Build chronological entries rows
  const entriesRowsHtml = stats.chronEntries.length > 0
    ? stats.chronEntries.map((e) => {
        const d = new Date(e.eventDatetime);
        const dayStr = d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

        const anxiety = typeof e.overallAnxietyLevel === 'number' ? e.overallAnxietyLevel : '-';
        let anxietyColor = '#059669';

        if (typeof e.overallAnxietyLevel === 'number') {
          if (e.overallAnxietyLevel > 60) {
            anxietyColor = '#e11d48';
          } else if (e.overallAnxietyLevel > 30) {
            anxietyColor = '#d97706';
          }
        }

        const controlCount = e.symptomControlCount ?? 0;
        const reassuranceCount = e.reassuranceSeekingCount ?? 0;

        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 9.5px;">
            <td style="padding: 8px 8px; vertical-align: top; white-space: nowrap;">
              <div style="font-weight: 800; color: #0f172a; font-size: 9.5px;">${dayStr}</div>
              <div style="font-weight: 600; color: #64748b; font-size: 8.5px; margin-top: 1px;">${timeStr}</div>
            </td>
            <td style="padding: 8px 10px; vertical-align: top; color: #0f172a; font-size: 9.5px; line-height: 1.35; word-break: break-word;">
              <div style="font-weight: 600; color: #0f172a;">${escapeHtml(e.situation || 'Episodio registrato')}</div>
              ${e.triggerFactors ? `<div style="font-size: 8.5px; color: #64748b; margin-top: 3px; font-style: italic;">Trigger: ${escapeHtml(e.triggerFactors)}</div>` : ''}
            </td>
            <td style="padding: 6px 4px; vertical-align: middle; text-align: center;">
              ${typeof e.overallAnxietyLevel === 'number' ? `
                <span style="font-weight: 800; font-size: 11px; color: ${anxietyColor}; font-variant-numeric: tabular-nums;">
                  ${anxiety}
                </span>
              ` : '<span style="color: #94a3b8; font-weight: 700;">-</span>'}
            </td>
            <td style="padding: 6px 4px; vertical-align: middle; text-align: center;">
              ${controlCount > 0 ? `
                <span style="font-weight: 800; font-size: 11px; color: #4338ca; font-variant-numeric: tabular-nums;">
                  ${controlCount}
                </span>
              ` : '<span style="color: #94a3b8; font-weight: 600; font-size: 11px;">0</span>'}
            </td>
            <td style="padding: 6px 4px; vertical-align: middle; text-align: center;">
              ${reassuranceCount > 0 ? `
                <span style="font-weight: 800; font-size: 11px; color: #b45309; font-variant-numeric: tabular-nums;">
                  ${reassuranceCount}
                </span>
              ` : '<span style="color: #94a3b8; font-weight: 600; font-size: 11px;">0</span>'}
            </td>
            <td style="padding: 8px 10px; vertical-align: top; color: #334155; font-size: 9.5px; line-height: 1.35; word-break: break-word;">
              ${e.avoidanceType ? `
                <div style="font-weight: 600; color: #1e293b;">${escapeHtml(e.avoidanceType)}</div>
                ${e.avoidanceCount ? `
                  <div style="margin-top: 2px; font-size: 9px; font-weight: 700; color: #b91c1c;">
                    ${e.avoidanceCount} ${e.avoidanceCount === 1 ? 'volta' : 'volte'}
                  </div>
                ` : ''}
              ` : '<span style="color: #94a3b8; font-style: italic;">Nessuno</span>'}
            </td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="6" style="padding: 12px; text-align: center; color: #64748b; font-style: italic;">Nessun episodio presente.</td></tr>`;

  // Construct printable HTML string
  const htmlContent = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>Report Dashboard Seduta - DiariaMente</title>
  <style>
    * { box-sizing: border-box !important; }
    body {
      margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #ffffff; color: #0f172a; line-height: 1.4;
    }
    .container { width: 754px; margin: 0 auto; background: #ffffff; }
    .header { border-bottom: 2px solid #4338ca; padding-bottom: 12px; margin-bottom: 16px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 18px; }
    .kpi-card {
      background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 6px; text-align: center;
    }
    .kpi-value { font-size: 20px; font-weight: 900; line-height: 1.1; margin-top: 1px; }
    .kpi-label { font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.04em; margin-top: 3px; }
    .section-title {
      font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; color: #1e1b4b;
      border-bottom: 2px solid #6366f1; padding-bottom: 5px; margin: 18px 0 10px 0;
    }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th {
      background: #f1f5f9; color: #1e293b; font-weight: 800; text-align: left; padding: 7px 8px;
      font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1.5px solid #cbd5e1;
    }
    td {
      vertical-align: top !important;
      padding: 8px 8px;
      line-height: 1.35;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    tbody tr:nth-child(even) { background-color: #f8fafc; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-size: 20px; font-weight: 900; color: #4338ca; letter-spacing: 0.03em;">DIARIAMENTE</div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px;">Report Dashboard Seduta</div>
          <div style="font-size: 10px; font-weight: 600; color: #64748b; margin-top: 3px;">
            Sintesi Clinica dei Progressi &bull; Periodo: <strong>${escapeHtml(periodText)}</strong>
          </div>
        </div>
        <div style="text-align: right;">
          ${options.patientName ? `
            <div style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 8px; text-align: right;">
              <div style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #64748b;">Paziente</div>
              <div style="font-size: 12px; font-weight: 900; color: #1e1b4b;">${escapeHtml(options.patientName)}</div>
            </div>
          ` : ''}
          <div style="font-size: 9px; color: #94a3b8; margin-top: 5px;">Generato il ${new Date().toLocaleDateString('it-IT')}</div>
        </div>
      </div>
    </div>

    <!-- METRICHE CHIAVE (KPIs) -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-value" style="color: #4338ca;">${stats.totalEntries}</div>
        <div class="kpi-label">Voci Registrate</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color: #e11d48;">${stats.avgAnxiety}</div>
        <div class="kpi-label">Ansia Media</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color: #4338ca;">${stats.totalControl}</div>
        <div class="kpi-label">Check Controllo</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color: #d97706;">${stats.totalReassurance}</div>
        <div class="kpi-label">Rassicurazioni</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color: #e11d48;">${stats.totalAvoidance}</div>
        <div class="kpi-label">Evitamenti Totali</div>
      </div>
    </div>

    <!-- CLASSIFICA EVITAMENTI -->
    <div class="section-title">Evitamenti per Tipologia &amp; Impatto Percentuale</div>
    <div style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; margin-bottom: 18px;">
      <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
        <colgroup>
          <col style="width: 60%;" />
          <col style="width: 20%;" />
          <col style="width: 20%;" />
        </colgroup>
        <thead>
          <tr>
            <th>Tipologia Evitamento</th>
            <th style="text-align: center;">Conteggio (Volte)</th>
            <th style="text-align: center;">Impatto (%)</th>
          </tr>
        </thead>
        <tbody>
          ${avoidanceRowsHtml}
        </tbody>
      </table>
    </div>

    <!-- REGISTRO CRONOLOGICO EPISODI DELLA DASHBOARD -->
    <div class="section-title">Registro Cronologico Episodi del Periodo (${stats.totalEntries})</div>
    <div style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
        <colgroup>
          <col style="width: 15%;" />
          <col style="width: 35%;" />
          <col style="width: 7.5%;" />
          <col style="width: 7.5%;" />
          <col style="width: 7.5%;" />
          <col style="width: 27.5%;" />
        </colgroup>
        <thead>
          <tr>
            <th>Data &amp; Ora</th>
            <th>Situazione</th>
            <th style="text-align: center;">Ansia</th>
            <th style="text-align: center;">Check</th>
            <th style="text-align: center;">Rassic.</th>
            <th>Evitamento</th>
          </tr>
        </thead>
        <tbody>
          ${entriesRowsHtml}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

  // Render hidden container for html2canvas
  const hiddenContainer = document.createElement('div');
  hiddenContainer.style.position = 'fixed';
  hiddenContainer.style.top = '-9999px';
  hiddenContainer.style.left = '-9999px';
  hiddenContainer.style.width = '794px';
  hiddenContainer.style.background = '#ffffff';
  hiddenContainer.style.zIndex = '-99999';
  hiddenContainer.innerHTML = htmlContent;
  document.body.appendChild(hiddenContainer);

  try {
    const canvas = await html2canvas(hiddenContainer, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const exportDateStr = new Date().toLocaleString('it-IT');

    // Altezza massima del contenuto per pagina in mm, riservando 18mm in fondo per il piè di pagina
    const maxContentHeightMm = 270;
    const maxSlicePx = Math.floor((maxContentHeightMm * canvas.width) / pdfWidth);

    let currentY = 0;
    let pageCount = 0;

    while (currentY < canvas.height) {
      const remainingPx = canvas.height - currentY;
      const sliceHeightPx = Math.min(remainingPx, maxSlicePx);
      const sliceHeightMm = (sliceHeightPx * pdfWidth) / canvas.width;

      if (pageCount > 0) {
        pdf.addPage('a4', 'portrait');
      }

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

        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(pageImgData, 'JPEG', 0, 8, pdfWidth, sliceHeightMm);
      }

      currentY += sliceHeightPx;
      pageCount++;
    }

    // Aggiungi piè di pagina vettoriale professionale mai tagliato su ciascuna pagina
    const totalPages = pdf.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.25);
      pdf.line(10, 287, 200, 287);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('DiariaMente - Documento riservato ad uso terapeutico cognitivo-comportamentale', 10, 291.5);
      const rightText = totalPages > 1
        ? `Data esportazione: ${exportDateStr}  •  Pagina ${p} di ${totalPages}`
        : `Data esportazione: ${exportDateStr}`;
      pdf.text(rightText, 200, 291.5, { align: 'right' });
    }

    const filename = `diariamente-dashboard-seduta-${new Date().toISOString().slice(0, 10)}.pdf`;

    // Direct download without console.warn or failed Web Share
    try {
      pdf.save(filename);
      onToast?.('Report Dashboard scaricato con successo!');
    } catch (saveErr) {
      const blob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(blobUrl);
      }, 3000);
      onToast?.('Report Dashboard scaricato con successo!');
    }
  } finally {
    document.body.removeChild(hiddenContainer);
  }
}

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
