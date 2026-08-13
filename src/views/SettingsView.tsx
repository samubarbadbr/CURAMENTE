import React, { useRef, useState } from 'react';
import { Tag, ThemeMode } from '../types';
import {
  Lock,
  Palette,
  Download,
  Upload,
  Tags,
  Trash2,
  ShieldCheck,
  ChevronRight,
  FileText,
  Table,
  Smartphone,
  Monitor,
  ArrowLeftRight,
  CheckCircle2,
  Cloud,
  RefreshCw,
  KeyRound
} from 'lucide-react';
import { CustomDropdown } from '../components/CustomDropdown';

interface SettingsViewProps {
  pinEnabled: boolean;
  onTogglePin: (enabled: boolean) => void;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  syncPin?: string;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt?: string | null;
  onSaveSyncPin?: (pin: string) => Promise<void>;
  onManualSyncPush?: () => Promise<void>;
  onManualSyncPull?: () => Promise<void>;
  onExportJson: () => void;
  onExportTxt: () => void;
  onExportCsv: () => void;
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
  syncPin = '',
  syncStatus = 'idle',
  lastSyncedAt,
  onSaveSyncPin,
  onManualSyncPush,
  onManualSyncPull,
  onExportJson,
  onExportTxt,
  onExportCsv,
  onImportJson,
  allTags,
  onDeleteCustomTag,
  onDeleteAllData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pinInput, setPinInput] = useState(syncPin);
  const [isEditingPin, setIsEditingPin] = useState(!syncPin);

  const customTags = allTags.filter((t) => t.isCustom === 1);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      e.target.value = '';
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim() || pinInput.trim().length < 3) return;
    if (onSaveSyncPin) {
      await onSaveSyncPin(pinInput.trim());
    }
    setIsEditingPin(false);
  };

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'light', label: 'Verde Salvia' },
    { value: 'dark', label: 'Scuro Notte' },
    { value: 'lavender', label: 'Lilla Mente' },
    { value: 'ocean', label: 'Oceano Profondo' },
    { value: 'auto', label: 'Automatico' },
  ];

  return (
    <div className="space-y-5 pb-28 animate-fade-in">
      {/* Page Header */}
      <div className="pt-1">
        <h2 className="text-2xl font-black text-[#15251C] dark:text-[#EEF3EF]">Impostazioni</h2>
        <p className="text-xs font-bold text-[#2C3E35] dark:text-[#D5E0D8] mt-0.5">
          Gestione sincronizzazione cloud, backup dati, temi, tag e sicurezza
        </p>
      </div>

      {/* SUPABASE CLOUD SYNC SECTION */}
      <div className="glass-panel rounded-[22px] p-5 space-y-4 border-2 border-[#5B67CA]/40 bg-white dark:bg-[#1B2520] shadow-md relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-[#5B67CA] text-white shadow-sm shrink-0">
              <Cloud className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="block text-base font-black text-[#15251C] dark:text-[#EEF3EF]">
                Sincronizzazione Cloud Supabase
              </span>
              <span className="block text-xs font-bold text-[#2C3E35] dark:text-[#D5E0D8]">
                Condividi in automatico il diario tra PC e Smartphone via PIN
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0 bg-[#EBF0EC] dark:bg-[#212E27] px-2.5 py-1.5 rounded-xl border border-[#C8D5CB] dark:border-[#2B3A31]">
            <Monitor className="w-4 h-4 text-[#5B67CA] dark:text-[#9CA6DC]" />
            <span className="text-[11px] font-black text-[#15251C] dark:text-[#EEF3EF]">↔</span>
            <Smartphone className="w-4 h-4 text-[#5B67CA] dark:text-[#9CA6DC]" />
          </div>
        </div>

        {/* PIN Box */}
        <div className="p-4 rounded-2xl bg-[#EBF0EC] dark:bg-[#212E27] border border-[#C8D5CB] dark:border-[#2B3A31] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-[#5B67CA] dark:text-[#9CA6DC]" />
              <span className="text-xs font-black uppercase tracking-wider text-[#15251C] dark:text-[#EEF3EF]">
                PIN Personale Sincronizzazione Cloud:
              </span>
            </div>
            {syncPin && !isEditingPin && (
              <button
                type="button"
                onClick={() => setIsEditingPin(true)}
                className="text-[11px] font-black text-[#5B67CA] dark:text-[#9CA6DC] hover:underline cursor-pointer"
              >
                Cambia PIN
              </button>
            )}
          </div>

          {isEditingPin ? (
            <form onSubmit={handlePinSubmit} className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Inserisci PIN (es. 4829)"
                  maxLength={12}
                  className="flex-1 px-3.5 py-2.5 text-sm font-black tracking-widest rounded-xl border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] text-[#15251C] dark:text-[#EEF3EF] focus:outline-none focus:ring-2 focus:ring-[#5B67CA]"
                />
                <button
                  type="submit"
                  disabled={!pinInput.trim() || pinInput.trim().length < 3}
                  className="px-4 py-2.5 text-xs font-black rounded-xl bg-[#5B67CA] text-white hover:bg-[#4A55B8] transition-all disabled:opacity-40 cursor-pointer shadow-sm shrink-0"
                >
                  Salva &amp; Sincronizza PIN
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
                  setPinInput(randomPin);
                }}
                className="text-[11px] font-bold text-[#5B67CA] dark:text-[#9CA6DC] hover:underline cursor-pointer"
              >
                ⚡ Genera PIN casuale a 4 cifre
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <span className="text-base font-black text-[#5B67CA] dark:text-[#9CA6DC] tracking-widest bg-white dark:bg-[#1B2520] px-4 py-1.5 rounded-xl border-2 border-[#5B67CA]/40 shadow-inner">
                  {syncPin}
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Collegato a Supabase
                </span>
              </div>

              {lastSyncedAt && (
                <div className="text-[11px] font-bold text-[#2C3E35] dark:text-[#D5E0D8]">
                  Ultimo aggiornamento: {new Date(lastSyncedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sync Buttons */}
        {syncPin && (
          <div className="pt-1 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (onManualSyncPush) await onManualSyncPush();
                }}
                disabled={syncStatus === 'syncing'}
                className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#5B67CA] hover:bg-[#4A55B8] text-white text-sm font-black transition-all active:scale-98 shadow-md cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>{syncStatus === 'syncing' ? 'Invio...' : '⬆️ Invia Dati a Supabase'}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (onManualSyncPull) await onManualSyncPull();
                }}
                disabled={syncStatus === 'syncing'}
                className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black transition-all active:scale-98 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Download className={`w-4 h-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>{syncStatus === 'syncing' ? 'Scaricamento...' : '⬇️ Scarica Dati dal Cloud'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BACKUP & DATA TRANSFER SECTION */}
      <div className="glass-panel rounded-[22px] p-5 space-y-4 border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] shadow-sm relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-[#5B67CA]/15 text-[#5B67CA] dark:text-[#9CA6DC] border border-[#5B67CA]/30 shrink-0">
              <ArrowLeftRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="block text-base font-black text-[#15251C] dark:text-[#EEF3EF]">
                Backup e Trasferimento File JSON
              </span>
              <span className="block text-xs font-bold text-[#2C3E35] dark:text-[#D5E0D8]">
                Esporta o carica un file di backup per salvare i tuoi dati offline
              </span>
            </div>
          </div>
        </div>

        {/* TWO PRIMARY ACTION BUTTONS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Button 1: Download JSON Backup */}
          <button
            type="button"
            onClick={onExportJson}
            className="flex flex-col items-start justify-between p-4 rounded-2xl bg-[#5B67CA] hover:bg-[#4A55B8] text-white transition-all active:scale-98 shadow-md cursor-pointer text-left border border-[#5B67CA]/50 group"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="p-2 rounded-xl bg-white/20 text-white">
                <Download className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-white">
                Consigliato
              </span>
            </div>
            <div>
              <span className="block text-sm font-black text-white leading-tight">
                Scarica File di Backup (.json)
              </span>
              <span className="block text-[11px] font-semibold text-white/80 mt-1">
                Salva subito tutti i dati del diario in un file ripristinabile.
              </span>
            </div>
          </button>

          {/* Button 2: Upload JSON Backup */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-start justify-between p-4 rounded-2xl bg-[#EBF0EC] dark:bg-[#212E27] hover:bg-[#DCE5DE] dark:hover:bg-[#2B3A31] text-[#15251C] dark:text-[#EEF3EF] border-2 border-[#5B67CA]/40 transition-all active:scale-98 shadow-sm cursor-pointer text-left group"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="p-2 rounded-xl bg-[#5B67CA]/15 text-[#5B67CA] dark:text-[#9CA6DC]">
                <Upload className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#5B67CA]/15 text-[#5B67CA] dark:text-[#9CA6DC] px-2 py-0.5 rounded-full">
                Ripristino
              </span>
            </div>
            <div>
              <span className="block text-sm font-black text-[#15251C] dark:text-[#EEF3EF] leading-tight">
                Carica File di Backup
              </span>
              <span className="block text-[11px] font-bold text-[#2C3E35] dark:text-[#D5E0D8] mt-1">
                Seleziona il file .json per ripristinare o sincronizzare in 1 sec.
              </span>
            </div>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Additional Formats Header */}
        <div className="pt-2 border-t border-[#C8D5CB] dark:border-[#2B3A31]">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#2C3E35] dark:text-[#D5E0D8] block mb-2">
            Altri Formati di Esportazione
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onExportTxt}
              className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1B2520] hover:bg-[#EBF0EC] dark:hover:bg-[#2B3A31] border border-[#C8D5CB] dark:border-[#2B3A31] text-left transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5] shrink-0" />
                <div>
                  <span className="block text-xs font-black text-[#15251C] dark:text-[#EEF3EF]">
                    Registro Leggibile (.TXT)
                  </span>
                  <span className="block text-[10px] font-bold text-[#2C3E35] dark:text-[#D5E0D8]">
                    Testo per lettura e stampa
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#15251C] dark:text-[#EEF3EF]" />
            </button>

            <button
              type="button"
              onClick={onExportCsv}
              className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#1B2520] hover:bg-[#EBF0EC] dark:hover:bg-[#2B3A31] border border-[#C8D5CB] dark:border-[#2B3A31] text-left transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <Table className="w-4 h-4 text-amber-600 dark:text-amber-400 stroke-[2.5] shrink-0" />
                <div>
                  <span className="block text-xs font-black text-[#15251C] dark:text-[#EEF3EF]">
                    Fogli di Calcolo (.CSV)
                  </span>
                  <span className="block text-[10px] font-bold text-[#2C3E35] dark:text-[#D5E0D8]">
                    Compatibile con Excel e Google
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#15251C] dark:text-[#EEF3EF]" />
            </button>
          </div>
        </div>
      </div>

      {/* SECURITY SECTION */}
      <div className="glass-panel rounded-[20px] p-5 space-y-4 border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-[#5B67CA]/15 text-[#5B67CA] dark:text-[#9CA6DC] border border-[#5B67CA]/30">
              <Lock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="block text-sm font-black text-[#15251C] dark:text-[#EEF3EF]">
                Protezione con PIN dell'App
              </span>
              <span className="block text-xs font-bold text-[#2C3E35] dark:text-[#D5E0D8]">
                Richiedi PIN a 4 cifre all'avvio dell'applicazione
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
            <div className="w-11 h-6 bg-[#EBF0EC] dark:bg-[#2B3A31] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#C8D5CB] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5B67CA]" />
          </label>
        </div>
      </div>

      {/* THEME SECTION */}
      <div className="glass-panel rounded-[20px] p-5 space-y-4 border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
              <Palette className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="block text-sm font-black text-[#15251C] dark:text-[#EEF3EF]">
                Tema Grafico
              </span>
              <span className="block text-xs font-bold text-[#2C3E35] dark:text-[#D5E0D8]">
                Scegli la palette di colori dell'interfaccia
              </span>
            </div>
          </div>

          <div className="w-full sm:w-auto">
            <CustomDropdown
              value={themeMode}
              onChange={onThemeChange}
              options={themeOptions}
              className="w-full sm:w-48"
            />
          </div>
        </div>
      </div>

      {/* CUSTOM TAG MANAGEMENT */}
      <div className="glass-panel rounded-[20px] p-5 space-y-3 border border-[#C8D5CB] dark:border-[#2B3A31] bg-white dark:bg-[#1B2520] shadow-sm">
        <div className="flex items-center space-x-2">
          <Tags className="w-4 h-4 text-[#5B67CA] dark:text-[#9CA6DC] stroke-[2.5]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-[#15251C] dark:text-[#EEF3EF]">
            Tag Personalizzati ({customTags.length})
          </h3>
        </div>

        {customTags.length === 0 ? (
          <p className="text-xs font-bold text-[#2C3E35] dark:text-[#D5E0D8] italic">Nessun tag personalizzato creato.</p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {customTags.map((tag) => (
              <div
                key={tag.id}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#EBF0EC] dark:bg-[#212E27] text-[#15251C] dark:text-[#EEF3EF] border border-[#C8D5CB] dark:border-[#2B3A31]"
              >
                <span>{tag.label}</span>
                <button
                  type="button"
                  onClick={() => onDeleteCustomTag(tag.id)}
                  className="text-[#15251C] dark:text-[#EEF3EF] hover:text-rose-600 p-0.5 rounded-full font-bold cursor-pointer"
                  aria-label={`Elimina tag ${tag.label}`}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DANGER ZONE */}
      <div className="glass-panel rounded-[20px] p-2 border border-rose-500/40 bg-white dark:bg-[#1B2520] shadow-sm">
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

      {/* FOOTNOTE */}
      <div className="flex items-start space-x-2 p-4 text-xs text-[#15251C] dark:text-[#EEF3EF] leading-relaxed rounded-[20px] bg-[#EBF0EC] dark:bg-[#2B3A31]/80 border border-[#C8D5CB] dark:border-[#2B3A31]">
        <ShieldCheck className="w-4 h-4 text-[#2D5C3E] dark:text-[#6A9C78] shrink-0 mt-0.5 stroke-[2.5]" />
        <span>
          <strong className="font-black text-[#15251C] dark:text-[#EEF3EF]">100% Client-Side &amp; Privato:</strong> I tuoi dati restano esclusivamente sul tuo dispositivo in memoria locale e sono trasferibili in sicurezza tramite file di backup `.json`.
        </span>
      </div>
    </div>
  );
};

