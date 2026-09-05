import React, { useState, useEffect } from 'react';
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
  Mail,
  Server,
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Info
} from 'lucide-react';
import { SUPABASE_EMAIL_TEMPLATE_HTML } from '../data/supabaseEmailTemplate';

interface SupabaseEmailTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast: (msg: string) => void;
  initialTab?: 'preview' | 'code' | 'instructions' | 'smtp';
}

export const SupabaseEmailTemplateModal: React.FC<SupabaseEmailTemplateModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
  initialTab = 'preview',
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'instructions' | 'edge' | 'smtp'>(initialTab);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

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
              <span>Istruzioni Template</span>
            </button>
            <button
              onClick={() => setActiveTab('edge')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'edge'
                  ? 'bg-[var(--bg-surface)] text-purple-500 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-purple-500'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              <span>Edge Function (PIN)</span>
            </button>
            <button
              onClick={() => setActiveTab('smtp')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'smtp'
                  ? 'bg-[var(--bg-surface)] text-amber-500 dark:text-amber-400 shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-amber-500'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-amber-500" />
              <span>Configurazione SMTP</span>
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

                    <div className="text-left space-y-2 text-xs sm:text-sm text-zinc-300 leading-relaxed">
                      <p className="text-base font-bold text-white">Ciao!</p>
                      <p className="text-zinc-300">
                        Ecco il tuo codice di verifica per accedere nuovamente al tuo diario:
                      </p>
                    </div>

                    {/* Spotlight PIN / Code Box (Classic Table Style Preview) */}
                    <div className="p-6 rounded-2xl bg-[#141724] border border-indigo-600/50 text-center space-y-2 shadow-xl">
                      <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest block">
                        CODICE DI ACCESSO
                      </span>
                      <span className="text-3xl sm:text-4xl font-black font-mono tracking-[0.25em] text-white block">
                        742819
                      </span>
                      <span className="text-xs text-zinc-300 block max-w-xs mx-auto leading-relaxed pt-1 font-medium">
                        Usa questo codice monouso per sbloccare l'app e impostare il tuo nuovo PIN.
                      </span>
                    </div>

                    {/* Privacy Note */}
                    <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-left text-xs text-indigo-200 leading-relaxed">
                      🔒 <strong>La tua privacy è al sicuro:</strong> Le tue annotazioni, i tuoi pensieri e le tue registrazioni rimangono crittografati sul tuo dispositivo. Nessun intermediario può accedere ai tuoi dati personali.
                    </div>

                    <p className="text-[11px] text-zinc-500 text-left leading-relaxed">
                      Se non hai richiesto tu il ripristino, ignora questa email: il tuo PIN e i tuoi dati rimarranno al sicuro.
                    </p>
                  </div>

                  {/* Simulated Footer */}
                  <div className="p-4 bg-black/40 border-t border-white/5 text-center text-[10px] text-zinc-500">
                    <p className="font-semibold text-zinc-400">
                      Diariamente &bull; Riservatezza &bull; Spazio Quotidiano
                    </p>
                    <p className="mt-0.5">Comunicazione automatizzata protetta.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-medium">
                <span>Codice HTML dark luxury compatibile con Outlook, Gmail, Apple Mail e Supabase:</span>
                <span className="font-mono text-indigo-500 font-bold">Variabile: &#123;&#123; .Token &#125;&#125;</span>
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
                  <span>Come impostare il template email in Supabase Auth:</span>
                </h4>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Questo template sostituisce i vecchi link di reindirizzamento mostrando il codice numerico a grandi cifre in un box in evidenza:
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
                    <strong className="block font-bold">Apri Supabase Dashboard</strong>
                    <span className="text-[var(--text-secondary)]">
                      Vai su <em>Authentication &rarr; Email Templates &rarr; Reset Password</em>.
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
                      Incolla il codice HTML nel corpo del messaggio e premi <strong>Save</strong>. Supabase inserirà automaticamente il codice di verifica al posto di <code className="text-indigo-400 font-mono">&#123;&#123; .Token &#125;&#125;</code>.
                    </span>
                  </div>
                </li>
              </ol>

              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-xs text-[var(--text-secondary)]">
                  File esportabile: <code className="font-mono text-[var(--text-primary)]">supabase-email-template.html</code>
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

          {activeTab === 'edge' && (
            <div className="space-y-4 max-w-xl mx-auto py-2">
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25 space-y-2">
                <div className="flex items-center space-x-2 text-purple-400 font-black text-xs sm:text-sm">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Supabase Edge Function: Invia il vero PIN memorizzato</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  L'app include già la Edge Function <code className="font-mono text-purple-300 font-bold">recover-pin</code> pronta all'uso in <code className="font-mono text-purple-300">/supabase/functions/recover-pin/index.ts</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-3 text-xs">
                <div className="font-bold text-[var(--text-primary)]">Come distribuire la Edge Function:</div>
                <div className="p-3 rounded-lg bg-zinc-950 font-mono text-[11px] text-purple-300 border border-zinc-800 space-y-1 select-all">
                  <div># 1. Installa Supabase CLI se necessario:</div>
                  <div>npm i -g supabase</div>
                  <div className="pt-1"># 2. Esegui il deploy della funzione:</div>
                  <div className="text-white font-bold">supabase functions deploy recover-pin</div>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Quando invocata, la Edge Function riceve l'email e il PIN memorizzato, popola il template grafico curato e invia direttamente l'email. Se la Edge Function non è distribuita, l'app passa in automatico al servizio Supabase Auth.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'smtp' && (
            <div className="space-y-4 max-w-xl mx-auto py-2">
              {/* Alert explaining why emails fail without SMTP */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                <div className="flex items-center space-x-2 text-amber-500 dark:text-amber-400 font-black text-xs sm:text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Perché le email non arrivano nella casella di posta?</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Supabase di default <strong>blocca l’invio verso caselle email esterne</strong> (restituendo l'errore <em>500 unexpected_failure: Error sending recovery email</em>) finché non viene configurato un provider <strong>Custom SMTP</strong> nella dashboard del tuo progetto.
                </p>
              </div>

              {/* Crucial Note about In-App PIN Change */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-start space-x-3">
                <KeyRound className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <span className="font-bold text-emerald-400 block">
                    Buona notizia: per cambiare il PIN non serve alcuna email!
                  </span>
                  <span className="text-zinc-300 leading-relaxed block">
                    Puoi cambiare il tuo PIN in qualsiasi momento direttamente nella sezione <strong>Impostazioni &rarr; Codice PIN</strong> cliccando sul pulsante <strong>"Modifica PIN"</strong>. Il cambio è istantaneo sia sul dispositivo sia nel cloud.
                  </span>
                </div>
              </div>

              {/* Step-by-step Setup instructions */}
              <div className="space-y-3 pt-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-secondary)] flex items-center justify-between">
                  <span>Come attivare l'invio email in 2 minuti:</span>
                  <a
                    href="https://supabase.com/dashboard/project/oaktfvcndyxylpsdjaik/settings/auth"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-indigo-500 hover:underline flex items-center gap-1 normal-case"
                  >
                    <span>Apri Impostazioni Auth Supabase</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </h4>

                <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-[var(--text-primary)]">
                    <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-black">
                      1
                    </span>
                    <span>Accedi alla sezione "SMTP Settings" del tuo progetto</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] pl-7 leading-relaxed">
                    Vai su <strong className="text-[var(--text-primary)]">Project Settings &rarr; Authentication</strong> e scorri in basso fino al riquadro <strong className="text-[var(--text-primary)]">"SMTP Settings"</strong>. Attiva la spunta <strong>"Enable Custom SMTP"</strong>.
                  </p>
                </div>

                {/* Option A: Personal Gmail (Recommended & Tested) */}
                <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-bold text-[var(--text-primary)]">
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black">
                        ✓
                      </span>
                      <span>Opzione Consigliata: Gmail SMTP (Funzionante al 100%)</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                      Attivo
                    </span>
                  </div>
                  <div className="pl-7 space-y-1.5 text-xs font-mono text-[var(--text-secondary)] bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                    <div>Sender Email: <span className="text-emerald-400">tua.email@gmail.com</span></div>
                    <div>Sender Name: <span className="text-emerald-400">DiariaMente</span></div>
                    <div>Host: <span className="text-indigo-400">smtp.gmail.com</span></div>
                    <div>Port: <span className="text-indigo-400">587</span></div>
                    <div>User: <span className="text-indigo-400">tua.email@gmail.com</span></div>
                    <div>Password: <span className="text-indigo-400">Password per le app a 16 caratteri</span></div>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] pl-7 leading-relaxed">
                    * La password per le app di Gmail si genera gratis da: <em>myaccount.google.com &rarr; Sicurezza &rarr; Password per le app</em>. Consente l'invio istantaneo e affidabile verso qualsiasi indirizzo di posta.
                  </p>
                </div>

                {/* Option B: Resend */}
                <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-bold text-[var(--text-primary)]">
                      <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px] font-black">
                        2
                      </span>
                      <span>Alternativa: Resend.com</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500">
                      3.000 mail/mese
                    </span>
                  </div>
                  <div className="pl-7 space-y-1.5 text-xs font-mono text-[var(--text-secondary)] bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                    <div>Sender Email: <span className="text-emerald-400">onboarding@resend.dev (oppure tuo dominio)</span></div>
                    <div>Host: <span className="text-indigo-400">smtp.resend.com</span></div>
                    <div>Port: <span className="text-indigo-400">587</span></div>
                    <div>User: <span className="text-indigo-400">resend</span></div>
                    <div>Password: <span className="text-indigo-400">re_tua_api_key_resend</span></div>
                  </div>
                </div>
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
