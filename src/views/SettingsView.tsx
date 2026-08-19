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
  KeyRound,
  Wifi,
  Database,
  Copy,
  Check,
  Laptop,
  Sparkles,
  UploadCloud,
  DownloadCloud,
  Loader2,
  ScanFace,
  Eye,
  EyeOff
} from 'lucide-react';

interface SettingsViewProps {
  pinEnabled: boolean;
  pinCode?: string;
  onTogglePin: (enabled: boolean) => void;
  onSavePin?: (pin: string) => Promise<boolean>;
  biometricsEnabled?: boolean;
  onToggleBiometrics?: (enabled: boolean) => Promise<boolean>;
  isBiometricsSupported?: boolean;
  onLockApp?: () => void;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
  syncPin?: string;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt?: string | null;
  onSaveSyncPin?: (pin: string) => Promise<void>;
  onManualSyncPush?: () => Promise<void>;
  onManualSyncPull?: () => Promise<void>;
  onTestConnection?: () => Promise<void>;
  onExportJson: () => void;
  onExportTxt: () => void;
  onExportCsv: () => void;
  onImportJson: (file: File) => void;
  allTags: Tag[];
  onDeleteCustomTag: (tagId: string) => Promise<void>;
  onDeleteAllData: () => void;
  onShowSplash?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  pinEnabled,
  pinCode = '',
  onTogglePin,
  onSavePin,
  biometricsEnabled = false,
  onToggleBiometrics,
  isBiometricsSupported = false,
  onLockApp,
  themeMode,
  onThemeChange,
  syncPin = '',
  syncStatus = 'idle',
  lastSyncedAt,
  onSaveSyncPin,
  onManualSyncPush,
  onManualSyncPull,
  onTestConnection,
  onExportJson,
  onExportTxt,
  onExportCsv,
  onImportJson,
  allTags,
  onDeleteCustomTag,
  onDeleteAllData,
  onShowSplash,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pinInput, setPinInput] = useState(syncPin);
  const [isEditingPin, setIsEditingPin] = useState(!syncPin);
  const [showSqlGuide, setShowSqlGuide] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // App Lock PIN local state
  const [appPinDraft, setAppPinDraft] = useState('');
  const [isEditingAppPin, setIsEditingAppPin] = useState(!pinCode);
  const [showAppPinPlain, setShowAppPinPlain] = useState(false);
  const [appPinError, setAppPinError] = useState<string | null>(null);

  const customTags = React.useMemo(() => {
    const seen = new Set<string>();
    const list: Tag[] = [];
    for (const t of allTags) {
      if (t.isCustom !== 1) continue;
      const key = `${t.category}:${t.label.trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(t);
      }
    }
    return list;
  }, [allTags]);

  const sqlScript = `-- 1. Crea o aggiorna la tabella 'user_sync_data' nel tuo progetto Supabase
CREATE TABLE IF NOT EXISTS public.user_sync_data (
  user_pin TEXT PRIMARY KEY,
  pin TEXT,
  user_id TEXT,
  data JSONB,
  payload JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assicura che tutte le colonne necessarie siano presenti
ALTER TABLE public.user_sync_data ADD COLUMN IF NOT EXISTS user_pin TEXT;
ALTER TABLE public.user_sync_data ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.user_sync_data ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE public.user_sync_data ADD COLUMN IF NOT EXISTS payload JSONB;
ALTER TABLE public.user_sync_data ADD COLUMN IF NOT EXISTS pin TEXT;
ALTER TABLE public.user_sync_data ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Abilita la sicurezza Row Level Security (RLS)
ALTER TABLE public.user_sync_data ENABLE ROW LEVEL SECURITY;

-- 3. Crea la policy per consentire la sincronizzazione anonima
DROP POLICY IF EXISTS "Accesso completo anonimo" ON public.user_sync_data;
CREATE POLICY "Accesso completo anonimo" ON public.user_sync_data
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Ricarica la cache dello schema per applicare subito le modifiche
NOTIFY pgrst, 'reload schema';`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

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

  const handleSaveAppPinSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAppPinError(null);
    if (!appPinDraft || !/^\d{4}$/.test(appPinDraft.trim())) {
      setAppPinError('Inserisci esattamente 4 cifre numeriche');
      return;
    }
    if (onSavePin) {
      const ok = await onSavePin(appPinDraft.trim());
      if (ok) {
        setIsEditingAppPin(false);
        setAppPinDraft('');
      }
    }
  };

  const themePreviews: {
    id: ThemeMode;
    name: string;
    description: string;
    bgHex?: string;
    cardHex?: string;
    accentHex?: string;
    textHex?: string;
    dot1Hex?: string;
    dot2Hex?: string;
    isAuto?: boolean;
  }[] = [
    {
      id: 'auto',
      name: 'Automatico',
      description: 'Adatta chiaro o scuro in base alle impostazioni del tuo dispositivo',
      isAuto: true,
    },
    {
      id: 'minimal',
      name: 'Light Minimal',
      description: 'Sfondo bianco puro, schede chiare e contrasto nitido monocromatico',
      bgHex: '#FFFFFF',
      cardHex: '#F4F4F5',
      accentHex: '#090A0E',
      textHex: '#09090B',
      dot1Hex: '#090A0E',
      dot2Hex: '#FFFFFF',
    },
    {
      id: 'cyber',
      name: 'Scuro Profondo',
      description: 'Sfondo nero profondo, schede scure e finiture bianche ad alto contrasto',
      bgHex: '#090A0E',
      cardHex: '#121212',
      accentHex: '#FFFFFF',
      textHex: '#FFFFFF',
      dot1Hex: '#FFFFFF',
      dot2Hex: '#090A0E',
    },
    {
      id: 'midnight',
      name: 'Midnight Blue',
      description: 'Sfondo blu notte intenso (#0A1120), schede blu scuro (#131F37) e accenti azzurro ciano (#38BDF8)',
      bgHex: '#0A1120',
      cardHex: '#131F37',
      accentHex: '#38BDF8',
      textHex: '#FFFFFF',
      dot1Hex: '#0A1120',
      dot2Hex: '#38BDF8',
    },
    {
      id: 'earth',
      name: 'Warm Earth',
      description: 'Sfondo color crema/sabbia (#FDFBF7), schede beige soft (#F3EFE6) e accenti terracotta (#C85A32)',
      bgHex: '#FDFBF7',
      cardHex: '#F3EFE6',
      accentHex: '#C85A32',
      textHex: '#2C221E',
      dot1Hex: '#FDFBF7',
      dot2Hex: '#C85A32',
    },
    {
      id: 'violet',
      name: 'Ametista Viola',
      description: 'Sfondo viola profondo (#0F0C1B), schede viola notte (#18132B) e accenti lavanda neon (#A78BFA)',
      bgHex: '#0F0C1B',
      cardHex: '#18132B',
      accentHex: '#A78BFA',
      textHex: '#FFFFFF',
      dot1Hex: '#0F0C1B',
      dot2Hex: '#A78BFA',
    },
  ];

  return (
    <div className="space-y-5 pb-28 animate-fade-in">
      {/* Page Header */}
      <div className="pt-1">
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Impostazioni</h2>
        <p className="text-xs font-bold text-[var(--text-secondary)] mt-0.5">
          Gestione sincronizzazione cloud, backup dati, temi, tag e sicurezza
        </p>
      </div>

      {/* SUPABASE CLOUD SYNC SECTION */}
      <div className="glass-panel rounded-[22px] p-5 space-y-4 border-2 border-[#5B67CA]/40 bg-[var(--bg-surface)] shadow-md relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-[#5B67CA] text-white shadow-sm shrink-0">
              <Cloud className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="block text-base font-black text-[var(--text-primary)]">
                Sincronizzazione Cloud Supabase
              </span>
              <span className="block text-xs font-bold text-[var(--text-secondary)]">
                Condividi in automatico il diario tra PC e Smartphone via PIN
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0 bg-[var(--bg-subtle)] px-2.5 py-1.5 rounded-xl border border-[var(--border-solid)]">
            <Monitor className="w-4 h-4 text-[#5B67CA]" />
            <span className="text-[11px] font-black text-[var(--text-primary)]">↔</span>
            <Smartphone className="w-4 h-4 text-[#5B67CA]" />
          </div>
        </div>

        {/* PIN Box */}
        <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-[#5B67CA]" />
              <span className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                PIN Personale Sincronizzazione Cloud:
              </span>
            </div>
            {syncPin && !isEditingPin && (
              <button
                type="button"
                onClick={() => setIsEditingPin(true)}
                className="text-[11px] font-black text-[#5B67CA] hover:underline cursor-pointer"
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
                  className="flex-1 px-3.5 py-2.5 text-sm font-black tracking-widest rounded-xl border border-[var(--border-solid)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#5B67CA]"
                />
                <button
                  type="submit"
                  disabled={!pinInput.trim() || pinInput.trim().length < 3}
                  className="px-4 py-2.5 text-xs font-black rounded-xl bg-[#5B67CA] text-white hover:bg-[#4A55B8] transition-all disabled:opacity-40 cursor-pointer shadow-sm shrink-0"
                >
                  Salva e Sincronizza PIN
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
                  setPinInput(randomPin);
                }}
                className="inline-flex items-center space-x-1.5 text-[11px] font-bold text-[#5B67CA] hover:underline cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Genera PIN casuale a 4 cifre</span>
              </button>
            </form>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-3">
                <span className="text-base font-black text-[#5B67CA] tracking-widest bg-[var(--bg-surface)] px-4 py-1.5 rounded-xl border-2 border-[#5B67CA]/40 shadow-inner">
                  {syncPin}
                </span>
                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Collegato a Supabase
                </span>
              </div>

              {lastSyncedAt && (
                <div className="text-[11px] font-bold text-[var(--text-secondary)]">
                  Ultimo aggiornamento: {new Date(lastSyncedAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sync Buttons */}
        <div className="pt-1 space-y-2">
          {syncPin && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={async () => {
                  if (onManualSyncPush) await onManualSyncPush();
                }}
                disabled={syncStatus === 'syncing'}
                className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#5B67CA] hover:bg-[#4A55B8] text-white text-xs sm:text-sm font-black transition-all active:scale-98 shadow-md cursor-pointer disabled:opacity-50"
              >
                {syncStatus === 'syncing' ? (
                  <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                ) : (
                  <UploadCloud className="w-4 h-4 stroke-[2.2]" />
                )}
                <span>{syncStatus === 'syncing' ? 'Invio in corso...' : 'Invia Dati a Supabase'}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (onManualSyncPull) await onManualSyncPull();
                }}
                disabled={syncStatus === 'syncing'}
                className="flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black transition-all active:scale-98 shadow-md cursor-pointer disabled:opacity-50"
              >
                {syncStatus === 'syncing' ? (
                  <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                ) : (
                  <DownloadCloud className="w-4 h-4 stroke-[2.2]" />
                )}
                <span>{syncStatus === 'syncing' ? 'Scaricamento in corso...' : 'Scarica Dati dal Cloud'}</span>
              </button>
            </div>
          )}

          {onTestConnection && (
            <button
              type="button"
              onClick={async () => {
                await onTestConnection();
              }}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl border-2 border-[#5B67CA]/40 bg-[var(--bg-surface)] text-[#5B67CA] hover:bg-[#5B67CA]/10 text-xs font-black transition-all cursor-pointer"
            >
              <Wifi className="w-4 h-4 stroke-[2.2]" />
              <span>Verifica Connessione Cloud</span>
            </button>
          )}

          {/* SQL Setup Helper Toggle */}
          <div className="pt-2 border-t border-[var(--border-solid)]">
            <button
              type="button"
              onClick={() => setShowSqlGuide(!showSqlGuide)}
              className="w-full flex items-center justify-between text-left py-2 px-3 rounded-xl bg-[var(--bg-subtle)] text-[var(--text-primary)] hover:opacity-90 transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-[#5B67CA]" />
                <span className="text-xs font-black">Istruzioni Setup Tabella Supabase SQL</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${showSqlGuide ? 'rotate-90' : ''}`} />
            </button>

            {showSqlGuide && (
              <div className="mt-3 p-4 rounded-2xl bg-[var(--bg-subtle)] text-[var(--text-primary)] space-y-3 text-xs animate-fade-in border border-[var(--border-solid)]">
                <p className="font-bold text-[var(--accent-primary)]">
                  Se ricevi l'errore <code className="bg-black/30 px-1.5 py-0.5 rounded text-amber-400">PGRST205 / user_data not found</code>, segui questi 2 passaggi nel tuo account Supabase:
                </p>
                <ol className="list-decimal list-inside space-y-1 font-semibold text-[var(--text-secondary)]">
                  <li>Apri il progetto su <strong>supabase.com</strong> e vai su <strong>SQL Editor</strong> nel menu laterale.</li>
                  <li>Incolla ed esegui (premi <strong>Run</strong>) il seguente script SQL:</li>
                </ol>

                <div className="relative mt-2">
                  <pre className="p-3 rounded-xl bg-black/70 text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed border border-white/10 select-all">
                    {sqlScript}
                  </pre>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="absolute top-2 right-2 flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-[#5B67CA] hover:bg-[#4A55B8] text-white text-[10px] font-black cursor-pointer shadow"
                  >
                    {copiedSql ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? 'Copiato!' : 'Copia SQL'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      {/* BACKUP & DATA TRANSFER SECTION */}
      <div className="glass-panel rounded-[22px] p-5 space-y-4 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-[#5B67CA]/15 text-[#5B67CA] border border-[#5B67CA]/30 shrink-0">
              <ArrowLeftRight className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="block text-base font-black text-[var(--text-primary)]">
                Backup e Trasferimento File JSON
              </span>
              <span className="block text-xs font-bold text-[var(--text-secondary)]">
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
            className="flex flex-col items-start justify-between p-4 rounded-2xl bg-[var(--bg-subtle)] hover:opacity-90 text-[var(--text-primary)] border-2 border-[#5B67CA]/40 transition-all active:scale-98 shadow-sm cursor-pointer text-left group"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <div className="p-2 rounded-xl bg-[#5B67CA]/15 text-[#5B67CA]">
                <Upload className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#5B67CA]/15 text-[#5B67CA] px-2 py-0.5 rounded-full">
                Ripristino
              </span>
            </div>
            <div>
              <span className="block text-sm font-black text-[var(--text-primary)] leading-tight">
                Carica File di Backup
              </span>
              <span className="block text-[11px] font-bold text-[var(--text-secondary)] mt-1">
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
        <div className="pt-2 border-t border-[var(--border-solid)]">
          <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-secondary)] block mb-2">
            Altri Formati di Esportazione
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onExportTxt}
              className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-subtle)] hover:opacity-90 border border-[var(--border-solid)] text-left transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4 text-emerald-500 stroke-[2.5] shrink-0" />
                <div>
                  <span className="block text-xs font-black text-[var(--text-primary)]">
                    Registro Leggibile (.TXT)
                  </span>
                  <span className="block text-[10px] font-bold text-[var(--text-secondary)]">
                    Testo per lettura e stampa
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-primary)]" />
            </button>

            <button
              type="button"
              onClick={onExportCsv}
              className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-subtle)] hover:opacity-90 border border-[var(--border-solid)] text-left transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-2.5">
                <Table className="w-4 h-4 text-amber-500 stroke-[2.5] shrink-0" />
                <div>
                  <span className="block text-xs font-black text-[var(--text-primary)]">
                    Fogli di Calcolo (.CSV)
                  </span>
                  <span className="block text-[10px] font-bold text-[var(--text-secondary)]">
                    Compatibile con Excel e Google
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-primary)]" />
            </button>
          </div>
        </div>
      </div>

      {/* SECURITY & BIOMETRICS SECTION */}
      <div className="glass-panel rounded-[20px] p-5 space-y-4 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-[#5B67CA]/15 text-[#5B67CA] border border-[#5B67CA]/30">
              <Lock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="block text-sm font-black text-[var(--text-primary)]">
                Protezione con PIN dell'App
              </span>
              <span className="block text-xs font-bold text-[var(--text-secondary)]">
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
            <div className="w-11 h-6 bg-[var(--bg-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-solid)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5B67CA]" />
          </label>
        </div>

        {/* PIN Configuration Details (when PIN is enabled) */}
        {pinEnabled && (
          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-4">
            {/* PIN Code Setting / Editing Box */}
            <div className="bg-[var(--bg-subtle)] rounded-2xl p-4 border border-[var(--border-solid)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <KeyRound className="w-4 h-4 text-[#5B67CA] stroke-[2.5]" />
                  <span className="text-xs font-black text-[var(--text-primary)]">
                    Codice PIN a 4 Cifre
                  </span>
                </div>
                {pinCode && !isEditingAppPin && (
                  <span className="text-[11px] font-black text-emerald-600 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    Configurato
                  </span>
                )}
              </div>

              {isEditingAppPin || !pinCode ? (
                <form onSubmit={handleSaveAppPinSubmit} className="space-y-3">
                  <div className="relative">
                    <input
                      type={showAppPinPlain ? 'text' : 'password'}
                      maxLength={4}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={appPinDraft}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setAppPinDraft(val);
                        if (appPinError) setAppPinError(null);
                      }}
                      placeholder="••••"
                      className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-[var(--border-solid)] rounded-xl px-4 py-2.5 text-center text-xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#5B67CA]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAppPinPlain(!showAppPinPlain)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1"
                      title={showAppPinPlain ? 'Nascondi PIN' : 'Mostra PIN'}
                    >
                      {showAppPinPlain ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {appPinError && (
                    <p className="text-[11px] font-bold text-rose-500 text-center">{appPinError}</p>
                  )}

                  <div className="flex items-center space-x-2">
                    <button
                      type="submit"
                      disabled={appPinDraft.length !== 4}
                      className="flex-1 py-2.5 rounded-xl bg-[#5B67CA] text-white text-xs font-black hover:bg-[#4d57b2] active:scale-98 transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                    >
                      {pinCode ? 'Aggiorna PIN' : 'Salva PIN'}
                    </button>
                    {pinCode && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingAppPin(false);
                          setAppPinDraft('');
                          setAppPinError(null);
                        }}
                        className="px-4 py-2.5 rounded-xl border border-[var(--border-solid)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] text-xs font-bold transition-all cursor-pointer"
                      >
                        Annulla
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-mono font-bold tracking-widest text-[var(--text-primary)]">
                      ••••
                    </span>
                    <span className="text-[11px] font-bold text-[var(--text-secondary)]">
                      (PIN a 4 cifre attivo)
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingAppPin(true);
                        setAppPinDraft('');
                      }}
                      className="text-xs font-bold text-[#5B67CA] hover:underline px-2 py-1"
                    >
                      Modifica
                    </button>
                    {onLockApp && (
                      <button
                        type="button"
                        onClick={onLockApp}
                        className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-solid)] text-[11px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-page)] active:scale-95 transition-all shadow-xs"
                      >
                        Blocca Ora
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Face ID / Touch ID Biometrics Toggle (Always shown or if supported) */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)]">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-violet-500/15 text-violet-500 border border-violet-500/30 shrink-0">
                  <ScanFace className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <span className="block text-xs font-black text-[var(--text-primary)]">
                    Face ID / Touch ID
                  </span>
                  <span className="block text-[10px] font-bold text-[var(--text-secondary)]">
                    Sblocca istantaneamente con riconoscimento biometrico
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={biometricsEnabled}
                  onChange={(e) => onToggleBiometrics && onToggleBiometrics(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-[var(--bg-surface)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-solid)] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-600" />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* THEME SECTION */}
      <div className="glass-panel rounded-[20px] p-5 space-y-4 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-500 border border-amber-500/30 shrink-0">
            <Palette className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <span className="block text-sm font-black text-[var(--text-primary)]">
              Tema Grafico e Palette
            </span>
          </div>
        </div>

        {/* Visual Palette Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          {themePreviews.map((p) => {
            const isSelected = themeMode === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onThemeChange(p.id)}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-150 active:scale-98 cursor-pointer flex items-center justify-between relative overflow-hidden group ${
                  isSelected
                    ? 'border-2 border-[var(--accent-btn)] bg-[var(--bg-subtle)] shadow-sm ring-1 ring-[var(--ring-color)]/20'
                    : 'border-[var(--border-solid)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {p.isAuto ? (
                    <div className="w-7 h-7 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-solid)] flex items-center justify-center text-[var(--accent-primary)] shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-150">
                      <Laptop className="w-3.5 h-3.5 stroke-[2.5]" />
                    </div>
                  ) : (
                    /* Swatch Preview Dots */
                    <div className="flex items-center -space-x-2 shrink-0 group-hover:scale-105 transition-transform duration-150">
                      <span
                        className="w-5 h-5 rounded-full border border-black/20 shadow-xs inline-block"
                        style={{ backgroundColor: p.dot1Hex || p.bgHex }}
                        title={`Sfondo: ${p.dot1Hex || p.bgHex}`}
                      />
                      <span
                        className="w-5 h-5 rounded-full border border-black/20 shadow-xs inline-block"
                        style={{ backgroundColor: p.dot2Hex || p.accentHex }}
                        title={`Accento: ${p.dot2Hex || p.accentHex}`}
                      />
                    </div>
                  )}
                  <span className="text-xs sm:text-sm font-black text-[var(--text-primary)] truncate">
                    {p.name}
                  </span>
                </div>

                {isSelected ? (
                  <span className="ml-2 px-2.5 py-1 rounded-full text-[10px] font-black bg-[var(--accent-btn)] text-[var(--accent-btn-text)] shrink-0 shadow-xs">
                    Attivo
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[var(--border-solid)] ml-2 shrink-0 opacity-40 group-hover:opacity-80 transition-opacity" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* CUSTOM TAG MANAGEMENT */}
      <div className="glass-panel rounded-[20px] p-5 space-y-3 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
        <div className="flex items-center space-x-2">
          <Tags className="w-4 h-4 text-[#5B67CA] stroke-[2.5]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
            Tag Personalizzati ({customTags.length})
          </h3>
        </div>

        {customTags.length === 0 ? (
          <p className="text-xs font-bold text-[var(--text-secondary)] italic">Nessun tag personalizzato creato.</p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {customTags.map((tag) => (
              <div
                key={tag.id}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-solid)]"
              >
                <span>{tag.label}</span>
                <button
                  type="button"
                  onClick={() => onDeleteCustomTag(tag.id)}
                  className="text-[var(--text-primary)] hover:text-rose-500 p-0.5 rounded-full font-bold cursor-pointer"
                  aria-label={`Elimina tag ${tag.label}`}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* INTRO SCREEN QUICK ACCESS */}
      {onShowSplash && (
        <div className="glass-panel rounded-[20px] p-2 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
          <button
            type="button"
            onClick={onShowSplash}
            className="w-full flex items-center justify-between p-3.5 text-left text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] active:scale-98 rounded-2xl transition-all duration-150 cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <Sparkles className="w-4 h-4 text-[var(--accent-primary)] stroke-[2.5]" />
              <div>
                <span className="text-xs font-black block">Mostra Schermata di Copertina</span>
                <span className="text-[11px] font-bold text-[var(--text-secondary)]">Rivedi la pagina introduttiva di benvenuto</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
        </div>
      )}

      {/* DANGER ZONE */}
      <div className="glass-panel rounded-[20px] p-2 border border-rose-500/40 bg-[var(--bg-surface)] shadow-sm">
        <button
          type="button"
          onClick={onDeleteAllData}
          className="w-full flex items-center justify-between p-3.5 text-left text-rose-500 hover:bg-rose-500/10 active:scale-98 rounded-2xl transition-all duration-150 cursor-pointer"
        >
          <div className="flex items-center space-x-3">
            <Trash2 className="w-4 h-4 stroke-[2.5]" />
            <span className="text-xs font-black">Elimina Tutti i Dati Locali</span>
          </div>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* FOOTNOTE */}
      <div className="flex items-start space-x-2 p-4 text-xs text-[var(--text-primary)] leading-relaxed rounded-[20px] bg-[var(--bg-subtle)] border border-[var(--border-solid)]">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5 stroke-[2.5]" />
        <span>
          <strong className="font-black text-[var(--text-primary)]">100% Client-Side e Privato:</strong> I tuoi dati restano esclusivamente sul tuo dispositivo in memoria locale e sono trasferibili in sicurezza tramite file di backup `.json`.
        </span>
      </div>
    </div>
  );
};

