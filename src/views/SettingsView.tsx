import React, { useRef } from 'react';
import { Tag, ThemeMode } from '../types';
import { Lock, Sun, Moon, Download, Upload, Tags, Trash2, ShieldCheck, ChevronRight } from 'lucide-react';
import { CustomDropdown } from '../components/CustomDropdown';

interface SettingsViewProps {
  pinEnabled: boolean;
  onTogglePin: (enabled: boolean) => void;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  allTags: Tag[];
  onDeleteCustomTag: (tagId: string) => Promise<void>;
  onDeleteAllData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  pinEnabled,
  onTogglePin,
  themeMode,
  onThemeChange,
  onExportJson,
  onImportJson,
  allTags,
  onDeleteCustomTag,
  onDeleteAllData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const customTags = allTags.filter((t) => t.isCustom === 1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      e.target.value = '';
    }
  };

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'auto', label: 'Automatico' },
    { value: 'light', label: 'Verde Salvia Chiaro' },
    { value: 'dark', label: 'Dark Mode Profonda' },
  ];

  return (
    <div className="space-y-5 pb-28 animate-fade-in">
      {/* Header */}
      <div className="pt-1">
        <h2 className="text-xl font-black text-[#14241B] dark:text-[#EEF3EF]">Impostazioni</h2>
        <p className="text-xs font-bold text-[#14241B] dark:text-[#D5E0D8] mt-0.5">
          Privacy, sicurezza e gestione dei dati locali
        </p>
      </div>

      {/* Security Section */}
      <div className="glass-panel rounded-[20px] p-5 space-y-4 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-[#5B67CA]/15 text-[#5B67CA] dark:text-[#9CA6DC]">
              <Lock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="block text-sm font-black text-[#14241B] dark:text-[#EEF3EF]">
                Protezione con PIN
              </span>
              <span className="block text-xs font-bold text-[#14241B] dark:text-[#D5E0D8]">
                Richiedi PIN a 4 cifre all'avvio dell'app
              </span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={pinEnabled}
              onChange={(e) => onTogglePin(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#E8EFEA] dark:bg-[#2B3A31] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#C8D4CB] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5B67CA]" />
          </label>
        </div>
      </div>

      {/* Theme Section */}
      <div className="glass-panel rounded-[20px] p-5 space-y-4 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              {themeMode === 'dark' ? <Moon className="w-5 h-5 stroke-[2.5]" /> : <Sun className="w-5 h-5 stroke-[2.5]" />}
            </div>
            <div>
              <span className="block text-sm font-black text-[#14241B] dark:text-[#EEF3EF]">
                Tema Grafico
              </span>
              <span className="block text-xs font-bold text-[#14241B] dark:text-[#D5E0D8]">
                Personalizza lo stile visivo
              </span>
            </div>
          </div>

          <CustomDropdown
            value={themeMode}
            onChange={onThemeChange}
            options={themeOptions}
          />
        </div>
      </div>

      {/* Backup & Data Import/Export */}
      <div className="glass-panel rounded-[20px] p-2 border border-[#C8D4CB] dark:border-[#2B3A31] divide-y divide-[#C8D4CB] dark:divide-[#2B3A31] bg-white dark:bg-[#1B2520]">
        <button
          type="button"
          onClick={onExportJson}
          className="w-full flex items-center justify-between p-3.5 text-left hover:bg-[#E8EFEA] dark:hover:bg-[#2B3A31]/50 active:scale-98 rounded-2xl transition-all duration-150 cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <Download className="w-4 h-4 text-[#5B67CA] dark:text-[#9CA6DC] stroke-[2.5]" />
            <span className="text-xs font-black text-[#14241B] dark:text-[#EEF3EF]">
              Esporta Backup Sicuro (JSON)
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#14241B] dark:text-[#EEF3EF]" />
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-between p-3.5 text-left hover:bg-[#E8EFEA] dark:hover:bg-[#2B3A31]/50 active:scale-98 rounded-2xl transition-all duration-150 cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <Upload className="w-4 h-4 text-[#5B67CA] dark:text-[#9CA6DC] stroke-[2.5]" />
            <span className="text-xs font-black text-[#14241B] dark:text-[#EEF3EF]">
              Importa Backup (JSON)
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#14241B] dark:text-[#EEF3EF]" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="application/json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Custom Tag Management */}
      <div className="glass-panel rounded-[20px] p-5 space-y-3 border border-[#C8D4CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520]">
        <div className="flex items-center space-x-2">
          <Tags className="w-4 h-4 text-[#5B67CA] dark:text-[#9CA6DC] stroke-[2.5]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-[#14241B] dark:text-[#EEF3EF]">
            Tag Personalizzati ({customTags.length})
          </h3>
        </div>

        {customTags.length === 0 ? (
          <p className="text-xs font-bold text-[#14241B] dark:text-[#D5E0D8] italic">Nessun tag personalizzato creato.</p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {customTags.map((tag) => (
              <div
                key={tag.id}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E8EFEA] dark:bg-[#212E27] text-[#14241B] dark:text-[#EEF3EF] border border-[#C8D4CB] dark:border-[#2B3A31]"
              >
                <span>{tag.label}</span>
                <button
                  type="button"
                  onClick={() => onDeleteCustomTag(tag.id)}
                  className="text-[#14241B] dark:text-[#EEF3EF] hover:text-rose-600 p-0.5 rounded-full font-bold cursor-pointer"
                  aria-label={`Elimina tag ${tag.label}`}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="glass-panel rounded-[20px] p-2 border border-rose-500/40 bg-white dark:bg-[#1B2520]">
        <button
          type="button"
          onClick={onDeleteAllData}
          className="w-full flex items-center justify-between p-3.5 text-left text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 active:scale-98 rounded-2xl transition-all duration-150 cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <Trash2 className="w-4 h-4 stroke-[2.5]" />
            <span className="text-xs font-black">Elimina Tutti i Dati Locali</span>
          </div>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Footnote */}
      <div className="flex items-start space-x-2 p-4 text-xs text-[#14241B] dark:text-[#EEF3EF] leading-relaxed rounded-[20px] bg-[#E8EFEA] dark:bg-[#2B3A31]/80 border border-[#C8D4CB] dark:border-[#2B3A31]">
        <ShieldCheck className="w-4 h-4 text-[#2D5C3E] dark:text-[#6A9C78] shrink-0 mt-0.5 stroke-[2.5]" />
        <span>
          <strong className="font-black text-[#14241B] dark:text-[#EEF3EF]">100% Privato & Offline:</strong> Tutti i tuoi dati di diario restano memorizzati esclusivamente all'interno di IndexedDB nel tuo browser. Nessun dato viene inviato a server esterni.
        </span>
      </div>
    </div>
  );
};
