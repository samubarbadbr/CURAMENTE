/**
 * Utility per la condivisione e il download affidabile di file PDF su smartphone (Android / iOS) e desktop.
 * Risolve i problemi di invio su WhatsApp dovuti a ContentProvider temporanei o revoche premature dei Blob URL.
 */

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (typeof window !== 'undefined' && window.innerWidth < 768)
  );
}

/**
 * Verifica se il browser corrente supporta la condivisione diretta di file tramite Web Share API
 */
export function canSharePdfFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) {
    return false;
  }
  if (typeof File === 'undefined') {
    return false;
  }
  try {
    const testFile = new File([new Uint8Array([0])], 'test.pdf', {
      type: 'application/pdf',
      lastModified: Date.now(),
    });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}

/**
 * Download affidabile del PDF mantenendo valido il Blob URL per 60 secondi,
 * evitando che Chrome / Android DownloadManager ricevano stream interrotti o chiusi prematuramente.
 */
export function downloadPdfBlob(blob: Blob, filename: string): void {
  // Assicura il corretto tipo MIME
  const cleanBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
  const blobUrl = URL.createObjectURL(cleanBlob);

  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Manteniamo attivo il Blob URL per 60 secondi: Chrome e Android DownloadManager
  // necessitano di tempo sufficiente per completare la scrittura asincrona su storage.
  setTimeout(() => {
    try {
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (_) {}
  }, 60000);
}

export type SharePdfResult = 'shared' | 'cancelled' | 'fallback_downloaded';

/**
 * Condivide direttamente il file PDF usando la Web Share API nativa (ad es. verso WhatsApp, Telegram, Email).
 * Se la condivisione non è supportata o fallisce con errore diverso da annullamento, ricorre al download sicuro.
 */
export async function sharePdfBlob(
  blob: Blob,
  filename: string,
  title: string = 'Report Clinico - DiariaMente',
  text: string = 'Ecco il report clinico DiariaMente in formato PDF.'
): Promise<SharePdfResult> {
  const cleanBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });

  if (canSharePdfFiles()) {
    try {
      const file = new File([cleanBlob], filename, {
        type: 'application/pdf',
        lastModified: Date.now(),
      });

      await navigator.share({
        files: [file],
        title,
        text,
      });

      return 'shared';
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        // L'utente ha chiuso il pannello di condivisione senza selezionare un'app: non è un errore
        return 'cancelled';
      }
      console.warn('Web Share API fallita, eseguo fallback su download sicuro:', err);
      downloadPdfBlob(cleanBlob, filename);
      return 'fallback_downloaded';
    }
  }

  // Se Web Share con file non è supportato sul dispositivo, esegui download
  downloadPdfBlob(cleanBlob, filename);
  return 'fallback_downloaded';
}
