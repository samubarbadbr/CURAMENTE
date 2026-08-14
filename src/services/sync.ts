import { saveDataToCloud, loadDataFromCloud, SUPABASE_URL, SUPABASE_KEY, formatSupabaseErrorMessage } from '../lib/supabase';
import { CbtEntry, Tag } from '../types';

export interface SyncDataPayload {
  entries: CbtEntry[];
  tags: Tag[];
  settings?: Record<string, any>;
  updatedAt?: string;
}

export { saveDataToCloud, loadDataFromCloud };

export const SyncService = {
  // Push local entries & tags to Supabase under PIN
  async push(pin: string, payload: SyncDataPayload): Promise<{ success: boolean; updatedAt?: string; error?: string }> {
    try {
      const cleanPin = pin.trim().toLowerCase();
      if (!cleanPin || cleanPin.length < 3) {
        return { success: false, error: 'PIN non valido (minimo 3 caratteri)' };
      }

      const updatedAt = new Date().toISOString();
      const syncPayload: SyncDataPayload = {
        ...payload,
        updatedAt,
      };

      // 1. Client-side persistence in localStorage as cache
      try {
        localStorage.setItem(`diariamente_sync_${cleanPin}`, JSON.stringify(syncPayload));
        localStorage.setItem('diariamente_sync_pin', cleanPin);
      } catch (e) {
        console.warn('localStorage sync warning:', e);
      }

      // 2. Upsert JSON payload into Supabase user_data table via REST API
      const res = await saveDataToCloud(cleanPin, syncPayload);
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'Impossibile salvare i dati su Supabase',
        };
      }

      return { success: true, updatedAt };
    } catch (err: any) {
      console.error('Sync push error:', err);
      return { success: false, error: err?.message || 'Errore durante il salvataggio' };
    }
  },

  // Pull data from Supabase for PIN
  async pull(pin: string): Promise<{ success: boolean; data?: SyncDataPayload; error?: string }> {
    try {
      const cleanPin = pin.trim().toLowerCase();
      if (!cleanPin || cleanPin.length < 3) {
        return { success: false, error: 'PIN non valido (minimo 3 caratteri)' };
      }

      let remoteData: SyncDataPayload | null = null;

      // 1. Fetch row from Supabase user_data table via REST API
      try {
        const fetchedData = await loadDataFromCloud(cleanPin);
        if (fetchedData && Array.isArray(fetchedData.entries)) {
          remoteData = fetchedData as SyncDataPayload;
        }
      } catch (sbErr: any) {
        console.warn('Supabase pull exception:', sbErr);
      }

      if (remoteData) {
        try {
          localStorage.setItem(`diariamente_sync_${cleanPin}`, JSON.stringify(remoteData));
          localStorage.setItem('diariamente_sync_pin', cleanPin);
        } catch (e) {
          console.warn('localStorage save cache error:', e);
        }
        return { success: true, data: remoteData };
      }

      // 2. Fallback to localStorage cache
      try {
        const raw = localStorage.getItem(`diariamente_sync_${cleanPin}`) || localStorage.getItem(`diariomente_sync_${cleanPin}`);
        if (raw) {
          const localData: SyncDataPayload = JSON.parse(raw);
          if (localData && Array.isArray(localData.entries)) {
            return { success: true, data: localData };
          }
        }
      } catch {
        // ignore
      }

      return {
        success: false,
        error: 'Nessun dato trovato su Supabase per questo PIN',
      };
    } catch (err: any) {
      console.error('Sync pull error:', err);
      return { success: false, error: err?.message || 'Errore nel caricamento dati' };
    }
  },

  // Test Supabase connection via REST API
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return { success: false, error: 'Dispositivo offline' };
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/user_sync_data?select=*&limit=1`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: formatSupabaseErrorMessage(errText) };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('Supabase test connection warning:', err?.message || err);
      return { success: false, error: err?.message || 'Impossibile contattare Supabase (offline o rete non disponibile)' };
    }
  },
};






