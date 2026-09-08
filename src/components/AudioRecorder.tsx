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

// Helper to generate a clean, offline demo sound wave (chime) if testing without physical microphone
function generateDemoWavBase64(): Promise<string> {
  return new Promise((resolve) => {
    try {
      const sampleRate = 22050;
      const duration = 2.5;
      const totalSamples = Math.floor(sampleRate * duration);
      const buffer = new ArrayBuffer(44 + totalSamples * 2);
      const view = new DataView(buffer);

      // RIFF header
      const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
          view.setUint8(offset + i, str.charCodeAt(i));
        }
      };

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + totalSamples * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
      view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
      view.setUint16(22, 1, true); // NumChannels (1 for Mono)
      view.setUint32(24, sampleRate, true); // SampleRate
      view.setUint32(28, sampleRate * 2, true); // ByteRate
      view.setUint16(32, 2, true); // BlockAlign
      view.setUint16(34, 16, true); // BitsPerSample
      writeString(36, 'data');
      view.setUint32(40, totalSamples * 2, true);

      // Generate pleasant gentle chime frequencies (A4 chord: 440Hz, 554Hz, 659Hz)
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

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Sync duration when audioNote prop changes
  useEffect(() => {
    if (audioDuration) {
      setPlayerDuration(audioDuration);
    }
  }, [audioDuration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        window.clearInterval(timerIntervalRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, []);

  // Stop recording automatically if reached MAX_RECORDING_SECONDS
  useEffect(() => {
    if (isRecording && recordingSeconds >= MAX_RECORDING_SECONDS) {
      stopRecording();
    }
  }, [recordingSeconds, isRecording]);

  // Start recording handler
  const startRecording = async () => {
    setErrorMessage(null);
    setIsNoDeviceFound(false);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setErrorMessage('La registrazione audio diretta non è supportata dal browser corrente.');
      setIsNoDeviceFound(true);
      return;
    }

    try {
      // Check if devices exist first (if enumerateDevices is supported)
      if (navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasAudioInput = devices.some((d) => d.kind === 'audioinput');
          if (devices.length > 0 && !hasAudioInput) {
            setIsNoDeviceFound(true);
            setErrorMessage('Nessun microfono rilevato su questo computer o dispositivo.');
            return;
          }
        } catch {
          // enumerateDevices might be restricted in some iframes, proceed to getUserMedia
        }
      }

      // Try basic audio constraints first (maximum compatibility)
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (firstErr: any) {
        // If failed with overconstrained, retry without special settings
        if (firstErr.name === 'OverconstrainedError') {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } else {
          throw firstErr;
        }
      }

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];

      // Determine best supported mime type
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

        // Convert blob to Base64 for clean storage in IndexedDB
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          const finalDuration = recordingSeconds || 1;
          setPlayerDuration(finalDuration);
          onChange(base64Data, finalDuration);
        };
        reader.readAsDataURL(blob);

        // Stop stream tracks
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((t) => t.stop());
          mediaStreamRef.current = null;
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250); // Slice every 250ms

      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      // Use console.warn instead of console.error to avoid raising scary red [App Error] in AI Studio
      console.warn('Avviso avvio registrazione vocale:', err?.name, err?.message);

      const isNotFoundError =
        err?.name === 'NotFoundError' ||
        err?.name === 'DevicesNotFoundError' ||
        String(err?.message || '').toLowerCase().includes('device not found');

      const isPermissionError =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        String(err?.message || '').toLowerCase().includes('permission');

      if (isNotFoundError) {
        setIsNoDeviceFound(true);
        setErrorMessage(
          'Nessun microfono hardware rilevato. Puoi collegare un microfono o caricare direttamente un file audio.'
        );
      } else if (isPermissionError) {
        setErrorMessage('Permesso microfono non concesso. Abilita i permessi nel browser per registrare.');
      } else {
        setErrorMessage(
          'Impossibile accedere al microfono (' + (err?.message || 'verifica connessione hardware') + ').'
        );
      }
      setIsRecording(false);
    }
  };

  // Stop recording handler
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

  // Cancel recording without saving
  const cancelRecording = () => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null; // Do not trigger save
      mediaRecorderRef.current.stop();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    setRecordingSeconds(0);
    audioChunksRef.current = [];
  };

  // Delete current audio
  const handleDeleteAudio = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentTime(0);
    onChange(undefined, undefined);
  };

  // Handle manual audio file upload
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;

      // Extract duration from audio element
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

    // Reset input value so same file can be re-selected if needed
    e.target.value = '';
  };

  // Load demo test audio
  const handleLoadDemoAudio = async () => {
    setErrorMessage(null);
    setIsNoDeviceFound(false);
    const demoBase64 = await generateDemoWavBase64();
    if (demoBase64) {
      setPlayerDuration(3);
      onChange(demoBase64, 3);
    }
  };

  // Toggle playback
  const togglePlay = () => {
    if (!audioElementRef.current) return;

    if (isPlaying) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    } else {
      audioElementRef.current.play().catch((err) => {
        console.warn('Errore riproduzione audio:', err);
      });
      setIsPlaying(true);
    }
  };

  // Audio element events
  const handleTimeUpdate = () => {
    if (audioElementRef.current) {
      setCurrentTime(audioElementRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioElementRef.current) {
      const dur = audioElementRef.current.duration;
      if (dur && !isNaN(dur) && isFinite(dur)) {
        setPlayerDuration(Math.round(dur));
      }
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
    }
  };

  return (
    <div className="space-y-2">
      {/* Hidden file input for audio upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudioFileUpload}
        className="hidden"
        id="audio-note-file-upload"
      />

      {/* Hidden audio element for offline playback */}
      {audioNote && (
        <audio
          ref={audioElementRef}
          src={audioNote}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleAudioEnded}
          preload="metadata"
        />
      )}

      {/* CASE 1: Currently Recording */}
      {isRecording ? (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </div>
              <span className="text-xs font-black text-rose-500 uppercase tracking-wider">
                Registrazione vocale in corso
              </span>
            </div>

            {/* Time Counter: e.g. 00:45 / 02:00 */}
            <div className="text-xs font-black text-[var(--text-primary)] tabular-nums">
              {formatTime(recordingSeconds)}{' '}
              <span className="text-[var(--text-muted)] font-normal">/ {formatTime(MAX_RECORDING_SECONDS)}</span>
            </div>
          </div>

          {/* Animated sound wave bars */}
          <div className="flex items-center justify-center space-x-1 py-1.5">
            {[40, 70, 95, 60, 85, 50, 90, 75, 45, 80, 100, 65, 85, 40].map((h, i) => (
              <div
                key={i}
                className="w-1 bg-rose-500 rounded-full transition-all duration-150 animate-pulse"
                style={{
                  height: `${Math.max(6, Math.min(26, (h * ((recordingSeconds % 3) + 1)) / 3))}px`,
                  animationDelay: `${i * 70}ms`,
                }}
              />
            ))}
          </div>

          {/* Actions: Stop and Save, or Cancel */}
          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={cancelRecording}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-rose-400 bg-[var(--bg-subtle)] border border-[var(--border-solid)] hover:bg-rose-500/10 transition-all cursor-pointer"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Ferma e Salva</span>
            </button>
          </div>
        </div>
      ) : audioNote ? (
        /* CASE 2: Audio Note Present - Minimal Offline Audio Player */
        <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] space-y-2.5 animate-fade-in shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400">
                <Volume2 className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-xs font-black text-[var(--text-primary)] block leading-tight">
                  Audio-Nota Registrata
                </span>
                <span className="text-[10px] font-bold text-[var(--text-secondary)]">
                  Disponibile offline
                </span>
              </div>
            </div>

            {/* Delete Track Button */}
            {!disabled && (
              <button
                type="button"
                onClick={handleDeleteAudio}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-all active:scale-95 cursor-pointer"
                title="Elimina traccia audio"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                <span className="text-[11px]">Elimina</span>
              </button>
            )}
          </div>

          {/* Player Controls & Scrubber */}
          <div className="flex items-center space-x-3 pt-1">
            <button
              type="button"
              onClick={togglePlay}
              className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md active:scale-95 transition-all cursor-pointer"
              aria-label={isPlaying ? 'Pausa' : 'Riproduci'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current stroke-none" />
              ) : (
                <Play className="w-4 h-4 fill-current stroke-none ml-0.5" />
              )}
            </button>

            {/* Slider / Scrubber */}
            <div className="flex-1 space-y-1">
              <input
                type="range"
                min={0}
                max={playerDuration || 1}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-[var(--border-solid)] rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)] tabular-nums">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(playerDuration)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CASE 3: Single, clean action bar (NO redundant duplicate label above it) */
        <div className="flex items-center flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={disabled}
            onClick={startRecording}
            className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-solid)] hover:bg-[var(--accent-btn)] hover:text-[var(--accent-btn-text)] transition-all duration-150 active:scale-95 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Mic className="w-4 h-4 text-rose-500 stroke-[2.5]" />
            <span>Registra Audio-Nota (max 2 min)</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-solid)] hover:bg-[var(--accent-btn)] hover:text-[var(--accent-btn-text)] transition-all duration-150 active:scale-95 cursor-pointer shadow-xs"
            title="Carica un file audio dal tuo dispositivo"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Carica file</span>
          </button>
        </div>
      )}

      {/* Error & Device Fallback Notice */}
      {errorMessage && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 space-y-2 animate-fade-in text-xs font-medium">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <div className="space-y-1">
              <span className="font-bold block text-[var(--text-primary)]">{errorMessage}</span>
              {isNoDeviceFound && (
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Non è stato trovato un microfono attivo. Puoi comunque allegare una registrazione caricando un file audio oppure provare il player con una traccia demo:
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 pl-6 flex-wrap">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-[var(--text-primary)] border border-amber-500/35 transition-all active:scale-95 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Carica file audio</span>
            </button>

            <button
              type="button"
              onClick={handleLoadDemoAudio}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Prova traccia demo</span>
            </button>

            <button
              type="button"
              onClick={startRecording}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-subtle)] border border-[var(--border-solid)] transition-all active:scale-95 cursor-pointer"
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

/* Reusable Read-only Audio Player for DetailView or Timeline */
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
    <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-solid)] space-y-2.5 shadow-xs">
      <audio
        ref={audioRef}
        src={audioSrc}
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => {
          if (audioRef.current && audioRef.current.duration && isFinite(audioRef.current.duration)) {
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
          <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400">
            <Volume2 className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-xs font-black text-[var(--text-primary)]">
            Traccia Vocale Registrata
          </span>
        </div>
        <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[var(--badge-bg)] text-[var(--badge-text)]">
          {formatTime(audioDur || currentTime)}
        </span>
      </div>

      <div className="flex items-center space-x-3 pt-0.5">
        <button
          type="button"
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md active:scale-95 transition-all cursor-pointer"
          aria-label={isPlaying ? 'Pausa' : 'Riproduci'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current stroke-none" />
          ) : (
            <Play className="w-4 h-4 fill-current stroke-none ml-0.5" />
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
            className="w-full h-1.5 bg-[var(--border-solid)] rounded-lg appearance-none cursor-pointer accent-indigo-500"
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
