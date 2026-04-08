/**
 * Sincronización unificada ML → Supabase.
 * Un solo botón que descarga todo de ML y deja el CRM actualizado:
 * órdenes históricas, transacciones de stock, datos Flex.
 */

import { getTodasLasOrdenes, mlGet } from './mlService';
import {
  getProductos, insertTransaccion, getMLOrderIdsProcessed, upsertFlexDia,
} from '../utils/db';
import { Producto, TransaccionStock } from '../components/catalogo/types';

export interface SyncResult {
  ordenesTotal: number;
  transaccionesCreadas: number;
  flexDiasActualizados: number;
  flexOrdenesDetectadas: number;
}

// ─── Matcheo ML item → producto del catálogo ──────────────
function matchProducto(
  productos: Producto[],
  sellerSku: string,
  titulo: string,
): Producto | undefined {
  if (sellerSku) {
    const skuUp = sellerSku.toUpperCase();
    const byProductSku = productos.find(p => p.sku.toUpperCase() === skuUp);
    if (byProductSku) return byProductSku;
    const byColorSku = productos.find(p =>
      p.colores.some(c => c.sku?.toUpperCase() === skuUp)
    );
    if (byColorSku) return byColorSku;
  }
  if (titulo) {
    const t = titulo.toLowerCase();
    // Buscar el SKU numérico dentro del título (ej. "54983" en "Mochila 54983 Negro")
    for (const p of productos) {
      const num = p.sku.replace(/\D/g, '');
      if (num && t.includes(num)) return p;
    }
  }
  return undefined;
}

function getColor(attrs: any[]): string {
  if (!Array.isArray(attrs)) return '';
  const c = attrs.find((a: any) =>
    (a.id || '').toLowerCase().includes('color') ||
    (a.name || '').toLowerCase().includes('color')
  );
  return c?.value_name || '';
}

function esFlexOrder(orden: any): boolean {
  const tags: string[] = orden.tags || [];
  return (
    tags.includes('d2c') ||
    tags.includes('delivered_by_seller') ||
    tags.some((t: string) => t.toLowerCase().includes('flex'))
  );
}

function clasificarZona(zip: string): 'caba' | 'primerCordon' | 'segundoCordon' {
  if (!zip) return 'primerCordon';
  const z = zip.trim().toUpperCase();
  if (z.startsWith('C')) return 'caba';
  const num = parseInt(z);
  if (isNaN(num)) return 'primerCordon';
  if (num >= 1001 && num <= 1499) return 'caba';
  if (num >= 1600 && num <= 1779) return 'primerCordon';
  if (num >= 1780 && num <= 1999) return 'segundoCordon';
  return 'primerCordon';
}

// ─── Función principal ────────────────────────────────────

