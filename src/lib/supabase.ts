const SUPABASE_URL = 'https://oaktfvcndyxylpsdjaik.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ha3RmdmNuZHl4eWxwc2RqYWlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MDk5MTIsImV4cCI6MjEwMjE4NTkxMn0.XEktFlHv1CHJRZJS2CHl0mvoJZ943m2d5WenVlxA6W8';

export { SUPABASE_URL, SUPABASE_KEY };

export async function saveDataToCloud(pin: string, dataPayload: any) {
  if (!pin) return { success: false, error: 'PIN mancante' };
  const cleanPin = pin.trim().toLowerCase();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        pin: cleanPin,
        data: dataPayload,
        payload: dataPayload,
        updated_at: new Date().toISOString()
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText);
    }
    return { success: true };
  } catch (err: any) {
    console.error("Errore salvataggio Cloud:", err);
    return { success: false, error: err.message || String(err) };
  }
}

export async function loadDataFromCloud(pin: string) {
  if (!pin) return null;
  const cleanPin = pin.trim().toLowerCase();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_data?pin=eq.${encodeURIComponent(cleanPin)}&select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (!res.ok) return null;
    const result = await res.json();
    if (result && result.length > 0) {
      return result[0].data || result[0].payload || result[0];
    }
  } catch (err) {
    console.error("Errore download cloud:", err);
  }
  return null;
}

