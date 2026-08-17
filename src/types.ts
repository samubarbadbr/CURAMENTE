export interface Tag {
  id: string;
  label: string;
  category: 'emotion' | 'physical_symptom';
  isCustom: number; // 0 or 1
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
}

export interface AppSettings {
  key: string;
  value: any;
}

export type ViewType = 'timeline' | 'entry' | 'detail' | 'dashboard' | 'settings';
export type FormTab = 'section_a' | 'section_b';
export type PeriodFilter = '7' | '14' | '30' | '90' | 'all';
export type ThemeMode = 'cyber' | 'minimal' | 'midnight' | 'earth' | 'violet' | 'auto';
