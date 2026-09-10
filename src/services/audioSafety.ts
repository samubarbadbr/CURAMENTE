// Service to coordinate audio recording safety checks across the application
// Ensures unsaved voice recordings and active microphone streams are not lost or leaked

export interface AudioSafetySession {
  id: string;
  isRecording: () => boolean;
  hasUnsavedAudio: () => boolean;
  stopAndSave: () => Promise<{ audioNote?: string; audioDuration?: number }>;
  discardAndStop: () => void;
}

type AudioSafetyListener = (state: { isRecording: boolean; hasUnsavedAudio: boolean }) => void;

class AudioSafetyService {
  private activeRecorders = new Map<string, AudioSafetySession>();
  private listeners = new Set<AudioSafetyListener>();

  public registerRecorder(session: AudioSafetySession) {
    this.activeRecorders.set(session.id, session);
    this.notify();
  }

  public unregisterRecorder(id: string) {
    this.activeRecorders.delete(id);
    this.notify();
  }

  public isCurrentlyRecording(): boolean {
    for (const session of this.activeRecorders.values()) {
      if (session.isRecording()) return true;
    }
    return false;
  }

  public hasUnsavedAudio(): boolean {
    for (const session of this.activeRecorders.values()) {
      if (session.hasUnsavedAudio()) return true;
    }
    return false;
  }

  public hasPendingChanges(): boolean {
    return this.isCurrentlyRecording() || this.hasUnsavedAudio();
  }

  public async stopAndSaveAll(): Promise<{ audioNote?: string; audioDuration?: number }> {
    let result: { audioNote?: string; audioDuration?: number } = {};
    for (const session of this.activeRecorders.values()) {
      const res = await session.stopAndSave();
      if (res.audioNote) {
        result = res;
      }
    }
    this.notify();
    return result;
  }

  public discardAndStopAll() {
    for (const session of this.activeRecorders.values()) {
      session.discardAndStop();
    }
    this.notify();
  }

  public subscribe(listener: AudioSafetyListener): () => void {
    this.listeners.add(listener);
    listener({
      isRecording: this.isCurrentlyRecording(),
      hasUnsavedAudio: this.hasUnsavedAudio(),
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notify() {
    const state = {
      isRecording: this.isCurrentlyRecording(),
      hasUnsavedAudio: this.hasUnsavedAudio(),
    };
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('Error notifying audio safety listener:', err);
      }
    });
  }
}

export const audioSafety = new AudioSafetyService();

// Register beforeunload handler to prevent accidental browser tab close or reload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', (e) => {
    if (audioSafety.hasPendingChanges()) {
      e.preventDefault();
      const message = 'Ci sono modifiche non salvate nella registrazione audio.';
      e.returnValue = message;
      return message;
    }
  });
}
