import {
  saveDataToCloud,
  loadDataFromCloud,
  checkCloudDataExists,
  SUPABASE_URL,
  SUPABASE_KEY,
  formatSupabaseErrorMessage,
} from '../lib/supabase';
import { CbtEntry, Tag, DiaryNote, CustomQuestion } from '../types';
import { DB, cleanupAndDeduplicateTags } from './db';
import { CustomQuestionsService } from './customQuestions';

export interface SyncDataPayload {
  entries: CbtEntry[];
  tags: Tag[];
  notes?: DiaryNote[];
  customQuestions?: CustomQuestion[];
  settings?: Record<string, any>;
  updatedAt?: string;
}

export interface DifferenceReport {
  hasDifferences: boolean;
  cloudEntriesCount: number;
  localEntriesCount: number;
  newEntriesFromCloud: number;
  updatedEntriesFromCloud: number;
  localOnlyEntries: number;
  newNotesFromCloud: number;
  updatedNotesFromCloud: number;
  localOnlyNotes: number;
  newTagsFromCloud: number;
  newCustomQuestionsFromCloud: number;
  summary: string;
}

export interface SilentSyncResult {
  success: boolean;
  existsOnCloud: boolean;
  hasDifferences: boolean;
  appliedChanges: boolean;
  summary: string;
  updatedAt?: string;
  error?: string;
}

export { saveDataToCloud, loadDataFromCloud, checkCloudDataExists };

/**
 * Compare local and cloud datasets to detect any differences
 */
export function detectDataDifferences(
  local: SyncDataPayload,
  cloud: SyncDataPayload
): DifferenceReport {
  const localEntries = Array.isArray(local.entries) ? local.entries : [];
  const cloudEntries = Array.isArray(cloud.entries) ? cloud.entries : [];
  const localNotes = Array.isArray(local.notes) ? local.notes : [];
  const cloudNotes = Array.isArray(cloud.notes) ? cloud.notes : [];
  const localTags = Array.isArray(local.tags) ? local.tags : [];
  const cloudTags = Array.isArray(cloud.tags) ? cloud.tags : [];
  const localQuestions = Array.isArray(local.customQuestions) ? local.customQuestions : [];
  const cloudQuestions = Array.isArray(cloud.customQuestions) ? cloud.customQuestions : [];

  const localEntriesMap = new Map(localEntries.map((e) => [e.id, e]));
  const cloudEntriesMap = new Map(cloudEntries.map((e) => [e.id, e]));

  let newEntriesFromCloud = 0;
  let updatedEntriesFromCloud = 0;
  let localOnlyEntries = 0;

  for (const [id, cloudEntry] of cloudEntriesMap.entries()) {
    const localEntry = localEntriesMap.get(id);
    if (!localEntry) {
      newEntriesFromCloud++;
    } else {
      const cloudTime = new Date(
        (cloudEntry as any).updatedAt || cloudEntry.createdAt || cloudEntry.eventDatetime || 0
      ).getTime();
      const localTime = new Date(
        (localEntry as any).updatedAt || localEntry.createdAt || localEntry.eventDatetime || 0
      ).getTime();

      if (cloudTime > localTime) {
        updatedEntriesFromCloud++;
      } else if (JSON.stringify(cloudEntry) !== JSON.stringify(localEntry)) {
        updatedEntriesFromCloud++;
      }
    }
  }

  for (const id of localEntriesMap.keys()) {
    if (!cloudEntriesMap.has(id)) {
      localOnlyEntries++;
    }
  }

  // Notes comparison
  const localNotesMap = new Map(localNotes.map((n) => [n.id, n]));
  const cloudNotesMap = new Map(cloudNotes.map((n) => [n.id, n]));

  let newNotesFromCloud = 0;
  let updatedNotesFromCloud = 0;
  let localOnlyNotes = 0;

  for (const [id, cloudNote] of cloudNotesMap.entries()) {
    const localNote = localNotesMap.get(id);
    if (!localNote) {
      newNotesFromCloud++;
    } else {
      const cloudTime = new Date(cloudNote.updatedAt || cloudNote.createdAt || 0).getTime();
      const localTime = new Date(localNote.updatedAt || localNote.createdAt || 0).getTime();

      if (cloudTime > localTime || JSON.stringify(cloudNote) !== JSON.stringify(localNote)) {
        updatedNotesFromCloud++;
      }
    }
  }

  for (const id of localNotesMap.keys()) {
    if (!cloudNotesMap.has(id)) {
      localOnlyNotes++;
    }
  }

  // Tags comparison
  const localTagKeys = new Set(localTags.map((t) => `${t.category || ''}:${t.label?.trim().toLowerCase() || ''}`));
  let newTagsFromCloud = 0;
  for (const t of cloudTags) {
    const key = `${t.category || ''}:${t.label?.trim().toLowerCase() || ''}`;
    if (!localTagKeys.has(key)) {
      newTagsFromCloud++;
    }
  }

  // Custom questions comparison
  const localQuestionMap = new Map(localQuestions.map((q) => [q.id, q]));
  let newCustomQuestionsFromCloud = 0;
  for (const q of cloudQuestions) {
    const localQ = localQuestionMap.get(q.id);
    if (!localQ || JSON.stringify(localQ) !== JSON.stringify(q)) {
      newCustomQuestionsFromCloud++;
    }
  }

  const hasDifferences =
    newEntriesFromCloud > 0 ||
    updatedEntriesFromCloud > 0 ||
    localOnlyEntries > 0 ||
    newNotesFromCloud > 0 ||
    updatedNotesFromCloud > 0 ||
    localOnlyNotes > 0 ||
    newTagsFromCloud > 0 ||
    newCustomQuestionsFromCloud > 0;

  const parts: string[] = [];
  if (newEntriesFromCloud > 0) parts.push(`${newEntriesFromCloud} nuove schede da cloud`);
  if (updatedEntriesFromCloud > 0) parts.push(`${updatedEntriesFromCloud} schede aggiornate`);
  if (localOnlyEntries > 0) parts.push(`${localOnlyEntries} schede locali non su cloud`);
  if (newNotesFromCloud > 0) parts.push(`${newNotesFromCloud} nuovi appunti`);
  if (updatedNotesFromCloud > 0) parts.push(`${updatedNotesFromCloud} appunti aggiornati`);
  if (localOnlyNotes > 0) parts.push(`${localOnlyNotes} appunti locali non su cloud`);
  if (newTagsFromCloud > 0) parts.push(`${newTagsFromCloud} nuovi tag`);
  if (newCustomQuestionsFromCloud > 0) parts.push(`${newCustomQuestionsFromCloud} nuove domande`);

  const summary = parts.length > 0 ? parts.join(', ') : 'Database perfettamente allineato';

  return {
    hasDifferences,
    cloudEntriesCount: cloudEntries.length,
    localEntriesCount: localEntries.length,
    newEntriesFromCloud,
    updatedEntriesFromCloud,
    localOnlyEntries,
    newNotesFromCloud,
    updatedNotesFromCloud,
    localOnlyNotes,
    newTagsFromCloud,
    newCustomQuestionsFromCloud,
    summary,
  };
}

