import { CbtEntry, Tag } from '../types';

export interface SyncDataPayload {
  entries: CbtEntry[];
  tags: Tag[];
  settings?: Record<string, any>;
  updatedAt?: string;
}

export const SyncService = {
  // Push local entries & tags using 100% client-side storage (localStorage)
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

      // 100% Client-side persistence in localStorage
      try {
        localStorage.setItem(`diariomente_sync_${cleanPin}`, JSON.stringify(syncPayload));
      } catch (e) {
        console.warn('localStorage sync warning:', e);
        return { success: false, error: 'Memoria locale piena o non accessibile' };
      }

      return { success: true, updatedAt };
    } catch (err) {
      console.error('Sync push error:', err);
      return { success: false, error: 'Errore nel salvataggio locale' };
    }
  },

  // Pull data using 100% client-side storage (localStorage)
  async pull(pin: string): Promise<{ success: boolean; data?: SyncDataPayload; error?: string }> {
    try {
      const cleanPin = pin.trim().toLowerCase();
      if (!cleanPin || cleanPin.length < 3) {
        return { success: false, error: 'PIN non valido (minimo 3 caratteri)' };
      }

      let localData: SyncDataPayload | null = null;
      try {
        const raw = localStorage.getItem(`diariomente_sync_${cleanPin}`);
        if (raw) {
          localData = JSON.parse(raw);
        }
      } catch {
        // ignore parse errors
      }

      if (localData && Array.isArray(localData.entries)) {
        return { success: true, data: localData };
      }

      return { success: false, error: 'Nessun dato trovato in locale per questo PIN' };
    } catch (err) {
      console.error('Sync pull error:', err);
      return { success: false, error: 'Errore nel caricamento dati' };
    }
  },
};


