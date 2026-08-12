import { useState, useEffect, useCallback } from 'react';
import { CbtEntry, Tag, ViewType, PeriodFilter, ThemeMode } from './types';
import { DB, seedDefaultTagsIfNeeded, createBlankEntry, openDatabase } from './services/db';
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
  const [themeMode, setThemeMode] = useState<ThemeMode>('auto');

  // Security & Lock
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinCode, setPinCode] = useState<string>('');
  const [isLocked, setIsLocked] = useState(false);

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
    document.documentElement.classList.remove('dark', 'theme-light', 'theme-dark');
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (mode === 'light') {
      // light mode default
    } else {
      // Auto: follow system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
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

  // Bootstrap app data
  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        await openDatabase();
        const tags = await seedDefaultTagsIfNeeded();
        if (isMounted) setAllTags(tags);

        // Load saved theme
        const savedThemeRow = await DB.get<{ key: string; value: ThemeMode }>('settings', 'theme_mode');
        const theme = savedThemeRow ? savedThemeRow.value : 'auto';
        if (isMounted) {
          setThemeMode(theme);
          applyTheme(theme);
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
    const nextTheme: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(nextTheme);
    applyTheme(nextTheme);
    await DB.put('settings', { key: 'theme_mode', value: nextTheme });
    showToast(`Tema impostato: ${nextTheme === 'dark' ? 'Scuro' : 'Chiaro'}`);
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
  };

  // Delete custom tag
  const handleDeleteCustomTag = async (tagId: string) => {
    await DB.delete('tags', tagId);
    const updatedTags = await DB.getAll<Tag>('tags');
    setAllTags(updatedTags);
    showToast('Tag eliminato');
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
      appName: 'Diario Mente',
      entries: allEntries,
      tags,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diario-mente-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Backup JSON scaricato');
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
        <title>Report Seduta Terapeutica CBT - Diario Mente</title>
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
          <h1>Diario Mente — Report Consultazione CBT</h1>
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
          Documento riservato generato da Diario Mente PWA. Tutti i dati sono rimasti privati ed elaborati offline nel browser del paziente.
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
      <div className="min-h-screen flex items-center justify-center bg-[#E8EFEA] dark:bg-[#121915] text-[#14241B] dark:text-[#EEF3EF]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#5B67CA] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold tracking-wider uppercase text-[#14241B] dark:text-[#A7B6AC]">Inizializzazione Diario Mente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E8EFEA] dark:bg-[#121915] text-[#14241B] dark:text-[#EEF3EF] flex flex-col font-sans transition-colors duration-200">
      {/* Lock screen overlay if PIN lock is enabled */}
      {isLocked && (
        <LockScreen
          correctPin={pinCode}
          onUnlock={() => setIsLocked(false)}
        />
      )}

      {/* Main App Container */}
      <div className="flex-1 max-w-lg w-full mx-auto flex flex-col relative">
        <Header
          currentView={currentView}
          themeMode={themeMode}
          onToggleTheme={handleToggleThemeMode}
          onNewEntry={handleOpenNewEntry}
          isOnline={isOnline}
        />

        <main className="flex-1 px-4 pt-3 pb-24">
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
              onExportJson={handleExportJson}
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
