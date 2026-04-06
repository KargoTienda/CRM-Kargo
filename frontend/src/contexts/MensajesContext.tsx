import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isConnected, getPreguntas, mlGet, getToken } from '../services/mlService';

export interface MensajeML {
  id: number;
  tipo: 'pregunta' | 'postventa' | 'reclamo';
  respondido: boolean;
  compradorId: number;
  compradorNombre: string;
  productoId?: string;
  productoTitulo: string;
  packId?: string;
  ordenId?: number;
  fecha: string;
  mensajes: { de: 'comprador' | 'vendedor'; texto: string; fecha: string }[];
  motivoReclamo?: string;
  estadoReclamo?: string;
  afectaReputacion?: boolean; // si el reclamo afecta la reputación del vendedor
  // Datos extra de la compra
  totalOrden?: number;
  cantidadOrden?: number;
  estadoOrden?: string;
  fechaOrden?: string;
  urlML?: string; // link directo a ML
}

interface MensajesContextType {
  mensajes: MensajeML[];
  pendientes: number;
  cargando: boolean;
  recargar: () => void;
  setMensajes: React.Dispatch<React.SetStateAction<MensajeML[]>>;
}

const MensajesContext = createContext<MensajesContextType | null>(null);

function horaCorta(isoStr?: string): string {
  if (!isoStr) return '';
  return isoStr.slice(11, 16);
}

function fechaCorta(isoStr?: string): string {
  if (!isoStr) return '';
  return isoStr.slice(0, 10);
}

// ─── Datos de ejemplo (cuando ML no conectado) ───────────
const EJEMPLO: MensajeML[] = [
  {
    id: 1, tipo: 'pregunta', respondido: false,
    compradorId: 0, compradorNombre: 'Martín González',
    productoTitulo: 'Mochila Trekking 40L', fecha: '2025-03-20',
    mensajes: [{ de: 'comprador', texto: '¿El morral tiene garantía? ¿De cuánto tiempo?', fecha: '10:32' }],
  },
  {
    id: 2, tipo: 'pregunta', respondido: false,
    compradorId: 0, compradorNombre: 'Laura Ramírez',
    productoTitulo: 'Morral Catterpillar', fecha: '2025-03-20',
    mensajes: [{ de: 'comprador', texto: '¿Tienen en color negro? No lo veo en las fotos', fecha: '09:15' }],
  },
  {
    id: 3, tipo: 'postventa', respondido: true,
    compradorId: 0, compradorNombre: 'Carlos Fernández',
    productoTitulo: 'Riñonera Básica', fecha: '2025-03-19',
    mensajes: [
      { de: 'comprador', texto: 'Me llegó el pedido pero la cremallera está trabada', fecha: '15:20' },
      { de: 'vendedor', texto: 'Lamentamos el inconveniente. Por favor mandanos una foto y lo resolvemos.', fecha: '16:05' },
      { de: 'comprador', texto: 'Listo, te mando foto ahora', fecha: '16:10' },
    ],
  },
  {
    id: 4, tipo: 'pregunta', respondido: true,
    compradorId: 0, compradorNombre: 'Ana Lucía Pérez',
    productoTitulo: 'Pechera Básica', fecha: '2025-03-19',
    mensajes: [
      { de: 'comprador', texto: '¿Hacen envíos al interior? ¿Cuánto tarda?', fecha: '11:00' },
      { de: 'vendedor', texto: 'Sí! Hacemos envíos a todo el país. Entre 3 y 7 días hábiles.', fecha: '11:45' },
    ],
  },
  {
    id: 5, tipo: 'postventa', respondido: false,
    compradorId: 0, compradorNombre: 'Diego Morales',
    productoTitulo: 'Morral Fashion', fecha: '2025-03-18',
    mensajes: [{ de: 'comprador', texto: 'Quería saber si puedo cambiar el talle, compré uno sin querer', fecha: '18:30' }],
  },
  {
    id: 6, tipo: 'reclamo', respondido: false,
    compradorId: 0, compradorNombre: 'Valentina Castro',
    productoTitulo: 'Mochila Trekking 40L', fecha: '2025-03-17',
    estadoReclamo: 'Abierto', motivoReclamo: 'Producto no recibido',
    afectaReputacion: true,
    ordenId: undefined, urlML: undefined,
    mensajes: [
      { de: 'comprador', texto: 'Compré hace 15 días y no me llegó nada. Quiero la devolución.', fecha: '09:00' },
      { de: 'vendedor', texto: 'Hola! Revisando el seguimiento del envío. Te escribimos a la brevedad.', fecha: '10:15' },
    ],
  },
  {
    id: 7, tipo: 'reclamo', respondido: false,
    compradorId: 0, compradorNombre: 'Sebastián Torres',
    productoTitulo: 'Pechera Básica', fecha: '2025-03-10',
    estadoReclamo: 'En proceso', motivoReclamo: 'Producto con defecto',
    afectaReputacion: false,
    ordenId: undefined, urlML: undefined,
    mensajes: [{ de: 'comprador', texto: 'La cremallera se rompió a los 3 días. Quiero devolución o cambio.', fecha: '11:20' }],
  },
];

