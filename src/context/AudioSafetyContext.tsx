import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { clearDraftFromStorage } from '../services/draftStorage';

export interface AudioStopResult {
  audioNote?: string;
  audioDuration?: number;
}

export interface RecorderCallbacks {
  stopAndSave: () => Promise<AudioStopResult>;
  discardAndStop: () => void;
}

export interface AudioSafetyContextType {
  isRecording: boolean;
  hasUnsavedAudio: boolean;
  isFormDirty: boolean;
  setIsRecording: (recording: boolean) => void;
  setHasUnsavedAudio: (hasUnsaved: boolean) => void;
  setIsFormDirty: (isDirty: boolean) => void;
  registerRecorder: (callbacks: RecorderCallbacks) => () => void;
  registerDraftSaver: (saver: () => Promise<void>) => () => void;
  registerDraftDiscarder: (discarder: () => void) => () => void;
  interceptNavigation: (onProceed: () => void | Promise<void>, e?: React.MouseEvent) => boolean;
  stopAndSaveAudio: () => Promise<AudioStopResult>;
  discardAndStopAudio: () => void;
  isSafetyModalOpen: boolean;
  modalTitle: string;
  modalMessage: string;
  handleSaveBeforeExit: () => Promise<void>;
  handleDiscardAndExit: () => Promise<void>;
  handleStayHere: () => void;
}

const AudioSafetyContext = createContext<AudioSafetyContextType | null>(null);

