/**
 * Sincronización unificada ML → Supabase.
 * Un solo botón que descarga todo de ML y deja el CRM actualizado:
 * órdenes históricas, transacciones de stock, datos Flex.
 */

import { getTodasLasOrdenes, mlGet } from './mlService';
import {
  getProductos, insertTransaccion, getMLOrderIdsProcessed, upsertFlexDia,
  getFlexConfig, ConfigFlex,
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

/**
 * Calcula la fecha de entrega según el horario de corte.
 * Si el pedido se hizo antes del corte → se entrega hoy.
 * Si se hizo después del corte → se entrega mañana.
 */
function fechaEntrega(fechaCreacion: string, horarioCorte: number): string {
  const d = new Date(fechaCreacion);
  if (d.getHours() >= horarioCorte) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().slice(0, 10);
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

  // 4. Cargar config Flex (horarios de corte y tarde)
  const flexConfig: ConfigFlex = (await getFlexConfig()) || {
    costoCaba: 800, costoPrimerCordon: 1200, costoSegundoCordon: 1800,
    mlCaba: 1000, mlPrimerCordon: 1500, mlSegundoCordon: 2200,
    horarioCorte: 15, horarioTarde: 9,
  };
  const { horarioCorte, horarioTarde } = flexConfig;

  // 5. Procesar cada orden pagada → kargo_transacciones
  onProgress?.('Creando transacciones de ventas...');
  let transaccionesCreadas = 0;
  let flexOrdenesDetectadas = 0;

  // Evitar contar el mismo envío dos veces (pack: 2 órdenes = 1 paquete)
  const shipmentsContados = new Set<string>();

  // Para Flex: acumular por fecha de ENTREGA (no de creación)
  const flexPorFecha: Record<string, {
    caba: number; primerCordon: number; segundoCordon: number;
    aTiempo: number; tarde: number;
  }> = {};

  for (const orden of ordenes) {
    if (orden.status !== 'paid') continue;
    const orderId = String(orden.id);

    // Flex: siempre actualizar aunque ya esté procesada
    if (esFlexOrder(orden)) {
      const shipId = String(orden.shipping?.id || '');
      if (shipId && shipmentsContados.has(shipId)) {
        // mismo paquete físico, ya contado
      } else {
        if (shipId) shipmentsContados.add(shipId);
        flexOrdenesDetectadas++;
        if (orden.date_created) {
          const fecha = fechaEntrega(orden.date_created, horarioCorte);
          if (!flexPorFecha[fecha]) {
            flexPorFecha[fecha] = { caba: 0, primerCordon: 0, segundoCordon: 0, aTiempo: 0, tarde: 0 };
          }
          const zip = orden.shipping?.receiver_address?.zip_code || '';
          const zona = clasificarZona(zip);
          flexPorFecha[fecha][zona] += 1;
          const fechaEntregaRaw = orden.shipping?.date_shipped || orden.date_closed;
          if (fechaEntregaRaw) {
            const horaEntrega = new Date(fechaEntregaRaw).getHours();
            if (horaEntrega < horarioTarde) flexPorFecha[fecha].aTiempo++;
            else flexPorFecha[fecha].tarde++;
          }
        }
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
    // Si este envío ya fue contado (pack con múltiples órdenes), saltar
    if (shipmentsContados.has(String(shippingId))) continue;
    const fechaOrden = new Date(orden.date_created || '');
    if (fechaOrden < hace90dias) continue; // solo recientes

    try {
      const shipment = await mlGet(`/shipments/${shippingId}`);
      const lt = shipment?.logistic_type;
      console.log(`[Flex] Orden ${orderId} shipment ${shippingId} logistic_type=${lt}`);
      // Solo 'self_service' es Flex real (vos entregás al cliente directamente)
      // 'xd_drop_off' = dejás en punto ML, ML entrega → NO es Flex
      const esEnvioPropio = lt === 'self_service';
      if (esEnvioPropio) {
        shipmentsContados.add(String(shippingId));
        flexOrdenesDetectadas++;
        if (!orden.date_created) continue;
        // Fecha de entrega según horario de corte
        const fecha = fechaEntrega(orden.date_created, horarioCorte);
        if (!flexPorFecha[fecha]) {
          flexPorFecha[fecha] = { caba: 0, primerCordon: 0, segundoCordon: 0, aTiempo: 0, tarde: 0 };
        }
        const zip = shipment.receiver_address?.zip_code || orden.shipping?.receiver_address?.zip_code || '';
        const zona = clasificarZona(zip);
        flexPorFecha[fecha][zona] += 1; // 1 paquete por pedido
        // A tiempo / tarde según fecha de envío real
        const fechaEntregaRaw = shipment.date_shipped || orden.date_closed;
        if (fechaEntregaRaw) {
          const horaEntrega = new Date(fechaEntregaRaw).getHours();
          if (horaEntrega < horarioTarde) flexPorFecha[fecha].aTiempo++;
          else flexPorFecha[fecha].tarde++;
        }
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
