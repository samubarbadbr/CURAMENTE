import React, { useState, useRef, useEffect } from 'react';
import { CbtEntry, Tag, FormTab } from '../types';
import { GradientSlider } from '../components/GradientSlider';
import { CounterInput } from '../components/CounterInput';
import { TagPicker } from '../components/TagPicker';
import { Save, X, Layers, Activity, Camera, Eye, EyeOff, Trash2, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface EntryFormViewProps {
  initialDraft: CbtEntry;
  allTags: Tag[];
  isEditing: boolean;
  onSave: (draft: CbtEntry) => Promise<void>;
  onCancel: () => void;
  onAddCustomTag: (category: 'emotion' | 'physical_symptom', label: string) => Promise<void>;
}

/**
 * Resizes and converts an image file into a compressed Base64 JPEG string
 * for fast local persistence and lightweight Supabase cloud synchronization.
 */
function processImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        resolve(dataUrl);
      };
      img.onerror = () => {
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export const EntryFormView: React.FC<EntryFormViewProps> = ({
  initialDraft,
  allTags,
  isEditing,
  onSave,
  onCancel,
  onAddCustomTag,
}) => {
  const [draft, setDraft] = useState<CbtEntry>({ ...initialDraft });
  const [activeTab, setActiveTab] = useState<FormTab>('section_a');
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isPhotoObscured, setIsPhotoObscured] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Smooth scroll to top on step/section change
  const scrollToTop = () => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      if (document.documentElement) {
        document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
      if (document.body) {
        document.body.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
      const rootContainer = document.querySelector('.app-root-container') || document.querySelector('main');
      if (rootContainer) {
        rootContainer.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
    } catch {
      window.scrollTo(0, 0);
    }
  };

  // Trigger scroll-to-top whenever the active step/tab changes
  useEffect(() => {
    scrollToTop();
  }, [activeTab]);

  const handleSwitchTab = (tab: FormTab) => {
    setActiveTab(tab);
    scrollToTop();
  };

  // Helper to update draft fields
  const updateDraft = <K extends keyof CbtEntry>(field: K, value: CbtEntry[K]) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessingPhoto(true);
      const base64Data = await processImageFile(file);
      updateDraft('photo', base64Data);
    } catch (err) {
      console.error('Error processing photo:', err);
    } finally {
      setIsProcessingPhoto(false);
      // Reset input value so re-selecting same file works
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    updateDraft('photo', undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleToggleTag = (category: 'emotion' | 'physical_symptom', tagId: string) => {
    const listKey = category === 'emotion' ? 'emotionTagIds' : 'physicalSymptomTagIds';
    const currentList = draft[listKey] || [];
    const updated = currentList.includes(tagId)
      ? currentList.filter((id) => id !== tagId)
      : [...currentList, tagId];
    updateDraft(listKey, updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(draft);
    setIsSaving(false);
  };

  // Convert ISO string to datetime-local input string
  const toDatetimeLocalValue = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    } catch {
      return new Date().toISOString().slice(0, 16);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-28 animate-fade-in">
      {/* Header bar */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-black text-[#14241B] dark:text-[#EEF3EF]">
            {isEditing ? 'Modifica Registrazione' : 'Nuova Registrazione'}
          </h2>
          <p className="text-xs font-bold text-[#14241B] dark:text-[#D5E0D8] mt-0.5">
            Registra l'evento, i pensieri e i comportamenti
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="p-2.5 rounded-full text-[#14241B] dark:text-[#EEF3EF] hover:bg-[#E8EFEA] dark:hover:bg-[#2B3A31] active:scale-95 transition-all cursor-pointer"
            aria-label="Annulla"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[#5B67CA] hover:bg-[#4A55B8] text-white text-xs font-semibold shadow-md active:scale-95 transition-all duration-150 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4 stroke-[2.5] text-white" />
            <span className="text-white font-semibold">Salva</span>
          </button>
        </div>
      </div>

      {/* Animated Tab Switcher */}
      <div className="p-1 rounded-[20px] bg-[#E8EFEA] dark:bg-[#1B2520] border border-[#C8D4CB] dark:border-[#2B3A31] flex">
        <button
          type="button"
          onClick={() => handleSwitchTab('section_a')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all duration-150 flex items-center justify-center space-x-1.5 active:scale-98 cursor-pointer ${
            activeTab === 'section_a'
              ? 'bg-white dark:bg-[#212E27] text-[#14241B] dark:text-[#EEF3EF] shadow-sm border border-[#C8D4CB] dark:border-[#2B3A31]'
              : 'text-[#14241B] dark:text-[#A7B6AC] hover:text-[#14241B] dark:hover:text-[#EEF3EF]'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-[#5B67CA] dark:text-[#9CA6DC]" />
          <span>Sezione A: Analisi Rapida</span>
        </button>
        <button
          type="button"
          onClick={() => handleSwitchTab('section_b')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all duration-150 flex items-center justify-center space-x-1.5 active:scale-98 cursor-pointer ${
            activeTab === 'section_b'
              ? 'bg-white dark:bg-[#212E27] text-[#14241B] dark:text-[#EEF3EF] shadow-sm border border-[#C8D4CB] dark:border-[#2B3A31]'
              : 'text-[#14241B] dark:text-[#A7B6AC] hover:text-[#14241B] dark:hover:text-[#EEF3EF]'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-[#2D5C3E] dark:text-[#6A9C78]" />
          <span>Sezione B: Approfondito</span>
        </button>
      </div>

      {/* SEZIONE A: Analisi Rapida */}
      {activeTab === 'section_a' && (
        <div className="space-y-4 animate-fade-in">
          {/* Data e ora */}
          <div className="glass-panel rounded-[20px] p-4 space-y-2 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
            <label className="block text-xs font-black uppercase tracking-wider text-[#14241B] dark:text-[#EEF3EF]">
              DATA E ORA DELL'EVENTO
            </label>
            <input
              type="datetime-local"
              required
              value={toDatetimeLocalValue(draft.eventDatetime)}
              onChange={(e) => updateDraft('eventDatetime', new Date(e.target.value).toISOString())}
              className="w-full px-3.5 py-2.5 text-sm font-bold rounded-xl border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] text-[#14241B] dark:text-[#EEF3EF] focus:ring-2 focus:ring-[#5B67CA] outline-none cursor-pointer"
            />
          </div>

          {/* Situazione con Caricamento Foto */}
          <div className="glass-panel rounded-[20px] p-4 space-y-3.5 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
            <label className="block text-xs font-black uppercase tracking-wider text-[#14241B] dark:text-[#EEF3EF]">
              Situazione (Dove ti trovavi? Con chi?)
            </label>
            <textarea
              rows={3}
              value={draft.situation}
              onChange={(e) => updateDraft('situation', e.target.value)}
              placeholder="Descrivi cosa stava succedendo in quel momento..."
              className="w-full px-3.5 py-2.5 text-sm font-bold rounded-xl border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] text-[#14241B] dark:text-[#EEF3EF] focus:ring-2 focus:ring-[#5B67CA] outline-none resize-none placeholder:text-[#6C7A72] dark:placeholder:text-[#A7B6AC]"
            />

            {/* SEZIONE FOTO STILIZZATA */}
            <div className="pt-2 border-t border-[#E8EFEA] dark:border-[#2B3A31]/60 space-y-3">
              {/* Native hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                id="situation-photo-upload"
              />

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-1.5 text-[11px] font-bold text-[#14241B] dark:text-[#EEF3EF]">
                  <ImageIcon className="w-3.5 h-3.5 text-[#5B67CA] dark:text-[#9CA6DC]" />
                  <span>Foto della Situazione (Opzionale)</span>
                </div>

                {/* Stylish Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessingPhoto}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E8EFEA] dark:bg-[#2B3A31] text-[#14241B] dark:text-[#EEF3EF] border border-[#C8D4CB] dark:border-[#2B3A31] hover:bg-[#5B67CA] hover:text-white dark:hover:bg-[#5B67CA] transition-all duration-150 active:scale-95 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#5B67CA] dark:text-[#9CA6DC] group-hover:text-white" />
                    <span>{draft.photo ? 'Cambia Foto' : 'Allega o Scatta Foto'}</span>
                  </button>

                  {draft.photo && (
                    <button
                      type="button"
                      onClick={() => setIsPhotoObscured(!isPhotoObscured)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#E8EFEA] dark:bg-[#2B3A31] text-[#14241B] dark:text-[#EEF3EF] border border-[#C8D4CB] dark:border-[#2B3A31] hover:bg-[#5B67CA] hover:text-white transition-all duration-150 active:scale-95 cursor-pointer shadow-sm"
                      title={isPhotoObscured ? 'Mostra foto' : 'Oscura / Sfoca foto per privacy'}
                      aria-label="Nascondi o mostra foto"
                    >
                      {isPhotoObscured ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[11px]">Mostra</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          <span className="text-[11px]">Oscura</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Photo Preview Container */}
              {isProcessingPhoto && (
                <div className="p-4 rounded-xl border border-dashed border-[#5B67CA] bg-[#5B67CA]/5 text-center text-xs font-bold text-[#5B67CA] animate-pulse">
                  Elaborazione e ottimizzazione foto in corso...
                </div>
              )}

              {draft.photo && !isProcessingPhoto && (
                <div className="relative rounded-2xl overflow-hidden border border-[#C8D4CB] dark:border-[#2B3A31] bg-black/5 dark:bg-black/30 flex items-center justify-center min-h-[140px] max-h-[320px]">
                  <img
                    src={draft.photo}
                    alt="Foto situazione allegata"
                    className={`w-full max-h-[320px] object-contain rounded-2xl transition-all duration-200 ${
                      isPhotoObscured ? 'filter blur-xl opacity-20 scale-105 select-none pointer-events-none' : 'filter-none opacity-100'
                    }`}
                  />

                  {/* Privacy shield overlay */}
                  {isPhotoObscured && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/40 backdrop-blur-sm text-white">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-2 backdrop-blur-md">
                        <EyeOff className="w-5 h-5 text-white" />
                      </div>
                      <p className="text-xs font-bold text-white text-center drop-shadow-sm">
                        Foto oscurata per proteggere la tua privacy
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsPhotoObscured(false)}
                        className="mt-2.5 px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold backdrop-blur transition-all active:scale-95 cursor-pointer"
                      >
                        Tocca l'icona o qui per mostrare
                      </button>
                    </div>
                  )}

                  {/* Top-Right Quick Remove Button */}
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 hover:bg-rose-600 text-white shadow-md transition-all active:scale-95 cursor-pointer z-10"
                    title="Elimina foto"
                    aria-label="Rimuovi foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Trigger */}
          <div className="glass-panel rounded-[20px] p-4 space-y-2 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
            <label className="block text-xs font-black uppercase tracking-wider text-[#14241B] dark:text-[#EEF3EF]">
              Fattori Scatenanti / Trigger
            </label>
            <textarea
              rows={2}
              value={draft.triggerFactors}
              onChange={(e) => updateDraft('triggerFactors', e.target.value)}
              placeholder="Cosa ha innescato l'episodio o la reazione?"
              className="w-full px-3.5 py-2.5 text-sm font-bold rounded-xl border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] text-[#14241B] dark:text-[#EEF3EF] focus:ring-2 focus:ring-[#5B67CA] outline-none resize-none placeholder:text-[#6C7A72] dark:placeholder:text-[#A7B6AC]"
            />
          </div>

          {/* Emozioni Tag Picker */}
          <div className="glass-panel rounded-[20px] p-4 space-y-3 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
            <label className="block text-xs font-black uppercase tracking-wider text-[#14241B] dark:text-[#EEF3EF]">
              Emozioni Provate
            </label>
            <TagPicker
              category="emotion"
              allTags={allTags}
              selectedTagIds={draft.emotionTagIds}
              onToggleTag={(id) => handleToggleTag('emotion', id)}
              onAddCustomTag={onAddCustomTag}
              placeholder="Aggiungi altra emozione..."
            />
          </div>

          {/* Pensiero Negativo & Slider Convinzione */}
          <div className="glass-panel rounded-[20px] p-4 space-y-4 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-[#14241B] dark:text-[#EEF3EF]">
                Pensiero Negativo Automatico
              </label>
              <textarea
                rows={2}
                value={draft.negativeThought}
                onChange={(e) => updateDraft('negativeThought', e.target.value)}
                placeholder="Quale pensiero si è affacciato alla mente?"
                className="w-full px-3.5 py-2.5 text-sm font-bold rounded-xl border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] text-[#14241B] dark:text-[#EEF3EF] focus:ring-2 focus:ring-[#5B67CA] outline-none resize-none placeholder:text-[#6C7A72] dark:placeholder:text-[#A7B6AC]"
              />
            </div>

            <GradientSlider
              label="Grado di convinzione del pensiero"
              sublabel="Quanto credevi a questo pensiero in quel momento? (0-100)"
              value={draft.thoughtBeliefLevel}
              onChange={(val) => updateDraft('thoughtBeliefLevel', val)}
            />
          </div>

          {/* Continue to Section B prompt button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleSwitchTab('section_b')}
              className="w-full py-3.5 rounded-[20px] bg-[#E8EFEA] dark:bg-[#2B3A31] border border-[#C8D4CB] dark:border-[#2B3A31] text-[#14241B] dark:text-[#EEF3EF] text-xs font-black hover:bg-[#5B67CA] hover:text-white dark:hover:bg-[#5B67CA] transition-all duration-150 active:scale-98 flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <span>Passa a Sezione B (Sintomi & Comportamenti)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SEZIONE B: Monitoraggio Approfondito */}
      {activeTab === 'section_b' && (
        <div className="space-y-4 animate-fade-in">
          {/* Sintomi Fisici */}
          <div className="glass-panel rounded-[20px] p-4 space-y-3 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
            <label className="block text-xs font-black uppercase tracking-wider text-[#14241B] dark:text-[#EEF3EF]">
              Sintomi Fisici Avvertiti
            </label>
            <TagPicker
              category="physical_symptom"
              allTags={allTags}
              selectedTagIds={draft.physicalSymptomTagIds}
              onToggleTag={(id) => handleToggleTag('physical_symptom', id)}
              onAddCustomTag={onAddCustomTag}
              placeholder="Aggiungi altro sintomo..."
            />
            <textarea
              rows={2}
              value={draft.physicalSymptomsText}
              onChange={(e) => updateDraft('physicalSymptomsText', e.target.value)}
              placeholder="Dettagli aggiuntivi sulle sensazioni corporee..."
              className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] text-[#14241B] dark:text-[#EEF3EF] focus:ring-2 focus:ring-[#5B67CA] outline-none resize-none placeholder:text-[#6C7A72] dark:placeholder:text-[#A7B6AC]"
            />
          </div>

          {/* Pensieri Negativi Estesi + Intensità */}
          <div className="glass-panel rounded-[20px] p-4 space-y-4 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase tracking-wider text-[#14241B] dark:text-[#EEF3EF]">
                Pensieri Negativi (Descrizione Estesa)
              </label>
              <textarea
                rows={3}
                value={draft.negativeThoughtsExtended}
                onChange={(e) => updateDraft('negativeThoughtsExtended', e.target.value)}
                placeholder="Approfondisci i pensieri negativi o catastrofici ricorrenti..."
                className="w-full px-3.5 py-2.5 text-sm font-bold rounded-xl border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] text-[#14241B] dark:text-[#EEF3EF] focus:ring-2 focus:ring-[#5B67CA] outline-none resize-none placeholder:text-[#6C7A72] dark:placeholder:text-[#A7B6AC]"
              />
            </div>

            <GradientSlider
              label="Intensità / Frequenza dei pensieri"
              value={draft.negativeThoughtsIntensity}
              onChange={(val) => updateDraft('negativeThoughtsIntensity', val)}
            />
          </div>

          {/* Attenzione Corporea */}
          <div className="glass-panel rounded-[20px] p-4 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
            <GradientSlider
              label="Attenzione focalizzata sul corpo"
              sublabel="Quanto eri concentrato/a nell'ascolto dei sintomi fisici?"
              value={draft.bodyFocusedAttentionLevel}
              onChange={(val) => updateDraft('bodyFocusedAttentionLevel', val)}
            />
          </div>

          {/* Controllo Sintomi */}
          <div className="glass-panel rounded-[20px] p-4 space-y-3 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
            <label className="block text-xs font-black uppercase tracking-wider text-[#14241B] dark:text-[#EEF3EF]">
              Controllo dei Sintomi
            </label>
            <textarea
              rows={2}
              value={draft.symptomControlDescription}
              onChange={(e) => updateDraft('symptomControlDescription', e.target.value)}
              placeholder="Quali azioni di controllo hai effettuato? (es. misurare il battito)"
              className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] text-[#14241B] dark:text-[#EEF3EF] focus:ring-2 focus:ring-[#5B67CA] outline-none resize-none placeholder:text-[#6C7A72] dark:placeholder:text-[#A7B6AC]"
            />
            <CounterInput
              label="Numero di check o misurazioni"
              value={draft.symptomControlCount}
              onChange={(val) => updateDraft('symptomControlCount', val)}
            />
          </div>

          {/* Ricerca Rassicurazioni */}
          <div className="glass-panel rounded-[20px] p-4 space-y-3 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
            <label className="block text-xs font-black uppercase tracking-wider text-[#14241B] dark:text-[#EEF3EF]">
              Ricerca di Rassicurazioni
            </label>
            <input
              type="text"
              value={draft.reassuranceSeekingType}
              onChange={(e) => updateDraft('reassuranceSeekingType', e.target.value)}
              placeholder="Tipo di richiesta (es. chiedere conferme ai familiari, internet...)"
              className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] text-[#14241B] dark:text-[#EEF3EF] focus:ring-2 focus:ring-[#5B67CA] outline-none placeholder:text-[#6C7A72] dark:placeholder:text-[#A7B6AC]"
            />
            <CounterInput
              label="Numero di volte"
              value={draft.reassuranceSeekingCount}
              onChange={(val) => updateDraft('reassuranceSeekingCount', val)}
            />
          </div>

          {/* Evitamenti */}
          <div className="glass-panel rounded-[20px] p-4 space-y-3 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
            <label className="block text-xs font-black uppercase tracking-wider text-[#14241B] dark:text-[#EEF3EF]">
              Evitamenti
            </label>
            <input
              type="text"
              value={draft.avoidanceType}
              onChange={(e) => updateDraft('avoidanceType', e.target.value)}
              placeholder="Situazione o luogo evitato..."
              className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] text-[#14241B] dark:text-[#EEF3EF] focus:ring-2 focus:ring-[#5B67CA] outline-none placeholder:text-[#6C7A72] dark:placeholder:text-[#A7B6AC]"
            />
            <CounterInput
              label="Numero di evitamenti"
              value={draft.avoidanceCount}
              onChange={(val) => updateDraft('avoidanceCount', val)}
            />
          </div>

          {/* Ansia Complessiva */}
          <div className="glass-panel rounded-[20px] p-5 border border-[#5B67CA] bg-white dark:bg-[#1B2520]">
            <GradientSlider
              label="Ansia complessiva percepita"
              sublabel="Valuta il livello globale di ansia in questa situazione (0-100)"
              size="lg"
              value={draft.overallAnxietyLevel}
              onChange={(val) => updateDraft('overallAnxietyLevel', val)}
            />
          </div>

          {/* Note */}
          <div className="glass-panel rounded-[20px] p-4 space-y-2 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
            <label className="block text-xs font-black uppercase tracking-wider text-[#14241B] dark:text-[#EEF3EF]">
              Note Aggiuntive
            </label>
            <textarea
              rows={2}
              value={draft.notes}
              onChange={(e) => updateDraft('notes', e.target.value)}
              placeholder="Altre osservazioni per te o la psicologa..."
              className="w-full px-3.5 py-2 text-xs font-bold rounded-xl border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] text-[#14241B] dark:text-[#EEF3EF] focus:ring-2 focus:ring-[#5B67CA] outline-none resize-none placeholder:text-[#6C7A72] dark:placeholder:text-[#A7B6AC]"
            />
          </div>

          {/* Navigation & Save Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleSwitchTab('section_a')}
              className="py-3 px-4 rounded-[20px] bg-[#E8EFEA] dark:bg-[#2B3A31] border border-[#C8D4CB] dark:border-[#2B3A31] text-[#14241B] dark:text-[#EEF3EF] text-xs font-black hover:bg-[#5B67CA] hover:text-white dark:hover:bg-[#5B67CA] transition-all duration-150 active:scale-98 flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>← Torna a Sezione A (Analisi Rapida)</span>
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary flex-1 py-3.5 min-h-[48px] rounded-full bg-[#5B67CA] hover:bg-[#4A55B8] text-white text-sm font-bold shadow-md active:scale-98 transition-all duration-150 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Save className="w-4 h-4 stroke-[2.5] text-white" />
              <span className="text-white font-bold">Salva Registrazione</span>
            </button>
          </div>
        </div>
      )}
    </form>
  );
};
