import React, { useState, useEffect } from 'react';
import {
  ShoppingBagIcon, QuestionMarkCircleIcon,
  CheckCircleIcon, XCircleIcon, ArrowPathIcon, LinkIcon,
} from '@heroicons/react/24/outline';
import {
  getAuthUrl, exchangeCode, clearToken, isConnected,
  getMiPerfil, getOrdenes, getPreguntas,
} from '../../services/mlService';

const glass = {
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.9)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
} as React.CSSProperties;

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');

// ─── Modal para pegar el código ──────────────────────────
const ModalCodigo: React.FC<{ onConfirmar: (code: string) => void; onCerrar: () => void }> = ({ onConfirmar, onCerrar }) => {
  const [url, setUrl] = useState('');

  const extraerCodigo = () => {
    try {
      const u = new URL(url.trim());
      const code = u.searchParams.get('code');
      if (code) {
        onConfirmar(code);
      } else {
        alert('No encontré el código en esa URL. Asegurate de copiar la URL completa de la barra del navegador.');
      }
    } catch {
      alert('URL inválida. Copiá la URL completa de la barra del navegador.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-yellow-50">
            <ShoppingBagIcon className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <h2 className="font-bold" style={{ color: '#004085' }}>Paso 2 — Pegá la URL</h2>
            <p className="text-xs text-gray-400">Después de autorizar en MercadoLibre</p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 mb-4 text-xs text-blue-800 space-y-1">
          <p className="font-bold">¿Cómo hacerlo?</p>
          <p>1. Se abrió MercadoLibre en otra pestaña</p>
          <p>2. Iniciá sesión y hacé clic en <strong>"Permitir acceso"</strong></p>
          <p>3. Te va a llevar a Google — no te preocupes</p>
          <p>4. Copiá la URL completa de la barra del navegador y pegala acá abajo</p>
        </div>

        <textarea
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://www.google.com/?code=TG-..."
          className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
          rows={3}
        />

        <div className="flex gap-3 mt-4">
          <button onClick={onCerrar}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={extraerCodigo}
            disabled={!url.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ backgroundColor: '#004085' }}>
            Conectar
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MercadoLibre principal ──────────────────────────────
const MercadoLibre: React.FC = () => {
  const [conectado, setConectado] = useState(isConnected());
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [perfil, setPerfil] = useState<any>(null);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [preguntas, setPreguntas] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (conectado) cargarDatos();
  }, [conectado]);

  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    try {
      const [p, o, q] = await Promise.all([
        getMiPerfil(),
        getOrdenes(),
        getPreguntas(),
      ]);
      setPerfil(p);
      setOrdenes(o.results || []);
      setPreguntas(q.questions || []);
    } catch (e: any) {
      setError('Error cargando datos de MercadoLibre. Intentá reconectar.');
    } finally {
      setCargando(false);
    }
  };

  const iniciarConexion = async () => {
    const url = await getAuthUrl();
    window.open(url, '_blank');
    setModalAbierto(true);
  };

  const confirmarCodigo = async (code: string) => {
    setModalAbierto(false);
    setCargando(true);
    try {
      await exchangeCode(code);
      setConectado(true);
    } catch (e: any) {
      const detalle = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Error desconocido';
      setError(`Error al conectar: ${detalle}`);
      setCargando(false);
    }
  };

  const desconectar = () => {
    clearToken();
    setConectado(false);
    setPerfil(null);
    setOrdenes([]);
    setPreguntas([]);
  };

  const estadoOrden = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      paid:        { label: 'Pagada',      color: '#059669', bg: 'rgba(5,150,105,0.1)'  },
      cancelled:   { label: 'Cancelada',   color: '#dc2626', bg: 'rgba(220,38,38,0.1)'  },
      pending:     { label: 'Pendiente',   color: '#d97706', bg: 'rgba(217,119,6,0.1)'  },
      in_process:  { label: 'En proceso',  color: '#0284c7', bg: 'rgba(2,132,199,0.1)'  },
    };
    return map[status] || { label: status, color: '#6b7280', bg: 'rgba(107,114,128,0.1)' };
  };

  // ── Sin conectar ─────────────────────────────────────────
  if (!conectado) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#004085' }}>MercadoLibre</h1>
          <p className="text-sm text-gray-400 mt-0.5">Conectá tu cuenta para ver ventas y mensajes en tiempo real</p>
        </div>

        <div className="rounded-2xl p-8 text-center" style={glass}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ backgroundColor: '#FFE600' }}>
            <ShoppingBagIcon className="h-8 w-8" style={{ color: '#3d2b00' }} />
          </div>
          <h2 className="text-xl font-black mb-2" style={{ color: '#004085' }}>
            Conectá MercadoLibre
          </h2>
          <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
            Al conectar vas a poder ver tus ventas, responder preguntas y mensajes directamente desde el CRM.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 rounded-xl text-sm text-red-700">{error}</div>
          )}

          <button
            onClick={iniciarConexion}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all hover:scale-105"
            style={{ backgroundColor: '#FFE600', color: '#3d2b00', boxShadow: '0 4px 16px rgba(255,230,0,0.4)' }}>
            <LinkIcon className="h-4 w-4" />
            Vincular MercadoLibre
          </button>
        </div>

        {modalAbierto && (
          <ModalCodigo
            onConfirmar={confirmarCodigo}
            onCerrar={() => setModalAbierto(false)}
          />
        )}
      </div>
    );
  }

  // ── Conectado ────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#004085' }}>MercadoLibre</h1>
          {perfil && (
            <p className="text-sm text-gray-400 mt-0.5">
              Conectado como <span className="font-semibold" style={{ color: '#004085' }}>{perfil.nickname}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={cargarDatos} disabled={cargando}
            className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50">
            <ArrowPathIcon className={`h-4 w-4 text-gray-500 ${cargando ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={desconectar}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all">
            <XCircleIcon className="h-4 w-4" />
            Desconectar
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 rounded-xl text-sm text-red-700">{error}</div>
      )}

      {/* Stats rápidas */}
      {!cargando && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Ventas recientes', valor: ordenes.length, icon: ShoppingBagIcon, color: '#004085', bg: '#e6edf5' },
            { label: 'Preguntas sin resp.', valor: preguntas.length, icon: QuestionMarkCircleIcon, color: '#D35400', bg: '#fef3ec' },
            { label: 'Reputación', valor: perfil?.seller_reputation?.level_id || '—', icon: CheckCircleIcon, color: '#059669', bg: '#ecfdf5' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4" style={glass}>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl" style={{ backgroundColor: s.bg }}>
                  <s.icon className="h-4 w-4" style={{ color: s.color }} />
                </div>
              </div>
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.valor}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {cargando && (
        <div className="rounded-2xl p-12 text-center" style={glass}>
          <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-400">Cargando datos de MercadoLibre...</p>
        </div>
      )}

      {/* Órdenes */}
      {!cargando && ordenes.length > 0 && (
        <div className="rounded-2xl p-5" style={glass}>
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-sm" style={{ color: '#1a1a2e' }}>Ventas recientes</p>
            <span className="text-xs text-gray-400">{ordenes.length} órdenes</span>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {ordenes.map((orden: any) => {
              const est = estadoOrden(orden.status);
              const item = orden.order_items?.[0];
              return (
                <div key={orden.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-100 transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: '#3A3A3A' }}>
                      {item?.item?.title || 'Producto'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {item?.quantity} unid. · {new Date(orden.date_created).toLocaleDateString('es-AR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="text-sm font-bold" style={{ color: '#004085' }}>
                      {fmt(orden.total_amount)}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ color: est.color, backgroundColor: est.bg }}>
                      {est.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preguntas */}
      {!cargando && preguntas.length > 0 && (
        <div className="rounded-2xl p-5" style={glass}>
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-sm" style={{ color: '#1a1a2e' }}>Preguntas sin responder</p>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={{ backgroundColor: '#fef3ec', color: '#D35400' }}>
              {preguntas.length}
            </span>
          </div>
          <div className="space-y-2">
            {preguntas.slice(0, 10).map((p: any) => (
              <div key={p.id} className="p-3 rounded-xl border border-orange-100 bg-orange-50/30">
                <p className="text-xs font-medium text-gray-700 mb-1">{p.text}</p>
                <p className="text-xs text-gray-400">{new Date(p.date_created).toLocaleDateString('es-AR')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!cargando && ordenes.length === 0 && preguntas.length === 0 && !error && (
        <div className="rounded-2xl p-8 text-center" style={glass}>
          <CheckCircleIcon className="h-10 w-10 mx-auto mb-3" style={{ color: '#059669' }} />
          <p className="font-bold" style={{ color: '#004085' }}>Todo al día</p>
          <p className="text-sm text-gray-400 mt-1">No hay ventas recientes ni preguntas pendientes</p>
        </div>
      )}
    </div>
  );
};

export default MercadoLibre;
