import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  AlertCircle,
  Volume2,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { audioSafety } from '../services/audioSafety';
import { ConfirmModal } from './ConfirmModal';
import { useUnsavedAudio } from '../hooks/useUnsavedAudio';

interface AudioRecorderProps {
  audioNote?: string; // base64 data URL
  audioDuration?: number; // duration in seconds
  onChange: (audioBase64: string | undefined, duration?: number) => void;
  disabled?: boolean;
  initialSavedAudio?: string;
  onRecordingChange?: (isRecording: boolean) => void;
  onUnsavedChange?: (hasUnsaved: boolean) => void;
}

const MAX_RECORDING_SECONDS = 120; // 2 minutes maximum

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  audioNote,
  audioDuration,
  onChange,
  disabled = false,
  initialSavedAudio,
  onRecordingChange,
  onUnsavedChange,
}) => {
  const {
    setIsRecording: setGlobalIsRecording,
    setHasUnsavedAudio: setGlobalHasUnsavedAudio,
    registerRecorder: registerGlobalRecorder,
  } = useUnsavedAudio();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasUnsavedAudio, setHasUnsavedAudio] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(audioDuration || 0);

  const idRef = useRef(`audio-rec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  const initialSavedAudioRef = useRef<string | undefined>(initialSavedAudio ?? audioNote);
  const isRecordingRef = useRef(false);
  const hasUnsavedAudioRef = useRef(false);
  const recordingSecondsRef = useRef(0);

  isRecordingRef.current = isRecording;
  hasUnsavedAudioRef.current = hasUnsavedAudio;
  recordingSecondsRef.current = recordingSeconds;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (audioDuration) {
      setPlayerDuration(audioDuration);
    }
  }, [audioDuration]);

  // Track if audioNote is different from initial saved state
  useEffect(() => {
    if (audioNote && audioNote !== initialSavedAudioRef.current) {
      setHasUnsavedAudio(true);
      hasUnsavedAudioRef.current = true;
      setGlobalHasUnsavedAudio(true);
      onUnsavedChange?.(true);
      audioSafety.notify();
    }
  }, [audioNote, onUnsavedChange, setGlobalHasUnsavedAudio]);

  // Sync hasUnsavedAudio state to global context
  useEffect(() => {
    setGlobalHasUnsavedAudio(hasUnsavedAudio);
  }, [hasUnsavedAudio, setGlobalHasUnsavedAudio]);

  // Notify recording state changes
  useEffect(() => {
    onRecordingChange?.(isRecording);
    setGlobalIsRecording(isRecording);
    if (isRecording) {
      setHasUnsavedAudio(true);
      hasUnsavedAudioRef.current = true;
      setGlobalHasUnsavedAudio(true);
    }
    audioSafety.notify();
  }, [isRecording, onRecordingChange, setGlobalIsRecording, setGlobalHasUnsavedAudio]);

  const stopAndSave = useCallback((): Promise<{ audioNote?: string; audioDuration?: number }> => {
    return new Promise((resolve) => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      if (!isRecordingRef.current || !mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        resolve({ audioNote, audioDuration: playerDuration || audioDuration });
        return;
      }

      const recorder = mediaRecorderRef.current;
      recorder.onstop = () => {
        const mime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          const finalDuration = recordingSecondsRef.current || 1;
          setPlayerDuration(finalDuration);
          setIsRecording(false);
          isRecordingRef.current = false;
          setHasUnsavedAudio(true);
          hasUnsavedAudioRef.current = true;
          onChange(base64Data, finalDuration);

          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((t) => {
              try { t.stop(); } catch {}
            });
            mediaStreamRef.current = null;
          }

          audioSafety.notify();
          resolve({ audioNote: base64Data, audioDuration: finalDuration });
        };
        reader.readAsDataURL(blob);
      };

      try {
        recorder.stop();
      } catch {
        resolve({ audioNote, audioDuration });
      }
    });
  }, [audioNote, audioDuration, playerDuration, onChange]);

  const discardAndStop = useCallback(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch {}
      });
      mediaStreamRef.current = null;
    }

    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }

    setIsRecording(false);
    isRecordingRef.current = false;
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;
    audioChunksRef.current = [];
    setHasUnsavedAudio(false);
    hasUnsavedAudioRef.current = false;

    if (initialSavedAudioRef.current !== audioNote) {
      onChange(initialSavedAudioRef.current, undefined);
    }

    audioSafety.notify();
  }, [audioNote, onChange]);

  // Register with global AudioSafetyService and AudioSafetyContext
  useEffect(() => {
    audioSafety.registerRecorder({
      id: idRef.current,
      isRecording: () => isRecordingRef.current,
      hasUnsavedAudio: () => hasUnsavedAudioRef.current,
      stopAndSave,
      discardAndStop,
    });

    const unregisterGlobal = registerGlobalRecorder({
      stopAndSave,
      discardAndStop,
    });

    return () => {
      unregisterGlobal();
      // Guaranteed clean shutdown of microphone streams when unmounting
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => {
          try { t.stop(); } catch {}
        });
        mediaStreamRef.current = null;
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
      audioSafety.unregisterRecorder(idRef.current);
    };
  }, [stopAndSave, discardAndStop, registerGlobalRecorder]);

  useEffect(() => {
    if (isRecording && recordingSeconds >= MAX_RECORDING_SECONDS) {
      stopRecording();
    }
  }, [recordingSeconds, isRecording]);

  // Start real voice recording
  const startRecording = async () => {
    setErrorMessage(null);

    const hasGetUserMedia = Boolean(
      (navigator?.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') ||
      (navigator as any)?.webkitGetUserMedia ||
      (navigator as any)?.mozGetUserMedia
    );

    if (!hasGetUserMedia) {
      setErrorMessage(
        'Il microfono non è supportato dal browser corrente. Puoi caricare un file audio con il pulsante "Carica file".'
      );
      return;
    }

    try {
      // Request microphone stream directly so the browser prompts the user
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (advancedErr: any) {
        // If advanced constraints fail or are not supported on this device/browser, try basic audio constraint
        if (
          advancedErr?.name === 'OverconstrainedError' ||
          advancedErr?.name === 'TypeError' ||
          advancedErr?.name === 'ConstraintNotSatisfiedError'
        ) {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw advancedErr;
        }
      }

      if (!stream || stream.getAudioTracks().length === 0) {
        throw new Error('Nessuna traccia audio rilevata dal microfono.');
      }

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      // Check supported MIME types across browsers (Chrome, Safari iOS 14.8+, Firefox, Edge)
      const candidateMimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus',
        'audio/wav',
      ];
      let selectedMimeType = '';
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        for (const t of candidateMimeTypes) {
          try {
            if (MediaRecorder.isTypeSupported(t)) {
              selectedMimeType = t;
              break;
            }
          } catch {
            // Ignore type check error
          }
        }
      }

      let recorder: MediaRecorder;
      try {
        recorder = selectedMimeType
          ? new MediaRecorder(stream, { mimeType: selectedMimeType })
          : new MediaRecorder(stream);
      } catch {
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || selectedMimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          const finalDuration = recordingSecondsRef.current || 1;
          setPlayerDuration(finalDuration);
          onChange(base64Data, finalDuration);
        };
        reader.readAsDataURL(blob);

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => {
            try { t.stop(); } catch {}
          });
          mediaStreamRef.current = null;
        }
      };

      mediaRecorderRef.current = recorder;

      // Safe start with timeslice or default fallback
      try {
        recorder.start(500);
      } catch {
        recorder.start();
      }

      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordingSeconds(0);
      recordingSecondsRef.current = 0;
      setErrorMessage(null);

      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => {
          const next = prev + 1;
          recordingSecondsRef.current = next;
          return next;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('Avviso registrazione vocale:', err?.name, err?.message);
      setIsRecording(false);
      isRecordingRef.current = false;

      const isPermissionError =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        String(err?.message || '').toLowerCase().includes('permission') ||
        String(err?.message || '').toLowerCase().includes('denied') ||
        String(err?.message || '').toLowerCase().includes('disallowed');

      if (isPermissionError) {
        setErrorMessage(
          'Permesso microfono non concesso nel browser. Tocca "Riprova" e seleziona "Consenti", oppure consenti l\'accesso al microfono nelle impostazioni del browser.'
        );
      } else if (
        err?.name === 'NotFoundError' ||
        err?.name === 'DevicesNotFoundError' ||
        String(err?.message || '').toLowerCase().includes('not found')
      ) {
        setErrorMessage(
          'Nessun microfono rilevato su questo dispositivo. Collega un microfono o carica un file audio.'
        );
      } else {
        setErrorMessage(
          'Impossibile accedere al microfono. Verifica che non sia occupato da un\'altra applicazione o prova a ricaricare la pagina.'
        );
      }
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    setIsRecording(false);
    isRecordingRef.current = false;
  };

  const cancelRecording = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => {
        try { t.stop(); } catch {}
      });
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    isRecordingRef.current = false;
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;
    audioChunksRef.current = [];
  };

  const requestDeleteAudio = () => {
    setIsConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    setIsConfirmDeleteOpen(false);
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setHasUnsavedAudio(true);
    hasUnsavedAudioRef.current = true;
    onChange(undefined, undefined);
    audioSafety.notify();
  };

  const handleDeleteAudio = () => {
    requestDeleteAudio();
  };

  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      const tempAudio = new Audio(base64Data);
      tempAudio.onloadedmetadata = () => {
        const dur = Math.round(tempAudio.duration) || 5;
        setPlayerDuration(dur);
        onChange(base64Data, dur);
      };
      tempAudio.onerror = () => {
        setPlayerDuration(5);
        onChange(base64Data, 5);
      };
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const togglePlay = () => {
    if (!audioElementRef.current) return;

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play().catch((err) => {
        console.warn('Riproduzione audio:', err);
      });
      setIsPlaying(true);
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudioFileUpload}
        className="hidden"
        id="audio-note-file-upload"
      />

      {audioNote && (
        <audio
          ref={audioElementRef}
          src={audioNote}
          onTimeUpdate={() => audioElementRef.current && setCurrentTime(audioElementRef.current.currentTime)}
          onLoadedMetadata={() => {
            if (audioElementRef.current?.duration && isFinite(audioElementRef.current.duration)) {
              setPlayerDuration(Math.round(audioElementRef.current.duration));
            }
          }}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          preload="metadata"
        />
      )}

      {/* CASE 1: In fase di registrazione */}
      {isRecording ? (
        <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </div>
              <span className="text-[11px] font-black text-rose-500 uppercase tracking-wider">
                Registrazione vocale in corso
              </span>
            </div>

            <div className="text-xs font-black text-[var(--text-primary)] tabular-nums">
              {formatTime(recordingSeconds)}{' '}
              <span className="text-[var(--text-muted)] font-normal">/ {formatTime(MAX_RECORDING_SECONDS)}</span>
            </div>
          </div>

          {/* Sound waves animate */}
          <div className="flex items-center justify-center space-x-1 py-1">
            {[40, 70, 95, 60, 85, 50, 90, 75, 45, 80, 100, 65, 85, 40].map((h, i) => (
              <div
                key={i}
                className="w-1 bg-rose-500 rounded-full transition-all duration-150 animate-pulse"
                style={{
                  height: `${Math.max(6, Math.min(24, (h * ((recordingSeconds % 3) + 1)) / 3))}px`,
                  animationDelay: `${i * 60}ms`,
                }}
              />
            ))}
          </div>

          <div className="flex items-center justify-end space-x-2 pt-0.5">
            <button
              type="button"
              onClick={cancelRecording}
              className="px-2.5 py-1 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-rose-400 bg-[var(--bg-subtle)] border border-[var(--border-solid)] transition-all cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Ferma e Salva</span>
            </button>
          </div>
        </div>
      ) : audioNote ? (
        /* CASE 2: Audio presente -> Player minimale */
        <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] space-y-2 animate-fade-in shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-500">
                <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="text-xs font-black text-[var(--text-primary)]">
                Audio-Nota Vocale Registrata
              </span>
              {hasUnsavedAudio && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/15 text-amber-500 border border-amber-500/25 animate-pulse">
                  Non ancora salvata
                </span>
              )}
            </div>

            {!disabled && (
              <button
                type="button"
                onClick={handleDeleteAudio}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-all active:scale-95 cursor-pointer"
                title="Elimina traccia audio"
              >
                <Trash2 className="w-3 h-3" />
                <span>Elimina</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2.5 pt-0.5">
            <button
              type="button"
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-all cursor-pointer"
              aria-label={isPlaying ? 'Pausa' : 'Riproduci'}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current stroke-none" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current stroke-none ml-0.5" />
              )}
            </button>

            <div className="flex-1 space-y-1">
              <input
                type="range"
                min={0}
                max={playerDuration || 1}
                step={0.1}
                value={currentTime}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (audioElementRef.current) {
                    audioElementRef.current.currentTime = val;
                    setCurrentTime(val);
                  }
                }}
                className="w-full h-1.5 bg-[var(--border-solid)] rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)] tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(playerDuration)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CASE 3: Singola barra di azione pulita (SENZA etichette doppie sopra) */
        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={startRecording}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-solid)] hover:bg-[var(--accent-btn)] hover:text-[var(--accent-btn-text)] transition-all active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Mic className="w-3.5 h-3.5 text-rose-500 stroke-[2.5]" />
            <span>Registra Audio-Nota (max 2 min)</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-solid)] hover:bg-[var(--accent-btn)] hover:text-[var(--accent-btn-text)] transition-all active:scale-95 cursor-pointer shadow-xs"
            title="Carica file audio"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Carica file</span>
          </button>
        </div>
      )}

      {/* Avviso in caso di errore microfono con pulsante riprova e carica file */}
      {errorMessage && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 space-y-2 animate-fade-in text-xs font-medium">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <div className="space-y-1">
              <span className="font-bold block text-[var(--text-primary)]">{errorMessage}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 pl-6 flex-wrap">
            <button
              type="button"
              onClick={startRecording}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Riprova microfono</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--bg-subtle)] hover:bg-amber-500/20 text-[var(--text-primary)] border border-[var(--border-solid)] transition-all active:scale-95 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Carica file audio</span>
            </button>
          </div>
        </div>
      )}

      {/* Finestra di conferma eliminazione traccia audio */}
      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        title="Elimina traccia audio"
        message="Sei sicuro di voler eliminare questa registrazione vocale? L'operazione non potrà essere annullata."
        confirmLabel="Elimina traccia"
        cancelLabel="Annulla"
        isDanger={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsConfirmDeleteOpen(false)}
      />
    </div>
  );
};

export const AudioPlayerView: React.FC<{
  audioSrc: string;
  duration?: number;
}> = ({ audioSrc, duration = 0 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDur, setAudioDur] = useState(duration);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch((err) => console.warn('Riproduzione audio:', err));
      setIsPlaying(true);
    }
  };

  return (
    <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] space-y-2 shadow-xs">
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => {
          if (audioRef.current?.duration && isFinite(audioRef.current.duration)) {
            setAudioDur(Math.round(audioRef.current.duration));
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        preload="metadata"
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-500">
            <Volume2 className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
          <span className="text-xs font-black text-[var(--text-primary)]">
            Traccia Vocale Registrata
          </span>
        </div>
        <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)]">
          {formatTime(audioDur || currentTime)}
        </span>
      </div>

      <div className="flex items-center space-x-2.5 pt-0.5">
        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition-all cursor-pointer"
          aria-label={isPlaying ? 'Pausa' : 'Riproduci'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current stroke-none" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current stroke-none ml-0.5" />
          )}
        </button>

        <div className="flex-1 space-y-1">
          <input
            type="range"
            min={0}
            max={audioDur || 1}
            step={0.1}
            value={currentTime}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (audioRef.current) {
                audioRef.current.currentTime = val;
                setCurrentTime(val);
              }
            }}
            className="w-full h-1.5 bg-[var(--border-solid)] rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
          <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)] tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(audioDur)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
