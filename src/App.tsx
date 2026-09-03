import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CbtEntry, Tag, ViewType, PeriodFilter, ThemeMode, CustomQuestion } from './types';
import { DB, seedDefaultTagsIfNeeded, cleanupAndDeduplicateTags, createBlankEntry, openDatabase } from './services/db';
import { SyncService } from './services/sync';
import { checkBiometricsAvailability, registerBiometricCredential } from './lib/biometrics';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { LockScreen } from './components/LockScreen';
import { Toast } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { SplashScreen } from './components/SplashScreen';
import { TimelineView } from './views/TimelineView';
import { EntryFormView } from './views/EntryFormView';
import { DetailView } from './views/DetailView';
import { DashboardView } from './views/DashboardView';
import { SettingsView } from './views/SettingsView';
import { CustomQuestionsView } from './views/CustomQuestionsView';
import { CustomQuestionsService } from './services/customQuestions';
import { TherapistExportModal } from './components/TherapistExportModal';
import { generateTherapistCsv, exportSingleEntryPdf } from './services/therapistReportGenerator';
import { saveRecoveryEmailToCloud } from './lib/supabase';

const viewOrder: Record<ViewType, number> = {
  timeline: 0,
  entry: 0.5,
  detail: 0.5,
  dashboard: 1,
  custom_questions: 1.5,
  settings: 2,
};

const pageVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 30 : dir < 0 ? -30 : 0,
    opacity: 0,
    scale: 0.98,
    filter: 'blur(4px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: (dir: number) => ({
    x: dir < 0 ? 30 : dir > 0 ? -30 : 0,
    opacity: 0,
    scale: 0.98,
    filter: 'blur(4px)',
  }),
};

