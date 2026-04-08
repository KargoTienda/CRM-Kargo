import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ShoppingBagIcon, QuestionMarkCircleIcon,
  CheckCircleIcon, XCircleIcon, ArrowPathIcon, LinkIcon,
} from '@heroicons/react/24/outline';
import {
  getAuthUrl, exchangeCode, clearToken, isConnected,
  getMiPerfil, getOrdenes, getPreguntas, getTodasLasOrdenes,
} from '../../services/mlService';
import { toast } from 'react-hot-toast';

const glass = {
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.9)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
} as React.CSSProperties;

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');


// ─── MercadoLibre principal ──────────────────────────────
const MercadoLibre: React.FC = () => {
  const location = useLocation();
  const [conectado, setConectado] = useState(isConnected());
  const [cargando, setCargando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [perfil, setPerfil] = useState<any>(null);
  const [ordenes, setOrdenes] = useState<any[]>([]);
  const [preguntas, setPreguntas] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Detectar callback de ML con ?code= en la URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get('code');
    if (code && !conectado) {
      confirmarCodigo(code);
      // Limpiar la URL
      window.history.replaceState({}, '', '/mercadolibre');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (conectado) cargarDatos();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conectado]);

  const cargarDatos = async () => {
    setCargando(true);
    setError(null);
    try {
      const [p, o, q] = await Promise.all([
        getMiPerfil(),
        getOrdenes(50),
        getPreguntas(),
      ]);
      setPerfil(p);
      setOrdenes(o.results || []);
      setPreguntas(q.questions || []);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Error desconocido';
      setError(typeof msg === 'string' ? msg : 'Error cargando datos de MercadoLibre');
    } finally {
      setCargando(false);
    }
  };

  const sincronizarTodo = async () => {
    setSincronizando(true);
    try {
      const todas = await getTodasLasOrdenes();
      setOrdenes(todas.slice(0, 200)); // mostrar hasta 200 en pantalla
      toast.success(`Sincronizadas ${todas.length} órdenes`);
    } catch (e: any) {
      toast.error('Error sincronizando órdenes');
    } finally {
      setSincronizando(false);
    }
  };

  const iniciarConexion = async () => {
    const url = await getAuthUrl();
    window.location.href = url;
  };

  const confirmarCodigo = async (code: string) => {
    setCargando(true);
    setError(null);
    try {
      await exchangeCode(code);
      setConectado(true);
      toast.success('MercadoLibre conectado');
    } catch (e: any) {
      const raw = e?.response?.data;
      const msg = raw?.message || raw?.error_description || raw?.error
        || e?.message || 'Error al conectar';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      setCargando(false);
    }
  };

  const desconectar = () => {
    clearToken();
    setConectado(false);
    setPerfil(null);
    setOrdenes([]);
    setPreguntas([]);
    toast.success('Desconectado de MercadoLibre');
  };

  const estadoOrden = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      paid:        { label: 'Pagada',     color: '#059669', bg: 'rgba(5,150,105,0.1)'  },
      cancelled:   { label: 'Cancelada',  color: '#dc2626', bg: 'rgba(220,38,38,0.1)'  },
      pending:     { label: 'Pendiente',  color: '#d97706', bg: 'rgba(217,119,6,0.1)'  },
      in_process:  { label: 'En proceso', color: '#0284c7', bg: 'rgba(2,132,199,0.1)'  },
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
          <p className="text-sm text-gray-500 mb-2 max-w-md mx-auto">
            Al conectar podés ver ventas, responder preguntas y sincronizar stock automáticamente.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            URL de retorno: <code className="bg-gray-100 px-1 rounded">{window.location.origin}/mercadolibre</code>
            <br/>Registrala en tu app de ML si aún no lo hiciste.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 rounded-xl text-sm text-red-700 text-left">{error}</div>
          )}

          {cargando ? (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              Conectando...
            </div>
          ) : (
            <button
              onClick={iniciarConexion}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all hover:scale-105"
              style={{ backgroundColor: '#FFE600', color: '#3d2b00', boxShadow: '0 4px 16px rgba(255,230,0,0.4)' }}>
              <LinkIcon className="h-4 w-4" />
              Vincular MercadoLibre
            </button>
          )}
        </div>

      </div>
    );
  }

  // ── Conectado ────────────────────────────────────────────
  return (
    <div className="space-y-5">
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
          <button onClick={sincronizarTodo} disabled={sincronizando}
            title="Sincronizar todas las órdenes"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-gray-200 hover:bg-blue-50 transition-all disabled:opacity-50"
            style={{ color: '#004085' }}>
            <ArrowPathIcon className={`h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`} />
            {sincronizando ? 'Sincronizando...' : 'Sync completo'}
          </button>
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

      {!cargando && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Órdenes cargadas', valor: ordenes.length, icon: ShoppingBagIcon, color: '#004085', bg: '#e6edf5' },
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

      {!cargando && ordenes.length > 0 && (
        <div className="rounded-2xl p-5" style={glass}>
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-sm" style={{ color: '#1a1a2e' }}>Ventas</p>
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
