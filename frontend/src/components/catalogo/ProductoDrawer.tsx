import React, { useState, useEffect } from 'react';
import { XMarkIcon, PencilIcon } from '@heroicons/react/24/outline';
import {
  Producto, ConfigParams, calcGanBruta, calcMargen,
  calcStockTotal, CATEGORIA_EMOJI, TransaccionStock,
} from './types';
import { getTransaccionesByProducto } from '../../utils/db';
import PreciosCalc from './PreciosCalc';

interface Props {
  producto: Producto | null;
  config: ConfigParams;
  onClose: () => void;
  onEditar: (p: Producto) => void;
}

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');

const COLORES_HEX: Record<string, string> = {
  Negro: '#1a1a1a', Blanco: '#f5f5f5', Azul: '#2563eb', Rojo: '#dc2626',
  Verde: '#16a34a', Naranja: '#ea580c', Rosa: '#ec4899', Violeta: '#7c3aed',
  Gris: '#6b7280', Marron: '#92400e', Marrón: '#92400e', Amarillo: '#ca8a04',
  Celeste: '#0ea5e9', Turquesa: '#0891b2',
  'Negro con Rojo': '#7f1d1d', 'Negro con Amarillo': '#713f12',
};

const DESTINO_LABEL: Record<string, { label: string; color: string }> = {
  sede:     { label: 'A sede',    color: '#004085' },
  afuera:   { label: 'Salida',    color: '#D35400' },
  venta_ml: { label: 'Venta ML',  color: '#059669' },
};