const ESTADOS_RECLAMO: Record<string, string> = {
  opened:           'Abierto',
  closed:           'Cerrado',
  partially_closed: 'Parcialmente cerrado',
  valid:            'A favor tuyo',
  invalid:          'A favor comprador',
  in_process:       'En proceso',
};

const MOTIVOS_RECLAMO: Record<string, string> = {
  PNR:  'Producto no recibido',
  PDD:  'Producto dañado o defectuoso',
  NFG:  'No es como se describe',
  OTH:  'Otro motivo',
  QTY:  'Cantidad incorrecta',
  FRD:  'Posible fraude',
};

export const MensajesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mensajes, setMensajes] = useState<MensajeML[]>([]);
  const [cargando, setCargando] = useState(false);

  const cargar = useCallback(async () => {
    if (!isConnected()) return;
    setCargando(true);
    try {
      const token = getToken();

      // Preguntas sin responder y respondidas
      const [sinResp, conResp] = await Promise.all([
        getPreguntas('UNANSWERED'),
        getPreguntas('ANSWERED'),
      ]);

      const preguntas: MensajeML[] = [
        ...(sinResp.questions || []),
        ...(conResp.questions || []),
      ].map((p: any) => ({
        id: p.id,
        tipo: 'pregunta' as const,
        respondido: p.status === 'ANSWERED',
        compradorId: p.from?.id || 0,
        compradorNombre: p.from?.nickname || `Comprador ${p.from?.id}`,
        productoId: p.item_id,
        productoTitulo: p.item_title || 'Publicación ML',
        fecha: fechaCorta(p.date_created),
        fechaOrden: p.date_created,
        urlML: p.item_id
          ? `https://www.mercadolibre.com.ar/p/${p.item_id}`
          : undefined,
        mensajes: [
          { de: 'comprador' as const, texto: p.text, fecha: horaCorta(p.date_created) },
          ...(p.answer ? [{ de: 'vendedor' as const, texto: p.answer.text, fecha: horaCorta(p.answer.date_created) }] : []),
        ],
      }));

      // Post-venta: traer mensajes de las órdenes recientes
      let postVenta: MensajeML[] = [];
      try {
        const ordenesData = await mlGet(`/orders/search?seller=${token!.user_id}&sort=date_desc&limit=20`);
        const ordenes = ordenesData.results || [];

        const conPack = ordenes.filter((o: any) => o.pack_id);
        const packsVistos = new Set<string>();

        for (const orden of conPack.slice(0, 10)) {
          const packId = String(orden.pack_id);
          if (packsVistos.has(packId)) continue;
          packsVistos.add(packId);
          try {
            const msgs = await mlGet(`/messages/packs/${packId}/sellers/${token!.user_id}?tag=post_sale`);
            const conversacion = msgs.messages || [];
            if (conversacion.length === 0) continue;
            const sinLeer = conversacion.some((m: any) => m.from.user_id !== token!.user_id && !m.message_date.read);
            postVenta.push({
              id: Number(packId),
              tipo: 'postventa',
              respondido: !sinLeer,
              compradorId: orden.buyer?.id || 0,
              compradorNombre: orden.buyer?.nickname || `Comprador ${orden.buyer?.id}`,
              productoId: orden.order_items?.[0]?.item?.id,
              productoTitulo: orden.order_items?.[0]?.item?.title || 'Pedido ML',
              packId,
              ordenId: orden.id,
              fecha: fechaCorta(orden.date_created),
              fechaOrden: orden.date_created,
              totalOrden: orden.total_amount,
              cantidadOrden: orden.order_items?.reduce((s: number, i: any) => s + i.quantity, 0),
              estadoOrden: orden.status,
              urlML: `https://www.mercadolibre.com.ar/ventas/${orden.id}/detalle`,
              mensajes: conversacion.map((m: any) => ({
                de: m.from.user_id === token!.user_id ? 'vendedor' as const : 'comprador' as const,
                texto: m.text?.plain || '',
                fecha: horaCorta(m.message_date?.received),
              })),
            });
          } catch { /* skip */ }
        }
      } catch { /* skip post-venta */ }

      // Reclamos desde la API de ML
      let reclamos: MensajeML[] = [];
      try {
        const claimsData = await mlGet(`/post-purchase/v1/claims/search?seller_id=${token!.user_id}&limit=20`);
        const claims: any[] = claimsData.data || [];

        for (const claim of claims.slice(0, 15)) {
          try {
            // Datos de la orden para obtener comprador y producto
            const ordenData = await mlGet(`/orders/${claim.resource_id}`);

            // Mensajes del reclamo
            let mensajesReclamo: MensajeML['mensajes'] = [];
            try {
              const msgsData = await mlGet(`/post-purchase/v1/claims/${claim.id}/messages`);
              mensajesReclamo = (msgsData.messages || []).map((m: any) => ({
                de: m.from?.user_id === token!.user_id ? 'vendedor' as const : 'comprador' as const,
                texto: m.message || m.text || '',
                fecha: horaCorta(m.date_created),
              })).filter((m: any) => m.texto);
            } catch { /* sin mensajes */ }

            if (mensajesReclamo.length === 0) {
              mensajesReclamo = [{ de: 'comprador', texto: MOTIVOS_RECLAMO[claim.reason_id] || claim.reason_id || 'Reclamo abierto', fecha: horaCorta(claim.date_created) }];
            }

            reclamos.push({
              id: claim.id,
              tipo: 'reclamo',
              respondido: claim.status !== 'opened',
              compradorId: ordenData.buyer?.id || 0,
              compradorNombre: ordenData.buyer?.nickname || `Comprador ${ordenData.buyer?.id}`,
              productoId: ordenData.order_items?.[0]?.item?.id,
              productoTitulo: ordenData.order_items?.[0]?.item?.title || 'Pedido ML',
              ordenId: claim.resource_id,
              fecha: fechaCorta(claim.date_created),
              fechaOrden: claim.date_created,
              totalOrden: ordenData.total_amount,
              cantidadOrden: ordenData.order_items?.reduce((s: number, i: any) => s + i.quantity, 0),
              estadoOrden: ordenData.status,
              estadoReclamo: ESTADOS_RECLAMO[claim.status] || claim.status,
              motivoReclamo: MOTIVOS_RECLAMO[claim.reason_id] || claim.reason_id,
              afectaReputacion: claim.affects_seller_reputation === true,
              urlML: `https://www.mercadolibre.com.ar/ventas/${claim.resource_id}/detalle`,
              mensajes: mensajesReclamo,
            });
          } catch { /* skip este reclamo */ }
        }
      } catch { /* skip reclamos */ }

      setMensajes([...preguntas, ...postVenta, ...reclamos]);
    } catch (e) {
      console.error('[Kargo] Error cargando mensajes:', e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (isConnected()) cargar();
  }, [cargar]);

  const pendientes = mensajes.filter(m => !m.respondido).length;

  return (
    <MensajesContext.Provider value={{ mensajes, pendientes, cargando, recargar: cargar, setMensajes }}>
      {children}
    </MensajesContext.Provider>
  );
};

export function useMensajes() {
  const ctx = useContext(MensajesContext);
  if (!ctx) throw new Error('useMensajes debe usarse dentro de MensajesProvider');
  return ctx;
}
