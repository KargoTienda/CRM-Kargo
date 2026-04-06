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

export function emitirNotificacion(n: Omit<Notificacion, 'id' | 'fecha' | 'leida'>) {
  const notif: Notificacion = {
    ...n,
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    fecha: new Date().toISOString(),
    leida: false,
  };
  listeners.forEach(l => l(notif));
}

export function suscribirNotificaciones(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}
