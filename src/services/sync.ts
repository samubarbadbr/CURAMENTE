import { supabase } from '../lib/supabase';
import { CbtEntry, Tag } from '../types';

export interface SyncDataPayload {
  entries: CbtEntry[];
  tags: Tag[];
  settings?: Record<string, any>;
  updatedAt?: string;
}

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
        localStorage.setItem(`diariomente_sync_${cleanPin}`, JSON.stringify(syncPayload));
      } catch (e) {
        console.warn('localStorage sync warning:', e);
      }

      // 2. Upsert JSON payload into Supabase user_data table
      try {
        const { error } = await supabase
          .from('user_data')
          .upsert(
            {
              pin: cleanPin,
              data: syncPayload,
              payload: syncPayload,
              updated_at: updatedAt,
            },
            { onConflict: 'pin' }
          );

        if (error) {
          console.warn('Supabase upsert error:', error.message);
          const { error: err2 } = await supabase
            .from('user_data')
            .upsert({ pin: cleanPin, data: syncPayload });
          if (err2) {
            console.warn('Supabase fallback upsert error:', err2.message);
          }
        }
      } catch (sbErr) {
        console.warn('Supabase push exception:', sbErr);
      }

      return { success: true, updatedAt };
    } catch (err) {
      console.error('Sync push error:', err);
      return { success: false, error: 'Errore durante il salvataggio' };
    }
  },

  // Pull data from Supabase for PIN
  async pull(pin: string): Promise<{ success: boolean; data?: SyncDataPayload; error?: string }> {
    try {
      const cleanPin = pin.trim().toLowerCase();
      if (!cleanPin || cleanPin.length < 3) {
        return { success: false, error: 'PIN non valido (minimo 3 caratteri)' };
      }

      // 1. Attempt to fetch row from Supabase user_data table
      try {
        const { data, error } = await supabase
          .from('user_data')
          .select('*')
          .eq('pin', cleanPin)
          .maybeSingle();

        if (!error && data) {
          const remoteData: SyncDataPayload = data.data || data.payload || (data.entries ? data : null);
          if (remoteData && Array.isArray(remoteData.entries)) {
            try {
              localStorage.setItem(`diariomente_sync_${cleanPin}`, JSON.stringify(remoteData));
            } catch (e) {
              console.warn('localStorage save cache error:', e);
            }
            return { success: true, data: remoteData };
          }
        }
      } catch (sbErr) {
        console.warn('Supabase pull exception:', sbErr);
      }

      // 2. Fallback to localStorage cache
      try {
        const raw = localStorage.getItem(`diariomente_sync_${cleanPin}`);
        if (raw) {
          const localData: SyncDataPayload = JSON.parse(raw);
          if (localData && Array.isArray(localData.entries)) {
            return { success: true, data: localData };
          }
        }
      } catch {
        // ignore
      }

      return { success: false, error: 'Nessun dato trovato per questo PIN' };
    } catch (err) {
      console.error('Sync pull error:', err);
      return { success: false, error: 'Errore nel caricamento dati' };
    }
  },
};



