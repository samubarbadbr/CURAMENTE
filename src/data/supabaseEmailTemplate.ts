export const SUPABASE_EMAIL_TEMPLATE_HTML = `<!DOCTYPE html>
<html lang="it" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Diariamente - Ripristino Sicurezza e Conferma</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #050508; color: #f4f4f6; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    
    @media only screen and (max-width: 600px) {
      .email-card {
        border-radius: 16px !important;
      }
      .content-padding {
        padding: 32px 20px 28px 20px !important;
      }
      .cta-btn {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #050508; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">

  <!-- Outer background table (#050508) -->
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #050508; min-height: 100vh; table-layout: fixed; margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 48px 16px 48px 16px; background-color: #050508;">
        
        <!-- Center Email Card (Max width 540px, Dark Glassmorphism style) -->
        <table class="email-card" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #0d0e15; background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 24px; box-shadow: 0 20px 48px rgba(0, 0, 0, 0.75); overflow: hidden;">
          
          <!-- Top Gradient Accent Bar -->
          <tr>
            <td height="3" style="background: linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #38bdf8 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td class="content-padding" style="padding: 44px 36px 36px 36px; text-align: center;">

              <!-- App Icon Badge -->
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 18px auto;">
                <tr>
                  <td align="center" width="54" height="54" style="width: 54px; height: 54px; background-color: rgba(99, 102, 241, 0.14); border: 1px solid rgba(99, 102, 241, 0.35); border-radius: 16px; text-align: center; vertical-align: middle;">
                    <span style="font-size: 24px; line-height: 1; color: #a5b4fc; display: inline-block;">✦</span>
                  </td>
                </tr>
              </table>

              <!-- Header Title & Tagline -->
              <h1 style="margin: 0 0 6px 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                Diariamente
              </h1>
              <p style="margin: 0 0 26px 0; font-size: 13px; font-weight: 500; color: #94a3b8; letter-spacing: 0.2px;">
                Il tuo spazio quotidiano per riflettere e crescere
              </p>

              <!-- Divider Line -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 26px;">
                <tr>
                  <td height="1" style="background-color: rgba(255, 255, 255, 0.08); font-size: 0; line-height: 0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Body Message with Privacy Tone -->
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #f1f5f9; text-align: left; font-weight: 400;">
                Gentile utente,
              </p>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #cbd5e1; text-align: left; font-weight: 400;">
                abbiamo ricevuto una richiesta di ripristino per il codice di sicurezza (PIN) o di verifica per il tuo diario personale su <strong style="color: #ffffff;">Diariamente</strong>.
              </p>

              <!-- Privacy Assurance Callout -->
              <div style="background-color: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 14px; padding: 14px 18px; margin-bottom: 28px; text-align: left;">
                <p style="margin: 0; font-size: 13px; line-height: 20px; color: #c7d2fe;">
                  🔒 <strong>La tua privacy è al sicuro:</strong> Le tue annotazioni, i tuoi pensieri e le tue registrazioni rimangono crittografati sul tuo dispositivo. Nessun intermediario può leggere i tuoi dati personali.
                </p>
              </div>

              <!-- Main Call To Action Button ({{ .ConfirmationURL }}) -->
              <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 30px auto;">
                <tr>
                  <td align="center" style="border-radius: 14px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); box-shadow: 0 6px 22px rgba(99, 102, 241, 0.38);">
                    <a href="{{ .ConfirmationURL }}" target="_blank" class="cta-btn" style="display: inline-block; padding: 15px 36px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.2); letter-spacing: 0.2px; text-align: center;">
                      Conferma e Reimposta PIN
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback Direct Link -->
              <div style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px; padding: 14px 16px; margin-bottom: 26px; text-align: left;">
                <p style="margin: 0 0 6px 0; font-size: 11px; color: #94a3b8; font-weight: 500;">
                  Se il pulsante non risponde al clic, copia e incolla questo indirizzo nel tuo browser:
                </p>
                <p style="margin: 0; font-size: 11px; word-break: break-all; color: #a5b4fc; line-height: 17px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
                  <a href="{{ .ConfirmationURL }}" style="color: #a5b4fc; text-decoration: underline;">{{ .ConfirmationURL }}</a>
                </p>
              </div>

              <!-- Reassurance / Security Notice -->
              <p style="margin: 0; font-size: 12px; line-height: 19px; color: #64748b; text-align: left;">
                Se non sei stato tu a effettuare questa richiesta, puoi ignorare questa email in totale serenità: il tuo PIN e i tuoi dati rimarranno inalterati e custoditi al sicuro.
              </p>

            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="padding: 22px 36px 26px 36px; background-color: rgba(0, 0, 0, 0.35); border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: #cbd5e1; letter-spacing: 0.3px;">
                Diariamente &bull; Riservatezza &bull; Spazio Quotidiano
              </p>
              <p style="margin: 0; font-size: 11px; line-height: 17px; color: #64748b;">
                Questa è una comunicazione transazionale automatizzata generata per il tuo account protetto.
              </p>
            </td>
          </tr>

        </table>
        <!-- End Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
