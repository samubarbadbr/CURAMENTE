import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CbtEntry, Tag, ViewType, PeriodFilter, ThemeMode } from './types';
import { DB, seedDefaultTagsIfNeeded, cleanupAndDeduplicateTags, createBlankEntry, openDatabase } from './services/db';
import { SyncService } from './services/sync';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { LockScreen } from './components/LockScreen';
import { Toast } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { TimelineView } from './views/TimelineView';
import { EntryFormView } from './views/EntryFormView';
import { DetailView } from './views/DetailView';
import { DashboardView } from './views/DashboardView';
import { SettingsView } from './views/SettingsView';

const viewOrder: Record<ViewType, number> = {
  timeline: 0,
  entry: 0.5,
  detail: 0.5,
  dashboard: 1,
  settings: 2,
};

const pageVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 36 : dir < 0 ? -36 : 0,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir < 0 ? 36 : dir > 0 ? -36 : 0,
    opacity: 0,
  }),
};

const pageTransition = {
  type: 'tween',
  ease: [0.25, 1, 0.5, 1],
  duration: 0.22,
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
  const [isLocked, setIsLocked] = useState(false);

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

        if (pinEnabledRow?.value && pinCodeRow?.value) {
          if (isMounted) {
            setPinEnabled(true);
            setPinCode(pinCodeRow.value);
            setIsLocked(true);
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

  // PIN settings toggle
  const handleTogglePin = async (enabled: boolean) => {
    if (enabled) {
      const pin = window.prompt('Imposta un PIN a 4 cifre per sbloccare la tua app:');
      if (!pin || !/^\d{4}$/.test(pin)) {
        showToast('PIN non valido. Inserisci esattamente 4 cifre.');
        return;
      }
      await DB.put('settings', { key: 'pin_enabled', value: true });
      await DB.put('settings', { key: 'pin_code', value: pin });
      setPinEnabled(true);
      setPinCode(pin);
      showToast('Protezione con PIN attivata');
    } else {
      await DB.put('settings', { key: 'pin_enabled', value: false });
      setPinEnabled(false);
      setPinCode('');
      showToast('Protezione con PIN disattivata');
    }
  };

  // Export JSON Backup
  const handleExportJson = async () => {
    const allEntries = await DB.getAll<CbtEntry>('entries');
    const tags = await DB.getAll<Tag>('tags');
    const payload = {
      exportedAt: new Date().toISOString(),
      appName: 'Curamente',
      entries: allEntries,
      tags,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curamente-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Backup JSON scaricato');
  };

  // Export Plain Text (.TXT)
  const handleExportTxt = async () => {
    const allEntries = await DB.getAll<CbtEntry>('entries');
    allEntries.sort((a, b) => new Date(b.eventDatetime).getTime() - new Date(a.eventDatetime).getTime());

    if (allEntries.length === 0) {
      showToast('Nessuna registrazione da esportare');
      return;
    }

    const tagMap = new Map(allTags.map((t) => [t.id, t.label]));

    let txtContent = `==================================================\n`;
    txtContent += `DIARIAMENTE - REGISTRO E MONITORAGGIO PERSONALE\n`;
    txtContent += `Data Esportazione: ${new Date().toLocaleString('it-IT')}\n`;
    txtContent += `Totale Registrazioni: ${allEntries.length}\n`;
    txtContent += `==================================================\n\n`;

    allEntries.forEach((entry, idx) => {
      const dateStr = new Date(entry.eventDatetime).toLocaleString('it-IT', {
        dateStyle: 'full',
        timeStyle: 'short',
      });
      const emotions = entry.emotionTagIds.map((id) => tagMap.get(id) || id).join(', ');
      const symptoms = entry.physicalSymptomTagIds.map((id) => tagMap.get(id) || id).join(', ');

      txtContent += `--------------------------------------------------\n`;
      txtContent += `REGISTRAZIONE #${allEntries.length - idx}\n`;
      txtContent += `Data e Ora Evento: ${dateStr}\n`;
      txtContent += `Situazione: ${entry.situation || 'N/D'}\n`;
      txtContent += `Fattori Scatenanti: ${entry.triggerFactors || 'N/D'}\n`;
      txtContent += `Pensiero Automatico Negativo: ${entry.negativeThought || 'N/D'}\n`;
      txtContent += `Livello Credenza Iniziale: ${entry.thoughtBeliefLevel}%\n`;
      txtContent += `Intensità del Pensiero: ${entry.negativeThoughtsIntensity}%\n`;
      txtContent += `Emozioni Provate: ${emotions || 'Nessuna'}\n`;
      txtContent += `Sintomi Fisici: ${symptoms || 'Nessuno'}\n`;
      if (entry.physicalSymptomsText) txtContent += `Dettaglio Sintomi Fisici: ${entry.physicalSymptomsText}\n`;
      txtContent += `Attenzione sul Corpo: ${entry.bodyFocusedAttentionLevel}%\n`;
      txtContent += `Sintomi Controllati: ${entry.symptomControlDescription || 'Nessuno'}\n`;
      txtContent += `Check di Controllo: ${entry.symptomControlCount} volte\n`;
      txtContent += `Rassicurazioni Cercate: ${entry.reassuranceSeekingType || 'Nessuna'} (${entry.reassuranceSeekingCount} volte)\n`;
      txtContent += `Evitamenti Messi in Atto: ${entry.avoidanceType || 'Nessuno'} (${entry.avoidanceCount} volte)\n`;
      txtContent += `Ansia Complessiva: ${entry.overallAnxietyLevel} / 100\n`;
      if (entry.notes) txtContent += `Note & Riflessioni: ${entry.notes}\n`;
      txtContent += `--------------------------------------------------\n\n`;
    });

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curamente-registrazioni-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('File TXT scaricato con successo');
  };

  // Export Spreadsheet (.CSV) with UTF-8 BOM, strict quoting and double-quote escaping
  const handleExportCsv = async () => {
    const allEntries = await DB.getAll<CbtEntry>('entries');
    allEntries.sort((a, b) => new Date(b.eventDatetime).getTime() - new Date(a.eventDatetime).getTime());

    if (allEntries.length === 0) {
      showToast('Nessuna registrazione da esportare');
      return;
    }

    const tagMap = new Map(allTags.map((t) => [t.id, t.label]));

    const headers = [
      'ID',
      'Data e Ora',
      'Situazione',
      'Fattori Scatenanti',
      'Pensiero Negativo Automatico',
      'Credenza nel Pensiero (%)',
      'Intensita Pensiero (%)',
      'Emozioni',
      'Sintomi Fisici',
      'Dettaglio Sintomi Fisici',
      'Attenzione al Corpo (%)',
      'Sintomi Controllati',
      'Numero Controlli',
      'Tipo Rassicurazioni',
      'Numero Rassicurazioni',
      'Tipo Evitamento',
      'Numero Evitamenti',
      'Ansia Complessiva (%)',
      'Note e Riflessioni',
    ];

    const escapeCsvField = (field: unknown): string => {
      if (field === null || field === undefined) {
        return '""';
      }
      const text = String(field).replace(/"/g, '""');
      return `"${text}"`;
    };

    // UTF-8 BOM prefix (\uFEFF) ensures Excel and third-party apps correctly render accented characters
    let csvContent = '\uFEFF';
    csvContent += headers.map(escapeCsvField).join(',') + '\r\n';

    allEntries.forEach((entry) => {
      const emotionLabels = (entry.emotionTagIds || []).map((id) => tagMap.get(id) || id).join('; ');
      const symptomLabels = (entry.physicalSymptomTagIds || []).map((id) => tagMap.get(id) || id).join('; ');

      const row = [
        entry.id,
        entry.eventDatetime,
        entry.situation || '',
        entry.triggerFactors || '',
        entry.negativeThought || '',
        entry.thoughtBeliefLevel ?? 0,
        entry.negativeThoughtsIntensity ?? 0,
        emotionLabels,
        symptomLabels,
        entry.physicalSymptomsText || '',
        entry.bodyFocusedAttentionLevel ?? 0,
        entry.symptomControlDescription || '',
        entry.symptomControlCount ?? 0,
        entry.reassuranceSeekingType || '',
        entry.reassuranceSeekingCount ?? 0,
        entry.avoidanceType || '',
        entry.avoidanceCount ?? 0,
        entry.overallAnxietyLevel ?? 0,
        entry.notes || '',
      ];

      csvContent += row.map(escapeCsvField).join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `diariamente-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast('File CSV scaricato con successo');
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

  // Printable Therapist Session Report PDF Export
  const handleExportPdfReport = async () => {
    const reportEntries = await DB.getAll<CbtEntry>('entries');
    reportEntries.sort((a, b) => new Date(a.eventDatetime).getTime() - new Date(b.eventDatetime).getTime());

    if (reportEntries.length === 0) {
      showToast('Nessuna registrazione disponibile per il report');
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      showToast('Abilita i popup nel browser per generare il report');
      return;
    }

    const rowsHtml = reportEntries
      .map((e) => {
        const d = new Date(e.eventDatetime).toLocaleString('it-IT', {
          dateStyle: 'short',
          timeStyle: 'short',
        });
        const emotionLabels = (e.emotionTagIds || [])
          .map((id) => allTags.find((t) => t.id === id)?.label)
          .filter(Boolean)
          .join(', ');

        return `
          <tr>
            <td><strong>${d}</strong></td>
            <td>${e.situation || '—'}</td>
            <td>${emotionLabels || '—'}</td>
            <td>${e.negativeThought || '—'} (${e.thoughtBeliefLevel}%)</td>
            <td><strong style="color:${e.overallAnxietyLevel > 60 ? '#C97B7B' : '#7B8CDE'}">${e.overallAnxietyLevel}/100</strong></td>
            <td>${e.symptomControlCount} check</td>
            <td>${e.reassuranceSeekingCount} volte</td>
            <td>${e.avoidanceCount} volte</td>
          </tr>
        `;
      })
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <title>Report Registrazioni - Diariamente</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #1a201c; padding: 32px; background: #fff; }
          .header { border-bottom: 2px solid #7B8CDE; padding-bottom: 16px; margin-bottom: 24px; }
          h1 { margin: 0 0 4px 0; color: #212823; font-size: 24px; }
          .subtitle { margin: 0; color: #5A675E; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th { background: #EBF1EC; text-align: left; padding: 8px 10px; border-bottom: 2px solid #8B9B90; color: #212823; font-weight: bold; }
          td { padding: 8px 10px; border-bottom: 1px solid #E3E9E4; vertical-align: top; }
          .footer { margin-top: 32px; font-size: 11px; color: #88968C; border-top: 1px solid #E3E9E4; padding-top: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Diariamente — Report Consultazione & Monitoraggio</h1>
          <p class="subtitle">Generato il ${new Date().toLocaleDateString('it-IT')} — Totale voci registrate: ${reportEntries.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Data/Ora</th>
              <th>Situazione</th>
              <th>Emozioni</th>
              <th>Pensiero Automatico</th>
              <th>Ansia</th>
              <th>Controllo</th>
              <th>Rassicurazioni</th>
              <th>Evitamenti</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="footer">
          Documento riservato generato da Curamente PWA. Tutti i dati sono elaborati in modo sicuro.
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        <\/script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  const selectedDetailEntry = entries.find((e) => e.id === detailEntryId);

  if (!isDbReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EBF0EC] dark:bg-[#121915] text-[#15251C] dark:text-[#EEF3EF]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#5B67CA] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold tracking-wider uppercase text-[#15251C] dark:text-[#A7B6AC]">Inizializzazione Curamente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full app-root-container flex flex-col font-sans transition-colors duration-200">
      {/* Lock screen overlay if PIN lock is enabled */}
      {isLocked && (
        <LockScreen
          correctPin={pinCode}
          onUnlock={() => setIsLocked(false)}
        />
      )}

      {/* Main App Container */}
      <div className="flex-1 w-full max-w-2xl lg:max-w-3xl mx-auto flex flex-col relative">
        <Header
          currentView={currentView}
          themeMode={themeMode}
          onToggleTheme={handleToggleThemeMode}
          onNewEntry={handleOpenNewEntry}
          isOnline={isOnline}
          isPrivacyModeEnabled={isPrivacyModeEnabled}
          onTogglePrivacyMode={handleTogglePrivacyMode}
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
                />
              )}

              {currentView === 'detail' && selectedDetailEntry && (
                <DetailView
                  entry={selectedDetailEntry}
                  allTags={allTags}
                  onBack={() => navigateToView('timeline')}
                  onEdit={() => handleOpenEditEntry(selectedDetailEntry.id)}
                  onDelete={() => handleDeleteEntry(selectedDetailEntry.id)}
                />
              )}

              {currentView === 'dashboard' && (
                <DashboardView
                  entries={entries}
                  dashPeriod={dashPeriod}
                  onPeriodChange={(p) => setDashPeriod(p)}
                  onExportReport={handleExportPdfReport}
                />
              )}

              {currentView === 'settings' && (
                <SettingsView
                  pinEnabled={pinEnabled}
                  onTogglePin={handleTogglePin}
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
                  onExportTxt={handleExportTxt}
                  onExportCsv={handleExportCsv}
                  onImportJson={handleImportJson}
                  allTags={allTags}
                  onDeleteCustomTag={handleDeleteCustomTag}
                  onDeleteAllData={handleDeleteAllData}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNav
          currentView={currentView}
          onSelectView={(view) => {
            navigateToView(view);
            if (view === 'timeline') loadEntries(periodFilter);
            if (view === 'dashboard') loadEntries(dashPeriod);
          }}
        />
      </div>

      <Toast message={toastMsg} />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDanger={confirmModal.isDanger}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
