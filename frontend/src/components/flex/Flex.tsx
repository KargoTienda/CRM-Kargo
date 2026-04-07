import React, { useState, useEffect } from 'react';
import {
  Cog6ToothIcon, XMarkIcon, PlusIcon, DocumentArrowDownIcon,
  CheckCircleIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import {
  getFlexPedidos, upsertFlexDia, deleteFlexDia,
  getFlexConfig, saveFlexConfig, DiaFlex as DiaFlexDB, ConfigFlex as ConfigFlexDB,
} from '../../utils/db';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Tipos ────────────────────────────────────────────────
type DiaFlex = DiaFlexDB;
type ConfigFlex = ConfigFlexDB;

const CONFIG_DEFAULT: ConfigFlex = {
  costoCaba: 800,
  costoPrimerCordon: 1200,
  costoSegundoCordon: 1800,
  mlCaba: 1000,
  mlPrimerCordon: 1500,
  mlSegundoCordon: 2200,
};

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS_CORTO = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');

// ─── Helpers ──────────────────────────────────────────────
function getSemanas(anio: number, mes: number): { inicio: number; fin: number }[] {
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  return [
    { inicio: 1,  fin: 7 },
    { inicio: 8,  fin: 14 },
    { inicio: 15, fin: 21 },
    { inicio: 22, fin: diasEnMes },
  ];
}

function fechaStr(anio: number, mes: number, dia: number): string {
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function calcSemana(dias: DiaFlex[], config: ConfigFlex) {
  const totalCaba = dias.reduce((s, d) => s + d.caba, 0);
  const totalPC   = dias.reduce((s, d) => s + d.primerCordon, 0);
  const totalSC   = dias.reduce((s, d) => s + d.segundoCordon, 0);
  const total     = totalCaba + totalPC + totalSC;
  const aTiempo   = dias.reduce((s, d) => s + d.aTiempo, 0);
  const tarde     = dias.reduce((s, d) => s + d.tarde, 0);

  const pagoEmpresa = totalCaba * config.costoCaba + totalPC * config.costoPrimerCordon + totalSC * config.costoSegundoCordon;
  const ingresoML   = totalCaba * config.mlCaba + totalPC * config.mlPrimerCordon + totalSC * config.mlSegundoCordon;
  const ganancia    = ingresoML - pagoEmpresa;

  return { total, totalCaba, totalPC, totalSC, aTiempo, tarde, pagoEmpresa, ingresoML, ganancia };
}

// ─── Config Modal ─────────────────────────────────────────
const ConfigModal: React.FC<{ config: ConfigFlex; onSave: (c: ConfigFlex) => void; onClose: () => void }> = ({ config, onSave, onClose }) => {
  const [f, setF] = useState(config);
  const set = (k: keyof ConfigFlex, v: number) => setF(prev => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold" style={{ color: '#004085' }}>Parámetros Flex</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-5">
          {([
            { label: 'CABA',          costoKey: 'costoCaba',          mlKey: 'mlCaba' },
            { label: 'Primer cordón', costoKey: 'costoPrimerCordon',  mlKey: 'mlPrimerCordon' },
            { label: 'Segundo cordón',costoKey: 'costoSegundoCordon', mlKey: 'mlSegundoCordon' },
          ] as const).map(z => (
            <div key={z.label}>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">{z.label}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Costo empresa (por paquete)</label>
                  <input type="number" value={f[z.costoKey]} onChange={e => set(z.costoKey, Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">ML paga por envío</label>
                  <input type="number" value={f[z.mlKey]} onChange={e => set(z.mlKey, Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => { onSave(f); onClose(); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: '#004085' }}>Guardar</button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal agregar día ────────────────────────────────────
const DiaModal: React.FC<{
  fecha: string; existente?: DiaFlex;
  onSave: (d: DiaFlex) => void; onClose: () => void;
}> = ({ fecha, existente, onSave, onClose }) => {
  const [f, setF] = useState<DiaFlex>(existente || { fecha, caba: 0, primerCordon: 0, segundoCordon: 0, aTiempo: 0, tarde: 0 });
  const set = (k: keyof DiaFlex, v: number) => setF(prev => ({ ...prev, [k]: v }));
  const total = f.caba + f.primerCordon + f.segundoCordon;
  const [d, m, a] = fecha.split('-').reverse();
  const fechaLabel = `${d}/${m}/${a}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold" style={{ color: '#004085' }}>Pedidos del {fechaLabel}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><XMarkIcon className="h-5 w-5 text-gray-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {([
              { label: 'CABA',       key: 'caba' },
              { label: '1er cordón', key: 'primerCordon' },
              { label: '2do cordón', key: 'segundoCordon' },
            ] as const).map(z => (
              <div key={z.key} className="text-center">
                <label className="text-xs text-gray-400 block mb-1">{z.label}</label>
                <input type="number" min={0} value={f[z.key]}
                  onChange={e => set(z.key, Number(e.target.value))}
                  className="w-full text-center py-2 rounded-xl border border-gray-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-200" />
              </div>
            ))}
          </div>

          <div className="pt-1 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-2">Total: <b className="text-gray-700">{total} paquetes</b></p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {([
              { label: '✓ A tiempo', key: 'aTiempo', color: '#059669' },
              { label: '⚠ Tarde (+9am)', key: 'tarde', color: '#D35400' },
            ] as const).map(t => (
              <div key={t.key} className="text-center">
                <label className="text-xs font-semibold block mb-1" style={{ color: t.color }}>{t.label}</label>
                <input type="number" min={0} value={f[t.key]}
                  onChange={e => set(t.key, Number(e.target.value))}
                  className="w-full text-center py-2 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-200"
                  style={{ borderColor: t.color + '40' }} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={() => { onSave(f); onClose(); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: '#D35400' }}>Guardar</button>
        </div>
      </div>
    </div>
  );
};

// ─── Generar PDF ──────────────────────────────────────────
function generarPDF(semana: { inicio: number; fin: number }, anio: number, mes: number, dias: DiaFlex[], config: ConfigFlex, stats: ReturnType<typeof calcSemana>) {
  const doc = new jsPDF();
  const mesLabel = MESES[mes];
  const titulo = `Informe Flex Semanal — ${semana.inicio} al ${semana.fin} de ${mesLabel} ${anio}`;

  doc.setFontSize(16);
  doc.setTextColor(0, 64, 133);
  doc.text('KARGO — Informe Flex', 14, 18);

  doc.setFontSize(11);
  doc.setTextColor(80, 80, 80);
  doc.text(titulo, 14, 26);

  doc.setDrawColor(0, 64, 133);
  doc.line(14, 29, 196, 29);

  // Resumen por sector
  autoTable(doc, {
    startY: 34,
    head: [['Sector', 'Paquetes', 'Costo empresa']],
    body: [
      ['CABA',           String(stats.totalCaba), fmt(stats.totalCaba * config.costoCaba)],
      ['Primer cordón',  String(stats.totalPC),   fmt(stats.totalPC * config.costoPrimerCordon)],
      ['Segundo cordón', String(stats.totalSC),   fmt(stats.totalSC * config.costoSegundoCordon)],
      ['TOTAL',          String(stats.total),     fmt(stats.pagoEmpresa)],
    ],
    headStyles: { fillColor: [0, 64, 133] },
    foot: [['', '', '']],
    styles: { fontSize: 10 },
    columnStyles: { 2: { fontStyle: 'bold' } },
  });

  const y1 = (doc as any).lastAutoTable.finalY + 10;

  // Estadísticas de entrega
  autoTable(doc, {
    startY: y1,
    head: [['Entregas', 'Cantidad', '%']],
    body: [
      ['A tiempo (antes de 9am)', String(stats.aTiempo), stats.total > 0 ? `${Math.round(stats.aTiempo / stats.total * 100)}%` : '—'],
      ['Tarde (después de 9am)', String(stats.tarde),    stats.total > 0 ? `${Math.round(stats.tarde  / stats.total * 100)}%` : '—'],
    ],
    headStyles: { fillColor: [211, 84, 0] },
    styles: { fontSize: 10 },
  });

  const y2 = (doc as any).lastAutoTable.finalY + 10;

  // Detalle diario
  const filasDetalle = dias
    .filter(d => d.caba + d.primerCordon + d.segundoCordon > 0)
    .map(d => {
      const fecha = new Date(d.fecha + 'T12:00:00');
      const label = `${DIAS_CORTO[fecha.getDay()]} ${d.fecha.slice(8)}/${d.fecha.slice(5,7)}`;
      return [label, String(d.caba), String(d.primerCordon), String(d.segundoCordon), String(d.aTiempo), String(d.tarde)];
    });

  if (filasDetalle.length > 0) {
    autoTable(doc, {
      startY: y2,
      head: [['Fecha', 'CABA', '1er cordón', '2do cordón', 'A tiempo', 'Tarde']],
      body: filasDetalle,
      headStyles: { fillColor: [169, 194, 217], textColor: [0, 0, 0] },
      styles: { fontSize: 9 },
    });
  }

  // Mensaje de agradecimiento
  const yFinal = (doc as any).lastAutoTable?.finalY ?? y2;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('Muchas gracias por su servicio. Quedamos a disposición ante cualquier consulta.', 14, yFinal + 14);
  doc.text('— Equipo Kargo', 14, yFinal + 20);

  doc.save(`informe-flex-semana-${semana.inicio}-${mesLabel}-${anio}.pdf`);
}

// ─── Semana Card ──────────────────────────────────────────
const SemanaCard: React.FC<{
  semanaIdx: number; semana: { inicio: number; fin: number };
  anio: number; mes: number;
  pedidos: DiaFlex[]; config: ConfigFlex;
  onEditDia: (fecha: string) => void;
}> = ({ semanaIdx, semana, anio, mes, pedidos, config, onEditDia }) => {
  const dias: number[] = [];
  for (let d = semana.inicio; d <= semana.fin; d++) dias.push(d);

  const diasData = dias.map(d => {
    const f = fechaStr(anio, mes, d);
    return pedidos.find(p => p.fecha === f) || { fecha: f, caba: 0, primerCordon: 0, segundoCordon: 0, aTiempo: 0, tarde: 0 };
  });

  const stats = calcSemana(diasData, config);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
      {/* Header semana */}
      <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: '#004085' }}>
        <div>
          <p className="font-black text-white text-sm">Semana {semanaIdx + 1}</p>
          <p className="text-xs" style={{ color: '#A9C2D9' }}>{semana.inicio} al {semana.fin} de {MESES[mes]}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs" style={{ color: '#A9C2D9' }}>Total</p>
            <p className="text-lg font-black text-white">{stats.total}</p>
          </div>
          <button onClick={() => generarPDF({ inicio: semana.inicio, fin: semana.fin }, anio, mes, diasData, config, stats)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
            style={{ backgroundColor: '#D35400', color: 'white' }}>
            <DocumentArrowDownIcon className="h-3.5 w-3.5" />
            Informe PDF
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Tabla de días */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-400">
                <th className="text-left pb-2 font-medium">Día</th>
                <th className="text-center pb-2 font-medium">CABA</th>
                <th className="text-center pb-2 font-medium">1er C.</th>
                <th className="text-center pb-2 font-medium">2do C.</th>
                <th className="text-center pb-2 font-medium" style={{ color: '#059669' }}>✓</th>
                <th className="text-center pb-2 font-medium" style={{ color: '#D35400' }}>⚠</th>
                <th className="text-center pb-2 font-medium">Total</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {diasData.map((d, i) => {
                const fecha = new Date(d.fecha + 'T12:00:00');
                const total = d.caba + d.primerCordon + d.segundoCordon;
                const esHoy = d.fecha === new Date().toISOString().slice(0, 10);
                return (
                  <tr key={i} className={`border-t border-gray-50 ${esHoy ? 'bg-blue-50' : ''}`}>
                    <td className="py-1.5 pr-2 font-medium" style={{ color: '#3A3A3A' }}>
                      {DIAS_CORTO[fecha.getDay()]} {dias[i]}
                    </td>
                    <td className="text-center py-1.5">{d.caba || '—'}</td>
                    <td className="text-center py-1.5">{d.primerCordon || '—'}</td>
                    <td className="text-center py-1.5">{d.segundoCordon || '—'}</td>
                    <td className="text-center py-1.5 font-semibold" style={{ color: '#059669' }}>{d.aTiempo || '—'}</td>
                    <td className="text-center py-1.5 font-semibold" style={{ color: '#D35400' }}>{d.tarde || '—'}</td>
                    <td className="text-center py-1.5 font-bold" style={{ color: '#004085' }}>{total || '—'}</td>
                    <td className="text-center py-1.5">
                      <button onClick={() => onEditDia(d.fecha)}
                        className="p-1 rounded-lg hover:bg-blue-50 transition-colors">
                        <PlusIcon className="h-3.5 w-3.5 text-gray-400" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Resumen de semana */}
        {stats.total > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            {/* Zonas */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Por zona</p>
              {[
                { label: 'CABA',           val: stats.totalCaba, costo: stats.totalCaba * config.costoCaba },
                { label: 'Primer cordón',  val: stats.totalPC,   costo: stats.totalPC * config.costoPrimerCordon },
                { label: 'Segundo cordón', val: stats.totalSC,   costo: stats.totalSC * config.costoSegundoCordon },
              ].map(z => z.val > 0 && (
                <div key={z.label} className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">{z.label}: <b>{z.val}</b></span>
                  <span className="text-xs font-semibold" style={{ color: '#dc2626' }}>{fmt(z.costo)}</span>
                </div>
              ))}
            </div>

            {/* Finanzas */}
            <div className="space-y-1.5 pl-3 border-l border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Financiero</p>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">ML paga</span>
                <span className="text-xs font-semibold" style={{ color: '#059669' }}>{fmt(stats.ingresoML)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Pago empresa</span>
                <span className="text-xs font-semibold" style={{ color: '#dc2626' }}>{fmt(stats.pagoEmpresa)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-1">
                <span className="text-xs font-bold text-gray-600">Ganancia flex</span>
                <span className="text-xs font-black" style={{ color: stats.ganancia >= 0 ? '#D35400' : '#dc2626' }}>{fmt(stats.ganancia)}</span>
              </div>
            </div>

            {/* Entregas */}
            <div className="col-span-2 flex gap-3 pt-1 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs">
                <CheckCircleIcon className="h-4 w-4" style={{ color: '#059669' }} />
                <span className="text-gray-500">A tiempo: <b style={{ color: '#059669' }}>{stats.aTiempo}</b></span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <ClockIcon className="h-4 w-4" style={{ color: '#D35400' }} />
                <span className="text-gray-500">Tarde: <b style={{ color: '#D35400' }}>{stats.tarde}</b></span>
              </div>
              {stats.total > 0 && (
                <div className="flex-1">
                  <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.round(stats.aTiempo / stats.total * 100)}%`, backgroundColor: '#059669' }} />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{Math.round(stats.aTiempo / stats.total * 100)}% a tiempo</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Flex principal ───────────────────────────────────────
const Flex: React.FC = () => {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [pedidos, setPedidos] = useState<DiaFlex[]>([]);
  const [config, setConfig] = useState<ConfigFlex>(CONFIG_DEFAULT);
  const [cargado, setCargado] = useState(false);
  const [configAbierto, setConfigAbierto] = useState(false);
  const [diaModal, setDiaModal] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getFlexPedidos(), getFlexConfig()]).then(([p, c]) => {
      if (p.length > 0) setPedidos(p);
      if (c) setConfig(c);
      setCargado(true);
    });
  }, []);

  useEffect(() => {
    if (cargado) saveFlexConfig(config);
  }, [config, cargado]);

  const semanas = getSemanas(anio, mes);

  const guardarDia = (dia: DiaFlex) => {
    const total = dia.caba + dia.primerCordon + dia.segundoCordon;
    setPedidos(prev => {
      const sin = prev.filter(p => p.fecha !== dia.fecha);
      return total === 0 ? sin : [...sin, dia];
    });
    if (total === 0) {
      deleteFlexDia(dia.fecha);
    } else {
      upsertFlexDia(dia);
    }
    setDiaModal(null);
  };

  const diaEditar = diaModal ? pedidos.find(p => p.fecha === diaModal) : undefined;

  // Resumen mensual
  const todosMeses = semanas.flatMap(s => {
    const dias: DiaFlex[] = [];
    for (let d = s.inicio; d <= s.fin; d++) {
      const f = fechaStr(anio, mes, d);
      dias.push(pedidos.find(p => p.fecha === f) || { fecha: f, caba: 0, primerCordon: 0, segundoCordon: 0, aTiempo: 0, tarde: 0 });
    }
    return dias;
  });
  const statsMes = calcSemana(todosMeses, config);

  const cambiarMes = (delta: number) => {
    let nuevoMes = mes + delta;
    let nuevoAnio = anio;
    if (nuevoMes > 11) { nuevoMes = 0; nuevoAnio++; }
    if (nuevoMes < 0)  { nuevoMes = 11; nuevoAnio--; }
    setMes(nuevoMes);
    setAnio(nuevoAnio);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-black" style={{ color: '#004085' }}>Flex</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestión de entregas Mercado Libre Flex</p>
        </div>
        <button onClick={() => setConfigAbierto(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all">
          <Cog6ToothIcon className="h-4 w-4" /> Parámetros
        </button>
      </div>

      {/* Selector de mes */}
      <div className="flex items-center gap-4">
        <button onClick={() => cambiarMes(-1)} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50">
          <span className="text-sm">←</span>
        </button>
        <h2 className="text-lg font-black" style={{ color: '#004085' }}>
          {MESES[mes]} {anio}
        </h2>
        <button onClick={() => cambiarMes(1)} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50">
          <span className="text-sm">→</span>
        </button>
      </div>

      {/* Stats mensuales */}
      {statsMes.total > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total paquetes', value: statsMes.total,          color: '#004085', bg: '#e6edf5' },
            { label: 'ML paga',        value: `$${statsMes.ingresoML.toLocaleString('es-AR')}`,  color: '#059669', bg: '#f0fdf4' },
            { label: 'Pago empresa',   value: `$${statsMes.pagoEmpresa.toLocaleString('es-AR')}`, color: '#dc2626', bg: '#fef2f2' },
            { label: 'Ganancia flex',  value: `$${statsMes.ganancia.toLocaleString('es-AR')}`,  color: '#D35400', bg: '#fff7ed' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: s.bg }}>
              <p className="text-xs text-gray-500 mb-1">{s.label}</p>
              <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Semanas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {semanas.map((s, i) => (
          <SemanaCard
            key={i} semanaIdx={i} semana={s}
            anio={anio} mes={mes}
            pedidos={pedidos} config={config}
            onEditDia={setDiaModal}
          />
        ))}
      </div>

      {/* Modales */}
      {configAbierto && (
        <ConfigModal config={config} onSave={cfg => { setConfig(cfg); }} onClose={() => setConfigAbierto(false)} />
      )}
      {diaModal && (
        <DiaModal fecha={diaModal} existente={diaEditar} onSave={guardarDia} onClose={() => setDiaModal(null)} />
      )}
    </div>
  );
};

export default Flex;