export const AudioSafetyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isRecording, setIsRecordingState] = useState(false);
  const [hasUnsavedAudio, setHasUnsavedAudioState] = useState(false);
  const [isFormDirty, setIsFormDirtyState] = useState(false);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void | Promise<void>) | null>(null);

  const isRecordingRef = useRef(false);
  const hasUnsavedAudioRef = useRef(false);
  const isFormDirtyRef = useRef(false);
  const activeRecorderRef = useRef<RecorderCallbacks | null>(null);
  const draftSaverRef = useRef<(() => Promise<void>) | null>(null);
  const draftDiscarderRef = useRef<(() => void) | null>(null);

  const setIsRecording = useCallback((val: boolean) => {
    isRecordingRef.current = val;
    setIsRecordingState(val);
  }, []);

  const setHasUnsavedAudio = useCallback((val: boolean) => {
    hasUnsavedAudioRef.current = val;
    setHasUnsavedAudioState(val);
  }, []);

  const setIsFormDirty = useCallback((val: boolean) => {
    isFormDirtyRef.current = val;
    setIsFormDirtyState(val);
  }, []);

  const registerRecorder = useCallback((callbacks: RecorderCallbacks) => {
    activeRecorderRef.current = callbacks;
    return () => {
      if (activeRecorderRef.current === callbacks) {
        activeRecorderRef.current = null;
      }
    };
  }, []);

  const registerDraftSaver = useCallback((saver: () => Promise<void>) => {
    draftSaverRef.current = saver;
    return () => {
      if (draftSaverRef.current === saver) {
        draftSaverRef.current = null;
      }
    };
  }, []);

  const registerDraftDiscarder = useCallback((discarder: () => void) => {
    draftDiscarderRef.current = discarder;
    return () => {
      if (draftDiscarderRef.current === discarder) {
        draftDiscarderRef.current = null;
      }
    };
  }, []);

  const stopAndSaveAudio = useCallback(async (): Promise<AudioStopResult> => {
    if (activeRecorderRef.current) {
      try {
        const result = await activeRecorderRef.current.stopAndSave();
        setIsRecording(false);
        return result;
      } catch (err) {
        console.error('Error stopping and saving audio recorder:', err);
      }
    }
    setIsRecording(false);
    return {};
  }, [setIsRecording]);

  const discardAndStopAudio = useCallback(() => {
    if (activeRecorderRef.current) {
      try {
        activeRecorderRef.current.discardAndStop();
      } catch (err) {
        console.error('Error discarding audio recorder:', err);
      }
    }
    setIsRecording(false);
    setHasUnsavedAudio(false);
  }, [setIsRecording, setHasUnsavedAudio]);

  const interceptNavigation = useCallback(
    (onProceed: () => void | Promise<void>, e?: React.MouseEvent): boolean => {
      const pending = isRecordingRef.current || hasUnsavedAudioRef.current || isFormDirtyRef.current;
      if (pending) {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        setPendingAction(() => onProceed);
        setIsSafetyModalOpen(true);
        return false;
      }
      onProceed();
      return true;
    },
    []
  );

  const handleSaveBeforeExit = useCallback(async () => {
    setIsSafetyModalOpen(false);
    // 1. Stop and save the audio if recording or unsaved
    if (isRecordingRef.current || hasUnsavedAudioRef.current) {
      await stopAndSaveAudio();
    }
    // 2. If a draft saver is registered, save the entry draft to persistence
    if (draftSaverRef.current) {
      try {
        await draftSaverRef.current();
      } catch (err) {
        console.error('Error auto-saving draft on navigation:', err);
      }
    }
    // 3. Clear draft and reset unsaved states
    clearDraftFromStorage();
    setIsRecording(false);
    setHasUnsavedAudio(false);
    setIsFormDirty(false);

    // 4. Proceed with pending navigation
    if (pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      await action();
    }
  }, [stopAndSaveAudio, pendingAction, setIsRecording, setHasUnsavedAudio, setIsFormDirty]);

  const handleDiscardAndExit = useCallback(async () => {
    setIsSafetyModalOpen(false);
    // 1. Cleanly stop mic stream and discard audio
    discardAndStopAudio();
    // 2. If a discarder is registered, notify the form to clean draft state
    if (draftDiscarderRef.current) {
      try {
        draftDiscarderRef.current();
      } catch (err) {
        console.error('Error calling draft discarder:', err);
      }
    }
    // 3. Clear draft from localStorage and reset states
    clearDraftFromStorage();
    setIsRecording(false);
    setHasUnsavedAudio(false);
    setIsFormDirty(false);

    // 4. Proceed with pending navigation
    if (pendingAction) {
      const action = pendingAction;
      setPendingAction(null);
      await action();
    }
  }, [discardAndStopAudio, pendingAction, setIsRecording, setHasUnsavedAudio, setIsFormDirty]);

  const handleStayHere = useCallback(() => {
    setIsSafetyModalOpen(false);
    setPendingAction(null);
  }, []);

  // Prevent browser window close / refresh while recording or having unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecordingRef.current || hasUnsavedAudioRef.current || isFormDirtyRef.current) {
        e.preventDefault();
        const msg = 'Ci sono modifiche non salvate nella voce di diario.';
        e.returnValue = msg;
        return msg;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const modalTitle = isRecording
    ? 'Registrazione audio in corso'
    : hasUnsavedAudio
    ? 'Registrazione audio non salvata'
    : 'Modifiche non salvate';

  const modalMessage = isRecording
    ? 'Stai registrando una traccia vocale. Vuoi salvare la voce prima di cambiare sezione, oppure uscire e scartare le modifiche?'
    : hasUnsavedAudio
    ? 'Hai registrato una traccia vocale non ancora salvata. Vuoi salvare la voce prima di cambiare sezione, oppure uscire e scartare le modifiche?'
    : 'Ci sono modifiche non salvate nella voce di diario. Vuoi salvare la voce prima di cambiare sezione, oppure uscire e scartare le modifiche?';

  return (
    <AudioSafetyContext.Provider
      value={{
        isRecording,
        hasUnsavedAudio,
        isFormDirty,
        setIsRecording,
        setHasUnsavedAudio,
        setIsFormDirty,
        registerRecorder,
        registerDraftSaver,
        registerDraftDiscarder,
        interceptNavigation,
        stopAndSaveAudio,
        discardAndStopAudio,
        isSafetyModalOpen,
        modalTitle,
        modalMessage,
        handleSaveBeforeExit,
        handleDiscardAndExit,
        handleStayHere,
      }}
    >
      {children}

      {/* Global Safety Confirmation Modal */}
      <ConfirmModal
        isOpen={isSafetyModalOpen}
        title={modalTitle}
        message={modalMessage}
        confirmLabel="Salva voce"
        cancelLabel="Esci e scarta modifiche"
        dismissLabel="Rimani qui"
        isDanger={false}
        onConfirm={handleSaveBeforeExit}
        onCancel={handleDiscardAndExit}
        onDismiss={handleStayHere}
      />
    </AudioSafetyContext.Provider>
  );
};

export const useUnsavedAudio = (): AudioSafetyContextType => {
  const context = useContext(AudioSafetyContext);
  if (!context) {
    throw new Error('useUnsavedAudio must be used within an AudioSafetyProvider');
  }
  return context;
};
