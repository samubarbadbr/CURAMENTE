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
  Printer,
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
  HelpCircle,
  UploadCloud,
  DownloadCloud,
  Loader2,
  ScanFace,
  Eye,
  EyeOff,
  Mail,
  Send,
  ShieldAlert,
  AlertCircle,
  AlertTriangle,
  WifiOff,
} from 'lucide-react';
import { sendPinRecoveryEmail } from '../lib/supabase';
import { PWAInstallButton } from '../components/PWAInstallButton';

interface SettingsViewProps {
  pinEnabled: boolean;
  pinCode?: string;
  recoveryEmail?: string;
  onTogglePin: (enabled: boolean) => void;
  onSavePin?: (pin: string) => Promise<boolean>;
  onSavePinAndRecoveryEmail?: (pin: string, email: string) => Promise<boolean>;
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
  onExportTherapistReport: () => void;
  onExportCsv: () => void;
  onImportJson: (file: File) => void;
  allTags: Tag[];
  onDeleteCustomTag: (tagId: string) => Promise<void>;
  onDeleteAllData: () => void;
  onShowSplash?: () => void;
  onNavigateToCustomQuestions?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  pinEnabled,
  pinCode = '',
  recoveryEmail = '',
  onTogglePin,
  onSavePin,
  onSavePinAndRecoveryEmail,
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
  onExportTherapistReport,
  onExportCsv,
  onImportJson,
  allTags,
  onDeleteCustomTag,
  onDeleteAllData,
  onShowSplash,
  onNavigateToCustomQuestions,
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
  const [recoveryEmailDraft, setRecoveryEmailDraft] = useState(
    recoveryEmail || 'samuele.lavoroba@gmail.com'
  );
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [emailTestStatus, setEmailTestStatus] = useState<{
    success: boolean;
    message: string;
    rawError?: string;
  } | null>(null);

