import React, { useState } from 'react';
import {
  PlusIcon, ChevronLeftIcon, ChevronRightIcon,
  PencilIcon, XMarkIcon, DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { MesFinanciero, VentaProducto, calcMes, config } from '../../data/finanzasData';
import { useDatos } from '../../contexts/DatosContext';
import { calcPlataqueLlega } from '../catalogo/types';
import { generarPDFInversor } from '../dashboard/generarPDF';

// ─── Helpers UI ──────────────────────────────────────────
const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');

const glass = {
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.9)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)',
} as React.CSSProperties;

const StatMini: React.FC<{ label: string; valor: string; color: string; bg: string; glow?: string }> =
  ({ label, valor, color, bg, glow }) => (
    <div className="rounded-2xl p-4 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg" style={glass}>
      {glow && (
        <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-20 blur-2xl pointer-events-none"
          style={{ background: glow, transform: 'translate(30%,-30%)' }} />
      )}
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
      <p className="text-xl font-black" style={{ color }}>{valor}</p>
    </div>
  );

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl px-3 py-2.5 text-xs shadow-xl"
      style={{ background: 'rgba(0,64,133,0.95)', color: 'white', backdropFilter: 'blur(12px)' }}>
      <p className="font-bold mb-1">{label}</p>
      {payload.map((p: any) => <p key={p.name} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  );
};

// ─── Modal: editar ventas del mes ────────────────────────
interface ModalVentasProps {
  mes: MesFinanciero;
  onGuardar: (ventas: VentaProducto[]) => void;
  onCerrar: () => void;
}

