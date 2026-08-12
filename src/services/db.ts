import { CbtEntry, Tag } from '../types';

const DB_NAME = 'diario-mente-db';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

export const DEFAULT_TAGS: Omit<Tag, 'id'>[] = [
  // Emozioni
  { label: 'Ansia', category: 'emotion', isCustom: 0 },
  { label: 'Vergogna', category: 'emotion', isCustom: 0 },
  { label: 'Rabbia', category: 'emotion', isCustom: 0 },
  { label: 'Tristezza', category: 'emotion', isCustom: 0 },
  { label: 'Paura', category: 'emotion', isCustom: 0 },
  { label: 'Frustrazione', category: 'emotion', isCustom: 0 },
  { label: 'Colpa', category: 'emotion', isCustom: 0 },
  // Sintomi fisici
  { label: 'Tachicardia', category: 'physical_symptom', isCustom: 0 },
  { label: 'Tensione muscolare', category: 'physical_symptom', isCustom: 0 },
  { label: 'Nausea', category: 'physical_symptom', isCustom: 0 },
  { label: 'Sudorazione', category: 'physical_symptom', isCustom: 0 },
  { label: 'Vertigini', category: 'physical_symptom', isCustom: 0 },
  { label: 'Respiro corto', category: 'physical_symptom', isCustom: 0 },
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

export async function seedDefaultTagsIfNeeded(): Promise<Tag[]> {
  const existingTags = await DB.getAll<Tag>('tags');
  if (existingTags.length > 0) return existingTags;

  const newTags: Tag[] = [];
  for (const tag of DEFAULT_TAGS) {
    const fullTag: Tag = { id: generateUid(), ...tag };
    await DB.put('tags', fullTag);
    newTags.push(fullTag);
  }
  return newTags;
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
