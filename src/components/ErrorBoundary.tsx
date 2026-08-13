import React from 'react';
import { RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  props: Props;
  state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearCacheAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
    } catch (e) {
      console.warn('Clear storage error:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#EBF0EC] dark:bg-[#121915] p-6 text-[#15251C] dark:text-[#EEF3EF] font-sans">
          <div className="max-w-md w-full bg-white dark:bg-[#1B2520] rounded-[24px] p-6 sm:p-8 border border-[#C8D5CB] dark:border-[#2B3A31] shadow-xl text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-[#15251C] dark:text-[#EEF3EF]">
                Si è verificato un problema
              </h1>
              <p className="text-xs font-bold text-[#2C3E35] dark:text-[#A7B6AC] leading-relaxed">
                L'applicazione ha riscontrato un errore imprevisto durante l'avvio. Puoi ricaricare la pagina o ripristinare la cache locale.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-[#F5F8F6] dark:bg-[#141C17] border border-[#C8D5CB] dark:border-[#2B3A31] text-[11px] font-mono text-left text-rose-600 dark:text-rose-400 overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-[#5B67CA] hover:bg-[#4A55B8] text-white text-xs font-black shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 stroke-[2.5]" />
                <span>Ricarica l'applicazione</span>
              </button>

              <button
                type="button"
                onClick={this.handleClearCacheAndReload}
                className="w-full py-2.5 px-4 rounded-xl bg-[#E8EFEA] dark:bg-[#2B3A31] text-[#15251C] dark:text-[#EEF3EF] text-xs font-bold hover:bg-rose-500 hover:text-white dark:hover:bg-rose-600 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Pulisci cache locale e riavvia</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

