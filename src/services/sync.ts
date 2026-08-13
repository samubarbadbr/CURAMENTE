import { CbtEntry, Tag } from '../types';

export interface SyncDataPayload {
  entries: CbtEntry[];
  tags: Tag[];
  settings?: Record<string, any>;
  updatedAt?: string;
}

export const SyncService = {
  // Push local entries & tags to cloud under PIN
  async push(pin: string, payload: SyncDataPayload): Promise<{ success: boolean; updatedAt?: string; error?: string }> {
    try {
      const cleanPin = pin.trim().toLowerCase();
      if (!cleanPin || cleanPin.length < 3) {
        return { success: false, error: 'PIN non valido (minimo 3 caratteri)' };
      }

      const res = await fetch(`/api/sync/${encodeURIComponent(cleanPin)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'Errore durante l\'invio dati' };
      }

      return { success: true, updatedAt: json.updatedAt };
    } catch (err) {
      console.error('Sync push error:', err);
      return { success: false, error: 'Impossibile contattare il server cloud' };
    }
  },

  // Pull data from cloud for PIN
  async pull(pin: string): Promise<{ success: boolean; data?: SyncDataPayload; error?: string }> {
    try {
      const cleanPin = pin.trim().toLowerCase();
      if (!cleanPin || cleanPin.length < 3) {
        return { success: false, error: 'PIN non valido (minimo 3 caratteri)' };
      }

      const res = await fetch(`/api/sync/${encodeURIComponent(cleanPin)}`, {
        method: 'GET',
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { success: false, error: json.error || 'PIN non trovato sul cloud' };
      }

      return { success: true, data: json.data };
    } catch (err) {
      console.error('Sync pull error:', err);
      return { success: false, error: 'Impossibile contattare il server cloud' };
    }
  },
};
