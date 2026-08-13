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
        localStorage.setItem('diariomente_sync_pin', cleanPin);
      } catch (e) {
        console.warn('localStorage sync warning:', e);
      }

      // 2. Upsert JSON payload into Supabase user_data table
      let sbSuccess = false;
      let lastError = '';

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

        if (!error) {
          sbSuccess = true;
        } else {
          lastError = error.message;
          console.warn('Primary Supabase upsert error:', error.message);
          
          // Fallback: simple upsert with just pin and data
          const { error: err2 } = await supabase
            .from('user_data')
            .upsert({ pin: cleanPin, data: syncPayload }, { onConflict: 'pin' });
          
          if (!err2) {
            sbSuccess = true;
          } else {
            lastError = err2.message || lastError;
            console.warn('Fallback Supabase upsert error:', err2.message);
          }
        }
      } catch (sbErr: any) {
        lastError = sbErr?.message || String(sbErr);
        console.warn('Supabase push exception:', sbErr);
      }

      if (!sbSuccess) {
        return {
          success: false,
          error: lastError ? `Errore Supabase: ${lastError}` : 'Impossibile connettersi a Supabase',
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
      let sbErrorMsg = '';

      // 1. Attempt to fetch row from Supabase user_data table
      try {
        const { data, error } = await supabase
          .from('user_data')
          .select('*')
          .eq('pin', cleanPin)
          .maybeSingle();

        if (error) {
          sbErrorMsg = error.message;
          console.warn('Supabase select error:', error.message);
        } else if (data) {
          const parsed = data.data || data.payload || (data.entries ? data : null);
          if (parsed && Array.isArray(parsed.entries)) {
            remoteData = parsed;
          }
        }
      } catch (sbErr: any) {
        sbErrorMsg = sbErr?.message || String(sbErr);
        console.warn('Supabase pull exception:', sbErr);
      }

      if (remoteData) {
        try {
          localStorage.setItem(`diariomente_sync_${cleanPin}`, JSON.stringify(remoteData));
          localStorage.setItem('diariomente_sync_pin', cleanPin);
        } catch (e) {
          console.warn('localStorage save cache error:', e);
        }
        return { success: true, data: remoteData };
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

      return {
        success: false,
        error: sbErrorMsg
          ? `Errore Supabase: ${sbErrorMsg}`
          : 'Nessun dato trovato su Supabase per questo PIN',
      };
    } catch (err: any) {
      console.error('Sync pull error:', err);
      return { success: false, error: err?.message || 'Errore nel caricamento dati' };
    }
  },

  // Test Supabase connection
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('pin')
        .limit(1);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.error('Supabase test connection exception:', err);
      return { success: false, error: err?.message || 'Impossibile contattare Supabase (Failed to fetch)' };
    }
  },
};





