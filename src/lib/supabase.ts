import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://oaktfvcndyxylpsdjaik.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ha3RmdmNuZHl4eWxwc2RqYWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MDk5MTIsImV4cCI6MjEwMjE4NTkxMn0.XEktFlHv1CHJRZJS2CHl0mvoJZ943m2d5WenVlxA6W8';

const env = (import.meta as any).env || {};
const SUPABASE_URL = (env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
const SUPABASE_KEY = (env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY).trim();

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export { SUPABASE_URL, SUPABASE_KEY };

export function formatSupabaseErrorMessage(errText: string): string {
  if (!errText) return 'Connessione al momento non disponibile';
  // Keep technical error clean and user-friendly
  return "Impossibile completare l'operazione al momento. Riprova tra qualche istante o verifica la tua connessione.";
}

export async function saveDataToCloud(pin: string, payloadData: any) {
  if (!pin) return { success: false, error: 'PIN / User ID mancante' };
  const cleanId = pin.trim().toLowerCase();
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { success: false, error: 'Dispositivo offline' };
    }

    const headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'resolution=merge-duplicates'
    };

    // Try multiple column payload combinations to support user_pin, pin, and user_id schemas
    const attempts = [
      // Format matching user_pin primary key table (User's active Supabase schema)
      { user_pin: cleanId, pin: cleanId, data: payloadData, payload: payloadData, updated_at: new Date().toISOString() },
      { user_pin: cleanId, payload: payloadData, updated_at: new Date().toISOString() },
      { user_pin: cleanId, data: payloadData, updated_at: new Date().toISOString() },
      // Format matching user_id primary key table
      { user_id: cleanId, pin: cleanId, data: payloadData, payload: payloadData, updated_at: new Date().toISOString() },
      { user_id: cleanId, payload: payloadData, updated_at: new Date().toISOString() },
      { user_id: cleanId, data: payloadData, updated_at: new Date().toISOString() },
      // Format matching pin primary key table
      { pin: cleanId, payload: payloadData, updated_at: new Date().toISOString() },
      { pin: cleanId, data: payloadData, updated_at: new Date().toISOString() }
    ];

    let lastError = '';

    for (const bodyObj of attempts) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/user_sync_data`, {
          method: 'POST',
          headers,
          body: JSON.stringify(bodyObj)
        });

        if (res.ok) {
          console.log("Sincronizzazione riuscita su Supabase:", Object.keys(bodyObj));
          return { success: true };
        } else {
          lastError = await res.text();
          // If error is about missing table or RLS permission, don't keep trying columns
          if (lastError.includes('PGRST205') || lastError.includes('42501') || lastError.includes('permission denied')) {
            break;
          }
        }
      } catch (postErr: any) {
        lastError = postErr?.message || 'Errore di rete';
      }
    }

    const formatted = formatSupabaseErrorMessage(lastError);
    return { success: false, error: formatted };
  } catch (err: any) {
    console.warn("Avviso sync cloud:", err?.message || err);
    return { success: false, error: err?.message || 'Connessione di rete non disponibile' };
  }
}

export async function loadDataFromCloud(pin: string) {
  if (!pin) return null;
  const cleanId = pin.trim().toLowerCase();
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn("Dispositivo offline, caricamento cloud saltato");
      return null;
    }

    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    };

    // Try queries matching user_pin, pin, and user_id columns
    const queryUrls = [
      `${SUPABASE_URL}/rest/v1/user_sync_data?user_pin=eq.${encodeURIComponent(cleanId)}&select=*`,
      `${SUPABASE_URL}/rest/v1/user_sync_data?pin=eq.${encodeURIComponent(cleanId)}&select=*`,
      `${SUPABASE_URL}/rest/v1/user_sync_data?user_id=eq.${encodeURIComponent(cleanId)}&select=*`
    ];

    for (const url of queryUrls) {
      try {
        const res = await fetch(url, { method: 'GET', headers });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            return data[0].data || data[0].payload || data[0];
          }
        }
      } catch (e) {
        // try next column query
      }
    }
  } catch (err: any) {
    console.warn("Avviso fetch cloud:", err?.message || err);
  }
  return null;
}

/**
 * Sends a PIN recovery email.
 * First attempts to invoke the Supabase Edge Function 'recover-pin' to deliver
 * the actual PIN inside the clean, spotlight graphical email template.
 * If the Edge Function is not deployed, seamlessly uses Supabase Auth OTP / Reset Password.
 */
export async function sendPinRecoveryEmail(
  email: string,
  pin?: string
): Promise<{
  success: boolean;
  message: string;
  isRateLimited?: boolean;
  rawError?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, message: 'Email non specificata' };
  }

  // Get current stored PIN if not explicitly passed
  let effectivePin = pin?.trim();
  if (!effectivePin && typeof window !== 'undefined') {
    try {
      effectivePin = localStorage.getItem('diariamente_pin_code') || '';
    } catch {}
  }

  try {
    // 1. Try Supabase Edge Function 'recover-pin'
    if (effectivePin) {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('recover-pin', {
          body: {
            email: cleanEmail,
            pin: effectivePin,
          },
        });

        if (!fnError && data?.success) {
          return {
            success: true,
            message: 'Email con il PIN di accesso inviata con successo! Controlla la tua casella di posta.',
          };
        }
      } catch (edgeErr) {
        // Edge function not yet deployed or active, fallback to Auth OTP
      }
    }

    // Ensure the redirect URL preserves GitHub Pages path (e.g. /CURAMENTE/) or dev environment root
    const redirectUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname.endsWith('/') ? window.location.pathname : window.location.pathname + '/'}`
        : 'https://samubarbadbr.github.io/CURAMENTE/';

    // 2. Primary fallback method: supabase.auth.resetPasswordForEmail
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });

    if (!resetError) {
      return {
        success: true,
        message: 'Codice inviato con successo! Inserisci il codice monouso ricevuto per sbloccare l\'app e impostare il tuo nuovo PIN.',
      };
    }

    if (resetError.code === 'over_email_send_rate_limit' || resetError.status === 429) {
      return {
        success: false,
        isRateLimited: true,
        message: 'Limite orario invio email superato. Attendi qualche minuto prima di riprovare.',
        rawError: resetError.message,
      };
    }

    // 3. Secondary fallback: supabase.auth.signInWithOtp
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (!otpError) {
      return {
        success: true,
        message: 'Codice inviato con successo! Inserisci il codice monouso ricevuto per sbloccare l\'app e impostare il tuo nuovo PIN.',
      };
    }

    if (otpError.code === 'over_email_send_rate_limit' || otpError.status === 429) {
      return {
        success: false,
        isRateLimited: true,
        message: 'Limite orario invio email superato. Attendi qualche minuto prima di riprovare.',
        rawError: otpError.message,
      };
    }

    return {
      success: false,
      message: resetError.message || otpError.message || "Impossibile inviare l'email in questo momento.",
      rawError: resetError.message || otpError.message,
    };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    return {
      success: false,
      message: `Impossibile inviare l'email: ${errMsg}`,
      rawError: errMsg,
    };
  }
}

