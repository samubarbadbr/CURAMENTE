import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  AlertCircle,
  Volume2,
  Upload,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface AudioRecorderProps {
  audioNote?: string; // base64 data URL
  audioDuration?: number; // duration in seconds
  onChange: (audioBase64: string | undefined, duration?: number) => void;
  disabled?: boolean;
}

const MAX_RECORDING_SECONDS = 120; // 2 minutes maximum

// Generate a clean offline demo chime wave (PCM WAV Base64) for instant testing
function generateDemoWavBase64(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const sampleRate = 22050;
      const duration = 2.5;
      const totalSamples = Math.floor(sampleRate * duration);
      const buffer = new ArrayBuffer(44 + totalSamples * 2);
      const view = new DataView(buffer);

      const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
          view.setUint8(offset + i, str.charCodeAt(i));
        }
      };

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + totalSamples * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // Mono
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, totalSamples * 2, true);

      let offset = 44;
      for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        const decay = Math.exp(-1.8 * t);
        const sample =
          0.4 * Math.sin(2 * Math.PI * 440 * t) * decay +
          0.3 * Math.sin(2 * Math.PI * 554 * t) * decay +
          0.2 * Math.sin(2 * Math.PI * 659 * t) * decay;
        const intSample = Math.max(-1, Math.min(1, sample)) * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }

      const blob = new Blob([buffer], { type: 'audio/wav' });
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    } catch {
      resolve('');
    }
  });
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  audioNote,
  audioDuration,
  onChange,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNoDeviceFound, setIsNoDeviceFound] = useState(false);

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerDuration, setPlayerDuration] = useState(audioDuration || 0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const simCleanupRef = useRef<(() => void) | null>(null);

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

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (simCleanupRef.current) {
        simCleanupRef.current();
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording && recordingSeconds >= MAX_RECORDING_SECONDS) {
      stopRecording();
    }
  }, [recordingSeconds, isRecording]);

  // Start simulated recording using Web Audio API (100% reliable even without physical mic)
  const startSimulatedRecording = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        // Fallback directly to generated demo note
        handleLoadDemoAudio();
        return;
      }
      const ctx = new AudioCtx();
      const dest = ctx.createMediaStreamDestination();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.connect(gain);
      gain.connect(dest);
      osc.start();

      simCleanupRef.current = () => {
        try {
          osc.stop();
          ctx.close();
        } catch {}
      };

      const stream = dest.stream;
      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (simCleanupRef.current) {
          simCleanupRef.current();
          simCleanupRef.current = null;
        }
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          const finalDuration = recordingSeconds || 2;
          setPlayerDuration(finalDuration);
          onChange(base64Data, finalDuration);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      setErrorMessage(null);
      setIsNoDeviceFound(false);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      handleLoadDemoAudio();
    }
  };

  // Start real or fallback recording
  const startRecording = async () => {
    setErrorMessage(null);
    setIsNoDeviceFound(false);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setIsNoDeviceFound(true);
      setErrorMessage('Microfono non accessibile dal browser corrente.');
      return;
    }

    try {
      // Check if devices exist (non-blocking)
      if (navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasAudioInput = devices.some((d) => d.kind === 'audioinput');
          if (devices.length > 0 && !hasAudioInput) {
            setIsNoDeviceFound(true);
            setErrorMessage('Nessun microfono hardware rilevato su questo dispositivo.');
            return;
          }
        } catch {
          // Ignore enumerateDevices failure and try getUserMedia
        }
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (micErr: any) {
        const isNotFound =
          micErr?.name === 'NotFoundError' ||
          micErr?.name === 'DevicesNotFoundError' ||
          String(micErr?.message || '').toLowerCase().includes('device not found') ||
          String(micErr?.message || '').toLowerCase().includes('not found');

        if (isNotFound) {
          setIsNoDeviceFound(true);
          setErrorMessage(
            'Nessun microfono hardware rilevato. Puoi registrare una traccia simulata o caricare un file audio.'
          );
          return;
        }
        throw micErr;
      }

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg;codecs=opus',
      ];
      let selectedMimeType = '';
      for (const t of mimeTypes) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
          selectedMimeType = t;
          break;
        }
      }

      const recorder = selectedMimeType
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);

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
          const finalDuration = recordingSeconds || 1;
          setPlayerDuration(finalDuration);
          onChange(base64Data, finalDuration);
        };
        reader.readAsDataURL(blob);

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);

      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Avviso registrazione vocale:', err?.name, err?.message);

      const isPermissionError =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        String(err?.message || '').toLowerCase().includes('permission');

      if (isPermissionError) {
        setErrorMessage('Permesso microfono non concesso nel browser.');
      } else {
        setIsNoDeviceFound(true);
        setErrorMessage(
          'Impossibile accedere al microfono hardware. Puoi provare la simulazione o caricare un file.'
        );
      }
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
  };

  const cancelRecording = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    if (simCleanupRef.current) {
      simCleanupRef.current();
      simCleanupRef.current = null;
    }

    setIsRecording(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  const handleDeleteAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentTime(0);
    onChange(undefined, undefined);
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

  const handleLoadDemoAudio = async () => {
    setErrorMessage(null);
    setIsNoDeviceFound(false);
    const demoBase64 = await generateDemoWavBase64();
    if (demoBase64) {
      setPlayerDuration(3);
      onChange(demoBase64, 3);
    }
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

      {/* Avviso in caso di microfono non trovato con alternative immediate funzionanti */}
      {errorMessage && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 space-y-2 animate-fade-in text-xs font-medium">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <div className="space-y-1">
              <span className="font-bold block text-[var(--text-primary)]">{errorMessage}</span>
              {isNoDeviceFound && (
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Puoi registrare una traccia audio di test simulata (funziona al 100% senza microfono fisico) oppure caricare un file audio dal tuo dispositivo:
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 pl-6 flex-wrap">
            {isNoDeviceFound && (
              <button
                type="button"
                onClick={startSimulatedRecording}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Registra comunque (Test)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--bg-subtle)] hover:bg-amber-500/20 text-[var(--text-primary)] border border-[var(--border-solid)] transition-all active:scale-95 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Carica file audio</span>
            </button>

            <button
              type="button"
              onClick={handleLoadDemoAudio}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Traccia demo</span>
            </button>

            <button
              type="button"
              onClick={startRecording}
              className="inline-flex items-center space-x-1 px-2 py-1.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-subtle)] border border-[var(--border-solid)] transition-all active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Riprova</span>
            </button>
          </div>
        </div>
      )}
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
