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
  return errText;
}

export async function saveDataToCloud(pin: string, payloadData: any) {
  if (!pin) return { success: false, error: 'PIN / User ID mancante' };
  const cleanId = pin.trim().toLowerCase();
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, error: 'Dispositivo offline' };
    }
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_sync_data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_id: cleanId,
        pin: cleanId,
        data: payloadData,
        payload: payloadData,
        updated_at: new Date().toISOString()
      })
    });

    if (res.ok) {
      console.log("Sincronizzazione riuscita su user_sync_data");
      return { success: true };
    } else {
      const errText = await res.text();
      const formatted = formatSupabaseErrorMessage(errText);
      console.warn("Errore risposta sync:", formatted);
      return { success: false, error: formatted };
    }
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
    // Try user_id first, fallback or pin
    let res = await fetch(`${SUPABASE_URL}/rest/v1/user_sync_data?or=(user_id.eq.${encodeURIComponent(cleanId)},pin.eq.${encodeURIComponent(cleanId)})&select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!res.ok) {
      // Fallback simple query
      res = await fetch(`${SUPABASE_URL}/rest/v1/user_sync_data?user_id=eq.${encodeURIComponent(cleanId)}&select=*`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
    }
    
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return data[0].data || data[0].payload || data[0];
      }
    }
  } catch (err: any) {
    console.warn("Avviso fetch cloud:", err?.message || err);
  }
  return null;
}




