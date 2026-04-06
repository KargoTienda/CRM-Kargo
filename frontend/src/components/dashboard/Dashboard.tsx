import React, { useState, useEffect } from 'react';
import { idbGet } from '../../utils/storage';
import {
  ShoppingBagIcon, BanknotesIcon, ArrowTrendingUpIcon,
  XCircleIcon, ArrowPathIcon, CubeIcon, ChartBarIcon,
  LinkIcon, ExclamationTriangleIcon, DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { generarPDFInversor } from './generarPDF';
import { calcMes, topProductosMes } from '../../data/finanzasData';
import { useDatos, buscarProductoPorSKU } from '../../contexts/DatosContext';
import { Producto } from '../catalogo/types';

const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-4 py-3 text-xs shadow-2xl"
      style={{
        background: 'rgba(0,64,133,0.95)', color: 'white',
        border: '1px solid rgba(169,194,217,0.3)',
        backdropFilter: 'blur(12px)',
      }}>
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

// ── Mac-style Glass Card ─────────────────────────────────
const GlassCard: React.FC<{
  titulo: string; valor: string; subtitulo?: string;
  cambio?: { valor: number; positivo: boolean };
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  acento: string; fondo: string; glow?: string;
}> = ({ titulo, valor, subtitulo, cambio, icon: Icon, acento, fondo, glow }) => (
  <div className="relative rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    style={{
      background: 'rgba(255,255,255,0.8)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.9)',
      boxShadow: `0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)`,
    }}>
    {glow && (
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20 blur-2xl pointer-events-none"
        style={{ background: glow, transform: 'translate(30%,-30%)' }} />
    )}
    <div className="relative">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: fondo }}>
          <Icon className="h-5 w-5" style={{ color: acento }} />
        </div>
        {cambio && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${cambio.positivo ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {cambio.positivo ? '▲' : '▼'} {cambio.valor}%
          </span>
        )}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{titulo}</p>
      <p className="text-2xl font-black" style={{ color: '#1a1a2e' }}>{valor}</p>
      {subtitulo && <p className="text-xs text-gray-400 mt-1">{subtitulo}</p>}
    </div>
  </div>
);

// ── Banner ML ────────────────────────────────────────────
const BannerML: React.FC = () => (
  <div className="rounded-2xl p-4 flex items-center gap-4"
    style={{
      background: 'rgba(240,246,251,0.9)',
      border: '2px dashed #A9C2D9',
      backdropFilter: 'blur(8px)',
    }}>
    <div className="p-2.5 rounded-xl bg-blue-50">
      <LinkIcon className="h-5 w-5" style={{ color: '#004085' }} />
    </div>
    <div className="flex-1">
      <p className="text-sm font-bold" style={{ color: '#004085' }}>MercadoLibre no está conectado</p>
      <p className="text-xs text-gray-400">Los datos mostrados son de ejemplo. Conectá para ver ventas reales en tiempo real.</p>
    </div>
    <button
      className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all hover:scale-105 hover:shadow-lg"
      style={{ backgroundColor: '#FFE600', color: '#3d2b00', boxShadow: '0 4px 12px rgba(255,230,0,0.4)' }}
      onClick={() => alert('Integración MercadoLibre — próximamente.\n\nNecesitás:\n1. Cuenta en developers.mercadolibre.com.ar\n2. Crear una app y obtener Client ID y Secret\n3. Configurar en Ajustes del CRM')}
    >
      <ShoppingBagIcon className="h-4 w-4" />
      Conectar ML
    </button>
  </div>
);

