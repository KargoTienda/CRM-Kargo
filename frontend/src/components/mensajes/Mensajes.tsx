import React, { useState } from 'react';
import {
  ChatBubbleLeftRightIcon, QuestionMarkCircleIcon, ExclamationTriangleIcon,
  PaperAirplaneIcon, MagnifyingGlassIcon, ArrowPathIcon,
  CheckCircleIcon, ClockIcon, UserCircleIcon,
  ArchiveBoxIcon, InboxIcon, ArrowTopRightOnSquareIcon,
  CurrencyDollarIcon, CalendarIcon, TagIcon,
} from '@heroicons/react/24/outline';
import { useMensajes, MensajeML } from '../../contexts/MensajesContext';
import { isConnected, responderPregunta, enviarMensaje } from '../../services/mlService';

// ─── Tipos ────────────────────────────────────────────────
type Vista = 'pendientes' | 'respondidos';
type TipoFiltro = 'todos' | 'pregunta' | 'postventa' | 'reclamo';

// ─── Helpers UI ──────────────────────────────────────────
const glass = {
  background: 'rgba(255,255,255,0.9)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.9)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
} as React.CSSProperties;

const TIPO_CONFIG = {
  pregunta:  { label: 'Pregunta',   color: '#004085', bg: '#e6edf5', icon: QuestionMarkCircleIcon },
  postventa: { label: 'Post-venta', color: '#059669', bg: '#ecfdf5', icon: ChatBubbleLeftRightIcon },
  reclamo:   { label: 'Reclamo',    color: '#dc2626', bg: '#fef2f2', icon: ExclamationTriangleIcon },
};

const RECLAMO_ESTADO: Record<string, { color: string; bg: string }> = {
  'Abierto':          { color: '#dc2626', bg: '#fef2f2' },
  'En proceso':       { color: '#d97706', bg: '#fffbeb' },
  'Cerrado':          { color: '#6b7280', bg: '#f9fafb' },
  'A favor tuyo':     { color: '#059669', bg: '#f0fdf4' },
  'A favor comprador':{ color: '#dc2626', bg: '#fef2f2' },
};

function iniciales(nombre: string): string {
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function tiempoRelativo(fecha: string): string {
  if (!fecha) return '';
  const hoy = new Date().toISOString().slice(0, 10);
  if (fecha === hoy) return 'Hoy';
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (fecha === ayer) return 'Ayer';
  return fecha.split('-').reverse().join('/');
}

// ─── Avatar ───────────────────────────────────────────────
const Avatar: React.FC<{ nombre: string; size?: number }> = ({ nombre, size = 8 }) => (
  <div className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}
    style={{ backgroundColor: '#004085', fontSize: size < 10 ? '10px' : '12px' }}>
    {iniciales(nombre)}
  </div>
);

