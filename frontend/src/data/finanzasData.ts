/**
 * ─── FUENTE CENTRAL DE DATOS FINANCIEROS ────────────────────────────────────
 *
 * Acá viven los datos que usan Dashboard y Finanzas.
 * Cuando se integre MercadoLibre, reemplazás `MESES_DATA` con los datos
 * que devuelva la API y todo el CRM se actualiza solo.
 *
 * Flujo futuro con ML:
 *   API ML → transformar al formato MesFinanciero → reemplazar MESES_DATA
 * ────────────────────────────────────────────────────────────────────────────
 */

import { calcPlataqueLlega, CONFIG_DEFAULT, ConfigParams } from '../components/catalogo/types';

export const config: ConfigParams = CONFIG_DEFAULT;

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface VentaProducto {
  productoId: number;
  nombre: string;
  sku: string;
  costo: number;       // costo unitario ARS
  precio: number;      // precio de venta en ML
  unidades: number;    // ventas completadas
  canceladas: number;
  devoluciones: number;
}

export interface MesFinanciero {
  id: string;          // "2025-03"
  mes: string;
  año: number;
  ventas: VentaProducto[];
  cerrado: boolean;
}

// ─── Cálculo de un mes ────────────────────────────────────────────────────────

export function calcMes(mes: MesFinanciero) {
  const unidadesReales   = mes.ventas.reduce((s, v) => s + v.unidades, 0);
  const unidadesAFIP     = mes.ventas.reduce((s, v) => s + v.unidades + v.canceladas + v.devoluciones, 0);

  const facturadoReal    = mes.ventas.reduce((s, v) => s + v.precio * v.unidades, 0);
  const facturadoAFIP    = mes.ventas.reduce((s, v) => s + v.precio * (v.unidades + v.canceladas + v.devoluciones), 0);

  const ingresosBrutos   = mes.ventas.reduce((s, v) => {
    const plataXuni = calcPlataqueLlega(v.precio, config);
    return s + plataXuni * v.unidades;
  }, 0);

  const costos           = mes.ventas.reduce((s, v) => s + v.costo * v.unidades, 0);
  const ganancia         = ingresosBrutos - costos;
  const pagoCris         = costos + ganancia * 0.5;
  const gananciaKargo    = ganancia * 0.5;
  const sueldoCU         = gananciaKargo * 0.1 / 2;

  const canceladas       = mes.ventas.reduce((s, v) => s + v.canceladas, 0);
  const devoluciones     = mes.ventas.reduce((s, v) => s + v.devoluciones, 0);

  const detalleCanceladas = mes.ventas
    .filter(v => v.canceladas > 0)
    .map(v => ({ nombre: v.nombre, sku: v.sku, cantidad: v.canceladas }));

  const detalleDevoluciones = mes.ventas
    .filter(v => v.devoluciones > 0)
    .map(v => ({ nombre: v.nombre, sku: v.sku, cantidad: v.devoluciones }));

  return {
    unidadesReales, unidadesAFIP,
    facturadoReal, facturadoAFIP,
    ingresosBrutos, costos, ganancia,
    pagoCris, gananciaKargo, sueldoCU,
    canceladas, devoluciones,
    detalleCanceladas, detalleDevoluciones,
  };
}

/** Top productos del mes agrupados por SKU, ordenados por ingresos */
export function topProductosMes(mes: MesFinanciero, catalogoNombres?: Record<string, string>) {
  // Agrupar por SKU
  const porSku: Record<string, { nombre: string; sku: string; unidades: number; ingresos: number; ganancia: number; costoCris: number }> = {};

  mes.ventas.forEach(v => {
    const key = v.sku || v.nombre;
    const ingresos = calcPlataqueLlega(v.precio, config) * v.unidades;
    const ganancia = ingresos - v.costo * v.unidades;
    const costoCris = v.costo * v.unidades + ganancia * 0.5;
    // Nombre: usar el del catálogo si existe, sino el de la venta
    const nombre = catalogoNombres?.[key] || v.nombre;
    if (!porSku[key]) {
      porSku[key] = { nombre, sku: v.sku, unidades: 0, ingresos: 0, ganancia: 0, costoCris: 0 };
    }
    porSku[key].unidades += v.unidades;
    porSku[key].ingresos += ingresos;
    porSku[key].ganancia += ganancia;
    porSku[key].costoCris += costoCris;
  });

  return Object.values(porSku).sort((a, b) => b.ingresos - a.ingresos);
}

// ─── Datos ───────────────────────────────────────────────────────────────────
// TODO: reemplazar con llamada a la API de MercadoLibre cuando esté integrada