const pageTransition = {
  type: 'spring',
  stiffness: 340,
  damping: 30,
  mass: 0.75,
};

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [entries, setEntries] = useState<CbtEntry[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('timeline');
  const [direction, setDirection] = useState<number>(0);

  const navigateToView = (nextView: ViewType) => {
    if (nextView === currentView) return;
    const currentPos = viewOrder[currentView] ?? 0;
    const nextPos = viewOrder[nextView] ?? 0;
    setDirection(nextPos > currentPos ? 1 : nextPos < currentPos ? -1 : 1);
    setCurrentView(nextView);
  };

  // Form & Detail states
  const [entryDraft, setEntryDraft] = useState<CbtEntry | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);

  // Filters & Theme
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30');
  const [dashPeriod, setDashPeriod] = useState<PeriodFilter>('30');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  // Visual Privacy Mode (Modalità Sguardo Veloce)
  const [isPrivacyModeEnabled, setIsPrivacyModeEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('diariamente_privacy_mode') === 'true';
    } catch {
      return false;
    }
  });

  // Splash Screen / Intro Cover Screen state
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('diariamente_splash_dismissed') !== 'true';
    } catch {
      return true;
    }
  });

  const handleDismissSplash = () => {
    setShowSplash(false);
    try {
      sessionStorage.setItem('diariamente_splash_dismissed', 'true');
    } catch {}
  };

  const handleTogglePrivacyMode = () => {
    setIsPrivacyModeEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('diariamente_privacy_mode', String(next));
      } catch {}
      showToast(next ? 'Modalità Privacy attivata (Sguardo Veloce)' : 'Modalità Privacy disattivata');
      return next;
    });
  };

  // Security & Lock
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinCode, setPinCode] = useState<string>('');
  const [recoveryEmail, setRecoveryEmail] = useState<string>('samuele.lavoroba@gmail.com');
  const [isLocked, setIsLocked] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometricCredentialId, setBiometricCredentialId] = useState<string>('');
  const [isBiometricsSupported, setIsBiometricsSupported] = useState(false);

  // Cloud Sync state
  const [syncPin, setSyncPin] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  // Network & UI Feedback
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    isDanger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    message: '',
    onConfirm: () => {},
  });

  // Therapist Report Export Modal state
  const [isTherapistExportModalOpen, setIsTherapistExportModalOpen] = useState(false);
  const [exportEntries, setExportEntries] = useState<CbtEntry[]>([]);

  const handleOpenTherapistModal = async () => {
    try {
      const all = await DB.getAll<CbtEntry>('entries');
      all.sort((a, b) => new Date(b.eventDatetime).getTime() - new Date(a.eventDatetime).getTime());
      setExportEntries(all);
    } catch {
      setExportEntries(entries);
    }
    setIsTherapistExportModalOpen(true);
  };

  const handleExportSingleEntry = (entry: CbtEntry) => {
    exportSingleEntryPdf(entry, allTags, customQuestions, (msg) => showToast(msg));
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((current) => (current === msg ? null : current));
    }, 2500);
  };

  // Apply Theme
  const applyTheme = useCallback((mode: ThemeMode) => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.remove(
      'dark',
      'theme-cyber',
      'theme-minimal',
      'theme-midnight',
      'theme-earth',
      'theme-violet',
      'theme-amethyst',
      'theme-light',
      'theme-dark',
      'theme-lavender',
      'theme-ocean'
    );
    body.classList.remove(
      'dark',
      'theme-cyber',
      'theme-minimal',
      'theme-midnight',
      'theme-earth',
      'theme-violet',
      'theme-amethyst',
      'theme-light',
      'theme-dark',
      'theme-lavender',
      'theme-ocean'
    );

    let effectiveMode: 'cyber' | 'minimal' | 'midnight' | 'earth' | 'violet' = 'minimal';
    if (mode === 'auto') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveMode = prefersDark ? 'cyber' : 'minimal';
    } else if (mode === 'cyber' || (mode as any) === 'dark') {
      effectiveMode = 'cyber';
    } else if (mode === 'midnight' || (mode as any) === 'ocean') {
      effectiveMode = 'midnight';
    } else if (mode === 'earth') {
      effectiveMode = 'earth';
    } else if (mode === 'violet' || (mode as any) === 'amethyst') {
      effectiveMode = 'violet';
    } else {
      effectiveMode = 'minimal';
    }

    root.setAttribute('data-theme', effectiveMode);
    body.setAttribute('data-theme', effectiveMode);

    try {
      localStorage.setItem('diariamente_theme', mode);
      localStorage.setItem('diario_mente_theme', mode);
    } catch {}

    if (effectiveMode === 'cyber') {
      root.classList.add('dark', 'theme-cyber');
      body.classList.add('dark', 'theme-cyber');
      root.style.colorScheme = 'dark';
    } else if (effectiveMode === 'midnight') {
      root.classList.add('dark', 'theme-midnight');
      body.classList.add('dark', 'theme-midnight');
      root.style.colorScheme = 'dark';
    } else if (effectiveMode === 'violet') {
      root.classList.add('dark', 'theme-violet');
      body.classList.add('dark', 'theme-violet');
      root.style.colorScheme = 'dark';
    } else if (effectiveMode === 'earth') {
      root.classList.add('theme-earth');
      body.classList.add('theme-earth');
      root.style.colorScheme = 'light';
    } else {
      root.classList.add('theme-minimal');
      body.classList.add('theme-minimal');
      root.style.colorScheme = 'light';
    }
  }, []);

  // Fetch all entries from IndexedDB filtered by period
  const loadEntries = useCallback(async (period: PeriodFilter) => {
    try {
      const all = await DB.getAll<CbtEntry>('entries');
      all.sort((a, b) => new Date(b.eventDatetime).getTime() - new Date(a.eventDatetime).getTime());

      if (period === 'all') {
        setEntries(all);
        return;
      }

      const days = Number(period);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const filtered = all.filter((e) => new Date(e.eventDatetime) >= cutoff);
      setEntries(filtered);
    } catch (err) {
      console.error('Failed to load entries:', err);
    }
  }, []);

  // Sync Push function
  const handleSyncPush = useCallback(async (pinToUse?: string, silent = false) => {
    const pin = pinToUse || syncPin;
    if (!pin) {
      if (!silent) showToast('PIN non impostato nelle impostazioni');
      return false;
    }

    setSyncStatus('syncing');
    try {
      const allEntries = await DB.getAll<CbtEntry>('entries');
      const tags = await DB.getAll<Tag>('tags');

      const res = await SyncService.push(pin, { entries: allEntries, tags });
      if (res.success) {
        setSyncStatus('synced');
        setLastSyncedAt(res.updatedAt || new Date().toISOString());
        if (!silent) showToast(`Dati inviati al Cloud per il PIN ${pin}!`);
        return true;
      } else {
        setSyncStatus('error');
        if (!silent) showToast(`Errore invio cloud: ${res.error || 'Connessione fallita'}`);
        return false;
      }
    } catch (err: any) {
      console.error('Sync push failed:', err);
      setSyncStatus('error');
      if (!silent) showToast(`Errore invio cloud: ${err?.message || 'Connessione fallita'}`);
      return false;
    }
  }, [syncPin]);

  // Sync Pull function
  const handleSyncPull = useCallback(async (pinToUse?: string, forceReload = false) => {
    const pin = pinToUse || syncPin;
    if (!pin) {
      showToast('PIN non impostato per il caricamento cloud');
      return false;
    }

    setSyncStatus('syncing');
    try {
      const res = await SyncService.pull(pin);
      if (res.success && res.data) {
        // Merge cloud entries into local IndexedDB
        if (res.data.entries && Array.isArray(res.data.entries)) {
          for (const entry of res.data.entries) {
            await DB.put('entries', entry);
          }
        }
        if (res.data.tags && Array.isArray(res.data.tags)) {
          for (const tag of res.data.tags) {
            await DB.put('tags', tag);
          }
        }

        const updatedTags = await cleanupAndDeduplicateTags();
        setAllTags(updatedTags);
        await loadEntries(periodFilter);

        setSyncStatus('synced');
        setLastSyncedAt(res.data.updatedAt || new Date().toISOString());
        showToast(`Dati scaricati dal Cloud per il PIN ${pin}!`);

        if (forceReload) {
          setTimeout(() => {
            window.location.reload();
          }, 600);
        }
        return true;
      } else {
        setSyncStatus('error');
        showToast(`Errore scaricamento: ${res.error || 'Nessun dato trovato per questo PIN'}`);
        return false;
      }
    } catch (err: any) {
      console.error('Sync pull failed:', err);
      setSyncStatus('error');
      showToast(`Errore scaricamento: ${err?.message || 'Connessione fallita'}`);
      return false;
    }
  }, [syncPin, loadEntries, periodFilter]);

  // Test Supabase Connection
  const handleTestConnection = useCallback(async () => {
    showToast('Testing connessione Supabase...');
    const res = await SyncService.testConnection();
    if (res.success) {
      showToast('Connessione Supabase OK!');
    } else {
      showToast(`Errore connessione: ${res.error || 'Connessione fallita'}`);
    }
  }, []);

  // Save Sync PIN

  const handleSaveSyncPin = async (newPin: string) => {
    const cleanPin = newPin.trim().toLowerCase();
    setSyncPin(cleanPin);
    await DB.put('settings', { key: 'sync_pin', value: cleanPin });
    try {
      localStorage.setItem('diariamente_sync_pin', cleanPin);
      localStorage.setItem('diariomente_sync_pin', cleanPin);
    } catch (e) {
      console.warn(e);
    }

    // Try pulling from cloud first for existing data on this PIN
    setSyncStatus('syncing');
    const pullRes = await SyncService.pull(cleanPin);
    if (pullRes.success && pullRes.data && pullRes.data.entries?.length) {
      if (pullRes.data.entries && Array.isArray(pullRes.data.entries)) {
        for (const entry of pullRes.data.entries) {
          await DB.put('entries', entry);
        }
      }
      if (pullRes.data.tags && Array.isArray(pullRes.data.tags)) {
        for (const tag of pullRes.data.tags) {
          await DB.put('tags', tag);
        }
      }
      const updatedTags = await cleanupAndDeduplicateTags();
      setAllTags(updatedTags);
      await loadEntries(periodFilter);
      setSyncStatus('synced');
      setLastSyncedAt(pullRes.data.updatedAt || new Date().toISOString());
      showToast(`Dati scaricati e collegati per il PIN ${cleanPin}!`);
    } else {
      // If no data on cloud, push local data up to cloud
      const allEntries = await DB.getAll<CbtEntry>('entries');
      const tags = await DB.getAll<Tag>('tags');
      const pushRes = await SyncService.push(cleanPin, { entries: allEntries, tags });
      if (pushRes.success) {
        setSyncStatus('synced');
        setLastSyncedAt(pushRes.updatedAt || new Date().toISOString());
        showToast(`Dati salvati sul Cloud per il PIN ${cleanPin}!`);
      } else {
        setSyncStatus('error');
        showToast(`Errore sincronizzazione: ${pushRes.error || 'Impossibile connettersi'}`);
      }
    }
  };

  // Bootstrap app data
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        await openDatabase();
        const tags = await cleanupAndDeduplicateTags();
        if (isMounted) setAllTags(tags);

        // Load saved theme or default to minimal
        const themeRow = await DB.get<{ key: string; value: ThemeMode }>('settings', 'theme_mode');
        let initialTheme: ThemeMode = themeRow?.value || 'minimal';
        // Normalize legacy theme names
        if ((initialTheme as any) === 'light' || (initialTheme as any) === 'lavender') initialTheme = 'minimal';
        if ((initialTheme as any) === 'dark') initialTheme = 'cyber';
        if ((initialTheme as any) === 'ocean') initialTheme = 'midnight';

        if (isMounted) {
          setThemeMode(initialTheme);
          applyTheme(initialTheme);
        }

        // Load saved PIN settings
        const pinEnabledRow = await DB.get<{ key: string; value: boolean }>('settings', 'pin_enabled');
        const pinCodeRow = await DB.get<{ key: string; value: string }>('settings', 'pin_code');
        const recoveryEmailRow = await DB.get<{ key: string; value: string }>('settings', 'pin_recovery_email');
        const localEmail = localStorage.getItem('diariamente_recovery_email');
        if (recoveryEmailRow?.value || localEmail) {
          if (isMounted) {
            setRecoveryEmail(recoveryEmailRow?.value || localEmail || 'samuele.lavoroba@gmail.com');
          }
        }
        const bioEnabledRow = await DB.get<{ key: string; value: boolean }>('settings', 'biometrics_enabled');
        const bioCredRow = await DB.get<{ key: string; value: string }>('settings', 'biometric_credential_id');

        const bioSupported = await checkBiometricsAvailability();
        if (isMounted) {
          setIsBiometricsSupported(bioSupported);
        }

        if (pinEnabledRow?.value && pinCodeRow?.value) {
          if (isMounted) {
            setPinEnabled(true);
            setPinCode(pinCodeRow.value);
            setIsLocked(true);
          }
        }

        if (bioEnabledRow?.value) {
          if (isMounted) {
            setBiometricsEnabled(true);
            if (bioCredRow?.value) setBiometricCredentialId(bioCredRow.value);
            if (pinEnabledRow?.value) setIsLocked(true);
          }
        }

        // Load saved Cloud Sync PIN (check DB and localStorage)
        const syncPinRow = await DB.get<{ key: string; value: string }>('settings', 'sync_pin');
        let activeSyncPin = syncPinRow?.value;
        if (!activeSyncPin) {
          try {
            activeSyncPin = localStorage.getItem('diariamente_sync_pin') || localStorage.getItem('diariomente_sync_pin') || '';
          } catch {}
        }

        if (activeSyncPin && isMounted) {
          setSyncPin(activeSyncPin);
          setSyncStatus('syncing');
          // Auto-fetch from Supabase when app opens
          SyncService.pull(activeSyncPin).then(async (res) => {
            if (res.success && res.data) {
              if (res.data.entries && Array.isArray(res.data.entries)) {
                for (const entry of res.data.entries) {
                  await DB.put('entries', entry);
                }
              }
              if (res.data.tags && Array.isArray(res.data.tags)) {
                for (const tag of res.data.tags) {
                  await DB.put('tags', tag);
                }
              }
              const updatedTags = await cleanupAndDeduplicateTags();
              if (isMounted) {
                setAllTags(updatedTags);
                setSyncStatus('synced');
                setLastSyncedAt(res.data.updatedAt || new Date().toISOString());
              }
              await loadEntries('30');
            } else {
              if (isMounted) setSyncStatus('idle');
            }
          }).catch((err) => {
            console.warn('Auto fetch cloud error on startup:', err);
            if (isMounted) setSyncStatus('error');
          });
        }

        if (isMounted) {
          setIsDbReady(true);
          await loadEntries('30');
        }
      } catch (err) {
        console.error('Failed to bootstrap app:', err);
        if (isMounted) {
          setIsDbReady(true);
        }
      }
    }

    init();

    // Online / Offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [applyTheme, loadEntries]);

  // Reload entries on filter change
  useEffect(() => {
    if (isDbReady) {
      loadEntries(currentView === 'dashboard' ? dashPeriod : periodFilter);
    }
    // Smooth scroll to top on view changes
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [periodFilter, dashPeriod, currentView, isDbReady, loadEntries]);

  // Auto theme system preference listener
  useEffect(() => {
    if (themeMode !== 'auto') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyTheme('auto');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeMode, applyTheme]);

  // Toggle theme mode via Quick Button in Header (Clean Light <-> Dark Switch)
  const handleToggleThemeMode = async () => {
    const isCurrentlyDark =
      themeMode === 'cyber' ||
      themeMode === 'midnight' ||
      themeMode === 'violet' ||
      (themeMode === 'auto' &&
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    const nextTheme: ThemeMode = isCurrentlyDark ? 'minimal' : 'cyber';

    setThemeMode(nextTheme);
    applyTheme(nextTheme);
    await DB.put('settings', { key: 'theme_mode', value: nextTheme });

    const labels: Record<ThemeMode, string> = {
      cyber: 'Scuro Neon (Cyber Dark)',
      minimal: 'Light Minimal (Chiaro)',
      midnight: 'Midnight Blue (Oceano/Notte)',
      earth: 'Warm Earth (Sabbia/Caldo)',
      violet: 'Ametista (Viola Profondo)',
      auto: 'Automatico (Sistema)',
    };
    showToast(`Tema attivo: ${labels[nextTheme]}`);
  };

  // Open New Entry form
  const handleOpenNewEntry = () => {
    setEditingEntryId(null);
    setEntryDraft(createBlankEntry());
    navigateToView('entry');
  };

  // Open Edit Entry form
  const handleOpenEditEntry = (entryId: string) => {
    const found = entries.find((e) => e.id === entryId);
    if (!found) return;
    setEditingEntryId(entryId);
    setEntryDraft(JSON.parse(JSON.stringify(found)));
    navigateToView('entry');
  };

  // Save Entry (Create / Update)
  const handleSaveEntry = async (draft: CbtEntry) => {
    try {
      await DB.put('entries', draft);
      showToast('Voce di diario salvata con successo');
      await loadEntries(periodFilter);
      navigateToView('timeline');
      setEntryDraft(null);

      // Auto cloud sync
      if (syncPin) {
        handleSyncPush(syncPin);
      }
    } catch (err) {
      console.error(err);
      showToast('Errore durante il salvataggio');
    }
  };

  // Delete single entry
  const handleDeleteEntry = (entryId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Elimina Voce',
      message: 'Sei sicuro di voler eliminare definitivamente questa registrazione?',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        await DB.delete('entries', entryId);
        showToast('Voce eliminata');
        await loadEntries(periodFilter);
        navigateToView('timeline');

        // Auto cloud sync
        if (syncPin) {
          handleSyncPush(syncPin);
        }
      },
    });
  };

  // Add custom tag
  const handleAddCustomTag = async (category: 'emotion' | 'physical_symptom', label: string) => {
    const cleanLabel = label.trim();
    if (!cleanLabel) return;

    const existing = allTags.find(
      (t) => t.category === category && t.label.trim().toLowerCase() === cleanLabel.toLowerCase()
    );

    if (existing) {
      showToast(`"${cleanLabel}" è già presente nella lista`);
      return;
    }

    const newTag: Tag = {
      id: 'tag-custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
      label: cleanLabel,
      category,
      isCustom: 1,
    };
    await DB.put('tags', newTag);
    const updatedTags = await cleanupAndDeduplicateTags();
    setAllTags(updatedTags);
    showToast(`Tag "${cleanLabel}" aggiunto`);

    if (syncPin) {
      handleSyncPush(syncPin);
    }
  };

  // Delete custom tag
  const handleDeleteCustomTag = async (tagId: string) => {
    await DB.delete('tags', tagId);
    const updatedTags = await cleanupAndDeduplicateTags();
    setAllTags(updatedTags);
    showToast('Tag eliminato');

    if (syncPin) {
      handleSyncPush(syncPin);
    }
  };

  // PIN and Biometrics Settings Handlers
  const handleSavePinAndRecoveryEmail = async (newPin: string, newEmail: string): Promise<boolean> => {
    if (!newPin || !/^\d{4}$/.test(newPin)) {
      showToast('PIN non valido. Inserisci esattamente 4 cifre.');
      return false;
    }
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showToast('Inserisci un indirizzo email valido per il recupero.');
      return false;
    }
    try {
      await DB.put('settings', { key: 'pin_enabled', value: true });
      await DB.put('settings', { key: 'pin_code', value: newPin });
      await DB.put('settings', { key: 'pin_recovery_email', value: cleanEmail });
      try {
        localStorage.setItem('diariamente_recovery_email', cleanEmail);
      } catch {}

      setPinEnabled(true);
      setPinCode(newPin);
      setRecoveryEmail(cleanEmail);

      // Save to Supabase Cloud
      saveRecoveryEmailToCloud(cleanEmail, newPin);

      showToast('PIN ed Email di recupero salvati con successo!');
      return true;
    } catch (err) {
      console.error(err);
      showToast('Errore salvataggio impostazioni di sicurezza');
      return false;
    }
  };

  const handleSavePin = async (newPin: string): Promise<boolean> => {
    return handleSavePinAndRecoveryEmail(newPin, recoveryEmail || 'samuele.lavoroba@gmail.com');
  };

  const handleTogglePin = async (enabled: boolean) => {
    if (enabled) {
      await DB.put('settings', { key: 'pin_enabled', value: true });
      setPinEnabled(true);
      if (!pinCode) {
        showToast('Imposta un PIN a 4 cifre per completare la protezione');
      } else {
        showToast('Protezione con PIN attivata');
      }
    } else {
      await DB.put('settings', { key: 'pin_enabled', value: false });
      await DB.put('settings', { key: 'biometrics_enabled', value: false });
      setPinEnabled(false);
      setBiometricsEnabled(false);
      showToast('Protezione PIN e biometrica disattivata');
    }
  };

  const handleToggleBiometrics = async (enabled: boolean): Promise<boolean> => {
    if (enabled) {
      try {
        const res = await registerBiometricCredential();
        if (res.success && res.credentialId) {
          await DB.put('settings', { key: 'biometrics_enabled', value: true });
          await DB.put('settings', { key: 'biometric_credential_id', value: res.credentialId });
          setBiometricsEnabled(true);
          setBiometricCredentialId(res.credentialId);
          showToast('Face ID / Riconoscimento biometrico configurato con successo!');
          return true;
        } else {
          showToast(res.error || 'Face ID non disponibile o annullato.');
          return false;
        }
      } catch (err: any) {
        showToast(err?.message || 'Errore configurazione Face ID');
        return false;
      }
    } else {
      await DB.put('settings', { key: 'biometrics_enabled', value: false });
      setBiometricsEnabled(false);
      showToast('Sblocco con Face ID disattivato');
      return true;
    }
  };

  const handleLockAppNow = () => {
    if (pinCode || biometricsEnabled) {
      setIsLocked(true);
      showToast('Applicazione bloccata');
    } else {
      showToast('Configura prima un PIN per bloccare l\'app');
    }
  };

  // Export JSON Backup
  const handleExportJson = async () => {
    const allEntries = await DB.getAll<CbtEntry>('entries');
    const tags = await DB.getAll<Tag>('tags');
    const payload = {
      exportedAt: new Date().toISOString(),
      appName: 'Diariamente',
      entries: allEntries,
      tags,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diariamente-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Backup JSON scaricato');
  };

  // Export Spreadsheet (.CSV) formatted for therapist review: Data | Categoria | Domanda | Risposta | Valore (0-100)
  const handleExportCsv = async () => {
    const allEntries = await DB.getAll<CbtEntry>('entries');
    if (allEntries.length === 0) {
      showToast('Nessuna registrazione da esportare');
      return;
    }

    const csvContent = generateTherapistCsv(allEntries, allTags, customQuestions, {
      patientName: localStorage.getItem('diariamente_patient_name') || '',
      period: 'all',
      includeMetrics: true,
      includeSituationTriggers: true,
      includeThoughts: true,
      includeEmotionsSymptoms: true,
      includeBehaviors: true,
      includeCustomQuestions: true,
      includeNotes: true,
      includeSummaryTable: true,
      sortOrder: 'asc',
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diariamente-tabella-seduta-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('File CSV/Excel scaricato con successo');
  };

  // Import JSON Backup
  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const payload = JSON.parse(text);
        if (!payload.entries || !Array.isArray(payload.entries)) {
          showToast('File di backup non valido');
          return;
        }

        setConfirmModal({
          isOpen: true,
          title: 'Importa Backup',
          message: `Trovate ${payload.entries.length} registrazioni. Desideri importarle nel tuo database locale?`,
          isDanger: false,
          onConfirm: async () => {
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            for (const entry of payload.entries) {
              await DB.put('entries', entry);
            }
            if (payload.tags && Array.isArray(payload.tags)) {
              for (const tag of payload.tags) {
                await DB.put('tags', tag);
              }
            }
            const updatedTags = await cleanupAndDeduplicateTags();
            setAllTags(updatedTags);
            await loadEntries(periodFilter);
            showToast('Backup importato con successo');

            if (syncPin) {
              handleSyncPush(syncPin);
            }
          },
        });
      } catch {
        showToast('Errore durante la lettura del file');
      }
    };
    reader.readAsText(file);
  };

  // Clear all data
  const handleDeleteAllData = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Elimina Tutti i Dati',
      message: 'ATTENZIONE: Questa azione cancellerà irrevocabilmente tutte le registrazioni e impostazioni salvate su questo dispositivo.',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        await DB.clear('entries');
        await DB.clear('tags');
        await DB.clear('settings');
        const freshTags = await seedDefaultTagsIfNeeded();
        setAllTags(freshTags);
        await loadEntries(periodFilter);
        navigateToView('timeline');
        showToast('Tutti i dati sono stati azzerati');
      },
    });
  };

  const selectedDetailEntry = entries.find((e) => e.id === detailEntryId);

  // Custom Questions State & Handlers
  const [customQuestions, setCustomQuestions] = useState<CustomQuestion[]>(() =>
    CustomQuestionsService.load()
  );

  const handleCreateCustomQuestion = (data: Omit<CustomQuestion, 'id' | 'createdAt' | 'isDefault'>) => {
    CustomQuestionsService.create(data);
    setCustomQuestions(CustomQuestionsService.load());
    showToast('Nuova domanda personalizzata aggiunta!');
  };

  const handleUpdateCustomQuestion = (q: CustomQuestion) => {
    CustomQuestionsService.update(q);
    setCustomQuestions(CustomQuestionsService.load());
    showToast('Domanda aggiornata con successo!');
  };

  const handleDeleteCustomQuestion = (id: string) => {
    CustomQuestionsService.delete(id);
    setCustomQuestions(CustomQuestionsService.load());
    showToast('Domanda eliminata');
  };

  const handleToggleCustomQuestion = (id: string, isEnabled: boolean) => {
    CustomQuestionsService.toggle(id, isEnabled);
    setCustomQuestions(CustomQuestionsService.load());
    showToast(isEnabled ? 'Domanda attivata nel diario' : 'Domanda disattivata dal diario');
  };

  const handleResetCustomQuestionsDefaults = () => {
    const res = CustomQuestionsService.resetToDefaults();
    setCustomQuestions(res);
    showToast('Domande predefinite ripristinate!');
  };

  if (!isDbReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-page)] text-[var(--text-primary)]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold tracking-wider uppercase text-[var(--text-primary)]">Inizializzazione Diariamente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full app-root-container flex flex-col font-sans transition-colors duration-200">
      {/* Splash Screen / Intro Cover Screen */}
      <AnimatePresence>
        {showSplash && (
          <SplashScreen onStart={handleDismissSplash} />
        )}
      </AnimatePresence>

      {/* Lock screen overlay if PIN lock is enabled */}
      {isLocked && (
        <LockScreen
          correctPin={pinCode}
          recoveryEmail={recoveryEmail}
          biometricsEnabled={biometricsEnabled}
          biometricCredentialId={biometricCredentialId}
          onUnlock={() => setIsLocked(false)}
          onResetPinSuccess={(newPin) => {
            handleSavePinAndRecoveryEmail(newPin, recoveryEmail || 'samuele.lavoroba@gmail.com');
            setIsLocked(false);
          }}
        />
      )}

      {/* Cerchio Luminoso di Sfondo (Halo Glow Reflector: 600px x 600px) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 flex items-center justify-center">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(200, 210, 255, 0.4) 40%, transparent 70%)',
            filter: 'blur(35px)',
            zIndex: 0,
            opacity: 0.16,
          }}
          aria-hidden="true"
        />
      </div>

      {/* Main App Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, filter: 'blur(8px)' }}
        animate={{
          opacity: showSplash ? 0 : 1,
          scale: showSplash ? 0.96 : 1,
          filter: showSplash ? 'blur(8px)' : 'blur(0px)',
        }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 w-full max-w-2xl lg:max-w-3xl mx-auto flex flex-col relative"
      >
        <Header
          currentView={currentView}
          themeMode={themeMode}
          onToggleTheme={handleToggleThemeMode}
          onNewEntry={handleOpenNewEntry}
          isOnline={isOnline}
          isPrivacyModeEnabled={isPrivacyModeEnabled}
          onTogglePrivacyMode={handleTogglePrivacyMode}
          onShowSplash={() => setShowSplash(true)}
        />

        <main className="flex-1 px-4 sm:px-6 pt-3 pb-24 overflow-x-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentView}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={pageTransition}
              className="w-full min-h-full"
            >
              {currentView === 'timeline' && (
                <TimelineView
                  entries={entries}
                  allTags={allTags}
                  periodFilter={periodFilter}
                  onFilterChange={(p) => setPeriodFilter(p)}
                  onSelectEntry={(id) => {
                    setDetailEntryId(id);
                    navigateToView('detail');
                  }}
                  onEditEntry={handleOpenEditEntry}
                  onExportEntry={handleExportSingleEntry}
                  onNewEntry={handleOpenNewEntry}
                  isPrivacyModeEnabled={isPrivacyModeEnabled}
                  onTogglePrivacyMode={handleTogglePrivacyMode}
                />
              )}

              {currentView === 'entry' && entryDraft && (
                <EntryFormView
                  initialDraft={entryDraft}
                  allTags={allTags}
                  isEditing={!!editingEntryId}
                  onSave={handleSaveEntry}
                  onCancel={() => {
                    navigateToView('timeline');
                    setEntryDraft(null);
                  }}
                  onAddCustomTag={handleAddCustomTag}
                  onOpenCustomQuestions={() => navigateToView('custom_questions')}
                />
              )}

              {currentView === 'detail' && selectedDetailEntry && (
                <DetailView
                  entry={selectedDetailEntry}
                  allTags={allTags}
                  onBack={() => navigateToView('timeline')}
                  onEdit={() => handleOpenEditEntry(selectedDetailEntry.id)}
                  onDelete={() => handleDeleteEntry(selectedDetailEntry.id)}
                  onExport={() => handleExportSingleEntry(selectedDetailEntry)}
                />
              )}

              {currentView === 'dashboard' && (
                <DashboardView
                  entries={entries}
                  dashPeriod={dashPeriod}
                  onPeriodChange={(p) => setDashPeriod(p)}
                  onExportReport={handleOpenTherapistModal}
                />
              )}

              {currentView === 'custom_questions' && (
                <CustomQuestionsView
                  questions={customQuestions}
                  onCreateQuestion={handleCreateCustomQuestion}
                  onUpdateQuestion={handleUpdateCustomQuestion}
                  onDeleteQuestion={handleDeleteCustomQuestion}
                  onToggleQuestion={handleToggleCustomQuestion}
                  onResetDefaults={handleResetCustomQuestionsDefaults}
                  onBack={() => navigateToView('timeline')}
                />
              )}

              {currentView === 'settings' && (
                <SettingsView
                  pinEnabled={pinEnabled}
                  pinCode={pinCode}
                  recoveryEmail={recoveryEmail}
                  onTogglePin={handleTogglePin}
                  onSavePin={handleSavePin}
                  onSavePinAndRecoveryEmail={handleSavePinAndRecoveryEmail}
                  biometricsEnabled={biometricsEnabled}
                  onToggleBiometrics={handleToggleBiometrics}
                  isBiometricsSupported={isBiometricsSupported}
                  onLockApp={handleLockAppNow}
                  themeMode={themeMode}
                  onThemeChange={(m) => {
                    setThemeMode(m);
                    applyTheme(m);
                    DB.put('settings', { key: 'theme_mode', value: m });
                  }}
                  syncPin={syncPin}
                  syncStatus={syncStatus}
                  lastSyncedAt={lastSyncedAt}
                  onSaveSyncPin={handleSaveSyncPin}
                  onManualSyncPush={() => handleSyncPush(syncPin)}
                  onManualSyncPull={() => handleSyncPull(syncPin, true)}
                  onTestConnection={handleTestConnection}
                  onExportJson={handleExportJson}
                  onExportTherapistReport={handleOpenTherapistModal}
                  onExportCsv={handleExportCsv}
                  onImportJson={handleImportJson}
                  allTags={allTags}
                  onDeleteCustomTag={handleDeleteCustomTag}
                  onDeleteAllData={handleDeleteAllData}
                  onShowSplash={() => setShowSplash(true)}
                  onNavigateToCustomQuestions={() => navigateToView('custom_questions')}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>

      {/* Permanently Fixed Bottom Navigation */}
      {!showSplash && (
        <BottomNav
          currentView={currentView}
          onSelectView={(view) => {
            navigateToView(view);
            if (view === 'timeline') loadEntries(periodFilter);
            if (view === 'dashboard') loadEntries(dashPeriod);
          }}
        />
      )}

      <Toast message={toastMsg} />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDanger={confirmModal.isDanger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      <TherapistExportModal
        isOpen={isTherapistExportModalOpen}
        onClose={() => setIsTherapistExportModalOpen(false)}
        entries={exportEntries.length > 0 ? exportEntries : entries}
        allTags={allTags}
        customQuestions={customQuestions}
        onShowToast={showToast}
      />
    </div>
  );
}
