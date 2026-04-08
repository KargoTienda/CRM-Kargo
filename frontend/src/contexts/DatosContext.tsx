/**
 * ─── CONTEXTO CENTRAL DE DATOS ──────────────────────────────────────────────
 *
 * Fuente única de verdad para todo el CRM.
 * - ML conectado  → datos reales de MercadoLibre
 * - ML desconectado → datos de ejemplo (MESES_DATA)
 *
 * Para adaptar este CRM a otro negocio: solo cambiá MESES_DATA en finanzasData.ts
 * ────────────────────────────────────────────────────────────────────────────
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MESES_DATA, MesFinanciero, VentaProducto } from '../data/finanzasData';
import { isConnected, getOrdenes } from '../services/mlService';
import { Producto } from '../components/catalogo/types';
import {
  getProductos, upsertProductos,
  getOrdenesHistorial, upsertOrdenHistorial,
  getOrdenesProcesadas, insertOrdenProcesada,
} from '../utils/db';
import { emitirNotificacion } from '../utils/notificaciones';

async function getCatalogo(): Promise<Producto[]> {
  try { return await getProductos(); } catch { return []; }
}

export function buscarProductoPorSKU(sku: string, catalogo: Producto[]): Producto | null {
  if (!sku) return null;
  const skuLower = sku.toLowerCase().trim();
  // 1. Buscar en SKU de variantes de color
  for (const p of catalogo) {
    if (p.colores.some(c => c.sku && c.sku.toLowerCase().trim() === skuLower)) return p;
  }
  // 2. Buscar en SKU base del producto
  for (const p of catalogo) {
    if (p.sku.toLowerCase().trim() === skuLower) return p;
  }
  return null;
}

function buscarCosto(sku: string, titulo: string, catalogo: Producto[]): number {
  const porSku = buscarProductoPorSKU(sku, catalogo);
  if (porSku) return porSku.costo;
  // Fallback por nombre si no hay SKU
  const tituloLower = titulo.toLowerCase();
  const match = catalogo.find(p =>
    tituloLower.includes(p.nombre.toLowerCase()) ||
    p.nombre.toLowerCase().includes(tituloLower)
  );
  return match?.costo ?? 0;
}

const MESES_NOMBRE = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

// ─── Transformar órdenes de ML al formato interno ────────────────────────────

function transformarOrdenesML(ordenes: any[], catalogo: Producto[]): MesFinanciero[] {
  const porMes: Record<string, { pagadas: any[]; canceladas: any[] }> = {};

  ordenes.forEach(orden => {
    const fecha = new Date(orden.date_created);
    const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    if (!porMes[key]) porMes[key] = { pagadas: [], canceladas: [] };
    if (orden.status === 'paid' || orden.status === 'delivered') {
      porMes[key].pagadas.push(orden);
    } else if (orden.status === 'cancelled') {
      porMes[key].canceladas.push(orden);
    }
  });

  const hoy = new Date();
  const mesActualKey = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

  return Object.entries(porMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { pagadas, canceladas }]) => {
      const [anioStr, mesStr] = key.split('-');
      const anio = parseInt(anioStr);
      const mes = parseInt(mesStr);

      // Agrupar por producto
      const porProducto: Record<string, VentaProducto> = {};

      const procesarItems = (orden: any, esCancelada: boolean) => {
        (orden.order_items || []).forEach((item: any) => {
          const titulo = item.item?.title || 'Producto sin nombre';
          const skuML = item.item?.seller_sku || '';

          // Buscar en catálogo por SKU (variante o base)
          const catalogoProd = skuML ? buscarProductoPorSKU(skuML, catalogo) : null;

          // Clave de agrupación: SKU del catálogo (base) si existe,
          // sino SKU de ML, sino ID de publicación.
          // Esto hace que 12 publicaciones del mismo producto con el mismo SKU
          // queden agrupadas en una sola fila.
          const skuBase = catalogoProd?.sku || skuML || String(item.item?.id || titulo);
          const nombre = catalogoProd?.nombre || titulo;
          const costo = catalogoProd?.costo ?? buscarCosto(skuML, titulo, catalogo);

          if (!porProducto[skuBase]) {
            porProducto[skuBase] = {
              productoId: skuBase as any,
              nombre,
              sku: skuBase,
              costo,
              precio: item.unit_price || 0,
              unidades: 0,
              canceladas: 0,
              devoluciones: 0,
            };
          }
          if (esCancelada) {
            porProducto[skuBase].canceladas += item.quantity || 1;
          } else {
            porProducto[skuBase].unidades += item.quantity || 1;
          }
        });
      };

      pagadas.forEach(o => procesarItems(o, false));
      canceladas.forEach(o => procesarItems(o, true));

      return {
        id: key,
        mes: MESES_NOMBRE[mes],
        año: anio,
        ventas: Object.values(porProducto),
        cerrado: key < mesActualKey,
      };
    });
}

// ─── Contexto ────────────────────────────────────────────────────────────────

interface DatosContextType {
  meses: MesFinanciero[];
  setMeses: React.Dispatch<React.SetStateAction<MesFinanciero[]>>;
  mlConectado: boolean;
  cargandoML: boolean;
  errorML: string | null;
  refrescar: () => void;
}

const DatosContext = createContext<DatosContextType | null>(null);

// Auto-sync en background via endpoint server-side
async function triggerAutoSync() {
  try {
    const res = await fetch('/api/sync-auto', { method: 'POST' });
    if (res.ok) localStorage.setItem('last_sync_at', new Date().toISOString());
  } catch (_) {}
}

export const DatosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mlConectado, setMlConectado] = useState(isConnected());
  const [meses, setMeses] = useState<MesFinanciero[]>(MESES_DATA);
  const [cargandoML, setCargandoML] = useState(false);
  const [errorML, setErrorML] = useState<string | null>(null);

  // Auto-sync al cargar si ML está conectado
  useEffect(() => {
    if (isConnected()) {
      triggerAutoSync();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDesdeML = useCallback(async () => {
    if (!isConnected()) {
      console.log('[Kargo] ML no conectado, usando datos de ejemplo');
      return;
    }
    setCargandoML(true);
    setErrorML(null);
    try {
      console.log('[Kargo] Cargando órdenes de ML...');

      // 1. Cargar historial guardado en Supabase
      const historialArr = await getOrdenesHistorial();
      const historialGuardado: Record<string, any> = {};
      historialArr.forEach(o => { historialGuardado[String(o.id)] = o; });

      // 2. Traer las últimas 50 órdenes de ML
      const data = await getOrdenes(50);
      const nuevasOrdenes: any[] = data.results || [];
      console.log('[Kargo] Órdenes nuevas de ML:', nuevasOrdenes.length);

      // 3. Detectar órdenes nuevas (pagadas/entregadas que no estaban procesadas)
      const procesadasSet = await getOrdenesProcesadas();
      const ordenesNuevas = nuevasOrdenes.filter(o =>
        (o.status === 'paid' || o.status === 'delivered') && !procesadasSet.has(String(o.id))
      );

      // 4. Mergear historial
      for (const o of nuevasOrdenes) {
        historialGuardado[String(o.id)] = o;
        await upsertOrdenHistorial(o);
      }

      // 5. Procesar ventas nuevas: reducir stockSede y emitir notificaciones
      if (ordenesNuevas.length > 0) {
        const productos = await getProductos();
        let productosModificados = false;

        for (const orden of ordenesNuevas) {
          for (const item of (orden.order_items || [])) {
            const skuML = item.item?.seller_sku || '';
            const titulo = item.item?.title || 'Producto';
            const cantidad = item.quantity || 1;

            // Notificación de venta
            emitirNotificacion({
              tipo: 'venta',
              titulo: `Nueva venta: ${titulo}`,
              descripcion: `${cantidad} unidad${cantidad > 1 ? 'es' : ''} · Orden #${orden.id}`,
            });

            // Reducir stockSede del producto que coincida por SKU
            if (skuML) {
              for (const prod of productos) {
                let modificado = false;
                // eslint-disable-next-line no-loop-func
                const colores = prod.colores.map((c: any) => {
                  const skuVariante = c.sku || '';
                  const skuBase = prod.sku || '';
                  if (skuVariante === skuML || skuBase === skuML) {
                    const stockSede = c.stockSede ?? 0;
                    if (stockSede <= 0) {
                      emitirNotificacion({
                        tipo: 'stock_sin_cobertura',
                        titulo: `Venta sin stock en sede`,
                        descripcion: `${prod.nombre} ${c.color} — sin stock en Sede de entrega`,
                      });
                    }
                    modificado = true;
                    productosModificados = true;
                    return { ...c, stockSede: Math.max(0, stockSede - cantidad) };
                  }
                  return c;
                });
                if (modificado) prod.colores = colores;
              }
            }

            procesadasSet.add(String(orden.id));
          }
        }

        if (productosModificados) {
          await upsertProductos(productos);
          window.dispatchEvent(new CustomEvent('kargo:products-updated'));
        }
        for (const orden of ordenesNuevas) {
          await insertOrdenProcesada(String(orden.id));
        }
      }

      const todasLasOrdenes = Object.values(historialGuardado);
      console.log('[Kargo] Total órdenes en historial:', todasLasOrdenes.length);

      const catalogo = await getCatalogo();
      const mesesML = transformarOrdenesML(todasLasOrdenes, catalogo);
      console.log('[Kargo] Meses transformados:', mesesML.length);
      setMeses(mesesML.length > 0 ? mesesML : MESES_DATA);
    } catch (e: any) {
      console.error('[Kargo] Error ML:', e?.response?.data || e?.message || e);
      setErrorML('No se pudieron cargar los datos de ML');
    } finally {
      setCargandoML(false);
    }
  }, []);

  // Detectar cuando se conecta/desconecta ML (cambios en localStorage)
  useEffect(() => {
    const handleStorage = () => {
      const conectado = isConnected();
      setMlConectado(conectado);
    };
    window.addEventListener('storage', handleStorage);
    // También revisar periódicamente (por si el cambio ocurre en la misma pestaña)
    const intervalo = setInterval(() => {
      const conectado = isConnected();
      setMlConectado(prev => {
        if (prev !== conectado) return conectado;
        return prev;
      });
    }, 2000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(intervalo);
    };
  }, []);

  useEffect(() => {
    if (mlConectado) {
      cargarDesdeML();
    } else {
      setMeses(MESES_DATA);
    }
  }, [mlConectado, cargarDesdeML]);

  return (
    <DatosContext.Provider value={{
      meses, setMeses,
      mlConectado,
      cargandoML,
      errorML,
      refrescar: cargarDesdeML,
    }}>
      {children}
    </DatosContext.Provider>
  );
};

export function useDatos(): DatosContextType {
  const ctx = useContext(DatosContext);
  if (!ctx) throw new Error('useDatos debe usarse dentro de DatosProvider');
  return ctx;
}