export const SyncService = {
  // Push local entries, tags, notes & questions to Supabase under PIN
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
        localStorage.setItem('diariamente_last_synced_at', updatedAt);
      } catch (e) {
        console.warn('localStorage sync warning:', e);
      }

      // 2. Upsert JSON payload into Supabase user_sync_data table via REST API
      const res = await saveDataToCloud(cleanPin, syncPayload);
      if (!res.success) {
        return {
          success: false,
          error: res.error || 'Impossibile salvare i dati nel cloud',
        };
      }

      return { success: true, updatedAt };
    } catch (err: any) {
      console.error('Sync push error:', err);
      return { success: false, error: err?.message || 'Errore durante il salvataggio' };
    }
  },

  // Pull data from cloud for PIN
  async pull(pin: string): Promise<{ success: boolean; data?: SyncDataPayload; error?: string }> {
    try {
      const cleanPin = pin.trim().toLowerCase();
      if (!cleanPin || cleanPin.length < 3) {
        return { success: false, error: 'PIN non valido (minimo 3 caratteri)' };
      }

      let remoteData: SyncDataPayload | null = null;

      // 1. Fetch row from cloud user_sync_data table via REST API
      try {
        const fetchedData = await loadDataFromCloud(cleanPin);
        if (fetchedData && Array.isArray(fetchedData.entries)) {
          remoteData = fetchedData as SyncDataPayload;
        }
      } catch (sbErr: any) {
        console.warn('Cloud pull exception:', sbErr);
      }

      if (remoteData) {
        try {
          localStorage.setItem(`diariamente_sync_${cleanPin}`, JSON.stringify(remoteData));
          localStorage.setItem('diariamente_sync_pin', cleanPin);
          if (remoteData.updatedAt) {
            localStorage.setItem('diariamente_last_synced_at', remoteData.updatedAt);
          }
        } catch (e) {
          console.warn('localStorage save cache error:', e);
        }
        return { success: true, data: remoteData };
      }

      // 2. Fallback to localStorage cache
      try {
        const raw =
          localStorage.getItem(`diariamente_sync_${cleanPin}`) ||
          localStorage.getItem(`diariomente_sync_${cleanPin}`);
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
        error: 'Nessun dato trovato nel cloud per questo PIN',
      };
    } catch (err: any) {
      console.error('Sync pull error:', err);
      return { success: false, error: err?.message || 'Errore nel caricamento dati' };
    }
  },

  // Check if data exists on Cloud for this PIN
  async checkForCloudData(pin: string): Promise<{ exists: boolean; data?: SyncDataPayload; error?: string }> {
    try {
      const res = await checkCloudDataExists(pin);
      if (res.exists && res.data && Array.isArray(res.data.entries)) {
        return { exists: true, data: res.data as SyncDataPayload };
      }
      return { exists: false, error: res.error };
    } catch (err: any) {
      return { exists: false, error: err?.message };
    }
  },

  /**
   * Automatically checks for cloud data via Supabase on startup and
   * silently synchronizes local databases if any difference is detected.
   */
  async silentSyncOnStartup(
    pin: string,
    onUpdate?: (payload: SyncDataPayload, summary: string) => Promise<void> | void
  ): Promise<SilentSyncResult> {
    const cleanPin = pin ? pin.trim().toLowerCase() : '';
    if (!cleanPin || cleanPin.length < 3) {
      return {
        success: false,
        existsOnCloud: false,
        hasDifferences: false,
        appliedChanges: false,
        summary: 'Nessun PIN valido per la sincronizzazione cloud',
      };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        success: false,
        existsOnCloud: false,
        hasDifferences: false,
        appliedChanges: false,
        summary: 'Dispositivo offline, controllo cloud saltato',
      };
    }

    try {
      // 1. Gather all current local state
      const localEntries = await DB.getAll<CbtEntry>('entries');
      const localTags = await DB.getAll<Tag>('tags');
      const localNotes = await DB.getAll<DiaryNote>('notes');
      const localQuestions = CustomQuestionsService.load();

      const localPayload: SyncDataPayload = {
        entries: localEntries,
        tags: localTags,
        notes: localNotes,
        customQuestions: localQuestions,
        updatedAt: localStorage.getItem('diariamente_last_synced_at') || new Date().toISOString(),
      };

      // 2. Query Supabase to check if cloud data exists
      const cloudCheck = await checkCloudDataExists(cleanPin);
      const nowIso = new Date().toISOString();

      try {
        localStorage.setItem('diariamente_last_cloud_check', nowIso);
      } catch {}

      // Case A: Cloud data does not exist yet for this PIN
      if (!cloudCheck.exists || !cloudCheck.data || !Array.isArray(cloudCheck.data.entries)) {
        // If we have local entries or notes, silently initialize the cloud backup
        if (localEntries.length > 0 || localNotes.length > 0) {
          console.log('[Silent Sync] Nessun dato su Cloud per questo PIN. Inizializzo backup silenzioso...');
          await this.push(cleanPin, localPayload);
          return {
            success: true,
            existsOnCloud: false,
            hasDifferences: false,
            appliedChanges: true,
            summary: 'Backup cloud inizializzato con i dati locali esistenti',
            updatedAt: nowIso,
          };
        }

        return {
          success: true,
          existsOnCloud: false,
          hasDifferences: false,
          appliedChanges: false,
          summary: 'Nessun dato presente su Cloud',
          updatedAt: nowIso,
        };
      }

      // Case B: Cloud data exists. Compare with local dataset.
      const cloudPayload: SyncDataPayload = {
        entries: Array.isArray(cloudCheck.data.entries) ? cloudCheck.data.entries : [],
        tags: Array.isArray(cloudCheck.data.tags) ? cloudCheck.data.tags : [],
        notes: Array.isArray(cloudCheck.data.notes) ? cloudCheck.data.notes : [],
        customQuestions: Array.isArray(cloudCheck.data.customQuestions) ? cloudCheck.data.customQuestions : [],
        settings: cloudCheck.data.settings,
        updatedAt: cloudCheck.updatedAt || cloudCheck.data.updatedAt || nowIso,
      };

      const diffReport = detectDataDifferences(localPayload, cloudPayload);

      // If no differences detected, databases are already aligned!
      if (!diffReport.hasDifferences) {
        console.log('[Silent Sync] Database locale e Cloud sono già identici.');
        return {
          success: true,
          existsOnCloud: true,
          hasDifferences: false,
          appliedChanges: false,
          summary: 'Database già sincronizzato',
          updatedAt: cloudPayload.updatedAt || nowIso,
        };
      }

      // If differences ARE detected: silently merge cloud into local IndexedDB
      console.log('[Silent Sync] Differenze rilevate:', diffReport.summary);

      // 1. Merge entries: cloud entries that are newer or not present locally
      const localEntriesMap = new Map(localEntries.map((e) => [e.id, e]));
      for (const cloudEntry of cloudPayload.entries) {
        const localEntry = localEntriesMap.get(cloudEntry.id);
        if (!localEntry) {
          // Cloud has an entry not yet present locally
          await DB.put('entries', cloudEntry);
        } else {
          // Check timestamp or content
          const cloudTime = new Date(
            (cloudEntry as any).updatedAt || cloudEntry.createdAt || cloudEntry.eventDatetime || 0
          ).getTime();
          const localTime = new Date(
            (localEntry as any).updatedAt || localEntry.createdAt || localEntry.eventDatetime || 0
          ).getTime();

          if (cloudTime > localTime || JSON.stringify(cloudEntry) !== JSON.stringify(localEntry)) {
            await DB.put('entries', cloudEntry);
          }
        }
      }

      // 2. Merge diary notes
      const localNotesMap = new Map(localNotes.map((n) => [n.id, n]));
      for (const cloudNote of cloudPayload.notes || []) {
        const localNote = localNotesMap.get(cloudNote.id);
        if (!localNote) {
          await DB.put('notes', cloudNote);
        } else {
          const cloudTime = new Date(cloudNote.updatedAt || cloudNote.createdAt || 0).getTime();
          const localTime = new Date(localNote.updatedAt || localNote.createdAt || 0).getTime();

          if (cloudTime > localTime || JSON.stringify(cloudNote) !== JSON.stringify(localNote)) {
            await DB.put('notes', cloudNote);
          }
        }
      }

      // 3. Merge tags
      if (cloudPayload.tags && cloudPayload.tags.length > 0) {
        for (const tag of cloudPayload.tags) {
          await DB.put('tags', tag);
        }
        await cleanupAndDeduplicateTags();
      }

      // 4. Merge custom questions
      if (cloudPayload.customQuestions && cloudPayload.customQuestions.length > 0) {
        const localQMap = new Map(localQuestions.map((q) => [q.id, q]));
        let questionsModified = false;
        const mergedQuestions = [...localQuestions];

        for (const cloudQ of cloudPayload.customQuestions) {
          const localQ = localQMap.get(cloudQ.id);
          if (!localQ) {
            mergedQuestions.push(cloudQ);
            questionsModified = true;
          } else if (JSON.stringify(localQ) !== JSON.stringify(cloudQ)) {
            const idx = mergedQuestions.findIndex((q) => q.id === cloudQ.id);
            if (idx >= 0) {
              mergedQuestions[idx] = cloudQ;
              questionsModified = true;
            }
          }
        }

        if (questionsModified) {
          CustomQuestionsService.save(mergedQuestions);
        }
      }

      // 5. Two-way harmonization:
      // If local had items not yet in Cloud (e.g. offline entries/notes), push merged state to Cloud
      if (diffReport.localOnlyEntries > 0 || diffReport.localOnlyNotes > 0) {
        console.log('[Silent Sync] Rilevati elementi creati localmente offline. Sincronizzo Cloud...');
        const mergedEntries = await DB.getAll<CbtEntry>('entries');
        const mergedTags = await DB.getAll<Tag>('tags');
        const mergedNotes = await DB.getAll<DiaryNote>('notes');
        const mergedQuestions = CustomQuestionsService.load();

        const fullMergedPayload: SyncDataPayload = {
          entries: mergedEntries,
          tags: mergedTags,
          notes: mergedNotes,
          customQuestions: mergedQuestions,
          updatedAt: nowIso,
        };

        await this.push(cleanPin, fullMergedPayload);
      }

      // Update local storage cache and timestamp
      try {
        localStorage.setItem(`diariamente_sync_${cleanPin}`, JSON.stringify(cloudPayload));
        localStorage.setItem('diariamente_last_synced_at', nowIso);
      } catch {}

      // Trigger UI update callback silently
      if (onUpdate) {
        await onUpdate(cloudPayload, diffReport.summary);
      }

      return {
        success: true,
        existsOnCloud: true,
        hasDifferences: true,
        appliedChanges: true,
        summary: diffReport.summary,
        updatedAt: nowIso,
      };
    } catch (err: any) {
      console.warn('[Silent Sync] Eccezione durante la sincronizzazione:', err);
      return {
        success: false,
        existsOnCloud: false,
        hasDifferences: false,
        appliedChanges: false,
        summary: 'Errore durante la sincronizzazione silenziosa',
        error: err?.message,
      };
    }
  },

  // Test cloud connection via REST API
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return { success: false, error: 'Dispositivo offline' };
      }
      const res = await fetch(`${SUPABASE_URL}/rest/v1/user_sync_data?select=*&limit=1`, {
        method: 'GET',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });

      if (!res.ok) {
        const errText = await res.text();
        return { success: false, error: formatSupabaseErrorMessage(errText) };
      }
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: 'Impossibile completare la connessione al momento. Riprova tra qualche istante o verifica la tua connessione.',
      };
    }
  },
};