// ─── Item lista ──────────────────────────────────────────
const ItemConversacion: React.FC<{ msg: MensajeML; activo: boolean; onClick: () => void }> =
  ({ msg, activo, onClick }) => {
    const tipo = TIPO_CONFIG[msg.tipo];
    const ultimo = msg.mensajes[msg.mensajes.length - 1];
    return (
      <button onClick={onClick} className="w-full text-left p-3.5 rounded-2xl transition-all"
        style={activo
          ? { backgroundColor: '#e6edf5', border: '1.5px solid #A9C2D9' }
          : { border: '1.5px solid transparent', backgroundColor: 'transparent' }}>
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <Avatar nombre={msg.compradorNombre} size={9} />
            {!msg.respondido && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                style={{ backgroundColor: '#D35400' }} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <p className="text-xs font-bold truncate" style={{ color: '#1a1a2e' }}>
                {msg.compradorNombre}
              </p>
              <span className="text-xs text-gray-400 flex-shrink-0">{tiempoRelativo(msg.fecha)}</span>
            </div>
            <p className="text-xs text-gray-500 truncate mb-1.5">{msg.productoTitulo}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 truncate italic flex-1">
                "{ultimo?.texto}"
              </p>
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                style={{ color: tipo.color, backgroundColor: tipo.bg, fontSize: '10px' }}>
                {tipo.label}
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  };

// ─── Mensajes ─────────────────────────────────────────────
const Mensajes: React.FC = () => {
  const { mensajes, setMensajes, cargando, recargar } = useMensajes();
  const mlConectado = isConnected();
  const [vista, setVista] = useState<Vista>('pendientes');
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [seleccionado, setSeleccionado] = useState<MensajeML | null>(() =>
    mensajes.find(m => !m.respondido) || mensajes[0] || null
  );
  const [respuesta, setRespuesta] = useState('');
  const [enviando, setEnviando] = useState(false);

  const pendientes = mensajes.filter(m => !m.respondido);
  const respondidos = mensajes.filter(m => m.respondido);
  const lista = (vista === 'pendientes' ? pendientes : respondidos).filter(m => {
    const matchTipo = tipoFiltro === 'todos' || m.tipo === tipoFiltro;
    const matchBusq = !busqueda ||
      m.compradorNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.productoTitulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.mensajes.some(x => x.texto.toLowerCase().includes(busqueda.toLowerCase()));
    return matchTipo && matchBusq;
  });

  const enviarRespuesta = async () => {
    if (!respuesta.trim() || !seleccionado || enviando) return;
    const texto = respuesta.trim();
    const hora = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    setEnviando(true);

    if (mlConectado) {
      try {
        if (seleccionado.tipo === 'pregunta') {
          await responderPregunta(seleccionado.id, texto);
        } else if (seleccionado.tipo === 'postventa' && seleccionado.packId) {
          await enviarMensaje(seleccionado.packId, texto);
        }
      } catch (e) {
        console.error('Error enviando a ML:', e);
      }
    }

    setMensajes(prev => prev.map(m => {
      if (m.id !== seleccionado.id) return m;
      const actualizado: MensajeML = {
        ...m,
        respondido: true,
        mensajes: [...m.mensajes, { de: 'vendedor', texto, fecha: hora }],
      };
      setSeleccionado(actualizado);
      return actualizado;
    }));
    setRespuesta('');
    setEnviando(false);
  };

  return (
    <div className="flex flex-col h-full space-y-4" style={{ height: 'calc(100vh - 100px)' }}>

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#004085' }}>Mensajes</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {pendientes.length > 0
              ? <span><span className="font-semibold" style={{ color: '#D35400' }}>{pendientes.length}</span> sin responder</span>
              : 'Todo al día'}
          </p>
        </div>
        <button onClick={recargar} disabled={cargando}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-50">
          <ArrowPathIcon className={`h-4 w-4 text-gray-500 ${cargando ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">

        {/* ── Panel izquierdo ───────────────────────────── */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3">

          {/* Tabs pendientes/respondidos */}
          <div className="flex gap-2 p-1 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.9)' }}>
            {([
              { key: 'pendientes', label: 'Sin responder', icon: InboxIcon, count: pendientes.length },
              { key: 'respondidos', label: 'Respondidos', icon: ArchiveBoxIcon, count: respondidos.length },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setVista(t.key)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all"
                style={vista === t.key
                  ? { backgroundColor: '#004085', color: 'white' }
                  : { color: '#9ca3af' }}>
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
                {t.count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                    style={vista === t.key
                      ? { backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }
                      : { backgroundColor: '#f3f4f6', color: '#6b7280' }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Filtro por tipo */}
          <div className="flex gap-1.5 flex-wrap">
            {([
              { key: 'todos', label: 'Todos' },
              { key: 'pregunta', label: 'Preguntas' },
              { key: 'postventa', label: 'Post-venta' },
              { key: 'reclamo', label: 'Reclamos' },
            ] as const).map(f => (
              <button key={f.key} onClick={() => setTipoFiltro(f.key)}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                style={tipoFiltro === f.key
                  ? { backgroundColor: '#004085', color: 'white' }
                  : { backgroundColor: 'rgba(255,255,255,0.8)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.9)' }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Buscador */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-200"
              style={{ backgroundColor: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.9)' }} />
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {cargando ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="h-6 w-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Cargando desde ML...</p>
                </div>
              </div>
            ) : lista.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-center">
                <div>
                  <CheckCircleIcon className="h-8 w-8 mx-auto mb-2 text-gray-200" />
                  <p className="text-xs text-gray-400">
                    {vista === 'pendientes' ? 'Todo respondido' : 'Sin mensajes respondidos'}
                  </p>
                </div>
              </div>
            ) : (
              lista.map(m => (
                <ItemConversacion key={m.id} msg={m} activo={seleccionado?.id === m.id}
                  onClick={() => setSeleccionado(m)} />
              ))
            )}
          </div>
        </div>

        {/* ── Panel derecho: conversación ──────────────── */}
        <div className="flex-1 rounded-2xl flex flex-col min-h-0" style={glass}>
          {!seleccionado ? (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                <p className="font-medium text-gray-400">Seleccioná una conversación</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header conversación */}
              <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar nombre={seleccionado.compradorNombre} size={10} />
                    <div>
                      <p className="font-black text-sm" style={{ color: '#1a1a2e' }}>
                        {seleccionado.compradorNombre}
                      </p>
                      <p className="text-xs text-gray-400">{seleccionado.productoTitulo}</p>
                      {seleccionado.motivoReclamo && (
                        <p className="text-xs font-semibold mt-0.5" style={{ color: '#dc2626' }}>
                          Reclamo: {seleccionado.motivoReclamo}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Badge tipo */}
                    {(() => {
                      const t = TIPO_CONFIG[seleccionado.tipo];
                      return (
                        <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
                          style={{ color: t.color, backgroundColor: t.bg }}>
                          <t.icon className="h-3.5 w-3.5" />
                          {t.label}
                        </span>
                      );
                    })()}

                    {/* Estado reclamo */}
                    {seleccionado.estadoReclamo && (() => {
                      const est = RECLAMO_ESTADO[seleccionado.estadoReclamo] || RECLAMO_ESTADO['Abierto'];
                      return (
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                          style={{ color: est.color, backgroundColor: est.bg }}>
                          {seleccionado.estadoReclamo}
                        </span>
                      );
                    })()}

                    {/* Respondido/pendiente */}
                    {seleccionado.respondido ? (
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-semibold">
                        <CheckCircleIcon className="h-3.5 w-3.5" /> Respondido
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 font-semibold">
                        <ClockIcon className="h-3.5 w-3.5" /> Pendiente
                      </span>
                    )}

                    {/* Badge reputación reclamo */}
                    {seleccionado.tipo === 'reclamo' && seleccionado.afectaReputacion != null && (
                      <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold"
                        style={seleccionado.afectaReputacion
                          ? { backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }
                          : { backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>
                        {seleccionado.afectaReputacion ? '⚠ Afecta reputación' : '✓ No afecta reputación'}
                      </span>
                    )}

                    {/* Link a ML */}
                    {seleccionado.urlML && (
                      <a href={seleccionado.urlML} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold transition-all hover:opacity-80"
                        style={{ backgroundColor: '#fff9e6', color: '#d97706', border: '1px solid #fde68a' }}
                        title="Ver en MercadoLibre">
                        <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                        Ver en ML
                      </a>
                    )}
                  </div>
                </div>

                {/* Panel de info del comprador / orden */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {/* Comprador */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                    style={{ backgroundColor: '#f0f4fa' }}>
                    <UserCircleIcon className="h-4 w-4 flex-shrink-0" style={{ color: '#004085' }} />
                    <div className="min-w-0">
                      <p className="text-gray-400 text-xs leading-none mb-0.5">Comprador</p>
                      <p className="font-semibold truncate" style={{ color: '#1a1a2e' }}>
                        {seleccionado.compradorNombre}
                        {seleccionado.compradorId > 0 && (
                          <span className="font-normal text-gray-400"> · #{seleccionado.compradorId}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Producto */}
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                    style={{ backgroundColor: '#f0f4fa' }}>
                    <TagIcon className="h-4 w-4 flex-shrink-0" style={{ color: '#004085' }} />
                    <div className="min-w-0">
                      <p className="text-gray-400 text-xs leading-none mb-0.5">Producto</p>
                      <p className="font-semibold truncate" style={{ color: '#1a1a2e' }}>
                        {seleccionado.productoTitulo}
                      </p>
                    </div>
                  </div>

                  {/* Total orden */}
                  {seleccionado.totalOrden != null && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                      style={{ backgroundColor: '#f0fdf4' }}>
                      <CurrencyDollarIcon className="h-4 w-4 flex-shrink-0 text-green-600" />
                      <div className="min-w-0">
                        <p className="text-gray-400 text-xs leading-none mb-0.5">Total orden</p>
                        <p className="font-semibold" style={{ color: '#1a1a2e' }}>
                          ${seleccionado.totalOrden.toLocaleString('es-AR')}
                          {seleccionado.cantidadOrden != null && (
                            <span className="font-normal text-gray-400"> · {seleccionado.cantidadOrden} u.</span>
                          )}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Fecha */}
                  {seleccionado.fechaOrden && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
                      style={{ backgroundColor: '#f0f4fa' }}>
                      <CalendarIcon className="h-4 w-4 flex-shrink-0" style={{ color: '#004085' }} />
                      <div className="min-w-0">
                        <p className="text-gray-400 text-xs leading-none mb-0.5">
                          {seleccionado.estadoOrden ? 'Estado' : 'Fecha'}
                        </p>
                        <p className="font-semibold" style={{ color: '#1a1a2e' }}>
                          {seleccionado.estadoOrden
                            ? seleccionado.estadoOrden
                            : seleccionado.fechaOrden.slice(0, 10).split('-').reverse().join('/')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {seleccionado.mensajes.map((m, i) => (
                  <div key={i} className={`flex gap-2.5 ${m.de === 'vendedor' ? 'flex-row-reverse' : ''}`}>
                    {m.de === 'comprador' && (
                      <Avatar nombre={seleccionado.compradorNombre} size={7} />
                    )}
                    <div className={`max-w-[72%] ${m.de === 'vendedor' ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className="rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                        style={m.de === 'vendedor'
                          ? { backgroundColor: '#004085', color: 'white', borderBottomRightRadius: '6px' }
                          : { backgroundColor: '#f3f4f6', color: '#1a1a2e', borderBottomLeftRadius: '6px' }}>
                        {m.texto}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 px-1">
                        {m.de === 'vendedor' ? 'Vos' : seleccionado.compradorNombre} · {m.fecha}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Responder */}
              <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
                <div className="flex gap-2.5 items-end">
                  <div className="flex-1 relative">
                    <textarea value={respuesta}
                      onChange={e => setRespuesta(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarRespuesta(); } }}
                      placeholder={mlConectado ? "Escribí tu respuesta... (Enter para enviar)" : "Conectá ML para enviar respuestas reales"}
                      rows={2}
                      className="w-full px-4 py-3 rounded-2xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
                      style={{ borderColor: '#e5e7eb', backgroundColor: '#fafafa' }} />
                    {!mlConectado && (
                      <p className="text-xs text-gray-400 mt-1.5">Modo local — conectá ML para enviar a compradores reales</p>
                    )}
                  </div>
                  <button onClick={enviarRespuesta}
                    disabled={!respuesta.trim() || enviando}
                    className="p-3.5 rounded-2xl text-white transition-all hover:opacity-90 disabled:opacity-40 flex-shrink-0"
                    style={{ backgroundColor: '#D35400' }}>
                    {enviando
                      ? <ArrowPathIcon className="h-5 w-5 animate-spin" />
                      : <PaperAirplaneIcon className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Mensajes;
