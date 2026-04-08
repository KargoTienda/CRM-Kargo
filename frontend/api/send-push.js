/**
 * Endpoint server-side para enviar push notifications a todos los dispositivos.
 * POST /api/send-push  { title, body, type, url }
 */
const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.REACT_APP_VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.REACT_APP_VAPID_EMAIL || 'mailto:admin@kargo.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return res.status(500).json({ ok: false, error: 'VAPID keys not configured' });
  }

  const { title = 'Kargo CRM', body = '', type = 'info', url = '/dashboard', tag } = req.body || {};

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const { data: subs, error } = await supabase.from('push_subscriptions').select('endpoint, keys');

  if (error || !subs?.length) {
    return res.status(200).json({ ok: true, sent: 0, message: 'No hay suscriptores' });
  }

  const payload = JSON.stringify({ title, body, type, url, tag: tag || type });
  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload,
          { TTL: 86400 }
        );
        sent++;
      } catch (err) {
        failed++;
        // Eliminar suscripciones inválidas (410 = gone)
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    })
  );

  res.status(200).json({ ok: true, sent, failed });
};
