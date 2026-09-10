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
    const callApi = async (attempt: number = 0) => {
      const url = attempt === 0 ? '/api/correct-text' : `/api/correct-text?_t=${Date.now()}`;
      return fetch(url, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ text: trimmed }),
      });
    };

    let response = await callApi(0);

    // If transient or proxy error (405 / 502 / 503 / 504), retry with cache-busting
    if (!response.ok || response.status === 405 || response.status >= 500) {
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json') || response.status === 405 || response.status >= 500) {
        await new Promise((r) => setTimeout(r, 400));
        response = await callApi(1);
      }
    }

    const contentType = response.headers.get('content-type') || '';

    // Safely check if response is JSON to prevent WebKit/Safari from throwing
    // DOMException: "The string did not match the expected pattern."
    if (!contentType.includes('application/json')) {
      const rawText = await response.text().catch(() => '');
      console.warn('Risposta non-JSON ricevuta dal servizio di correzione:', response.status, rawText.slice(0, 100));

      if (response.status === 404) {
        return {
          success: false,
          original: text,
          corrected: text,
          error: 'Servizio di correzione AI momentaneamente non disponibile (404).',
        };
      }

      if (rawText.includes('__cookie_check') || response.status === 302 || response.status === 401 || response.status === 403) {
        return {
          success: false,
          original: text,
          corrected: text,
          error: 'Sessione di autenticazione scaduta su questo dispositivo. Ricarica la pagina dal browser.',
        };
      }

      return {
        success: false,
        original: text,
        corrected: text,
        error: 'Servizio di correzione temporaneamente occupato. Riprova tra qualche istante.',
      };
    }

    const data = await response.json().catch((jsonErr) => {
      console.warn('Errore parsing JSON da /api/correct-text:', jsonErr);
      return null;
    });

    if (!data) {
      return {
        success: false,
        original: text,
        corrected: text,
        error: 'Formato di risposta non valido dal server di correzione.',
      };
    }

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
    let errorMessage = err?.message || 'Errore di connessione con il servizio di correzione.';

    // Catch specific iOS Safari / WebKit DOMException
    if (errorMessage.includes('The string did not match the expected pattern')) {
      errorMessage = 'Errore di connessione al servizio AI. Ricarica la pagina e riprova.';
    }

    return {
      success: false,
      original: text,
      corrected: text,
      error: errorMessage,
    };
  }
}
