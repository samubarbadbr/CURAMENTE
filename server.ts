import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import 'dotenv/config';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Enable CORS and credentials for mobile & web preview requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }
  next();
});

// Explicit OPTIONS handler for /api/correct-text preflights
app.options('/api/correct-text', (_req, res) => {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(204).end();
});

// Health check for AI correction service
app.get('/api/correct-text', (_req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json({ status: 'ok', hasApiKey: Boolean(process.env.GEMINI_API_KEY) });
});

// API route for AI text proofreading & correction
app.post('/api/correct-text', async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Nessun testo fornito per la correzione.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Chiave GEMINI_API_KEY non configurata. Configurala nei segreti per abilitare la correzione AI.',
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Sei un assistente per la scrittura di un diario personale.
Il tuo unico compito è correggere eventuali refusi di battitura, errori grammaticali, ortografici e di punteggiatura nel testo seguente, riordinando le frasi in modo fluido, pulito e naturale in lingua italiana.

REGOLE TASSATIVE:
1. NON cambiare assolutamente il significato, le emozioni, i dettagli o il punto di vista dell'autore.
2. Mantieni il tono autentico e intimo del diario.
3. NON aggiungere commenti, introduzioni, spiegazioni, saluti né racchiudere il testo tra virgolette.
4. Restituisci ESCLUSIVAMENTE il testo corretto finale.

Testo originale:
"""
${text}
"""`;

    let corrected = text;
    // Primary model according to gemini-api skill: 'gemini-3.8-flash' (standard free tier for proofreading)
    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError: any = null;
    let modelSuccess = false;

    for (const modelName of candidateModels) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout durante la generazione')), 6000)
        );
        const generatePromise = ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });

        const response = (await Promise.race([generatePromise, timeoutPromise])) as any;
        const generated = response.text?.trim();
        if (generated) {
          corrected = generated;
          modelSuccess = true;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Modello ${modelName} non riuscito:`, err?.message || err);
      }
    }

    if (!modelSuccess) {
      console.warn('Gemini momentaneamente non disponibile, applicazione correzione regole italiana di fallback');
      corrected = applyItalianCorrectionFallback(text);
    }

    return res.json({
      success: true,
      original: text,
      corrected,
      modelUsed: modelSuccess ? 'gemini' : 'rules_engine',
    });
  } catch (error: any) {
    console.error('Errore durante la correzione del testo:', error);
    // Even on error, return rules-corrected text instead of failing the user
    try {
      const fallback = applyItalianCorrectionFallback(req.body?.text || '');
      return res.json({
        success: true,
        original: req.body?.text || '',
        corrected: fallback,
        modelUsed: 'rules_fallback',
      });
    } catch {
      return res.status(500).json({
        error: 'Impossibile correggere il testo al momento. Riprova più tardi.',
      });
    }
  }
});

// Funzione di correzione grammatica, refusi e fluidità in lingua italiana
function applyItalianCorrectionFallback(text: string): string {
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

// Fallback for any other method on /api/correct-text
app.all('/api/correct-text', (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(405).json({
    error: `Metodo ${req.method} non supportato per questo endpoint. Utilizza una richiesta POST.`,
  });
});

// Vite middleware setup
async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server avviato su http://0.0.0.0:${PORT}`);
  });
}

startServer();
