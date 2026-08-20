import { CustomQuestion } from '../types';

const STORAGE_KEY = 'diariamente_custom_questions';

export const DEFAULT_CUSTOM_QUESTIONS: CustomQuestion[] = [
  {
    id: 'default-q-1',
    prompt: 'Per cosa provo gratitudine o apprezzamento sincero oggi?',
    category: 'Gratitudine',
    responseType: 'text',
    frequency: 'daily',
    isEnabled: true,
    isDefault: true,
    createdAt: new Date('2026-01-01T08:00:00.000Z').toISOString(),
    order: 1,
  },
  {
    id: 'default-q-2',
    prompt: 'Come valuto il mio livello di energia e serenità interiore?',
    category: 'Mood',
    responseType: 'scale_10',
    frequency: 'daily',
    isEnabled: true,
    isDefault: true,
    createdAt: new Date('2026-01-01T08:05:00.000Z').toISOString(),
    order: 2,
  },
  {
    id: 'default-q-3',
    prompt: 'Ho dedicato del tempo a un\'attività significativa o a prendermi cura di me?',
    category: 'Crescita',
    responseType: 'boolean',
    frequency: 'daily',
    isEnabled: true,
    isDefault: true,
    createdAt: new Date('2026-01-01T08:10:00.000Z').toISOString(),
    order: 3,
  },
];

export const CustomQuestionsService = {
  /**
   * Load custom questions from localStorage, seeding defaults if empty
   */
  load(): CustomQuestion[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        this.save(DEFAULT_CUSTOM_QUESTIONS);
        return DEFAULT_CUSTOM_QUESTIONS;
      }
      const parsed = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.save(DEFAULT_CUSTOM_QUESTIONS);
        return DEFAULT_CUSTOM_QUESTIONS;
      }
      return parsed;
    } catch (err) {
      console.warn('Error reading custom questions from storage:', err);
      return DEFAULT_CUSTOM_QUESTIONS;
    }
  },

  /**
   * Save questions to localStorage
   */
  save(questions: CustomQuestion[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
      // Dispatch a custom window event so all views listening can update reactively
      window.dispatchEvent(new CustomEvent('custom_questions_updated', { detail: questions }));
    } catch (err) {
      console.error('Error saving custom questions:', err);
    }
  },

  /**
   * Create a new custom question
   */
  create(newQ: Omit<CustomQuestion, 'id' | 'createdAt' | 'isDefault'>): CustomQuestion {
    const list = this.load();
    const created: CustomQuestion = {
      ...newQ,
      id: 'cq-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      isDefault: false,
      order: list.length + 1,
    };
    const updatedList = [...list, created];
    this.save(updatedList);
    return created;
  },

  /**
   * Update an existing question
   */
  update(updated: CustomQuestion): void {
    const list = this.load();
    const index = list.findIndex((q) => q.id === updated.id);
    if (index >= 0) {
      list[index] = { ...updated };
      this.save(list);
    }
  },

  /**
   * Delete a question by ID
   */
  delete(id: string): void {
    const list = this.load();
    const filtered = list.filter((q) => q.id !== id);
    this.save(filtered);
  },

  /**
   * Toggle question enabled/disabled state
   */
  toggle(id: string, isEnabled: boolean): void {
    const list = this.load();
    const item = list.find((q) => q.id === id);
    if (item) {
      item.isEnabled = isEnabled;
      this.save(list);
    }
  },

  /**
   * Reset to default questions
   */
  resetToDefaults(): CustomQuestion[] {
    this.save(DEFAULT_CUSTOM_QUESTIONS);
    return DEFAULT_CUSTOM_QUESTIONS;
  },

  /**
   * Filter active questions that apply to a specific date based on frequency
   */
  getApplicableQuestionsForDate(dateStr?: string): CustomQuestion[] {
    const all = this.load();
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    return all.filter((q) => {
      if (!q.isEnabled) return false;
      if (q.frequency === 'daily') return true;
      if (q.frequency === 'weekdays' && !isWeekend) return true;
      if (q.frequency === 'weekend' && isWeekend) return true;
      return false;
    });
  },
};
