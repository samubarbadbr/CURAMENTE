import { CbtEntry } from '../types';

export const DRAFT_STORAGE_KEY = 'diariamente_draft';

export interface DraftStorageData {
  draft: CbtEntry;
  isEditing?: boolean;
  editingEntryId?: string | null;
  savedAt: string;
}

/**
 * Checks if an entry has meaningful content or is still completely empty.
 */
export function isDraftEmpty(draft?: CbtEntry | null): boolean {
  if (!draft) return true;

  const hasSituation = Boolean(draft.situation && draft.situation.trim().length > 0);
  const hasNegativeThought = Boolean(draft.negativeThought && draft.negativeThought.trim().length > 0);
  const hasNotes = Boolean(draft.notes && draft.notes.trim().length > 0);
  const hasAudio = Boolean(draft.audioNote);
  const hasPhoto = Boolean(draft.photo);
  const hasEmotions = Boolean(draft.emotionTagIds && draft.emotionTagIds.length > 0);
  const hasSymptoms = Boolean(draft.physicalSymptomTagIds && draft.physicalSymptomTagIds.length > 0);
  const hasCustomAnswers = Boolean(
    draft.customAnswers &&
      Object.values(draft.customAnswers).some(
        (val) => val !== undefined && val !== null && String(val).trim().length > 0
      )
  );
  const hasTrigger = Boolean(draft.triggerFactors && draft.triggerFactors.trim().length > 0);
  const hasNegativeExtended = Boolean(
    draft.negativeThoughtsExtended && draft.negativeThoughtsExtended.trim().length > 0
  );
  const hasBehaviors = Boolean(
    (draft.symptomControlDescription && draft.symptomControlDescription.trim().length > 0) ||
      (draft.reassuranceSeekingType && draft.reassuranceSeekingType.trim().length > 0) ||
      (draft.avoidanceType && draft.avoidanceType.trim().length > 0)
  );

  return (
    !hasSituation &&
    !hasNegativeThought &&
    !hasNotes &&
    !hasAudio &&
    !hasPhoto &&
    !hasEmotions &&
    !hasSymptoms &&
    !hasCustomAnswers &&
    !hasTrigger &&
    !hasNegativeExtended &&
    !hasBehaviors
  );
}

/**
 * Saves the current draft to LocalStorage in real time.
 */
export function saveDraftToStorage(
  draft: CbtEntry,
  isEditing = false,
  editingEntryId: string | null = null
): void {
  try {
    const payload: DraftStorageData = {
      draft,
      isEditing,
      editingEntryId,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Impossibile salvare la bozza in localStorage:', err);
  }
}

/**
 * Restores the saved draft from LocalStorage if available.
 */
export function loadDraftFromStorage(): DraftStorageData | null {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      if ('draft' in parsed && parsed.draft && typeof parsed.draft === 'object') {
        return parsed as DraftStorageData;
      } else if ('eventDatetime' in parsed || 'situation' in parsed) {
        return {
          draft: parsed as CbtEntry,
          savedAt: new Date().toISOString(),
        };
      }
    }
    return null;
  } catch (err) {
    console.warn('Impossibile recuperare la bozza da localStorage:', err);
    return null;
  }
}

/**
 * Clears the saved draft from LocalStorage upon saving or discarding.
 */
export function clearDraftFromStorage(): void {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch (err) {
    console.warn('Impossibile eliminare la bozza da localStorage:', err);
  }
}

/**
 * Checks whether a non-empty draft currently exists in LocalStorage.
 */
export function hasSavedDraft(): boolean {
  try {
    const saved = loadDraftFromStorage();
    return Boolean(saved && saved.draft && !isDraftEmpty(saved.draft));
  } catch {
    return false;
  }
}
