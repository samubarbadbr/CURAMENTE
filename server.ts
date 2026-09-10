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
    // Primary model: gemini-3.1-flash-lite (fastest, ~700ms, highly responsive for mobile); fallbacks for redundancy
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError: any = null;
    let modelSuccess = false;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        const generated = response.text?.trim();
        if (generated) {
          corrected = generated;
          modelSuccess = true;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Modello ${modelName} non disponibile:`, err?.message || err);
      }
    }

    if (!modelSuccess && lastError) {
      throw lastError;
    }

    return res.json({
      success: true,
      original: text,
      corrected,
    });
  } catch (error: any) {
    console.error('Errore durante la correzione del testo:', error);
    let errorText = error?.message || 'Errore durante la correzione del testo con il servizio AI.';
    try {
      const parsed = JSON.parse(errorText);
      if (parsed?.error?.message) {
        errorText = parsed.error.message;
      }
    } catch {}
    return res.status(500).json({
      error: errorText,
    });
  }
});

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
