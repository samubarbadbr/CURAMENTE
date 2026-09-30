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

  // Handle offline situation with clear, honest error message
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: false,
      original: text,
      corrected: text,
      error: 'Connessione a Internet non disponibile. Connettiti a una rete per correggere il testo con l\'AI.',
    };
  }

  try {
    const callApi = async (attempt: number = 0) => {
      const url = attempt === 0 ? '/api/correct-text' : `/api/correct-text?_t=${Date.now()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(url, {
          method: 'POST',
          cache: 'no-store',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ text: trimmed }),
        });
        clearTimeout(timeoutId);
        return res;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    let response = await callApi(0).catch(() => null);

    if (!response) {
      return {
        success: false,
        original: text,
        corrected: text,
        error: 'Impossibile raggiungere il servizio AI. Verifica la connessione Internet e riprova.',
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const raw = await response.text().catch(() => '');
      console.warn('Risposta non-JSON da /api/correct-text:', response.status, raw.slice(0, 100));
      return {
        success: false,
        original: text,
        corrected: text,
        error: 'Errore di risposta dal server di correzione AI. Riprova tra qualche istante.',
      };
    }

    const data = await response.json().catch(() => null);
    if (!data || !data.success || !data.corrected) {
      return {
        success: false,
        original: text,
        corrected: text,
        error: data?.error || 'Impossibile correggere il testo. Riprova tra qualche istante.',
      };
    }

    return {
      success: true,
      original: text,
      corrected: data.corrected,
    };
  } catch (err: any) {
    console.error('Errore correzione testo AI:', err);
    return {
      success: false,
      original: text,
      corrected: text,
      error: 'Errore durante la correzione AI. Verifica la connessione e riprova.',
    };
  }
}