export async function sincronizarTodo(
  onProgress?: (msg: string) => void
): Promise<SyncResult> {

  // 1. Descargar todas las órdenes de ML → guarda en kargo_ordenes_historial
  onProgress?.('Descargando órdenes de MercadoLibre...');
  const ordenes = await getTodasLasOrdenes();

  // 2. Catálogo para matchear productos
  onProgress?.('Cargando catálogo de productos...');
  const productos = await getProductos();

  // 3. Qué órdenes ya fueron procesadas (evitar duplicados)
  onProgress?.('Verificando historial existente...');
  const yaProcesadas = await getMLOrderIdsProcessed();

  // 4. Procesar cada orden pagada → kargo_transacciones
  onProgress?.('Creando transacciones de ventas...');
  let transaccionesCreadas = 0;
  let flexOrdenesDetectadas = 0;

  // Para Flex: acumular por fecha
  const flexPorFecha: Record<string, {
    caba: number; primerCordon: number; segundoCordon: number;
    aTiempo: number; tarde: number;
  }> = {};

  for (const orden of ordenes) {
    if (orden.status !== 'paid') continue;
    const orderId = String(orden.id);

    // Flex: siempre actualizar aunque ya esté procesada
    if (esFlexOrder(orden)) {
      flexOrdenesDetectadas++;
      const fechaRaw = orden.shipping?.date_shipped || orden.date_closed || orden.date_created;
      if (fechaRaw) {
        const fecha = fechaRaw.slice(0, 10);
        if (!flexPorFecha[fecha]) {
          flexPorFecha[fecha] = { caba: 0, primerCordon: 0, segundoCordon: 0, aTiempo: 0, tarde: 0 };
        }
        const zip = orden.shipping?.receiver_address?.zip_code || '';
        const zona = clasificarZona(zip);
        flexPorFecha[fecha][zona] += 1; // 1 entrega por pedido, no por unidad
        try {
          const hora = new Date(fechaRaw).getHours();
          if (hora < 9) flexPorFecha[fecha].aTiempo++;
          else flexPorFecha[fecha].tarde++;
        } catch {}
      }
    }

    // Transacciones: sólo si no fue procesada antes
    if (yaProcesadas.has(orderId)) continue;

    for (const item of (orden.order_items || [])) {
      const sellerSku = item.item?.seller_sku || '';
      const titulo = item.item?.title || '';
      const cantidad = item.quantity || 1;
      const fecha = orden.date_closed || orden.date_created || new Date().toISOString();

      const producto = matchProducto(productos, sellerSku, titulo);
      const color = getColor(item.variation_attributes || []);

      const tx: TransaccionStock = {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        fecha,
        productoNombre: producto?.nombre || titulo,
        sku: sellerSku || producto?.sku || '',
        color,
        cantidad,
        destino: 'venta_ml',
        nota: `ML:${orderId}`,
        usuario: 'ML sync',
      };

      await insertTransaccion(tx);
      transaccionesCreadas++;
    }
  }

  // 5. Para órdenes recientes sin tag d2c, consultar el envío para detectar Flex
  onProgress?.('Verificando envíos Flex recientes...');
  const hace90dias = new Date();
  hace90dias.setDate(hace90dias.getDate() - 90);

  for (const orden of ordenes) {
    if (orden.status !== 'paid') continue;
    if (esFlexOrder(orden)) continue; // ya procesado
    const orderId = String(orden.id);
    const shippingId = orden.shipping?.id;
    if (!shippingId) continue;
    const fechaOrden = new Date(orden.date_created || '');
    if (fechaOrden < hace90dias) continue; // solo recientes

    try {
      const shipment = await mlGet(`/shipments/${shippingId}`);
      const lt = shipment?.logistic_type;
      console.log(`[Flex] Orden ${orderId} shipment ${shippingId} logistic_type=${lt}`);
      // ML maneja: 'fulfillment', 'crossdocking', 'me1', 'me2', 'not_specified'
      // Flex/propio: 'self_service', 'custom', 'xd_drop_off', 'drop_off', 'mandate'
      const esEnvioPropio = lt && !['fulfillment', 'crossdocking', 'me1', 'me2', 'not_specified'].includes(lt);
      if (esEnvioPropio) {
        flexOrdenesDetectadas++;
        const fechaRaw = shipment.date_shipped || orden.date_closed || orden.date_created;
        if (!fechaRaw) continue;
        const fecha = fechaRaw.slice(0, 10);
        if (!flexPorFecha[fecha]) {
          flexPorFecha[fecha] = { caba: 0, primerCordon: 0, segundoCordon: 0, aTiempo: 0, tarde: 0 };
        }
        const zip = shipment.receiver_address?.zip_code || orden.shipping?.receiver_address?.zip_code || '';
        const zona = clasificarZona(zip);
        flexPorFecha[fecha][zona] += 1; // 1 entrega por pedido
        try {
          const hora = new Date(fechaRaw).getHours();
          if (hora < 9) flexPorFecha[fecha].aTiempo++;
          else flexPorFecha[fecha].tarde++;
        } catch {}
      }
    } catch {}
  }

  // 6. Guardar datos Flex en Supabase
  onProgress?.('Guardando datos Flex...');
  const flexDias = Object.entries(flexPorFecha).map(([fecha, d]) => ({ fecha, ...d }));
  for (const dia of flexDias) {
    if (dia.caba + dia.primerCordon + dia.segundoCordon > 0) {
      await upsertFlexDia(dia);
    }
  }

  onProgress?.('✓ Sincronización completa');
  return {
    ordenesTotal: ordenes.length,
    transaccionesCreadas,
    flexDiasActualizados: flexDias.length,
    flexOrdenesDetectadas,
  };
}
