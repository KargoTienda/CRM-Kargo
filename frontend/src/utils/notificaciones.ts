export type TipoNotif = 'venta' | 'mensaje' | 'reclamo' | 'stock_sin_cobertura';

export interface Notificacion {
  id: string;
  tipo: TipoNotif;
  titulo: string;
  descripcion: string;
  fecha: string;
  leida: boolean;
}

type Listener = (n: Notificacion) => void;
const listeners: Listener[] = [];

const PUSH_URL_MAP: Record<TipoNotif, string> = {
  venta:              '/finanzas',
  mensaje:            '/mensajes',
  reclamo:            '/mensajes',
  stock_sin_cobertura: '/catalogo',
};

export function emitirNotificacion(n: Omit<Notificacion, 'id' | 'fecha' | 'leida'>) {
  const notif: Notificacion = {
    ...n,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    fecha: new Date().toISOString(),
    leida: false,
  };
  listeners.forEach(l => l(notif));

  // Enviar push a todos los dispositivos registrados
  fetch('/api/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: n.titulo,
      body: n.descripcion,
      type: n.tipo,
      url: PUSH_URL_MAP[n.tipo] || '/dashboard',
    }),
  }).catch(() => {/* silencioso */});
}

export function suscribirNotificaciones(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}
