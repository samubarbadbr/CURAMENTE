import { DiaryNote, DiaryNoteCategory, DiaryNoteMood } from '../types';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  isMobileDevice,
  canSharePdfFiles,
  downloadPdfBlob,
  sharePdfBlob,
} from './pdfSharingUtils';

export interface DiaryReportFilterOptions {
  patientName?: string;
  period?: 'last_session' | '7' | 'month' | '30' | 'custom' | 'all';
  periodLabel?: string;
  customStartDate?: string; // YYYY-MM-DD
  customEndDate?: string;   // YYYY-MM-DD
  lastSessionDate?: string; // YYYY-MM-DD
  categoryFilter?: DiaryNoteCategory | 'all';
  sortOrder?: 'asc' | 'desc'; // 'asc': oldest first, 'desc': newest first
}

const CATEGORY_LABELS: Record<DiaryNoteCategory, { label: string; color: string }> = {
  Riflessione: { label: 'Riflessione', color: '#6366f1' },
  Gratitudine: { label: 'Gratitudine', color: '#d97706' },
  Pensiero: { label: 'Pensiero', color: '#0284c7' },
  Obiettivo: { label: 'Obiettivo', color: '#059669' },
  Promemoria: { label: 'Promemoria', color: '#e11d48' },
  Altro: { label: 'Altro', color: '#475569' },
};

const MOOD_LABELS: Record<DiaryNoteMood, { label: string; color: string }> = {
  sereno: { label: 'Sereno', color: '#10b981' },
  grato: { label: 'Grato', color: '#d97706' },
  calmo: { label: 'Calmo', color: '#059669' },
  riflessivo: { label: 'Riflessivo', color: '#6366f1' },
  energico: { label: 'Energico', color: '#d946ef' },
  ansioso: { label: 'Ansioso', color: '#ea580c' },
  triste: { label: 'Giù di corda', color: '#2563eb' },
};

/**
 * Filter and sort notes according to options
 */
export function filterNotesForReport(
  notes: DiaryNote[],
  options: DiaryReportFilterOptions
): DiaryNote[] {
  let filtered = [...notes];
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
    filtered = filtered.filter((n) => new Date(n.createdAt) >= sessionCutoff);
    if (options.customEndDate) {
      const end = new Date(options.customEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((n) => new Date(n.createdAt) <= end);
    }
  } else if (options.period === '7') {
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - 7);
    cutoff.setHours(0, 0, 0, 0);
    filtered = filtered.filter((n) => new Date(n.createdAt) >= cutoff);
  } else if (options.period === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    filtered = filtered.filter((n) => new Date(n.createdAt) >= startOfMonth);
  } else if (options.period === '30') {
    const cutoff = new Date();
    cutoff.setDate(now.getDate() - 30);
    cutoff.setHours(0, 0, 0, 0);
    filtered = filtered.filter((n) => new Date(n.createdAt) >= cutoff);
  } else if (options.period === 'custom') {
    if (options.customStartDate) {
      const start = new Date(options.customStartDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((n) => new Date(n.createdAt) >= start);
    }
    if (options.customEndDate) {
      const end = new Date(options.customEndDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((n) => new Date(n.createdAt) <= end);
    }
  }

  if (options.categoryFilter && options.categoryFilter !== 'all') {
    filtered = filtered.filter((n) => n.category === options.categoryFilter);
  }

  // Sort
  const sortOrder = options.sortOrder || 'desc';
  filtered.sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
  });

  return filtered;
}

/**
 * Generate printable HTML for Diary Notes clinical report
 */