const ProductoDrawer: React.FC<Props> = ({ producto, config, onClose, onEditar }) => {
  const [tabActiva, setTabActiva] = useState<'info' | 'precios' | 'stock' | 'historial'>('info');
  const [historial, setHistorial] = useState<TransaccionStock[]>([]);
  const [cargandoHist, setCargandoHist] = useState(false);

  useEffect(() => {
    if (tabActiva !== 'historial' || !producto) return;
    setCargandoHist(true);
    getTransaccionesByProducto(producto.sku, producto.nombre).then(txs => {
      setHistorial(txs);
      setCargandoHist(false);
    });
  }, [tabActiva, producto]);

  if (!producto) return null;

  const stockTotal = calcStockTotal(producto);
  const ganBruta = calcGanBruta(producto, config);
  const margen = calcMargen(ganBruta, producto.precio);
  const precioPromo = producto.promoPorc > 0
    ? Math.round(producto.precio * (1 - producto.promoPorc))
    : producto.precio;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black bg-opacity-30 backdrop-blur-sm"
        onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col bg-white shadow-2xl"
        style={{ animation: 'slideInRight 0.25s ease-out' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{CATEGORIA_EMOJI[producto.categoria]}</span>
            <div>
              <h2 className="font-bold text-sm leading-tight" style={{ color: '#3A3A3A' }}>
                {producto.nombre}
              </h2>
              <p className="text-xs text-gray-400">{producto.sku} · {producto.categoria}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEditar(producto)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
              style={{ backgroundColor: '#004085' }}>
              <PencilIcon className="h-3.5 w-3.5" /> Editar
            </button>
            <button onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <XMarkIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Imagen */}
        <div className="flex-shrink-0">
          {producto.imagen ? (
            <img src={producto.imagen} alt={producto.nombre}
              className="w-full h-48 object-cover" />
          ) : (
            <div className="w-full h-36 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #e6edf5 0%, #c8daea 100%)' }}>
              <span className="text-6xl">{CATEGORIA_EMOJI[producto.categoria]}</span>
            </div>
          )}
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-3 gap-px bg-gray-100 flex-shrink-0">
          {[
            { label: 'Precio', valor: fmt(precioPromo), color: '#004085' },
            { label: 'Ganancia', valor: fmt(ganBruta), color: ganBruta >= 0 ? '#059669' : '#dc2626' },
            { label: 'Margen', valor: `${margen}%`, color: margen >= 30 ? '#059669' : '#d97706' },
          ].map(s => (
            <div key={s.label} className="bg-white px-3 py-2.5 text-center">
              <p className="text-xs text-gray-400 mb-0.5">{s.label}</p>
              <p className="text-sm font-bold" style={{ color: s.color }}>{s.valor}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0">
          {(['info', 'precios', 'stock', 'historial'] as const).map(tab => (
            <button key={tab} onClick={() => setTabActiva(tab)}
              className="flex-1 py-2.5 text-xs font-semibold transition-colors"
              style={tabActiva === tab
                ? { color: '#004085', borderBottom: '2px solid #004085' }
                : { color: '#9ca3af' }}>
              {tab === 'info' ? 'Info' : tab === 'precios' ? 'Precios' : tab === 'stock' ? 'Stock' : 'Historial'}
            </button>
          ))}
        </div>

        {/* Contenido scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Tab Info */}
          {tabActiva === 'info' && (
            <div className="space-y-4">
              {producto.descripcion && (
                <p className="text-sm text-gray-600 leading-relaxed">{producto.descripcion}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Marca', valor: producto.marca || '—' },
                  { label: 'Categoría', valor: producto.categoria },
                  { label: 'SKU', valor: producto.sku },
                  { label: 'Código de barras', valor: producto.codigoBarras || '—' },
                  { label: 'Costo (USD)', valor: `u$s ${producto.usd}` },
                  { label: 'Costo (ARS)', valor: fmt(producto.costo) },
                  { label: 'Stock total', valor: `${stockTotal} unidades` },
                  { label: 'Precio inflado', valor: producto.precioSinDesc > 0 ? fmt(producto.precioSinDesc) : '—' },
                ].map(f => (
                  <div key={f.label} className="rounded-xl p-3" style={{ backgroundColor: '#f7f6f1' }}>
                    <p className="text-xs text-gray-400 mb-1">{f.label}</p>
                    <p className="text-sm font-semibold" style={{ color: '#3A3A3A' }}>{f.valor}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Precios */}
          {tabActiva === 'precios' && (
            <PreciosCalc producto={producto} config={config} />
          )}

          {/* Tab Historial */}
          {tabActiva === 'historial' && (
            <div className="space-y-2">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Últimas 50 transacciones</p>
              {cargandoHist ? (
                <div className="flex justify-center py-8">
                  <svg className="animate-spin h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                </div>
              ) : historial.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  Sin movimientos registrados
                </div>
              ) : (
                historial.map(t => {
                  const meta = DESTINO_LABEL[t.destino] || { label: t.destino, color: '#6b7280' };
                  const esVenta = t.destino === 'venta_ml' || t.destino === 'afuera';
                  const fechaFmt = t.fecha
                    ? new Date(t.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : '—';
                  return (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: meta.color + '18' }}>
                          <span className="text-base">{esVenta ? '📦' : '🔄'}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold px-1.5 py-0.5 rounded-md"
                              style={{ backgroundColor: meta.color + '18', color: meta.color }}>
                              {meta.label}
                            </span>
                            <span className="text-xs text-gray-500">{t.color || '—'}</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {fechaFmt}{t.usuario ? ` · ${t.usuario}` : ''}{t.nota ? ` · ${t.nota}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-sm font-black" style={{ color: esVenta ? '#dc2626' : '#004085' }}>
                          {esVenta ? '-' : '+'}{t.cantidad}
                        </p>
                        <p className="text-xs text-gray-400">uds.</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab Stock */}
          {tabActiva === 'stock' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold" style={{ color: '#3A3A3A' }}>Stock por color</span>
                <span className="text-xs text-gray-400">Total: {stockTotal} uds.</span>
              </div>
              {producto.colores.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No hay variantes de color cargadas
                </div>
              ) : (
                producto.colores.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full border-2 border-white shadow"
                        style={{ backgroundColor: COLORES_HEX[c.color] || c.hex || '#9ca3af' }} />
                      <span className="text-sm font-medium" style={{ color: '#3A3A3A' }}>{c.color}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Depósito</p>
                        <span className={`text-sm font-bold ${
                          (c.stockDeposito||0) === 0 ? 'text-red-500' : (c.stockDeposito||0) <= 2 ? 'text-amber-500' : 'text-gray-700'
                        }`}>{c.stockDeposito||0}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: '#004085' }}>Sede</p>
                        <span className={`text-sm font-bold ${
                          (c.stockSede||0) === 0 ? 'text-red-500' : (c.stockSede||0) <= 2 ? 'text-amber-500' : 'text-emerald-600'
                        }`}>{c.stockSede||0}</span>
                      </div>
                      {(c.stockDeposito||0) + (c.stockSede||0) === 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">Sin stock</span>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* Barra de stock total */}
              <div className="pt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                  <span>Distribución por color</span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden gap-px">
                  {producto.colores.filter(c => (c.stockDeposito||0) + (c.stockSede||0) > 0).map((c, i) => (
                    <div key={i}
                      title={`${c.color}: dep ${c.stockDeposito||0} / sede ${c.stockSede||0}`}
                      style={{
                        width: `${(((c.stockDeposito||0) + (c.stockSede||0)) / stockTotal) * 100}%`,
                        backgroundColor: COLORES_HEX[c.color] || '#A9C2D9',
                      }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default ProductoDrawer;
