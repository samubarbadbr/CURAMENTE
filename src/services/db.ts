import { CbtEntry, Tag } from '../types';

const DB_NAME = 'diario-mente-db';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

export const DEFAULT_TAGS: Tag[] = [
  // Emozioni
  { id: 'tag-emotion-ansia', label: 'Ansia', category: 'emotion', isCustom: 0 },
  { id: 'tag-emotion-vergogna', label: 'Vergogna', category: 'emotion', isCustom: 0 },
  { id: 'tag-emotion-rabbia', label: 'Rabbia', category: 'emotion', isCustom: 0 },
  { id: 'tag-emotion-tristezza', label: 'Tristezza', category: 'emotion', isCustom: 0 },
  { id: 'tag-emotion-paura', label: 'Paura', category: 'emotion', isCustom: 0 },
  { id: 'tag-emotion-frustrazione', label: 'Frustrazione', category: 'emotion', isCustom: 0 },
  { id: 'tag-emotion-colpa', label: 'Colpa', category: 'emotion', isCustom: 0 },
  // Sintomi fisici
  { id: 'tag-symptom-tachicardia', label: 'Tachicardia', category: 'physical_symptom', isCustom: 0 },
  { id: 'tag-symptom-tensione-muscolare', label: 'Tensione muscolare', category: 'physical_symptom', isCustom: 0 },
  { id: 'tag-symptom-nausea', label: 'Nausea', category: 'physical_symptom', isCustom: 0 },
  { id: 'tag-symptom-sudorazione', label: 'Sudorazione', category: 'physical_symptom', isCustom: 0 },
  { id: 'tag-symptom-vertigini', label: 'Vertigini', category: 'physical_symptom', isCustom: 0 },
  { id: 'tag-symptom-respiro-corto', label: 'Respiro corto', category: 'physical_symptom', isCustom: 0 },
];

export function generateUid(): string {
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

export function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('entries')) {
        const entriesStore = db.createObjectStore('entries', { keyPath: 'id' });
        entriesStore.createIndex('by_datetime', 'eventDatetime', { unique: false });
      }
      if (!db.objectStoreNames.contains('tags')) {
        const tagsStore = db.createObjectStore('tags', { keyPath: 'id' });
        tagsStore.createIndex('by_category', 'category', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = (event: Event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event: Event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T> {
  return openDatabase().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = callback(store);
      tx.oncomplete = () => resolve(request ? request.result : (undefined as unknown as T));
      tx.onerror = () => reject(tx.error);
    });
  });
}

export const DB = {
  async put<T>(storeName: string, value: T): Promise<IDBValidKey> {
    return runTransaction<IDBValidKey>(storeName, 'readwrite', (store) => store.put(value));
  },
  async delete(storeName: string, key: string): Promise<void> {
    return runTransaction<void>(storeName, 'readwrite', (store) => store.delete(key));
  },
  async getAll<T>(storeName: string): Promise<T[]> {
    return runTransaction<T[]>(storeName, 'readonly', (store) => store.getAll());
  },
  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    return runTransaction<T | undefined>(storeName, 'readonly', (store) => store.get(key));
  },
  async clear(storeName: string): Promise<void> {
    return runTransaction<void>(storeName, 'readwrite', (store) => store.clear());
  },
};

export async function cleanupAndDeduplicateTags(): Promise<Tag[]> {
  const existingTags = await DB.getAll<Tag>('tags');
  const allEntries = await DB.getAll<CbtEntry>('entries');

  // Map to group tags by `${category}:${label.toLowerCase().trim()}`
  const groups = new Map<string, Tag[]>();
  for (const tag of existingTags) {
    if (!tag || !tag.label || !tag.category) continue;
    const key = `${tag.category}:${tag.label.trim().toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tag);
  }

  // Ensure all DEFAULT_TAGS are included
  for (const defaultTag of DEFAULT_TAGS) {
    const key = `${defaultTag.category}:${defaultTag.label.trim().toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, [defaultTag]);
    }
  }

  const remapping = new Map<string, string>(); // oldTagId -> canonicalTagId
  const canonicalTags: Tag[] = [];
  const tagsToDelete = new Set<string>();

  for (const [key, tagList] of groups.entries()) {
    const matchingDefault = DEFAULT_TAGS.find(
      (dt) => `${dt.category}:${dt.label.trim().toLowerCase()}` === key
    );

    let canonical: Tag;
    if (matchingDefault) {
      canonical = matchingDefault;
    } else {
      const preferred = tagList.find((t) => t.isCustom === 0) || tagList[0];
      canonical = {
        id: preferred.id || generateUid(),
        label: preferred.label.trim(),
        category: preferred.category,
        isCustom: preferred.isCustom ?? 1,
      };
    }

    canonicalTags.push(canonical);

    // Any tag with different ID in this group must be deleted and remapped
    for (const t of tagList) {
      if (t.id && t.id !== canonical.id) {
        remapping.set(t.id, canonical.id);
        tagsToDelete.add(t.id);
      }
    }
  }

  // Delete duplicate tags from IndexedDB
  for (const idToDelete of tagsToDelete) {
    await DB.delete('tags', idToDelete);
  }

  // Save canonical tags to IndexedDB
  for (const tag of canonicalTags) {
    await DB.put('tags', tag);
  }

  // Remap entry references if any duplicates were cleaned
  if (remapping.size > 0 && allEntries.length > 0) {
    for (const entry of allEntries) {
      let entryChanged = false;

      const newEmotionIds = (entry.emotionTagIds || []).map((id) => {
        if (remapping.has(id)) {
          entryChanged = true;
          return remapping.get(id)!;
        }
        return id;
      });

      const newSymptomIds = (entry.physicalSymptomTagIds || []).map((id) => {
        if (remapping.has(id)) {
          entryChanged = true;
          return remapping.get(id)!;
        }
        return id;
      });

      const uniqueEmotions = Array.from(new Set(newEmotionIds));
      const uniqueSymptoms = Array.from(new Set(newSymptomIds));

      if (
        uniqueEmotions.length !== (entry.emotionTagIds || []).length ||
        uniqueSymptoms.length !== (entry.physicalSymptomTagIds || []).length
      ) {
        entryChanged = true;
      }

      if (entryChanged) {
        entry.emotionTagIds = uniqueEmotions;
        entry.physicalSymptomTagIds = uniqueSymptoms;
        await DB.put('entries', entry);
      }
    }
  }

  return canonicalTags;
}

export async function seedDefaultTagsIfNeeded(): Promise<Tag[]> {
  return cleanupAndDeduplicateTags();
}

export function createBlankEntry(): CbtEntry {
  const nowIso = new Date().toISOString();
  return {
    id: generateUid(),
    createdAt: nowIso,
    eventDatetime: nowIso,
    situation: '',
    triggerFactors: '',
    negativeThought: '',
    thoughtBeliefLevel: 50,
    emotionTagIds: [],
    physicalSymptomTagIds: [],
    physicalSymptomsText: '',
    negativeThoughtsExtended: '',
    negativeThoughtsIntensity: 50,
    bodyFocusedAttentionLevel: 50,
    symptomControlDescription: '',
    symptomControlCount: 0,
    reassuranceSeekingType: '',
    reassuranceSeekingCount: 0,
    avoidanceType: '',
    avoidanceCount: 0,
    overallAnxietyLevel: 50,
    notes: '',
  };
}
