export interface TextCorrectionResult {
  success: boolean;
  original: string;
  corrected: string;
  error?: string;
}

// Correzione immediata basata su regole e ortografia italiana in caso di offline o errori di rete
export function applyItalianCorrectionFallback(text: string): string {
  if (!text || !text.trim()) return text;
  let s = text.trim();

  // Correzioni verbi ausiliari avere con acca mancante (es: "o visto" -> "ho visto")
  const particiPassati = 'visto|fatto|detto|saputo|sentito|preso|messo|pensato|provato|trovato|capito|iniziato|finito|dormito|mangiato|letto|scritto|chiesto|risposto|notato|avuto|stato|andato|uscito|parlato|creduto|sentita|sentiti|sentite|vista|visti|viste|fatta|fatti|fatte';
  s = s.replace(new RegExp(`\\b([Oo])\\s+(${particiPassati})\\b`, 'g'), (_, p1, p2) => (p1 === 'O' ? 'Ho ' : 'ho ') + p2);
  s = s.replace(new RegExp(`\\b([Aa])\\s+(${particiPassati})\\b`, 'g'), (_, p1, p2) => (p1 === 'A' ? 'Ha ' : 'ha ') + p2);
  s = s.replace(new RegExp(`\\b([Aa]nno)\\s+(${particiPassati})\\b`, 'g'), (_, p1, p2) => (p1.startsWith('A') ? 'Hanno ' : 'hanno ') + p2);

  // Errori tipici ortografici italiani
  s = s.replace(/\bun\s+pò\b/gi, "un po'");
  s = s.replace(/\bqual'è\b/gi, 'qual è');
  s = s.replace(/\bqual'e\b/gi, 'qual è');
  s = s.replace(/\bd'accordo\b/gi, "d'accordo");
  s = s.replace(/\bd'avanti\b/gi, 'davanti');
  s = s.replace(/\bfa'\b/gi, 'fa');
  s = s.replace(/\bfa\s+bene\b/gi, 'fa bene');
  s = s.replace(/\bfa\s+male\b/gi, 'fa male');
  s = s.replace(/\bce\s+l'ho\b/gi, "ce l'ho");
  s = s.replace(/\bce\s+l'ha\b/gi, "ce l'ha");
  s = s.replace(/\bnon\s+ce\s+la\s+faccio\b/gi, 'non ce la faccio');

  // Correzioni vocali accentate
  s = s.replace(/\b([Ee])'/g, (_, p1) => (p1 === 'E' ? 'È' : 'è'));
  s = s.replace(/\bperche'?\b/gi, 'perché');
  s = s.replace(/\baffinche'?\b/gi, 'affinché');
  s = s.replace(/\bpiu'?\b/gi, 'più');
  s = s.replace(/\bgia'?\b/gi, 'già');
  s = s.replace(/\bcioe'?\b/gi, 'cioè');
  s = s.replace(/\bpuo'?\b/gi, 'può');
  s = s.replace(/\bpero'?\b/gi, 'però');
  s = s.replace(/\bcosi'?\b/gi, 'così');
  s = s.replace(/\blaggiu'?\b/gi, 'laggiù');
  s = s.replace(/\blassu'?\b/gi, 'lassù');

  // Punteggiatura e spaziatura corretta
  s = s.replace(/\s+([.,;:!?])/g, '$1');
  s = s.replace(/([.,;:!?])(?=[^\s.,;:!?0-9])/g, '$1 ');
  s = s.replace(/\s{2,}/g, ' ');

  // Maiuscola a inizio frase e dopo punto, punto interrogativo o esclamativo
  s = s.replace(/(^|[.!?]\s+)([a-zàèéìòù])/g, (_, prefix, letter) => prefix + letter.toUpperCase());

  // Se finisce senza punteggiatura, aggiungi un punto finale
  if (!/[.!?]$/.test(s)) {
    s += '.';
  }

  return s;
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

  // Handle offline situation cleanly with instant local correction
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      success: true,
      original: text,
      corrected: applyItalianCorrectionFallback(trimmed),
    };
  }

  try {
    const callApi = async (attempt: number = 0) => {
      const url = attempt === 0 ? '/api/correct-text' : `/api/correct-text?_t=${Date.now()}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
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

    // If fetch failed or server error, apply local fallback immediately
    if (!response || !response.ok) {
      return {
        success: true,
        original: text,
        corrected: applyItalianCorrectionFallback(trimmed),
      };
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return {
        success: true,
        original: text,
        corrected: applyItalianCorrectionFallback(trimmed),
      };
    }

    const data = await response.json().catch(() => null);
    if (!data || !data.corrected) {
      return {
        success: true,
        original: text,
        corrected: applyItalianCorrectionFallback(trimmed),
      };
    }

    return {
      success: true,
      original: text,
      corrected: data.corrected,
    };
  } catch (err) {
    console.warn('Fallback automatico su regole italiane per correzione:', err);
    return {
      success: true,
      original: text,
      corrected: applyItalianCorrectionFallback(trimmed),
    };
  }
}