export function generateDiaryReportHtml(
  notes: DiaryNote[],
  options: DiaryReportFilterOptions
): string {
  const patient = options.patientName?.trim() || '';
  const nowStr = new Date().toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate statistics
  const totalNotes = notes.length;
  const categoryCounts: Record<string, number> = {};
  const moodCounts: Record<string, number> = {};

  notes.forEach((n) => {
    if (n.category) {
      categoryCounts[n.category] = (categoryCounts[n.category] || 0) + 1;
    }
    if (n.mood) {
      moodCounts[n.mood] = (moodCounts[n.mood] || 0) + 1;
    }
  });

  let dateRangeDisplay = 'Tutti gli appunti registrati';
  if (options.period === '7') dateRangeDisplay = 'Ultimi 7 giorni';
  else if (options.period === '30') dateRangeDisplay = 'Ultimi 30 giorni';
  else if (options.period === 'month') dateRangeDisplay = 'Mese corrente';
  else if (options.period === 'last_session') {
    dateRangeDisplay = options.lastSessionDate
      ? `Dall'ultima seduta (${new Date(options.lastSessionDate).toLocaleDateString('it-IT')}) ad oggi`
      : 'Dall\'ultima seduta ad oggi';
  } else if (options.period === 'custom') {
    const s = options.customStartDate ? new Date(options.customStartDate).toLocaleDateString('it-IT') : '';
    const e = options.customEndDate ? new Date(options.customEndDate).toLocaleDateString('it-IT') : '';
    dateRangeDisplay = s && e ? `Dal ${s} al ${e}` : 'Intervallo personalizzato';
  }

  return `
  <!DOCTYPE html>
  <html lang="it">
  <head>
    <meta charset="UTF-8">
    <title>DiariaMente — Diario Clinico & Appunti per la Psicoterapia</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #0f172a;
        background: #ffffff;
        font-size: 12.5px;
        line-height: 1.55;
        padding: 24px 32px 36px 32px;
        width: 780px;
        max-width: 780px;
        margin: 0 auto;
      }
      .report-header {
        border-bottom: 2px solid #0f172a;
        padding-bottom: 16px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      .report-title {
        font-size: 22px;
        font-weight: 900;
        color: #0f172a;
        letter-spacing: -0.5px;
      }
      .report-subtitle {
        font-size: 12px;
        color: #475569;
        font-weight: 600;
        margin-top: 4px;
      }
      .meta-box {
        text-align: right;
        font-size: 11px;
        color: #64748b;
        line-height: 1.5;
      }
      .meta-box strong {
        color: #0f172a;
      }
      .summary-cards {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 14px;
        margin-bottom: 24px;
      }
      .summary-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px 14px;
      }
      .summary-card-title {
        font-size: 10.5px;
        font-weight: 800;
        text-transform: uppercase;
        color: #64748b;
        letter-spacing: 0.5px;
        margin-bottom: 6px;
      }
      .summary-card-value {
        font-size: 24px;
        font-weight: 900;
        color: #0f172a;
      }
      .stats-text-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 6px;
      }
      .stat-text-line {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        font-size: 11.5px;
        line-height: 1.4;
      }
      .stat-label {
        font-weight: 800;
      }
      .stat-count {
        font-size: 12px;
        font-weight: 900;
        color: #0f172a;
      }
      .notes-section-title {
        font-size: 13px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.6px;
        color: #0f172a;
        padding-bottom: 8px;
        border-bottom: 1.5px solid #e2e8f0;
        margin-bottom: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .note-card {
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 12px;
        padding: 16px 18px;
        margin-bottom: 16px;
        page-break-inside: avoid;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      }
      .note-card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 8px;
      }
      .note-date {
        font-size: 12px;
        font-weight: 800;
        color: #0f172a;
      }
      .note-labels {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .note-title {
        font-size: 14.5px;
        font-weight: 900;
        color: #0f172a;
        margin-bottom: 8px;
        line-height: 1.35;
      }
      .note-content {
        font-size: 12px;
        color: #1e293b;
        white-space: pre-wrap;
        line-height: 1.6;
        word-break: break-word;
      }
      .note-audio-box {
        margin-top: 10px;
        padding: 8px 12px;
        background: #f0fdf4;
        border-left: 3px solid #16a34a;
        border-radius: 6px;
        font-size: 11px;
        color: #166534;
        font-weight: 600;
      }
      .note-photo-box {
        margin-top: 12px;
        border-radius: 8px;
        overflow: hidden;
        max-width: 280px;
        border: 1px solid #e2e8f0;
      }
      .note-photo-box img {
        width: 100%;
        height: auto;
        display: block;
      }
      @media print {
        body { padding: 0; }
        .note-card { page-break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="report-header">
      <div>
        <h1 class="report-title">DiariaMente — Diario Clinico & Appunti</h1>
        <p class="report-subtitle">Report per la seduta di psicoterapia · Riflessioni, eventi emotivi e appunti personali</p>
      </div>
      <div class="meta-box">
        ${patient ? `<div>Paziente: <strong>${patient}</strong></div>` : ''}
        <div>Generato: <strong>${nowStr}</strong></div>
        <div>Periodo: <strong>${dateRangeDisplay}</strong></div>
      </div>
    </div>

    <!-- Summary Box -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-card-title">Totale Appunti</div>
        <div class="summary-card-value">${totalNotes}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Nel periodo selezionato</div>
      </div>
      <div class="summary-card">
        <div class="summary-card-title">Ripartizione Categorie</div>
        <div class="stats-text-list">
          ${Object.entries(categoryCounts)
            .map(([cat, count]) => {
              const info = CATEGORY_LABELS[cat as DiaryNoteCategory] || CATEGORY_LABELS.Altro;
              return `<div class="stat-text-line">
                <span class="stat-label" style="color: ${info.color};">${cat}</span>
                <span class="stat-count">${count}</span>
              </div>`;
            })
            .join('')}
          ${Object.keys(categoryCounts).length === 0 ? '<div style="color:#94a3b8; font-size:11px;">Nessuna categoria</div>' : ''}
        </div>
      </div>
      <div class="summary-card">
        <div class="summary-card-title">Quadro Stati d'Animo</div>
        <div class="stats-text-list">
          ${Object.entries(moodCounts)
            .map(([m, count]) => {
              const info = MOOD_LABELS[m as DiaryNoteMood] || { label: m, color: '#64748b' };
              return `<div class="stat-text-line">
                <span class="stat-label" style="color: ${info.color};">${info.label}</span>
                <span class="stat-count">${count}</span>
              </div>`;
            })
            .join('')}
          ${Object.keys(moodCounts).length === 0 ? '<div style="color:#94a3b8; font-size:11px;">Non specificato</div>' : ''}
        </div>
      </div>
    </div>

    <!-- Notes List -->
    <div class="notes-section-title">
      <span>Elenco Dettagliato degli Appunti (${notes.length})</span>
      <span style="font-size: 11px; font-weight: normal; color: #64748b;">Ordinamento: ${options.sortOrder === 'asc' ? 'Cronologico (dal più vecchio)' : 'Recenti per primi'}</span>
    </div>

    ${notes.length === 0 ? `
      <div style="text-align: center; padding: 40px; color: #64748b; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1;">
        Nessun appunto registrato nell'intervallo di date specificato.
      </div>
    ` : ''}

    ${notes.map((n, idx) => {
      const dateObj = new Date(n.createdAt);
      const dateFormatted = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString('it-IT', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : n.createdAt;

      const catInfo = n.category ? (CATEGORY_LABELS[n.category] || CATEGORY_LABELS.Altro) : CATEGORY_LABELS.Riflessione;
      const moodInfo = n.mood ? MOOD_LABELS[n.mood] : undefined;

      return `
        <div class="note-card" data-report-card="true">
          <div class="note-card-top">
            <span class="note-date">#${idx + 1} · ${dateFormatted}</span>
            <div class="note-labels">
              ${n.pinned ? '<span style="color: #b45309; font-weight: 800; font-size: 10.5px; text-transform: uppercase;">[In evidenza]</span>' : ''}
              ${n.category ? `
                <span style="color: ${catInfo.color}; font-weight: 800; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.3px;">
                  ${catInfo.label}
                </span>
              ` : ''}
              ${moodInfo ? `
                <span style="color: #cbd5e1; font-size: 10px;">•</span>
                <span style="color: ${moodInfo.color}; font-weight: 700; font-size: 11.5px;">
                  ${moodInfo.label}
                </span>
              ` : ''}
            </div>
          </div>

          ${n.title ? `<div class="note-title">${escapeHtml(n.title)}</div>` : ''}
          <div class="note-content">${escapeHtml(n.content)}</div>

          ${n.audioNote ? `
            <div class="note-audio-box">
              <strong>Nota Vocale allegata</strong> ${n.audioDuration ? `(${Math.round(n.audioDuration)} sec)` : ''} · Registrata direttamente dal paziente durante l'evento.
            </div>
          ` : ''}

          ${n.photo ? `
            <div class="note-photo-box">
              <img src="${n.photo}" alt="Foto allegata all'appunto" />
            </div>
          ` : ''}
        </div>
      `;
    }).join('')}
  </body>
  </html>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Export Diary Notes directly to PDF using jsPDF + html2canvas
 */
export async function exportDiaryNotesPdf(
  notes: DiaryNote[],
  options: DiaryReportFilterOptions,
  onToast?: (msg: string) => void,
  exportMode: 'auto' | 'download' | 'share' = 'auto'
): Promise<'downloaded' | 'shared' | 'fallback_downloaded' | 'cancelled' | 'failed'> {
  const filtered = filterNotesForReport(notes, options);

  if (filtered.length === 0) {
    onToast?.('Nessun appunto da esportare per i criteri selezionati.');
    return 'failed';
  }

  onToast?.('Generazione PDF in corso...');

  const html = generateDiaryReportHtml(filtered, options);

  // Hidden container for rendering
  const container = document.createElement('div');
  container.id = 'printable-diary-pdf-render';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '780px';
  container.style.background = '#ffffff';
  container.style.zIndex = '-9999';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    // Identify card break points while container is attached to DOM
    const cards = container.querySelectorAll('[data-report-card="true"]');
    const breakPoints: number[] = [];
    cards.forEach((c) => {
      const el = c as HTMLElement;
      breakPoints.push(el.offsetTop);
    });

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 780,
    });

    document.body.removeChild(container);

    const pdf = new jsPDF('p', 'mm', 'a4');
    const a4WidthMm = 210;
    const a4HeightMm = 297;
    const marginSideMm = 15; // 15mm margins on left and right = 180mm content width (perfectly centered)
    const contentWidthMm = 180;
    const topMarginMm = 14;
    const bottomMarginMm = 20;
    const maxContentHeightMm = a4HeightMm - topMarginMm - bottomMarginMm;

    const maxSlicePx = Math.floor((maxContentHeightMm * canvas.width) / contentWidthMm);

    let currentY = 0;
    const slices: { startY: number; sliceHeightPx: number; isFirstPage: boolean }[] = [];

    while (currentY < canvas.height) {
      const remainingPx = canvas.height - currentY;
      const isFirst = slices.length === 0;

      let sliceHeightPx: number;
      if (remainingPx <= maxSlicePx) {
        sliceHeightPx = remainingPx;
      } else {
        const targetY = currentY + maxSlicePx;
        const minAcceptableY = currentY + Math.floor(maxSlicePx * 0.25);

        let chosenY = -1;
        for (let i = breakPoints.length - 1; i >= 0; i--) {
          const ptY = breakPoints[i];
          if (ptY <= targetY && ptY >= minAcceptableY) {
            chosenY = ptY;
            break;
          }
        }

        sliceHeightPx = chosenY !== -1 ? chosenY - currentY : maxSlicePx;
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
      const topMm = slice.isFirstPage ? 12 : 14;

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
          pageCanvas.width,
          slice.sliceHeightPx
        );

        const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);
        pdf.addImage(imgData, 'JPEG', marginSideMm, topMm, contentWidthMm, sliceHeightMm, undefined, 'FAST');
      }

      // Continuation header on page 2+
      if (pageIndex > 0) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.setTextColor(71, 85, 105);
        pdf.text('DiariaMente — Diario Personale & Appunti Clinici', marginSideMm, 8.5);
        if (options.patientName) {
          pdf.text(`Paziente: ${options.patientName}`, a4WidthMm - marginSideMm, 8.5, { align: 'right' });
        }
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.25);
        pdf.line(marginSideMm, 10.5, a4WidthMm - marginSideMm, 10.5);
      }

      // Professional vector footer on every page (centered and safely above edge)
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.25);
      pdf.line(marginSideMm, 281, a4WidthMm - marginSideMm, 281);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Documento ad uso strettamente clinico e psicoterapeutico riservato · DiariaMente', a4WidthMm / 2, 286.5, { align: 'center' });
      pdf.text(`Pagina ${pageIndex + 1} di ${totalPages}`, a4WidthMm - marginSideMm, 286.5, { align: 'right' });
    }

    const arrayBuffer = pdf.output('arraybuffer');
    const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const dateIso = new Date().toISOString().slice(0, 10);
    const filename = `diariamente-appunti-terapeuta-${dateIso}.pdf`;

    const shouldShare =
      exportMode === 'share' ||
      (exportMode === 'auto' && isMobileDevice() && canSharePdfFiles());

    if (shouldShare) {
      onToast?.('Apertura condivisione...');
      const shareResult = await sharePdfBlob(
        pdfBlob,
        filename,
        'Diario & Appunti — DiariaMente',
        options.patientName
          ? `Appunti clinici e riflessioni di ${options.patientName} per la psicoterapia.`
          : 'Appunti clinici e riflessioni personali per la psicoterapia.'
      );
      if (shareResult === 'shared') {
        onToast?.('Appunti condivisi con successo!');
      } else if (shareResult === 'fallback_downloaded') {
        onToast?.('PDF Appunti scaricato!');
      }
      return shareResult;
    } else {
      downloadPdfBlob(pdfBlob, filename);
      onToast?.('PDF Appunti scaricato con successo!');
      return 'downloaded';
    }
  } catch (err) {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    console.error('Errore generazione PDF Appunti:', err);
    // Fallback: download HTML
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `appunti-terapeuta-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    onToast?.('Scaricato report alternativo HTML stampabile in PDF');
    return 'fallback_downloaded';
  }
}

/**
 * Quick export for a single diary note
 */
export async function exportSingleDiaryNotePdf(
  note: DiaryNote,
  patientName?: string,
  onToast?: (msg: string) => void,
  exportMode: 'auto' | 'download' | 'share' = 'auto'
): Promise<'downloaded' | 'shared' | 'fallback_downloaded' | 'cancelled' | 'failed'> {
  return await exportDiaryNotesPdf(
    [note],
    {
      patientName: patientName || localStorage.getItem('diariamente_patient_name') || '',
      period: 'all',
      sortOrder: 'desc',
    },
    onToast,
    exportMode
  );
}
