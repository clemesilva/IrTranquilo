import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => l.split('=').map((s) => s.trim()))
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const resend = new Resend(env.RESEND_API_KEY);

const { data: users, error } = await supabase
  .from('users')
  .select('email, display_name')
  .eq('email', 'clementesilvavicuna@gmail.com')
  .limit(1);

if (error) { console.error(error); process.exit(1); }

const user = users[0];
console.log(`Enviando a: ${user.email}`);

const result = await resend.emails.send({
  from: 'AndaTranquilo <hola@andatranquilo.cl>',
  to: user.email,
  subject: '¿Fuiste a algún lugar esta semana?',
  html: `
    <!DOCTYPE html>
    <html lang="es">
    <head><meta charset="UTF-8"/></head>
    <body style="margin:0;padding:0;background:#F0F6FF;font-family:system-ui,-apple-system,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F6FF;padding:40px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(26,86,160,0.08);">
            <!-- Header -->
            <tr>
              <td style="background:linear-gradient(135deg,#2563b0,#1A56A0);padding:32px;text-align:center;">
                <p style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">AndaTranquilo</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:36px 40px;">
                <p style="margin:0 0 12px;font-size:18px;font-weight:600;color:#0f3460;">
                  Hola${user.display_name ? `, ${user.display_name}` : ''} 👋
                </p>
                <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.6;">
                  ¿Fuiste a algún lugar esta semana? Si el lugar ya está en AndaTranquilo, deja una reseña y cuéntanos cómo fue la accesibilidad. Si no está, <strong style="color:#0f3460;">agrégalo</strong> para que otros puedan conocerlo antes de ir.
                </p>
                <p style="margin:0 0 32px;font-size:15px;color:#444;line-height:1.6;">
                  Solo toma un minuto y hace una gran diferencia para quienes necesitan saber si un lugar es accesible antes de ir.
                </p>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:#1A56A0;border-radius:10px;">
                      <a href="https://andatranquilo.cl/explore"
                         style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                        Dejar una reseña →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="padding:20px 40px;border-top:1px solid #e8f0fb;">
                <p style="margin:0;font-size:12px;color:#999;text-align:center;">
                  Recibes este recordatorio porque eres parte de AndaTranquilo.<br/>
                  <a href="https://andatranquilo.cl" style="color:#1A56A0;">andatranquilo.cl</a>
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `,
});

console.log('Resultado:', result);