/**
 * Checks if the current URL contains Supabase recovery tokens or recovery parameters.
 * Supports:
 * - Hash fragments: #access_token=...&type=recovery, #type=recovery
 * - Query strings: ?token_hash=...&type=recovery, ?code=...
 */
export async function handleIncomingRecoveryUrl(): Promise<{ isRecovery: boolean; sessionUser?: any }> {
  if (typeof window === 'undefined') return { isRecovery: false };

  const hash = window.location.hash || '';
  const search = window.location.search || '';

  const isRecoveryInHash =
    hash.includes('type=recovery') ||
    (hash.includes('access_token=') && hash.includes('type=recovery'));
  const isRecoveryInSearch =
    search.includes('type=recovery') ||
    search.includes('token_hash=') ||
    search.includes('type=signup') ||
    search.includes('type=magiclink');

  if (isRecoveryInHash || isRecoveryInSearch) {
    // If token_hash is in search parameters, verify it explicitly
    if (search.includes('token_hash=')) {
      const params = new URLSearchParams(search);
      const token_hash = params.get('token_hash');
      const type = (params.get('type') as any) || 'recovery';
      if (token_hash) {
        try {
          const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });
          if (!error && (data?.session || data?.user)) {
            return { isRecovery: true, sessionUser: data.user };
          }
        } catch (e) {
          console.warn('Errore verifica token_hash da URL:', e);
        }
      }
    }

    // If code is in search parameters (PKCE flow)
    if (search.includes('code=')) {
      const params = new URLSearchParams(search);
      const code = params.get('code');
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && (data?.session || data?.user)) {
            return { isRecovery: true, sessionUser: data.user };
          }
        } catch (e) {
          console.warn('Errore scambio codice per sessione:', e);
        }
      }
    }

    // Check if session is already active or set from hash fragment
    try {
      const { data } = await supabase.auth.getSession();
      return { isRecovery: true, sessionUser: data?.session?.user };
    } catch {
      return { isRecovery: true };
    }
  }

  // Also check if current session was signed in via recovery
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session && (hash.includes('access_token') || hash.includes('type=recovery'))) {
      return { isRecovery: true, sessionUser: data.session.user };
    }
  } catch {}

  return { isRecovery: false };
}

/**
 * Removes auth hash fragments and search query params from the browser URL cleanly
 * without causing a page reload.
 */
export function clearAuthUrlParams() {
  if (typeof window === 'undefined') return;
  try {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState(null, document.title, cleanUrl);
  } catch (e) {
    console.warn('Impossibile pulire i parametri URL:', e);
  }
}

/**
 * Verifies OTP code received in email (type: recovery or email)
 */
export async function verifyRecoveryCode(
  email: string,
  token: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanToken = token.trim();

  if (!cleanToken) {
    return { success: false, message: 'Inserisci il codice di verifica a 6 cifre ricevuto via email.' };
  }

  try {
    // 1. Try recovery verification
    const { data: recData, error: recError } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'recovery',
    });

    if (!recError && (recData?.session || recData?.user)) {
      return { success: true, message: 'Codice verificato con successo!' };
    }

    // 2. Try email / token verification
    const { data: emailData, error: emailError } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'email',
    });

    if (!emailError && (emailData?.session || emailData?.user)) {
      return { success: true, message: 'Codice verificato con successo!' };
    }

    return {
      success: false,
      message: recError?.message || emailError?.message || 'Codice errato o scaduto. Controlla la tua email o richiedine uno nuovo.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Errore durante la verifica del codice.',
    };
  }
}

/**
 * Persists recovery email and security metadata to Supabase cloud
 */
export async function saveRecoveryEmailToCloud(email: string, pin: string) {
  if (!email) return;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = pin ? pin.trim().toLowerCase() : 'security';
    const payload = {
      recovery_email: cleanEmail,
      pin_protected: true,
      updated_at: new Date().toISOString(),
    };

    // Save to user_sync_data as security metadata
    await saveDataToCloud(`sec_${cleanPin}`, payload);
  } catch (e) {
    console.warn('Could not sync security profile to cloud:', e);
  }
}