const ModalVentas: React.FC<ModalVentasProps> = ({ mes, onGuardar, onCerrar }) => {
  const [ventas, setVentas] = useState<VentaProducto[]>(mes.ventas.map(v => ({ ...v })));

  const update = (i: number, key: keyof VentaProducto, val: any) =>
    setVentas(prev => prev.map((v, idx) => idx === i ? { ...v, [key]: val } : v));

  const agregarFila = () => setVentas(prev => [...prev, {
    productoId: Date.now(), nombre: '', sku: '', costo: 0, precio: 0,
    unidades: 0, canceladas: 0, devoluciones: 0,
  }]);

  const eliminar = (i: number) => setVentas(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold" style={{ color: '#004085' }}>
              Ventas — {mes.mes} {mes.año}
            </h2>
            <p className="text-xs text-gray-400">Editá las unidades vendidas, canceladas y devueltas por producto</p>
          </div>
          <button onClick={onCerrar}><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-3 font-medium">Producto</th>
                <th className="text-right pb-3 font-medium">Costo $</th>
                <th className="text-right pb-3 font-medium">Precio $</th>
                <th className="text-center pb-3 font-medium">Vendidas</th>
                <th className="text-center pb-3 font-medium">Canceladas</th>
                <th className="text-center pb-3 font-medium">Devol.</th>
                <th className="text-right pb-3 font-medium">Ingresos</th>
                <th className="pb-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ventas.map((v, i) => {
                const plata = calcPlataqueLlega(v.precio, config) * v.unidades;
                return (
                  <tr key={i} className="group">
                    <td className="py-2 pr-3">
                      <input value={v.nombre}
                        onChange={e => update(i, 'nombre', e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-200"
                        placeholder="Nombre producto" />
                    </td>
                    <td className="py-2 px-2">
                      <input type="number" value={v.costo || ''}
                        onChange={e => update(i, 'costo', Number(e.target.value))}
                        className="w-24 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-200" />
                    </td>
                    <td className="py-2 px-2">
                      <input type="number" value={v.precio || ''}
                        onChange={e => update(i, 'precio', Number(e.target.value))}
                        className="w-24 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-200" />
                    </td>
                    {(['unidades', 'canceladas', 'devoluciones'] as const).map(campo => (
                      <td key={campo} className="py-2 px-2 text-center">
                        <input type="number" value={v[campo] || ''}
                          onChange={e => update(i, campo, Number(e.target.value))}
                          min={0}
                          className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-200" />
                      </td>
                    ))}
                    <td className="py-2 pl-2 text-right">
                      <span className="text-xs font-bold" style={{ color: '#059669' }}>{fmt(plata)}</span>
                    </td>
                    <td className="py-2 pl-2">
                      <button onClick={() => eliminar(i)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all">
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button onClick={agregarFila}
            className="mt-4 flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border border-dashed border-gray-300 text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all">
            <PlusIcon className="h-3.5 w-3.5" /> Agregar producto
          </button>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onCerrar}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Cancelar
          </button>
          <button onClick={() => onGuardar(ventas)}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: '#004085' }}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Finanzas principal ──────────────────────────────────
const Finanzas: React.FC = () => {
  const { meses, setMeses, mlConectado } = useDatos();
  const [idxActual, setIdxActual] = useState(meses.length - 1);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  const mes = meses[idxActual];
  const stats = calcMes(mes);
  const mesAnterior = idxActual > 0 ? calcMes(meses[idxActual - 1]) : null;

  const crecFact = mesAnterior
    ? Math.round(((stats.facturadoReal - mesAnterior.facturadoReal) / mesAnterior.facturadoReal) * 100)
    : 0;

  const historico = meses.map(m => {
    const s = calcMes(m);
    return { mes: m.mes.slice(0, 3), facturado: s.facturadoReal, ganancia: s.ganancia, pagoCris: s.pagoCris };
  });

  // Top más vendidos del mes seleccionado
  const topVendidos = [...mes.ventas]
    .filter(v => v.unidades > 0)
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 5);

  const guardarVentas = (ventas: VentaProducto[]) => {
    setMeses(prev => prev.map((m, i) => i === idxActual ? { ...m, ventas } : m));
    setModalAbierto(false);
  };

  const handlePDF = () => {
    setGenerandoPDF(true);
    try {
      generarPDFInversor({
        mes: mes.mes, año: mes.año,
        facturadoAFIP:  stats.facturadoAFIP,
        facturadoReal:  stats.facturadoReal,
        ingresosBrutos: stats.ingresosBrutos,
        costos:         stats.costos,
        ganancia:       stats.ganancia,
        pagoCris:       stats.pagoCris,
        gananciaKargo:  stats.gananciaKargo,
        sueldoCU:       stats.sueldoCU,
        ventas:         stats.unidadesReales,
        canceladas:     stats.canceladas,
        devoluciones:   stats.devoluciones,
        productos: mes.ventas.map(v => {
          const ingresos = calcPlataqueLlega(v.precio, config) * v.unidades;
          const ganP = ingresos - v.costo * v.unidades;
          return {
            nombre: v.nombre, unidades: v.unidades,
            facturado: v.precio * v.unidades, ingresos,
            ganancia: ganP, costoCris: v.costo * v.unidades + ganP * 0.5,
          };
        }),
        mesAnterior: mesAnterior ? {
          facturado: mesAnterior.facturadoReal,
          ganancia:  mesAnterior.ganancia,
        } : undefined,
      });
    } finally {
      setGenerandoPDF(false);
    }
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#004085' }}>Finanzas</h1>
          <p className="text-sm text-gray-400 mt-0.5">Resumen financiero mensual</p>
        </div>
        <div className="flex items-center gap-2">
          {!mlConectado && (
            <button onClick={() => setModalAbierto(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ backgroundColor: '#D35400' }}>
              <PencilIcon className="h-4 w-4" />
              Cargar ventas
            </button>
          )}
          <button onClick={handlePDF} disabled={generandoPDF}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#004085' }}>
            <DocumentArrowDownIcon className="h-4 w-4" />
            {generandoPDF ? 'Generando...' : `PDF ${mes.mes}`}
          </button>
        </div>
      </div>

      {/* Selector de mes */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl" style={glass}>
        <button onClick={() => setIdxActual(i => Math.max(0, i - 1))}
          disabled={idxActual === 0}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-all">
          <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
        </button>

        <div className="flex-1 flex items-center justify-center gap-3 overflow-x-auto">
          {meses.map((m, i) => (
            <button key={m.id} onClick={() => setIdxActual(i)}
              className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={i === idxActual
                ? { backgroundColor: '#004085', color: 'white', boxShadow: '0 4px 12px rgba(0,64,133,0.3)' }
                : { color: '#9ca3af', backgroundColor: 'transparent' }}>
              {m.mes.slice(0, 3)}
              {!m.cerrado && <span className="ml-1 text-xs opacity-70">●</span>}
            </button>
          ))}
        </div>

        <button onClick={() => setIdxActual(i => Math.min(meses.length - 1, i + 1))}
          disabled={idxActual === meses.length - 1}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-all">
          <ChevronRightIcon className="h-4 w-4 text-gray-600" />
        </button>
      </div>

      {/* Stats del mes */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold" style={{ color: '#004085' }}>
            {mes.mes} {mes.año}
            {!mes.cerrado && (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                Mes actual
              </span>
            )}
          </h2>
          {mesAnterior && (
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${crecFact >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {crecFact >= 0 ? '▲' : '▼'} {Math.abs(crecFact)}% vs mes anterior
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <StatMini label="Facturado AFIP"  valor={fmt(stats.facturadoAFIP)}  color="#7c3aed" bg="#f5f3ff" glow="#7c3aed" />
          <StatMini label="Facturado real"  valor={fmt(stats.facturadoReal)}  color="#004085" bg="#e6edf5" glow="#004085" />
          <StatMini label="Ingresos brutos" valor={fmt(stats.ingresosBrutos)} color="#0284c7" bg="#e0f2fe" glow="#0284c7" />
          <StatMini label={`${stats.unidadesReales} vendidas · ${stats.canceladas} cancel. · ${stats.devoluciones} devol.`} valor={fmt(stats.costos)} color="#d97706" bg="#fffbeb" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Panel distribución */}
          <div className="rounded-2xl p-5" style={glass}>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">Distribución del mes</p>
            <div className="space-y-3">
              {[
                { label: 'Ingresos brutos',       valor: stats.ingresosBrutos, color: '#004085' },
                { label: 'Costos (materiales)',    valor: stats.costos,         color: '#d97706' },
                { label: 'Ganancia total',         valor: stats.ganancia,       color: '#059669' },
                { label: 'Pago a Cris (inversor)', valor: stats.pagoCris,       color: '#dc2626' },
                { label: 'Ganancia Kargo',         valor: stats.gananciaKargo,  color: '#D35400' },
                { label: 'Sueldo c/u',             valor: stats.sueldoCU,       color: '#7c3aed' },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">{s.label}</span>
                    <span className="font-bold" style={{ color: s.color }}>{fmt(s.valor)}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(100, Math.round(Math.abs(s.valor) / stats.ingresosBrutos * 100))}%`,
                        backgroundColor: s.color,
                      }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 rounded-xl border-2" style={{ borderColor: '#dc2626', backgroundColor: '#fef2f2' }}>
              <p className="text-xs text-gray-500 mb-1">Pago total a Cris (inversor)</p>
              <p className="text-2xl font-black" style={{ color: '#dc2626' }}>{fmt(stats.pagoCris)}</p>
              <p className="text-xs text-gray-400 mt-1">
                Costos {fmt(stats.costos)} + 50% ganancia {fmt(stats.ganancia * 0.5)}
              </p>
            </div>
          </div>

          {/* Detalle por producto */}
          <div className="rounded-2xl p-5" style={glass}>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">Por producto</p>
            <div className="space-y-2 overflow-y-auto max-h-80">
              {mes.ventas.map((v, i) => {
                const plata = calcPlataqueLlega(v.precio, config) * v.unidades;
                const ganP  = plata - v.costo * v.unidades;
                const pagoP = v.costo * v.unidades + ganP * 0.5;
                return (
                  <div key={i} className="p-3 rounded-xl border border-gray-100 hover:border-blue-100 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="text-xs font-semibold" style={{ color: '#3A3A3A' }}>{v.nombre}</p>
                        {v.sku && <p className="text-xs text-gray-400 font-mono">SKU: {v.sku}</p>}
                        <p className="text-xs text-gray-400">{v.unidades} vendidas · {v.canceladas} cancel. · {v.devoluciones} devol.</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold" style={{ color: '#004085' }}>{fmt(plata)}</p>
                        <p className="text-xs text-gray-400">ingresos</p>
                      </div>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="text-gray-400">Ganancia: <span className="font-semibold text-emerald-600">{fmt(ganP)}</span></span>
                      <span className="text-gray-400">Pago Cris: <span className="font-semibold text-red-500">{fmt(pagoP)}</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Top más vendidos */}
      {topVendidos.length > 0 && (
        <div className="rounded-2xl p-5" style={glass}>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-4">
            Top más vendidos — {mes.mes} {mes.año}
          </p>
          <div className="space-y-2">
            {topVendidos.map((v, i) => {
              const maxUnidades = topVendidos[0].unidades;
              const pct = Math.round((v.unidades / maxUnidades) * 100);
              const ingresos = calcPlataqueLlega(v.precio, config) * v.unidades;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-black w-5 text-center"
                    style={{ color: i === 0 ? '#D35400' : '#9ca3af' }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold truncate" style={{ color: '#3A3A3A' }}>{v.nombre}</p>
                      <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                        <span className="text-xs font-black" style={{ color: '#004085' }}>{v.unidades} uds.</span>
                        <span className="text-xs text-gray-400">{fmt(ingresos)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: i === 0 ? '#D35400' : '#004085' }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Canceladas y Devoluciones */}
      {(stats.canceladas > 0 || stats.devoluciones > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {stats.detalleCanceladas.length > 0 && (
            <div className="rounded-2xl p-5" style={glass}>
              <p className="text-xs font-bold uppercase tracking-wide text-red-400 mb-3">
                Canceladas este mes — {stats.canceladas} unidades
              </p>
              <div className="space-y-2">
                {stats.detalleCanceladas.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-red-50">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{d.nombre}</p>
                      <p className="text-xs text-gray-400">SKU: {d.sku}</p>
                    </div>
                    <span className="text-sm font-black text-red-600">{d.cantidad} ud.</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {stats.detalleDevoluciones.length > 0 && (
            <div className="rounded-2xl p-5" style={glass}>
              <p className="text-xs font-bold uppercase tracking-wide text-orange-400 mb-3">
                Devoluciones este mes — {stats.devoluciones} unidades
              </p>
              <div className="space-y-2">
                {stats.detalleDevoluciones.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-orange-50">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{d.nombre}</p>
                      <p className="text-xs text-gray-400">SKU: {d.sku}</p>
                    </div>
                    <span className="text-sm font-black text-orange-600">{d.cantidad} ud.</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gráfico histórico */}
      <div className="rounded-2xl p-5" style={glass}>
        <p className="font-bold text-sm mb-4" style={{ color: '#1a1a2e' }}>Evolución histórica</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={historico} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
              tickFormatter={v => '$' + (v / 1000).toFixed(0) + 'k'} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="facturado" name="Facturado" fill="#004085" fillOpacity={0.85} radius={[4, 4, 0, 0]} barSize={18} />
            <Bar dataKey="ganancia"  name="Ganancia"  fill="#059669" fillOpacity={0.85} radius={[4, 4, 0, 0]} barSize={18} />
            <Bar dataKey="pagoCris"  name="Pago Cris" fill="#dc2626" fillOpacity={0.7}  radius={[4, 4, 0, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {modalAbierto && (
        <ModalVentas
          mes={mes}
          onGuardar={guardarVentas}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </div>
  );
};

export default Finanzas;