// ── Dashboard ────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const { meses, mlConectado, cargandoML } = useDatos();

  const mesActual   = meses[meses.length - 1];
  const mesAnterior = meses[meses.length - 2];
  const statsActual   = calcMes(mesActual);
  const statsAnterior = mesAnterior ? calcMes(mesAnterior) : null;

  const ventasMensuales = meses.map(m => {
    const s = calcMes(m);
    return { mes: m.mes.slice(0, 3), facturadoReal: s.facturadoReal, ingresosBrutos: s.ingresosBrutos };
  });

  // Mapa SKU → nombre del catálogo
  const [catalogoNombres, setCatalogoNombres] = useState<Record<string, string>>({});
  useEffect(() => {
    idbGet<Producto[]>('kargo_productos').then(catalogo => {
      if (!catalogo) return;
      const mapa: Record<string, string> = {};
      catalogo.forEach(p => {
        mapa[p.sku] = p.nombre;
        p.colores.forEach(c => { if (c.sku) mapa[c.sku] = p.nombre; });
      });
      setCatalogoNombres(mapa);
    });
  }, []);

  const topProductos = topProductosMes(mesActual, catalogoNombres);

  const estadoVentas = {
    completadas:  statsActual.unidadesReales,
    canceladas:   statsActual.canceladas,
    devoluciones: statsActual.devoluciones,
    enProceso:    0,
  };

  const crecimiento = statsAnterior
    ? Math.round(((statsActual.facturadoReal - statsAnterior.facturadoReal) / statsAnterior.facturadoReal) * 100)
    : 0;

  const handlePDF = async () => {
    setGenerandoPDF(true);
    try {
      generarPDFInversor({
        mes: mesActual.mes, año: mesActual.año,
        facturadoAFIP:   statsActual.facturadoAFIP,
        facturadoReal:   statsActual.facturadoReal,
        ingresosBrutos:  statsActual.ingresosBrutos,
        costos:          statsActual.costos,
        ganancia:        statsActual.ganancia,
        pagoCris:        statsActual.pagoCris,
        gananciaKargo:   statsActual.gananciaKargo,
        sueldoCU:        statsActual.sueldoCU,
        ventas:          estadoVentas.completadas,
        canceladas:      estadoVentas.canceladas,
        devoluciones:    estadoVentas.devoluciones,
        productos: topProductos.map(p => ({
          nombre: p.nombre, unidades: p.unidades,
          facturado: p.ingresos * 1.15, ingresos: p.ingresos,
          ganancia: p.ganancia, costoCris: p.costoCris,
        })),
        mesAnterior: {
          facturado: statsAnterior?.facturadoReal ?? 0,
          ganancia:  statsAnterior?.ganancia ?? 0,
        },
      });
    } finally {
      setGenerandoPDF(false);
    }
  };

  return (
    <div className="space-y-5">

      {!mlConectado && <BannerML />}
      {mlConectado && cargandoML && (
        <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: 'rgba(0,64,133,0.06)', border: '1px solid #A9C2D9' }}>
          <ArrowPathIcon className="h-4 w-4 animate-spin" style={{ color: '#004085' }} />
          <p className="text-sm" style={{ color: '#004085' }}>Cargando datos de MercadoLibre...</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#004085' }}>Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {mesActual.mes} {mesActual.año}
            {!mlConectado && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                datos de ejemplo
              </span>
            )}
          </p>
        </div>
        <button
          onClick={handlePDF}
          disabled={generandoPDF}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 disabled:opacity-50"
          style={{
            background: 'linear-gradient(135deg, #004085 0%, #0052a8 100%)',
            boxShadow: '0 4px 16px rgba(0,64,133,0.35)',
          }}
        >
          <DocumentArrowDownIcon className="h-4 w-4" />
          {generandoPDF ? 'Generando...' : 'Informe PDF'}
        </button>
      </div>

      {/* ── Fila 1: Facturado × 2 + Ingresos + Costos ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard
          titulo="Facturado AFIP"
          valor={fmt(statsActual.facturadoAFIP)}
          subtitulo="Incl. devol. y canceladas"
          icon={BanknotesIcon} acento="#7c3aed" fondo="#f5f3ff" glow="#7c3aed"
        />
        <GlassCard
          titulo="Facturado real"
          valor={fmt(statsActual.facturadoReal)}
          subtitulo={`Solo ${estadoVentas.completadas} ventas completadas`}
          cambio={{ valor: Math.abs(crecimiento), positivo: crecimiento > 0 }}
          icon={ShoppingBagIcon} acento="#004085" fondo="#e6edf5" glow="#004085"
        />
        <GlassCard
          titulo="Ingresos brutos"
          valor={fmt(statsActual.ingresosBrutos)}
          subtitulo="Facturado − comisiones ML"
          icon={ArrowTrendingUpIcon} acento="#0284c7" fondo="#e0f2fe" glow="#0284c7"
        />
        <GlassCard
          titulo="Costos"
          valor={fmt(statsActual.costos)}
          subtitulo="Costo de productos vendidos"
          icon={CubeIcon} acento="#d97706" fondo="#fffbeb" glow="#d97706"
        />
      </div>

      {/* ── Fila 2: Distribución + Gráfico ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Panel distribución */}
        <div className="rounded-2xl p-5 transition-all"
          style={{
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.9)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)',
          }}>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">Distribución del mes</p>
          <div className="space-y-3">
            {[
              { label: 'Ingresos brutos',       valor: statsActual.ingresosBrutos, color: '#004085' },
              { label: 'Costos',                valor: statsActual.costos,         color: '#d97706' },
              { label: 'Ganancia total',         valor: statsActual.ganancia,       color: '#059669' },
              { label: 'Pago a Cris (inversor)', valor: statsActual.pagoCris,       color: '#dc2626' },
              { label: 'Ganancia Kargo',         valor: statsActual.gananciaKargo,  color: '#D35400' },
              { label: 'Sueldo c/u',             valor: statsActual.sueldoCU,       color: '#7c3aed' },
            ].map(s => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">{s.label}</span>
                  <span className="font-bold" style={{ color: s.color }}>{fmt(s.valor)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, Math.round((s.valor / statsActual.ingresosBrutos) * 100))}%`,
                      backgroundColor: s.color,
                    }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico área */}
        <div className="lg:col-span-2 rounded-2xl p-5"
          style={{
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.9)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)',
          }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-bold text-sm" style={{ color: '#1a1a2e' }}>Evolución mensual</p>
              <p className="text-xs text-gray-400">Facturado real vs Ingresos brutos</p>
            </div>
            <ChartBarIcon className="h-4 w-4 text-gray-300" />
          </div>
          <ResponsiveContainer width="100%" height={195}>
            <AreaChart data={ventasMensuales}>
              <defs>
                <linearGradient id="gF2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#004085" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#004085" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gI2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#D35400" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#D35400" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={v => '$' + (v / 1000000).toFixed(1) + 'M'} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="facturadoReal" name="Facturado"
                stroke="#004085" strokeWidth={2.5} fill="url(#gF2)" dot={{ fill: '#004085', r: 3 }} />
              <Area type="monotone" dataKey="ingresosBrutos" name="Ingresos brutos"
                stroke="#D35400" strokeWidth={2.5} fill="url(#gI2)" dot={{ fill: '#D35400', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Fila 3: Top productos + Estado ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <div className="rounded-2xl p-5"
          style={{
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.9)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)',
          }}>
          <p className="font-bold text-sm mb-4" style={{ color: '#1a1a2e' }}>Top productos del mes</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topProductos} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'k'} />
              <YAxis type="category" dataKey="nombre" width={120}
                tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="ingresos" radius={[0, 6, 6, 0]}>
                {topProductos.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? '#D35400' : '#004085'} fillOpacity={1 - i * 0.1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl p-5 space-y-4"
          style={{
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.9)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)',
          }}>
          <p className="font-bold text-sm" style={{ color: '#1a1a2e' }}>Estado del mes</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Completadas',  valor: estadoVentas.completadas,  color: '#059669', bg: 'rgba(5,150,105,0.08)'  },
              { label: 'Canceladas',   valor: estadoVentas.canceladas,   color: '#dc2626', bg: 'rgba(220,38,38,0.08)'  },
              { label: 'Devoluciones', valor: estadoVentas.devoluciones, color: '#d97706', bg: 'rgba(217,119,6,0.08)'  },
              { label: 'En proceso',   valor: estadoVentas.enProceso,    color: '#0284c7', bg: 'rgba(2,132,199,0.08)'  },
            ].map(e => (
              <div key={e.label} className="rounded-xl p-3 text-center transition-all hover:scale-105"
                style={{ backgroundColor: e.bg, border: `1px solid ${e.color}20` }}>
                <p className="text-2xl font-black" style={{ color: e.color }}>{e.valor}</p>
                <p className="text-xs text-gray-500 mt-0.5">{e.label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {estadoVentas.canceladas > 0 && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'rgba(220,38,38,0.06)' }}>
                <XCircleIcon className="h-4 w-4 flex-shrink-0" style={{ color: '#dc2626' }} />
                <p className="text-xs" style={{ color: '#3A3A3A' }}>{estadoVentas.canceladas} ventas canceladas — revisar motivos en ML</p>
              </div>
            )}
            {estadoVentas.devoluciones > 0 && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl" style={{ backgroundColor: 'rgba(217,119,6,0.06)' }}>
                <ArrowPathIcon className="h-4 w-4 flex-shrink-0" style={{ color: '#d97706' }} />
                <p className="text-xs" style={{ color: '#3A3A3A' }}>{estadoVentas.devoluciones} devoluciones este mes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
