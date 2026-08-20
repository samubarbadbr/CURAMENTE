export interface Tag {
  id: string;
  label: string;
  category: 'emotion' | 'physical_symptom';
  isCustom: number; // 0 or 1
}

export type QuestionCategory =
  | 'Gratitudine'
  | 'Crescita'
  | 'Mood'
  | 'Lavoro'
  | 'Salute'
  | 'Riflessione'
  | 'Altro';

export type QuestionResponseType = 'text' | 'scale_5' | 'scale_10' | 'boolean';

export type QuestionFrequency = 'daily' | 'weekdays' | 'weekend';

export interface CustomQuestion {
  id: string;
  prompt: string;
  category: QuestionCategory;
  responseType: QuestionResponseType;
  frequency: QuestionFrequency;
  isEnabled: boolean; // On/Off toggle
  isDefault?: boolean;
  createdAt: string;
  order?: number;
}

export interface CbtEntry {
  id: string;
  createdAt: string;
  eventDatetime: string;
  situation: string;
  triggerFactors: string;
  negativeThought: string;
  thoughtBeliefLevel: number; // 0-100
  emotionTagIds: string[];
  physicalSymptomTagIds: string[];
  physicalSymptomsText: string;
  negativeThoughtsExtended: string;
  negativeThoughtsIntensity: number; // 0-100
  bodyFocusedAttentionLevel: number; // 0-100
  symptomControlDescription: string;
  symptomControlCount: number;
  reassuranceSeekingType: string;
  reassuranceSeekingCount: number;
  avoidanceType: string;
  avoidanceCount: number;
  overallAnxietyLevel: number; // 0-100
  photo?: string; // Base64 encoded image for multi-device sync
  notes: string;
  customAnswers?: Record<string, string | number | boolean>;
}

export interface AppSettings {
  key: string;
  value: any;
}

export type ViewType = 'timeline' | 'entry' | 'detail' | 'dashboard' | 'custom_questions' | 'settings';
export type FormTab = 'section_a' | 'section_b';
export type PeriodFilter = '7' | '14' | '30' | '90' | 'all';
export type ThemeMode = 'cyber' | 'minimal' | 'midnight' | 'earth' | 'violet' | 'auto';

