/**
 * Push Notifications — Kargo CRM
 * Gestiona el registro del service worker y la suscripción push.
 * La clave pública VAPID viene de la variable de entorno.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL!;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY!;
const VAPID_PUBLIC_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from(rawData.split('').map(c => c.charCodeAt(0)));
}

export async function registrarServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('[Kargo SW] registrado:', reg.scope);
    return reg;
  } catch (e) {
    console.error('[Kargo SW] error al registrar:', e);
    return null;
  }
}

export async function suscribirPush(): Promise<{ ok: boolean; reason: string }> {
  if (!('serviceWorker' in navigator)) {
    return { ok: false, reason: 'Tu navegador no soporta Service Workers' };
  }
  if (!('PushManager' in window)) {
    return { ok: false, reason: 'Tu navegador no soporta notificaciones push' };
  }
  if (!VAPID_PUBLIC_KEY) {
    return { ok: false, reason: 'Falta configurar REACT_APP_VAPID_PUBLIC_KEY en Vercel' };
  }

  // 1. Verificar que el SW esté registrado
  let reg: ServiceWorkerRegistration;
  try {
    reg = await navigator.serviceWorker.ready;
    console.log('[Push] SW listo:', reg.scope);
  } catch (e) {
    return { ok: false, reason: 'Service Worker no pudo inicializarse' };
  }

  // 2. Pedir permiso
  const perm = await Notification.requestPermission();
  if (perm === 'denied') return { ok: false, reason: 'Permiso de notificaciones denegado por el usuario' };
  if (perm !== 'granted') return { ok: false, reason: 'Permiso de notificaciones no otorgado' };

  // 3. Suscribirse
  let subscription: PushSubscription;
  try {
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  } catch (e: any) {
    console.error('[Push] Error al suscribir:', e);
    return { ok: false, reason: `Error al suscribir: ${e?.message || e}` };
  }

  // 4. Guardar en Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const sub = subscription.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    { endpoint: sub.endpoint, keys: sub.keys, updated_at: new Date().toISOString() },
    { onConflict: 'endpoint' }
  );
  if (error) {
    console.error('[Push] Error guardando suscripción:', error.message);
    return { ok: false, reason: `Error guardando suscripción: ${error.message}` };
  }
  console.log('[Push] Suscripción guardada');
  return { ok: true, reason: '' };
}

export async function desuscribirPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;

  const endpoint = sub.endpoint;
  await sub.unsubscribe();

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  console.log('[Push] Desuscripto');
}

export async function estasSuscripto(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return !!sub;
  } catch { return false; }
}