  React.useEffect(() => {
    if (recoveryEmail) {
      setRecoveryEmailDraft(recoveryEmail);
    }
  }, [recoveryEmail]);

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
    setEmailError(null);
    if (!appPinDraft || !/^\d{4}$/.test(appPinDraft.trim())) {
      setAppPinError('Inserisci esattamente 4 cifre numeriche');
      return;
    }
    const cleanEmail = recoveryEmailDraft.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setEmailError('Inserisci un indirizzo email valido per il recupero');
      return;
    }

    if (onSavePinAndRecoveryEmail) {
      const ok = await onSavePinAndRecoveryEmail(appPinDraft.trim(), cleanEmail);
      if (ok) {
        setIsEditingAppPin(false);
        setAppPinDraft('');
      }
    } else if (onSavePin) {
      const ok = await onSavePin(appPinDraft.trim());
      if (ok) {
        setIsEditingAppPin(false);
        setAppPinDraft('');
      }
    }
  };

  const handleTestRecoveryEmail = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setEmailTestStatus({
        success: false,
        message: 'Connessione assente. Riprova quando sarai di nuovo online oppure usa lo sblocco locale.',
      });
      return;
    }

    const targetEmail = (recoveryEmail || recoveryEmailDraft || '').trim().toLowerCase();
    if (!targetEmail || !targetEmail.includes('@')) {
      setEmailTestStatus({
        success: false,
        message: 'Inserisci prima un indirizzo email valido',
      });
      return;
    }
    setIsTestingEmail(true);
    setEmailTestStatus(null);
    try {
      const res = await sendPinRecoveryEmail(targetEmail, pinCode);
      setEmailTestStatus(res);
      if (!res.success) {
        const errorDetail = res.rawError || res.message;
        console.warn("Invio email di test non riuscito:", errorDetail);
      }
    } catch (err: any) {
      console.warn("Errore test email:", err);
      setEmailTestStatus({
        success: false,
        message: "Errore durante l'invio dell'email di test. Riprova più tardi.",
        rawError: err?.message,
      });
    } finally {
      setIsTestingEmail(false);
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
                Sincronizzazione Cloud
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
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-2 min-w-0">
              <KeyRound className="w-4 h-4 text-[#5B67CA] shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">
                PIN Personale Sincronizzazione Cloud:
              </span>
            </div>
            {syncPin && !isEditingPin && (
              <button
                type="button"
                onClick={() => setIsEditingPin(true)}
                className="text-[11px] font-black text-[#5B67CA] hover:underline cursor-pointer shrink-0"
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
                  <CheckCircle2 className="w-4 h-4" /> Connessione Cloud Attiva
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
                <span>{syncStatus === 'syncing' ? 'Invio in corso...' : 'Salva nel Cloud'}</span>
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
                <span>{syncStatus === 'syncing' ? 'Scaricamento in corso...' : 'Scarica dal Cloud'}</span>
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
        </div>
      </div>


      {/* PWA INSTALLATION & OFFLINE SECTION */}
      <div className="glass-panel rounded-[22px] p-5 space-y-4 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/15 text-indigo-500 border border-indigo-500/30 shrink-0">
              <Smartphone className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="block text-base font-black text-[var(--text-primary)]">
                App & Funzionamento Offline (PWA)
              </span>
              <span className="block text-xs font-bold text-[var(--text-secondary)]">
                Installazione su Home Screen, Service Worker e cache locale
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-bold shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>100% Offline</span>
          </div>
        </div>

        {/* PWA Install Button Card Component */}
        <PWAInstallButton variant="card" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] space-y-1">
            <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-400" /> Dati & PIN Locali
            </span>
            <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
              Tutte le voci del diario e la verifica del PIN sono salvate nel database locale (IndexedDB / localStorage).
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] space-y-1">
            <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Cache Service Worker
            </span>
            <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
              I file dell'app (HTML, JS, CSS, icone) vengono salvati in cache per aprirsi anche in aereo o senza internet.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] space-y-1">
            <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5 text-amber-400" /> Sicurezza Senza Rete
            </span>
            <p className="text-[11px] text-[var(--text-secondary)] leading-tight">
              Se sei offline, puoi comunque sbloccare con PIN o impronta. Il recupero email ti avviserà di riconnetterti.
            </p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Button 1: Download JSON Backup */}
          <button
            type="button"
            onClick={onExportJson}
            className="flex flex-col items-start justify-between p-4.5 sm:p-5 rounded-2xl bg-[#5B67CA] hover:bg-[#4A55B8] text-white transition-all active:scale-98 shadow-md cursor-pointer text-left border border-[#5B67CA]/50 group min-h-[136px]"
          >
            <div className="flex items-center justify-between w-full gap-2 mb-3">
              <div className="p-2.5 rounded-xl bg-white/20 text-white shrink-0">
                <Download className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-2.5 py-1 rounded-full text-white shrink-0 border border-white/20 shadow-xs">
                Consigliato
              </span>
            </div>
            <div className="space-y-1">
              <span className="block text-sm font-black text-white leading-tight">
                Scarica File di Backup (.json)
              </span>
              <span className="block text-[11px] font-medium text-white/85 leading-snug">
                Salva subito tutti i dati del diario in un file ripristinabile.
              </span>
            </div>
          </button>

          {/* Button 2: Upload JSON Backup */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-start justify-between p-4.5 sm:p-5 rounded-2xl bg-[var(--bg-subtle)] hover:opacity-90 text-[var(--text-primary)] border-2 border-[#5B67CA]/40 transition-all active:scale-98 shadow-sm cursor-pointer text-left group min-h-[136px]"
          >
            <div className="flex items-center justify-between w-full gap-2 mb-3">
              <div className="p-2.5 rounded-xl bg-[#5B67CA]/15 text-[#5B67CA] shrink-0">
                <Upload className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-[#5B67CA]/15 text-[#5B67CA] px-2.5 py-1 rounded-full shrink-0 border border-[#5B67CA]/20">
                Ripristino
              </span>
            </div>
            <div className="space-y-1">
              <span className="block text-sm font-black text-[var(--text-primary)] leading-tight">
                Carica File di Backup
              </span>
              <span className="block text-[11px] font-medium text-[var(--text-secondary)] leading-snug">
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
            Condivisione Clinica &amp; Altri Formati
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onExportTherapistReport}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-subtle)] hover:border-[#5B67CA]/50 border border-[var(--border-solid)] text-left transition-all cursor-pointer group shadow-xs active:scale-98"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-[#5B67CA]/15 text-[#5B67CA] shrink-0 border border-[#5B67CA]/25">
                  <Printer className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="block text-xs font-black text-[var(--text-primary)]">
                      Report per Terapeuta (PDF)
                    </span>
                    <span className="text-[9px] font-extrabold uppercase bg-[#5B67CA]/15 text-[#5B67CA] px-1.5 py-0.2 rounded-md">
                      Nuovo
                    </span>
                  </div>
                  <span className="block text-[10px] font-semibold text-[var(--text-secondary)] mt-0.5">
                    Layout chiaro con medie, filtri e stampa
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-primary)] group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              type="button"
              onClick={onExportCsv}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-subtle)] hover:border-emerald-500/40 border border-[var(--border-solid)] text-left transition-all cursor-pointer group shadow-xs active:scale-98"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-500 shrink-0 border border-emerald-500/25">
                  <Table className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <span className="block text-xs font-black text-[var(--text-primary)]">
                    Fogli di Calcolo (.CSV)
                  </span>
                  <span className="block text-[10px] font-semibold text-[var(--text-secondary)] mt-0.5">
                    Tabella (Data | Domanda | Risposta | Valore)
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-primary)] group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* SECURITY & BIOMETRICS SECTION */}
      <div className="glass-panel rounded-[20px] p-5 space-y-4 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-[#5B67CA]/15 text-[#5B67CA] border border-[#5B67CA]/30 shrink-0">
              <Lock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <span className="block text-sm font-black text-[var(--text-primary)] truncate">
                Protezione con PIN dell'App
              </span>
              <span className="block text-xs font-bold text-[var(--text-secondary)]">
                Richiedi PIN a 4 cifre all'avvio dell'applicazione
              </span>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
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
            {/* PIN Code & Recovery Email Setting / Editing Box */}
            <div className="bg-[var(--bg-subtle)] rounded-2xl p-3.5 sm:p-4 border border-[var(--border-solid)] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <KeyRound className="w-4 h-4 text-[#5B67CA] stroke-[2.5] shrink-0" />
                  <span className="text-xs font-black text-[var(--text-primary)]">
                    Codice PIN &amp; Email di Recupero
                  </span>
                </div>
                {pinCode && !isEditingAppPin && (
                  <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                    Configurato
                  </span>
                )}
              </div>

              {isEditingAppPin || !pinCode ? (
                <form onSubmit={handleSaveAppPinSubmit} className="space-y-3.5">
                  {/* PIN Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)]">
                      Imposta PIN a 4 Cifre:
                    </label>
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
                  </div>

                  {/* Recovery Email Input */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-[var(--text-secondary)]">
                      Email di Recupero:
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={recoveryEmailDraft}
                        onChange={(e) => {
                          setRecoveryEmailDraft(e.target.value);
                          if (emailError) setEmailError(null);
                        }}
                        placeholder="es. nome@email.com"
                        className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-muted)] border border-[var(--border-solid)] rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#5B67CA]"
                      />
                      <Mail className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                      Utilizzata per inviare istruzioni e codice in caso di PIN smarrito.
                    </p>
                    {emailError && (
                      <p className="text-[11px] font-bold text-rose-500">{emailError}</p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      type="submit"
                      disabled={appPinDraft.length !== 4 || !recoveryEmailDraft.includes('@')}
                      className="flex-1 py-2.5 rounded-xl bg-[#5B67CA] text-white text-xs font-black hover:bg-[#4d57b2] active:scale-98 transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                    >
                      {pinCode ? 'Aggiorna PIN & Email' : 'Salva PIN & Email di Recupero'}
                    </button>
                    {pinCode && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingAppPin(false);
                          setAppPinDraft('');
                          setAppPinError(null);
                          setEmailError(null);
                        }}
                        className="px-4 py-2.5 rounded-xl border border-[var(--border-solid)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] text-xs font-bold transition-all cursor-pointer"
                      >
                        Annulla
                      </button>
                    )}
                  </div>
                </form>
              ) : (
                <div className="space-y-3 pt-1">
                  {/* Notice clarifying that PIN change doesn't require email */}
                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-start space-x-2.5">
                    <KeyRound className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5 min-w-0">
                      <span className="font-bold text-[var(--text-primary)] block">Vuoi cambiare il tuo PIN?</span>
                      <span className="text-[var(--text-secondary)] leading-relaxed block text-[11px]">
                        Non serve inviare né ricevere alcuna email! Puoi cambiarlo subito da qui cliccando su <strong>"Modifica PIN"</strong>.
                      </span>
                    </div>
                  </div>

                  {/* Active PIN indicator and action buttons - optimized for mobile responsiveness */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="text-sm font-mono font-bold tracking-widest text-[var(--text-primary)] px-2.5 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-solid)]">
                        ••••
                      </span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        PIN attivo
                      </span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingAppPin(true);
                          setAppPinDraft('');
                        }}
                        className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap min-h-[38px]"
                      >
                        <KeyRound className="w-3.5 h-3.5 shrink-0" />
                        <span>Modifica PIN</span>
                      </button>
                      {onLockApp && (
                        <button
                          type="button"
                          onClick={onLockApp}
                          className="px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-page)] active:scale-95 transition-all shadow-xs cursor-pointer shrink-0 whitespace-nowrap min-h-[38px]"
                        >
                          Blocca Ora
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Registered recovery email row - fully responsive on mobile */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <div className="flex items-start sm:items-center space-x-2.5 min-w-0">
                      <Mail className="w-4 h-4 text-[#5B67CA] shrink-0 mt-0.5 sm:mt-0" />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-[var(--text-secondary)] block leading-tight">
                          Email di Recupero Registrata:
                        </span>
                        <span className="text-xs font-mono font-bold text-[var(--text-primary)] break-all block mt-0.5">
                          {recoveryEmail || recoveryEmailDraft || 'Non specificata'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleTestRecoveryEmail}
                      disabled={isTestingEmail}
                      className="w-full sm:w-auto text-xs font-bold px-3 py-2 rounded-lg bg-[#5B67CA]/10 hover:bg-[#5B67CA]/20 text-[#5B67CA] border border-[#5B67CA]/20 transition-all flex items-center justify-center space-x-1.5 cursor-pointer shrink-0 min-h-[36px]"
                      title="Verifica l'invio delle istruzioni di recupero"
                    >
                      {isTestingEmail ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      ) : (
                        <Send className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{isTestingEmail ? 'Invio test...' : 'Test Invio Email'}</span>
                    </button>
                  </div>

                  {/* Diagnostic status for email test */}
                  {emailTestStatus && (
                    <div className="pt-1">
                      {emailTestStatus.success ? (
                        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs flex items-start space-x-2.5 shadow-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-emerald-400 block text-xs sm:text-sm">
                              Email inviata con successo! Controlla la tua casella di posta per le istruzioni.
                            </span>
                            <span className="text-[11px] text-zinc-400 block mt-0.5">
                              Controlla la posta in arrivo e la cartella Spam di {recoveryEmail || recoveryEmailDraft}.
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs flex items-start space-x-2.5 shadow-sm">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-rose-400 block text-xs sm:text-sm">
                              {emailTestStatus.message || "Errore durante l'invio dell'email di test"}
                            </span>
                            {emailTestStatus.rawError && (
                              <span className="text-[11px] text-zinc-400 font-mono block mt-1">
                                Dettaglio: {emailTestStatus.rawError}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Face ID / Touch ID Biometrics Toggle (Always shown or if supported) */}
            <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)]">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="p-2 rounded-xl bg-violet-500/15 text-violet-500 border border-violet-500/30 shrink-0">
                  <ScanFace className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-black text-[var(--text-primary)]">
                    Face ID / Touch ID
                  </span>
                  <span className="block text-[10px] font-bold text-[var(--text-secondary)]">
                    Sblocca istantaneamente con riconoscimento biometrico
                  </span>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0">
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

      {/* CUSTOM QUESTIONS EDITOR SHORTCUT */}
      {onNavigateToCustomQuestions && (
        <div className="glass-panel rounded-[20px] p-5 space-y-3 border border-[var(--border-solid)] bg-[var(--bg-surface)] shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-[#5B67CA]/15 text-[#5B67CA] border border-[#5B67CA]/30 shrink-0">
                <HelpCircle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <span className="block text-sm font-black text-[var(--text-primary)]">
                  Editor Domande Custom
                </span>
                <span className="block text-xs font-bold text-[var(--text-secondary)]">
                  Crea, modifica e attiva domande di riflessione personalizzate per il tuo diario
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToCustomQuestions}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-[#5B67CA] hover:bg-[#4A55B8] active:scale-98 text-white text-xs font-black transition-all cursor-pointer shadow-md"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Gestisci Domande Personalizzate</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

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

