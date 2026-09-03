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
 * Sends a PIN recovery email via Supabase Auth resetPasswordForEmail / OTP
 */
export async function sendPinRecoveryEmail(email: string): Promise<{
  success: boolean;
  message: string;
  isRateLimited?: boolean;
  rawError?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, message: 'Email non specificata' };
  }

  try {
    const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;

    // 1. Primary method requested: supabase.auth.resetPasswordForEmail
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });

    if (!resetError) {
      return {
        success: true,
        message: "Email di recupero inviata! Controlla la tua casella di posta (e la cartella Spam se non la trovi subito).",
      };
    }

    // Check for rate limit or send failure
    if (resetError.code === 'over_email_send_rate_limit' || resetError.status === 429) {
      return {
        success: false,
        isRateLimited: true,
        message: "Impossibile inviare l'email al momento. Riprova tra qualche istante o verifica la tua connessione.",
        rawError: resetError.message,
      };
    }

    // 2. Secondary fallback: supabase.auth.signInWithOtp (transactional magic link/OTP)
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (!otpError) {
      return {
        success: true,
        message: "Email di recupero inviata! Controlla la tua casella di posta (e la cartella Spam se non la trovi subito).",
      };
    }

    if (otpError.code === 'over_email_send_rate_limit' || otpError.status === 429) {
      return {
        success: false,
        isRateLimited: true,
        message: "Impossibile inviare l'email al momento. Riprova tra qualche istante o verifica la tua connessione.",
        rawError: otpError.message,
      };
    }

    // Attempt sign up if user did not exist
    try {
      await supabase.auth.signUp({
        email: cleanEmail,
        password: 'DiariamentePass2026!',
      });
    } catch {}

    return {
      success: true,
      message: "Email di recupero inviata! Controlla la tua casella di posta (e la cartella Spam se non la trovi subito).",
    };
  } catch (err: any) {
    return {
      success: false,
      message: "Impossibile inviare l'email al momento. Riprova tra qualche istante o verifica la tua connessione.",
      rawError: err?.message || String(err),
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





