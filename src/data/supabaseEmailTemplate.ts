/**
 * Clean HTML Email Template for Diariamente PIN / Access Code Recovery
 * 
 * Fix for Gmail & Outlook Square Border-Radius Artifact:
 * - Table cells (<td>) in Chrome/Gmail draw their native rectangular cell grid borders
 *   when CSS border is applied to a <td>, causing a square outline to appear over/behind border-radius.
 * - By eliminating all borders from <table> and <td>, and using block containers (<div>)
 *   with inline border & border-radius, we guarantee a single, perfectly curved border
 *   without any outer square box artifacts.
 */

export const generatePinEmailHtml = (
  pinOrToken: string = '{{ .Token }}',
  isActualPin: boolean = false
): string => {
  const codeLabel = isActualPin ? 'IL TUO PIN DI ACCESSO' : 'CODICE DI ACCESSO';
  const introText = isActualPin
    ? "Ecco il tuo PIN di accesso per rientrare nell'app:"
    : "Ecco il tuo codice di verifica per accedere nuovamente al tuo diario:";
  const instructionsText = isActualPin
    ? "Digita questo PIN direttamente nella schermata dell'app per sbloccare il tuo diario."
    : "Usa questo codice monouso per sbloccare l'app e impostare il tuo nuovo PIN.";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="it">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Diariamente - Codice di Accesso</title>
  <style type="text/css">
    /* Reset and eliminate table-cell square border artifacts in all clients */
    table, td { border: 0 !important; border-collapse: collapse !important; outline: 0 !important; }
    div { box-sizing: border-box; }
  </style>
</head>
<body bgcolor="#06070a" style="margin: 0; padding: 0; background-color: #06070a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Centering Wrapper Table (No borders) -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#06070a" style="background-color: #06070a; width: 100%; border: 0 none; border-collapse: collapse; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 40px 16px 40px 16px; border: 0 none;">
        
        <!-- Email Container Card (Block div eliminates table-cell border artifacts) -->
        <div style="max-width: 500px; width: 100%; margin: 0 auto; background-color: #0e1017; border: 1px solid #232738; border-radius: 16px; overflow: hidden; text-align: left;">
          
          <!-- Top Accent Bar -->
          <div style="background-color: #6366f1; height: 4px; width: 100%; font-size: 0; line-height: 0;">&nbsp;</div>

          <!-- Main Card Content -->
          <div style="padding: 36px 28px 28px 28px;">
            
            <!-- Brand Header -->
            <div style="text-align: center; margin-bottom: 24px;">
              <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; text-align: center; background-color: #1a1d2e; border: 1px solid #3730a3; border-radius: 12px; color: #a5b4fc; font-size: 20px; font-weight: bold; margin-bottom: 10px;">
                ✦
              </div>
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px; line-height: 28px;">
                Diariamente
              </div>
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #818cf8; line-height: 18px; margin-top: 2px;">
                Il tuo spazio quotidiano per riflettere e crescere
              </div>
              <div style="background-color: #232738; height: 1px; width: 100%; margin-top: 20px; font-size: 0; line-height: 0;">&nbsp;</div>
            </div>

            <!-- Greeting Message -->
            <div style="margin-bottom: 22px;">
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 17px; font-weight: 700; color: #ffffff; margin-bottom: 8px;">
                Ciao!
              </div>
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 22px; color: #cbd5e1;">
                ${introText}
              </div>
            </div>

            <!-- Spotlight Code / PIN Box (Curved border ONLY - NO outer square outlines) -->
            <div style="background-color: #141724; border: 1px solid #4f46e5; border-radius: 14px; padding: 22px 16px 20px 16px; text-align: center; margin-bottom: 22px; box-sizing: border-box;">
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 700; color: #a5b4fc; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">
                ${codeLabel}
              </div>
              <div style="font-family: Consolas, 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; color: #ffffff; letter-spacing: 8px; line-height: 42px; margin-bottom: 10px;">
                ${pinOrToken}
              </div>
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; line-height: 19px; color: #cbd5e1;">
                ${instructionsText}
              </div>
            </div>

            <!-- Privacy Assurance Callout -->
            <div style="background-color: #0d1424; border: 1px solid #1e293b; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; line-height: 18px; color: #94a3b8; box-sizing: border-box;">
              <strong style="color: #c7d2fe;">🔒 La tua privacy è al sicuro:</strong> Le tue annotazioni, i tuoi pensieri e le tue registrazioni rimangono crittografati sul tuo dispositivo. Nessun intermediario può leggere i tuoi dati personali.
            </div>

            <!-- Security Notice -->
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; line-height: 18px; color: #64748b;">
              Se non sei stato tu a effettuare questa richiesta, puoi ignorare questo messaggio in totale serenità: il tuo account e i tuoi dati rimangono protetti.
            </div>

          </div>

          <!-- Footer Area -->
          <div style="background-color: #08090d; border-top: 1px solid #1a1d2e; padding: 18px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #64748b; line-height: 16px; text-align: center;">
            <span style="color: #94a3b8; font-weight: 600;">Diariamente</span> &bull; Riservatezza &bull; Spazio Quotidiano<br />
            Comunicazione automatizzata generata per il tuo account protetto.
          </div>

        </div>
        <!-- End Email Container Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Standard Supabase Auth Reset Password email template string
 * Ready to copy & paste into Supabase Dashboard: Authentication -> Email Templates -> Reset Password
 */
export const SUPABASE_EMAIL_TEMPLATE_HTML = generatePinEmailHtml('{{ .Token }}', false);
