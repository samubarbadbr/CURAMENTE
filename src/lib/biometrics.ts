/**
 * WebAuthn Biometrics Helper (Face ID / Touch ID / Fingerprint)
 * Uses the Web Authentication API to authenticate users securely on supported devices.
 */

export interface BiometricStatus {
  isAvailable: boolean;
  type: 'face_id' | 'fingerprint' | 'biometrics' | 'none';
}

/**
 * Check if the current browser/device supports WebAuthn platform biometrics (Face ID / Touch ID)
 */
export async function checkBiometricsAvailability(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    if (
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return !!available;
    }
  } catch (err) {
    console.warn('Biometrics check error:', err);
  }
  return false;
}

/**
 * Register a biometric credential for the local user on this device
 */
export async function registerBiometricCredential(): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  if (typeof window === 'undefined' || !navigator.credentials) {
    return { success: false, error: 'WebAuthn non supportato su questo browser.' };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: {
        name: 'Diariamente App',
        id: window.location.hostname || 'localhost',
      },
      user: {
        id: userId,
        name: 'user@diariamente.app',
        displayName: 'Utente Diariamente',
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' }, // ES256
        { alg: -257, type: 'public-key' }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    })) as PublicKeyCredential | null;

    if (credential && credential.id) {
      return { success: true, credentialId: credential.id };
    }
    return { success: false, error: 'Registrazione biometrica non completata.' };
  } catch (err: any) {
    console.error('Biometric registration error:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Operazione annullata o permesso biometrico negato.' };
    }
    return { success: false, error: err?.message || 'Errore configurazione Face ID / Touch ID.' };
  }
}

/**
 * Verify / Authenticate with biometric prompt (Face ID / Touch ID)
 */
export async function verifyBiometrics(credentialId?: string): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined' || !navigator.credentials) {
    return { success: false, error: 'WebAuthn non supportato.' };
  }

  try {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const allowCredentials: PublicKeyCredentialDescriptor[] = credentialId
      ? [
          {
            id: Uint8Array.from(atob(credentialId.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)),
            type: 'public-key',
            transports: ['internal'],
          },
        ]
      : [];

    const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
      challenge,
      rpId: window.location.hostname || 'localhost',
      userVerification: 'required',
      timeout: 60000,
      ...(allowCredentials.length > 0 ? { allowCredentials } : {}),
    };

    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
    });

    if (assertion) {
      return { success: true };
    }
    return { success: false, error: 'Verifica biometrica non riuscita.' };
  } catch (err: any) {
    console.error('Biometric verification error:', err);
    if (err.name === 'NotAllowedError') {
      return { success: false, error: 'Riconoscimento annullato o non riconosciuto.' };
    }
    return { success: false, error: err?.message || 'Errore durante la scansione biometrica.' };
  }
}
