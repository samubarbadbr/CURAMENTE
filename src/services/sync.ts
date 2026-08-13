import { CbtEntry, Tag } from '../types';

export interface SyncDataPayload {
  entries: CbtEntry[];
  tags: Tag[];
  settings?: Record<string, any>;
  updatedAt?: string;
}

export const SyncService = {
  // Push local entries & tags using 100% client-side storage (localStorage) + optional server backup
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

      // 100% Client-side persistence in localStorage for local profile/pin sync
      try {
        localStorage.setItem(`diariomente_sync_${cleanPin}`, JSON.stringify(syncPayload));
      } catch (e) {
        console.warn('localStorage sync warning:', e);
      }

      // Optional attempt to push to Express backend API if running on node server
      if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
        try {
          const res = await fetch(`/api/sync/${encodeURIComponent(cleanPin)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(syncPayload),
          });
          if (res.ok) {
            const json = await res.json().catch(() => null);
            if (json && json.updatedAt) {
              return { success: true, updatedAt: json.updatedAt };
            }
          }
        } catch {
          // Ignore server errors on static hosts like GitHub Pages
        }
      }

      return { success: true, updatedAt };
    } catch (err) {
      console.error('Sync push error:', err);
      return { success: false, error: 'Errore nel salvataggio locale' };
    }
  },

  // Pull data using 100% client-side storage (localStorage) + optional server pull
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

      // Optional attempt to pull from Express backend API if available
      if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
        try {
          const res = await fetch(`/api/sync/${encodeURIComponent(cleanPin)}`);
          if (res.ok) {
            const json = await res.json().catch(() => null);
            if (json && json.success && json.data) {
              // Update localStorage with cloud copy
              try {
                localStorage.setItem(`diariomente_sync_${cleanPin}`, JSON.stringify(json.data));
              } catch {
                // ignore
              }
              return { success: true, data: json.data };
            }
          }
        } catch {
          // Ignore server errors on static hosts like GitHub Pages
        }
      }

      if (localData && Array.isArray(localData.entries)) {
        return { success: true, data: localData };
      }

      return { success: false, error: 'Nessun dato trovato per questo PIN' };
    } catch (err) {
      console.error('Sync pull error:', err);
      return { success: false, error: 'Errore nel caricamento dati' };
    }
  },
};

