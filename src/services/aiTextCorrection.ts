export interface TextCorrectionResult {
  success: boolean;
  original: string;
  corrected: string;
  error?: string;
}

export async function correctDiaryText(text: string): Promise<TextCorrectionResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      success: false,
      original: text,
      corrected: text,
      error: 'Il testo da correggere è vuoto.',
    };
  }

  // Handle offline situation cleanly
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      original: text,
      corrected: text,
      error: 'Connessione assente. Riconnettiti ad Internet per usare la correzione automatica.',
    };
  }

  try {
    const response = await fetch('/api/correct-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: trimmed }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        original: text,
        corrected: text,
        error: data.error || 'Impossibile correggere il testo. Riprova più tardi.',
      };
    }

    return {
      success: true,
      original: text,
      corrected: data.corrected,
    };
  } catch (err: any) {
    console.error('Errore chiamata correzione testo:', err);
    return {
      success: false,
      original: text,
      corrected: text,
      error: err?.message || 'Errore di connessione con il servizio di correzione.',
    };
  }
}
