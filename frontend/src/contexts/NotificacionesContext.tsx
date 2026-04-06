import React, { createContext, useContext, useState, useEffect } from 'react';
import { Notificacion, suscribirNotificaciones } from '../utils/notificaciones';
import {
  getNotificaciones, insertNotificacion,
  updateNotificacionLeida, updateTodasLeidas,
} from '../utils/db';

interface NotificacionesContextType {
  notificaciones: Notificacion[];
  noLeidas: number;
  marcarLeida: (id: string) => void;
  marcarTodasLeidas: () => void;
}

const NotificacionesContext = createContext<NotificacionesContextType | null>(null);

export const NotificacionesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

  // Cargar notificaciones guardadas
  useEffect(() => {
    getNotificaciones().then(saved => {
      if (saved.length > 0) setNotificaciones(saved);
    });
  }, []);

  // Escuchar nuevas notificaciones del bus
  useEffect(() => {
    const unsub = suscribirNotificaciones(notif => {
      setNotificaciones(prev => [notif, ...prev].slice(0, 50));
      insertNotificacion(notif);
    });
    return unsub;
  }, []);

  const marcarLeida = (id: string) => {
    setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    updateNotificacionLeida(id);
  };

  const marcarTodasLeidas = () => {
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    updateTodasLeidas();
  };

  const noLeidas = notificaciones.filter(n => !n.leida).length;

  return (
    <NotificacionesContext.Provider value={{ notificaciones, noLeidas, marcarLeida, marcarTodasLeidas }}>
      {children}
    </NotificacionesContext.Provider>
  );
};

export function useNotificaciones() {
  const ctx = useContext(NotificacionesContext);
  if (!ctx) throw new Error('useNotificaciones debe usarse dentro de NotificacionesProvider');
  return ctx;
}