export const MESES_DATA: MesFinanciero[] = [
  {
    id: '2024-10', mes: 'Octubre', año: 2024, cerrado: true,
    ventas: [
      { productoId: 1, nombre: 'Morral Catterpillar', sku: 'MCAT_N',  costo: 7500,  precio: 24999, unidades: 5,  canceladas: 1, devoluciones: 0 },
      { productoId: 3, nombre: 'Mochila Trekking',    sku: 'MOC-TREK', costo: 10680, precio: 29699, unidades: 8,  canceladas: 0, devoluciones: 1 },
    ],
  },
  {
    id: '2024-11', mes: 'Noviembre', año: 2024, cerrado: true,
    ventas: [
      { productoId: 1, nombre: 'Morral Catterpillar', sku: 'MCAT_N',  costo: 7500,  precio: 24999, unidades: 7,  canceladas: 1, devoluciones: 0 },
      { productoId: 2, nombre: 'Morral Fashion',      sku: 'MS_N',    costo: 7500,  precio: 18682, unidades: 6,  canceladas: 0, devoluciones: 0 },
      { productoId: 3, nombre: 'Mochila Trekking',    sku: 'MOC-TREK', costo: 10680, precio: 29699, unidades: 9,  canceladas: 1, devoluciones: 0 },
    ],
  },
  {
    id: '2024-12', mes: 'Diciembre', año: 2024, cerrado: true,
    ventas: [
      { productoId: 1, nombre: 'Morral Catterpillar', sku: 'MCAT_N',  costo: 7500,  precio: 24999, unidades: 12, canceladas: 2, devoluciones: 1 },
      { productoId: 2, nombre: 'Morral Fashion',      sku: 'MS_N',    costo: 7500,  precio: 18682, unidades: 8,  canceladas: 1, devoluciones: 0 },
      { productoId: 3, nombre: 'Mochila Trekking',    sku: 'MOC-TREK', costo: 10680, precio: 29699, unidades: 15, canceladas: 0, devoluciones: 2 },
      { productoId: 4, nombre: 'Pechera Básica',      sku: 'PEC-001', costo: 6675,  precio: 18975, unidades: 4,  canceladas: 0, devoluciones: 0 },
    ],
  },
  {
    id: '2025-01', mes: 'Enero', año: 2025, cerrado: true,
    ventas: [
      { productoId: 1, nombre: 'Morral Catterpillar', sku: 'MCAT_N',  costo: 7500,  precio: 24999, unidades: 6,  canceladas: 1, devoluciones: 0 },
      { productoId: 3, nombre: 'Mochila Trekking',    sku: 'MOC-TREK', costo: 10680, precio: 29699, unidades: 10, canceladas: 2, devoluciones: 1 },
      { productoId: 5, nombre: 'Riñonera Básica',     sku: 'RIN-001', costo: 3004,  precio: 11399, unidades: 3,  canceladas: 0, devoluciones: 0 },
    ],
  },
  {
    id: '2025-02', mes: 'Febrero', año: 2025, cerrado: true,
    ventas: [
      { productoId: 1, nombre: 'Morral Catterpillar', sku: 'MCAT_N',  costo: 7500,  precio: 24999, unidades: 8,  canceladas: 1, devoluciones: 1 },
      { productoId: 2, nombre: 'Morral Fashion',      sku: 'MS_N',    costo: 7500,  precio: 18682, unidades: 9,  canceladas: 0, devoluciones: 0 },
      { productoId: 3, nombre: 'Mochila Trekking',    sku: 'MOC-TREK', costo: 10680, precio: 29699, unidades: 11, canceladas: 1, devoluciones: 0 },
    ],
  },
  {
    id: '2025-03', mes: 'Marzo', año: 2025, cerrado: false,
    ventas: [
      { productoId: 1, nombre: 'Morral Catterpillar', sku: 'MCAT_N',  costo: 7500,  precio: 24999, unidades: 10, canceladas: 2, devoluciones: 1 },
      { productoId: 2, nombre: 'Morral Fashion',      sku: 'MS_N',    costo: 7500,  precio: 18682, unidades: 9,  canceladas: 1, devoluciones: 0 },
      { productoId: 3, nombre: 'Mochila Trekking',    sku: 'MOC-TREK', costo: 10680, precio: 29699, unidades: 23, canceladas: 2, devoluciones: 2 },
      { productoId: 4, nombre: 'Pechera Básica',      sku: 'PEC-001', costo: 6675,  precio: 18975, unidades: 4,  canceladas: 1, devoluciones: 0 },
      { productoId: 5, nombre: 'Riñonera Básica',     sku: 'RIN-001', costo: 3004,  precio: 11399, unidades: 2,  canceladas: 0, devoluciones: 0 },
    ],
  },
];
