import React, { useState, useRef, useEffect } from 'react';
import { BellIcon, Bars3Icon, ShoppingBagIcon, ChatBubbleLeftRightIcon, ExclamationTriangleIcon, ArchiveBoxXMarkIcon } from '@heroicons/react/24/outline';
import { useNotificaciones } from '../../contexts/NotificacionesContext';
import { TipoNotif } from '../../utils/notificaciones';

const TIPO_CONFIG: Record<TipoNotif, { color: string; bg: string; Icon: React.ComponentType<any> }> = {
  venta:              { color: '#059669', bg: '#f0fdf4', Icon: ShoppingBagIcon },
  mensaje:            { color: '#004085', bg: '#e6edf5', Icon: ChatBubbleLeftRightIcon },
  reclamo:            { color: '#dc2626', bg: '#fef2f2', Icon: ExclamationTriangleIcon },
  stock_sin_cobertura:{ color: '#d97706', bg: '#fffbeb', Icon: ArchiveBoxXMarkIcon },
};

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min}m`;
  const hs = Math.floor(min / 60);
  if (hs < 24) return `hace ${hs}h`;
  return `hace ${Math.floor(hs / 24)}d`;
}

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, showMenuButton = false }) => {
  const { notificaciones, noLeidas, marcarLeida, marcarTodasLeidas } = useNotificaciones();
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header style={{ backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}
      className="px-6 py-3 flex items-center justify-end gap-3 relative z-20">

      {showMenuButton && (
        <button onClick={onMenuClick} className="mr-auto p-2 rounded-lg hover:bg-gray-100 lg:hidden">
          <Bars3Icon className="h-5 w-5 text-gray-500" />
        </button>
      )}

      {/* Campana */}
      <div ref={ref} className="relative">
        <button onClick={() => { setAbierto(v => !v); }}
          className="relative p-2 rounded-xl hover:bg-gray-100 transition-all">
          <BellIcon className="h-5 w-5 text-gray-500" />
          {noLeidas > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: '#D35400', fontSize: '9px' }}>
              {noLeidas > 9 ? '9+' : noLeidas}
            </span>
          )}
        </button>

        {/* Dropdown notificaciones */}
        {abierto && (
          <div className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl overflow-hidden z-50"
            style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(16px)' }}>

            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="font-bold text-sm" style={{ color: '#1a1a2e' }}>
                Notificaciones {noLeidas > 0 && <span className="ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: '#D35400', color: 'white' }}>{noLeidas}</span>}
              </p>
              {noLeidas > 0 && (
                <button onClick={marcarTodasLeidas} className="text-xs text-gray-400 hover:text-gray-600">
                  Marcar todas leídas
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notificaciones.length === 0 ? (
                <div className="py-10 text-center">
                  <BellIcon className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-xs text-gray-400">Sin notificaciones</p>
                </div>
              ) : (
                notificaciones.map(n => {
                  const cfg = TIPO_CONFIG[n.tipo];
                  return (
                    <button key={n.id} onClick={() => marcarLeida(n.id)}
                      className="w-full text-left px-4 py-3 flex gap-3 hover:bg-gray-50 transition-all border-b border-gray-50"
                      style={{ opacity: n.leida ? 0.5 : 1 }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: cfg.bg }}>
                        <cfg.Icon className="h-4 w-4" style={{ color: cfg.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold truncate" style={{ color: '#1a1a2e' }}>{n.titulo}</p>
                          <span className="text-xs text-gray-400 flex-shrink-0">{tiempoRelativo(n.fecha)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.descripcion}</p>
                      </div>
                      {!n.leida && (
                        <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: '#D35400' }} />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
