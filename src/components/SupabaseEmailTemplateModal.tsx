import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Eye,
  Code,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Mail
} from 'lucide-react';
import { SUPABASE_EMAIL_TEMPLATE_HTML } from '../data/supabaseEmailTemplate';

interface SupabaseEmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
}

export const SupabaseEmailTemplateModal: React.FC<SupabaseEmailTemplateModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'instructions'>('preview');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_EMAIL_TEMPLATE_HTML);
      setCopied(true);
      onShowToast('Template HTML copiato negli appunti!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      onShowToast('Errore durante la copia.');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([SUPABASE_EMAIL_TEMPLATE_HTML], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'diariamente-email-template.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('File HTML scaricato!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[var(--bg-surface)] rounded-2xl md:rounded-3xl border border-[var(--border-solid)] shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-500">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm md:text-base font-black text-[var(--text-primary)] flex items-center gap-1.5">
                <span>Template Email di Recupero</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                  Diariamente
                </span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Tema scuro (#050508), stile Apple Glassmorphic con link di conferma
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-transparent hover:border-[var(--border-subtle)] transition-all cursor-pointer"
            aria-label="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls & Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center space-x-1 p-0.5 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-subtle)]">
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-[var(--bg-surface)] text-indigo-500 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Anteprima Email</span>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'code'
                  ? 'bg-[var(--bg-surface)] text-indigo-500 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Codice HTML</span>
            </button>
            <button
              onClick={() => setActiveTab('instructions')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'instructions'
                  ? 'bg-[var(--bg-surface)] text-indigo-500 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Istruzioni</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] border border-[var(--border-solid)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer"
              title="Scarica file .html"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Scarica .html</span>
            </button>

            <button
              onClick={handleCopyCode}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiato!' : 'Copia Codice HTML'}</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {activeTab === 'preview' && (
            <div className="flex flex-col items-center">
              <div className="w-full mb-3 text-center">
                <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                  Anteprima reale di come i destinatari vedranno l'email su Apple Mail, Gmail e Webmail:
                </span>
              </div>

              {/* Email Container Simulation (#050508) */}
              <div className="w-full max-w-[560px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#050508] p-4 sm:p-6 text-zinc-100">
                
                {/* Simulated Email Card (#0d0e15) */}
                <div className="w-full rounded-2xl overflow-hidden bg-[#0d0e15] border border-white/10 shadow-2xl relative">
                  {/* Top glowing bar */}
                  <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-400" />

                  <div className="p-6 sm:p-8 text-center space-y-5">
                    {/* Icon */}
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/35 flex items-center justify-center text-indigo-300 text-xl font-black">
                      ✦
                    </div>

                    <div>
                      <h3 className="text-2xl font-black text-white tracking-tight">
                        Diariamente
                      </h3>
                      <p className="text-xs text-zinc-400 font-medium mt-1">
                        Il tuo spazio quotidiano per riflettere e crescere
                      </p>
                    </div>

                    <div className="h-px w-full bg-white/10" />

                    <div className="text-left space-y-3 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      <p>Gentile utente,</p>
                      <p>
                        abbiamo ricevuto una richiesta di ripristino per il codice di sicurezza (PIN) o di verifica per il tuo diario personale su <strong className="text-white">Diariamente</strong>.
                      </p>

                      <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-200 text-xs leading-relaxed">
                        🔒 <strong>La tua privacy è al sicuro:</strong> Le tue annotazioni, i tuoi pensieri e le tue registrazioni rimangono crittografati sul tuo dispositivo. Nessun intermediario può leggere i tuoi dati personali.
                      </div>
                    </div>

                    {/* Centered CTA button */}
                    <div className="pt-2 pb-2 flex justify-center">
                      <div className="inline-block py-3 px-8 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-500/30 border border-white/20 select-none">
                        Conferma e Reimposta PIN
                      </div>
                    </div>

                    {/* Direct link box */}
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-left text-[11px] text-zinc-400">
                      <p className="mb-1 font-medium">Se il pulsante non risponde al clic, usa questo indirizzo:</p>
                      <p className="font-mono text-indigo-300 break-all underline select-all">
                        https://ais-dev-nfpykdk7jfturfqazlkf4k-742591974870.europe-west2.run.app/#token=...
                      </p>
                    </div>

                    <p className="text-[11px] text-zinc-500 text-left">
                      Se non hai richiesto tu il ripristino, ignora questa email: il tuo PIN e i tuoi dati rimarranno al sicuro.
                    </p>
                  </div>

                  {/* Simulated Footer */}
                  <div className="p-4 bg-black/40 border-t border-white/5 text-center text-[10px] text-zinc-500">
                    <p className="font-semibold text-zinc-400">
                      Diariamente &bull; Riservatezza &bull; Spazio Quotidiano
                    </p>
                    <p className="mt-0.5">Comunicazione transazionale automatizzata protetta.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-medium">
                <span>Codice HTML compatibile con Outlook, Gmail, Apple Mail e Supabase:</span>
                <span className="font-mono">Variabile: &#123;&#123; .ConfirmationURL &#125;&#125;</span>
              </div>
              <div className="relative">
                <pre className="p-4 rounded-2xl bg-zinc-950 text-zinc-300 font-mono text-xs overflow-x-auto border border-zinc-800 max-h-[55vh] leading-relaxed select-all">
                  {SUPABASE_EMAIL_TEMPLATE_HTML}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'instructions' && (
            <div className="space-y-4 max-w-xl mx-auto py-2">
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 space-y-2">
                <h4 className="text-sm font-black text-indigo-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Come impostare il template email:</span>
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  3 semplici passaggi per personalizzare le email di recupero con lo stile visivo di Diariamente:
                </p>
              </div>

              <ol className="space-y-3 text-xs text-[var(--text-primary)] font-medium">
                <li className="flex items-start space-x-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                    1
                  </span>
                  <div>
                    <strong className="block font-bold">Copia il codice HTML</strong>
                    <span className="text-[var(--text-secondary)]">
                      Usa il pulsante <strong className="text-indigo-500">"Copia Codice HTML"</strong> in alto oppure scarica il file HTML.
                    </span>
                  </div>
                </li>

                <li className="flex items-start space-x-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                    2
                  </span>
                  <div>
                    <strong className="block font-bold">Apri il fornitore email del progetto</strong>
                    <span className="text-[var(--text-secondary)]">
                      Accedi alla sezione Modelli Email (Email Templates) e seleziona <em>Recupero Password / Magic Link</em>.
                    </span>
                  </div>
                </li>

                <li className="flex items-start space-x-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                    3
                  </span>
                  <div>
                    <strong className="block font-bold">Incolla e Salva</strong>
                    <span className="text-[var(--text-secondary)]">
                      Sostituisci il corpo del messaggio con il codice appena copiato e premi <strong>Salva</strong>.
                    </span>
                  </div>
                </li>
              </ol>

              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">
                  File esportabile: <code className="font-mono text-[var(--text-primary)]">diariamente-email-template.html</code>
                </span>
                <button
                  onClick={handleDownload}
                  className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Scarica</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
          <span className="text-[11px] text-[var(--text-secondary)]">
            Email conforme agli standard dark mode e accessibilità
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] border border-[var(--border-solid)] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer"
          >
            Chiudi
          </button>
        </div>

      </div>
    </div>
  );
};
