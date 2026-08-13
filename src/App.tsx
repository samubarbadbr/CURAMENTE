import { useState, useEffect, useCallback } from 'react';
import { CbtEntry, Tag, ViewType, PeriodFilter, ThemeMode } from './types';
import { DB, seedDefaultTagsIfNeeded, createBlankEntry, openDatabase } from './services/db';
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

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [entries, setEntries] = useState<CbtEntry[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('timeline');

  // Form & Detail states
  const [entryDraft, setEntryDraft] = useState<CbtEntry | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [detailEntryId, setDetailEntryId] = useState<string | null>(null);

  // Filters & Theme
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30');
  const [dashPeriod, setDashPeriod] = useState<PeriodFilter>('30');
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

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
    root.classList.remove('dark', 'theme-light', 'theme-dark', 'theme-lavender', 'theme-ocean');

    let effectiveMode = mode;
    if (mode === 'auto') {
      effectiveMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    if (effectiveMode === 'dark') {
      root.classList.add('dark', 'theme-dark');
    } else if (effectiveMode === 'lavender') {
      root.classList.add('theme-lavender');
    } else if (effectiveMode === 'ocean') {
      root.classList.add('dark', 'theme-ocean');
    } else {
      root.classList.add('theme-light');
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
      if (!silent) showToast('Errore salvataggio: PIN non impostato');
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
        if (!silent) showToast(`Dati salvati sul Cloud per il PIN ${pin}!`);
        return true;
      } else {
        setSyncStatus('error');
        if (!silent) showToast(`Errore salvataggio: ${res.error || 'Connessione fallita'}`);
        return false;
      }
    } catch (err: any) {
      console.error('Sync push failed:', err);
      setSyncStatus('error');
      if (!silent) showToast(`Errore salvataggio: ${err?.message || 'Connessione fallita'}`);
      return false;
    }
  }, [syncPin]);

  // Sync Pull function
  const handleSyncPull = useCallback(async (pinToUse?: string, forceReload = false) => {
    const pin = pinToUse || syncPin;
    if (!pin) {
      showToast('Errore salvataggio: PIN non impostato');
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

        const updatedTags = await DB.getAll<Tag>('tags');
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
        showToast(`Errore salvataggio: ${res.error || 'Nessun dato trovato per questo PIN'}`);
        return false;
      }
    } catch (err: any) {
      console.error('Sync pull failed:', err);
      setSyncStatus('error');
      showToast(`Errore salvataggio: ${err?.message || 'Connessione fallita'}`);
      return false;
    }
  }, [syncPin, loadEntries, periodFilter]);

  // Save Sync PIN
  const handleSaveSyncPin = async (newPin: string) => {
    const cleanPin = newPin.trim().toLowerCase();
    setSyncPin(cleanPin);
    await DB.put('settings', { key: 'sync_pin', value: cleanPin });
    try {
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
      const updatedTags = await DB.getAll<Tag>('tags');
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
        showToast(`Errore salvataggio: ${pushRes.error || 'Impossibile connettersi'}`);
      }
    }
  };

  // Bootstrap app data
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        await openDatabase();
        const tags = await seedDefaultTagsIfNeeded();
        if (isMounted) setAllTags(tags);

        // Load saved theme or default to light
        const themeRow = await DB.get<{ key: string; value: ThemeMode }>('settings', 'theme_mode');
        const initialTheme: ThemeMode = themeRow?.value || 'light';
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
            activeSyncPin = localStorage.getItem('diariomente_sync_pin') || '';
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
              const updatedTags = await DB.getAll<Tag>('tags');
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
  }, [periodFilter, dashPeriod, currentView, isDbReady, loadEntries]);

  // Toggle theme mode
  const handleToggleThemeMode = async () => {
    const cycle: ThemeMode[] = ['light', 'dark', 'lavender', 'ocean'];
    const currentIndex = cycle.indexOf(themeMode);
    const nextTheme = cycle[(currentIndex + 1) % cycle.length] || 'light';

    setThemeMode(nextTheme);
    applyTheme(nextTheme);
    await DB.put('settings', { key: 'theme_mode', value: nextTheme });

    const labels: Record<ThemeMode, string> = {
      light: 'Verde Salvia',
      dark: 'Scuro Notte',
      lavender: 'Lilla Mente',
      ocean: 'Oceano Profondo',
      auto: 'Automatico',
    };
    showToast(`Tema: ${labels[nextTheme]}`);
  };

  // Open New Entry form
  const handleOpenNewEntry = () => {
    setEditingEntryId(null);
    setEntryDraft(createBlankEntry());
    setCurrentView('entry');
  };

  // Open Edit Entry form
  const handleOpenEditEntry = (entryId: string) => {
    const found = entries.find((e) => e.id === entryId);
    if (!found) return;
    setEditingEntryId(entryId);
    setEntryDraft(JSON.parse(JSON.stringify(found)));
    setCurrentView('entry');
  };

  // Save Entry (Create / Update)
  const handleSaveEntry = async (draft: CbtEntry) => {
    try {
      await DB.put('entries', draft);
      showToast('Voce di diario salvata con successo');
      await loadEntries(periodFilter);
      setCurrentView('timeline');
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
      message: 'Sei sicuro di voler eliminare definitivamente questa registrazione CBT?',
      isDanger: true,
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        await DB.delete('entries', entryId);
        showToast('Voce eliminata');
        await loadEntries(periodFilter);
        setCurrentView('timeline');

        // Auto cloud sync
        if (syncPin) {
          handleSyncPush(syncPin);
        }
      },
    });
  };

  // Add custom tag
  const handleAddCustomTag = async (category: 'emotion' | 'physical_symptom', label: string) => {
    const newTag: Tag = {
      id: 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9),
      label: label.trim(),
      category,
      isCustom: 1,
    };
    await DB.put('tags', newTag);
    const updatedTags = await DB.getAll<Tag>('tags');
    setAllTags(updatedTags);
    showToast(`Tag "${label}" aggiunto`);

    if (syncPin) {
      handleSyncPush(syncPin);
    }
  };

  // Delete custom tag
  const handleDeleteCustomTag = async (tagId: string) => {
    await DB.delete('tags', tagId);
    const updatedTags = await DB.getAll<Tag>('tags');
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
    txtContent += `CURAMENTE - REGISTRO DOMANDE & RISPOSTE CBT\n`;
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

  // Export Spreadsheet (.CSV)
  const handleExportCsv = async () => {
    const allEntries = await DB.getAll<CbtEntry>('entries');
    allEntries.sort((a, b) => new Date(b.eventDatetime).getTime() - new Date(a.eventDatetime).getTime());

    if (allEntries.length === 0) {
      showToast('Nessuna registrazione da esportare');
      return;
    }

    const tagMap = new Map(allTags.map((t) => [t.id, t.label]));

    const headers = [
      'Data e Ora',
      'Situazione',
      'Fattori Scatenanti',
      'Pensiero Negativo Automatico',
      'Credenza (%)',
      'Intensita Pensiero (%)',
      'Emozioni',
      'Sintomi Fisici',
      'Dettaglio Sintomi Fisici',
      'Attenzione Corpo (%)',
      'Sintomi Controllati',
      'Check Controllo (n)',
      'Rassicurazioni Tipo',
      'Rassicurazioni (n)',
      'Evitamento Tipo',
      'Evitamenti (n)',
      'Ansia Complessiva (%)',
      'Note e Riflessioni',
    ];

    const escapeCsv = (str: string | number | undefined | null) => {
      if (str === undefined || str === null) return '""';
      const val = String(str).replace(/"/g, '""');
      return `"${val}"`;
    };

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += headers.map(escapeCsv).join(',') + '\n';

    allEntries.forEach((e) => {
      const emotions = e.emotionTagIds.map((id) => tagMap.get(id) || id).join('; ');
      const symptoms = e.physicalSymptomTagIds.map((id) => tagMap.get(id) || id).join('; ');

      const row = [
        e.eventDatetime,
        e.situation,
        e.triggerFactors,
        e.negativeThought,
        e.thoughtBeliefLevel,
        e.negativeThoughtsIntensity,
        emotions,
        symptoms,
        e.physicalSymptomsText,
        e.bodyFocusedAttentionLevel,
        e.symptomControlDescription,
        e.symptomControlCount,
        e.reassuranceSeekingType,
        e.reassuranceSeekingCount,
        e.avoidanceType,
        e.avoidanceCount,
        e.overallAnxietyLevel,
        e.notes,
      ];

      csvContent += row.map(escapeCsv).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curamente-dati-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
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
            const updatedTags = await DB.getAll<Tag>('tags');
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
        setCurrentView('timeline');
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
        <title>Report Seduta Terapeutica CBT - Curamente</title>
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
          <h1>Curamente — Report Consultazione CBT</h1>
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
    <div className="min-h-screen w-full bg-[#EBF0EC] dark:bg-[#121915] text-[#15251C] dark:text-[#EEF3EF] flex flex-col font-sans transition-colors duration-200">
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
        />

        <main className="flex-1 px-4 sm:px-6 pt-3 pb-24">
          {currentView === 'timeline' && (
            <TimelineView
              entries={entries}
              allTags={allTags}
              periodFilter={periodFilter}
              onFilterChange={(p) => setPeriodFilter(p)}
              onSelectEntry={(id) => {
                setDetailEntryId(id);
                setCurrentView('detail');
              }}
              onEditEntry={handleOpenEditEntry}
              onNewEntry={handleOpenNewEntry}
            />
          )}

          {currentView === 'entry' && entryDraft && (
            <EntryFormView
              initialDraft={entryDraft}
              allTags={allTags}
              isEditing={!!editingEntryId}
              onSave={handleSaveEntry}
              onCancel={() => {
                setCurrentView('timeline');
                setEntryDraft(null);
              }}
              onAddCustomTag={handleAddCustomTag}
            />
          )}

          {currentView === 'detail' && selectedDetailEntry && (
            <DetailView
              entry={selectedDetailEntry}
              allTags={allTags}
              onBack={() => setCurrentView('timeline')}
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
              onExportJson={handleExportJson}
              onExportTxt={handleExportTxt}
              onExportCsv={handleExportCsv}
              onImportJson={handleImportJson}
              allTags={allTags}
              onDeleteCustomTag={handleDeleteCustomTag}
              onDeleteAllData={handleDeleteAllData}
            />
          )}
        </main>

        <BottomNav
          currentView={currentView}
          onSelectView={(view) => {
            setCurrentView(view);
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
