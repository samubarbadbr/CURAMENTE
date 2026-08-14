const DEFAULT_SUPABASE_URL = 'https://oaktfvcndyxylpsdjaik.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ha3RmdmNuZHl4eWxwc2RqYWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MDk5MTIsImV4cCI6MjEwMjE4NTkxMn0.XEktFlHv1CHJRZJS2CHl0mvoJZ943m2d5WenVlxA6W8';

const env = (import.meta as any).env || {};
const SUPABASE_URL = (env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
const SUPABASE_KEY = (env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY).trim();

export { SUPABASE_URL, SUPABASE_KEY };

export function formatSupabaseErrorMessage(errText: string): string {
  if (!errText) return 'Connessione Supabase non disponibile';
  try {
    const parsed = JSON.parse(errText);
    if (parsed.code === 'PGRST205' || (parsed.message && parsed.message.includes("Could not find the table"))) {
      return "Tabella 'user_sync_data' non trovata su Supabase. Esegui la query SQL fornita nell'SQL Editor di Supabase.";
    }
    if (parsed.message && parsed.message.includes("in the schema cache")) {
      return "Colonna mancante o cache schema da aggiornare su Supabase. Esegui lo script SQL di aggiornamento in Impostazioni.";
    }
    if (parsed.code === '42501' || (parsed.message && (parsed.message.includes("permission denied") || parsed.message.includes("row-level security")))) {
      return "Permessi insufficienti su Supabase (RLS). Attiva la policy di accesso per la tabella 'user_sync_data'.";
    }
    if (parsed.message) {
      return parsed.message;
    }
  } catch (e) {
    // string is not JSON
  }
  if (errText.includes('PGRST205') || errText.includes('public.user_sync_data') || errText.includes('user_data')) {
    return "Tabella 'user_sync_data' non trovata su Supabase. Esegui la query SQL nell'SQL Editor di Supabase.";
  }
  if (errText.includes('schema cache')) {
    return "Struttura tabella Supabase non allineata. Esegui lo script SQL in Impostazioni per aggiungere le colonne.";
  }
  return errText;
}

export async function saveDataToCloud(pin: string, payloadData: any) {
  if (!pin) return { success: false, error: 'PIN / User ID mancante' };
  const cleanId = pin.trim().toLowerCase();
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, error: 'Dispositivo offline' };
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates'
    };

    // Try multiple column payload combinations to support user_pin, pin, and user_id schemas
    const attempts = [
      // Format matching user_pin primary key table (User's active Supabase schema)
      { user_pin: cleanId, pin: cleanId, data: payloadData, payload: payloadData, updated_at: new Date().toISOString() },
      { user_pin: cleanId, payload: payloadData, updated_at: new Date().toISOString() },
      { user_pin: cleanId, data: payloadData, updated_at: new Date().toISOString() },
      // Format matching user_id primary key table
      { user_id: cleanId, pin: cleanId, data: payloadData, payload: payloadData, updated_at: new Date().toISOString() },
      { user_id: cleanId, payload: payloadData, updated_at: new Date().toISOString() },
      { user_id: cleanId, data: payloadData, updated_at: new Date().toISOString() },
      // Format matching pin primary key table
      { pin: cleanId, payload: payloadData, updated_at: new Date().toISOString() },
      { pin: cleanId, data: payloadData, updated_at: new Date().toISOString() }
    ];

    let lastError = '';

    for (const bodyObj of attempts) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/user_sync_data`, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyObj)
        });

        if (res.ok) {
          console.log("Sincronizzazione riuscita su Supabase:", Object.keys(bodyObj));
          return { success: true };
        } else {
          lastError = await res.text();
          // If error is about missing table or RLS permission, don't keep trying columns
          if (lastError.includes('PGRST205') || lastError.includes('42501') || lastError.includes('permission denied')) {
            break;
          }
        }
      } catch (postErr: any) {
        lastError = postErr?.message || 'Errore di rete';
      }
    }

    const formatted = formatSupabaseErrorMessage(lastError);
    return { success: false, error: formatted };
  } catch (err: any) {
    console.warn("Avviso sync cloud:", err?.message || err);
    return { success: false, error: err?.message || 'Connessione di rete non disponibile' };
  }
}

export async function loadDataFromCloud(pin: string) {
  if (!pin) return null;
  const cleanId = pin.trim().toLowerCase();
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn("Dispositivo offline, caricamento cloud saltato");
      return null;
    }

    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    };

    // Try queries matching user_pin, pin, and user_id columns
    const queryUrls = [
      `${SUPABASE_URL}/rest/v1/user_sync_data?user_pin=eq.${encodeURIComponent(cleanId)}&select=*`,
      `${SUPABASE_URL}/rest/v1/user_sync_data?pin=eq.${encodeURIComponent(cleanId)}&select=*`,
      `${SUPABASE_URL}/rest/v1/user_sync_data?user_id=eq.${encodeURIComponent(cleanId)}&select=*`
    ];

    for (const url of queryUrls) {
      try {
        const res = await fetch(url, { method: 'GET', headers });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            return data[0].data || data[0].payload || data[0];
          }
        }
      } catch (e) {
        // try next column query
      }
    }
  } catch (err: any) {
    console.warn("Avviso fetch cloud:", err?.message || err);
  }
  return null;
}




