/**
 * Sincronización automática server-side.
 * Llamado por Vercel Cron cada 6 horas y también desde el frontend al cargar.
 * No depende del navegador: lee el token ML desde Supabase.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const ML_CLIENT_ID = process.env.REACT_APP_ML_CLIENT_ID;
const ML_CLIENT_SECRET = process.env.REACT_APP_ML_CLIENT_SECRET;
const ML_REDIRECT_URI = process.env.REACT_APP_ML_REDIRECT_URI || 'https://crm-kargo-qvdt.vercel.app/mercadolibre';

// ─── Supabase ─────────────────────────────────────────────

function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ─── ML Token ─────────────────────────────────────────────

async function getMLToken(supabase) {
  const { data } = await supabase.from('kargo_store').select('value').eq('key', 'ml_token').maybeSingle();
  return data?.value || null;
}

async function refreshMLToken(supabase, refreshToken) {
  const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(data));

  const token = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user_id: data.user_id,
    expires_at: Date.now() + (data.expires_in - 60) * 1000,
  };
  await supabase.from('kargo_store').upsert({ key: 'ml_token', value: token, updated_at: new Date().toISOString() });
  return token;
}

async function getValidMLToken(supabase) {
  let token = await getMLToken(supabase);
  if (!token) throw new Error('No ML token in DB — conectar ML primero desde el CRM');
  if (Date.now() >= token.expires_at) {
    token = await refreshMLToken(supabase, token.refresh_token);
  }
  return token;
}

// ─── ML API ───────────────────────────────────────────────

async function mlGet(path, accessToken) {
  const resp = await fetch(`https://api.mercadolibre.com${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return resp.json();
}

// ─── Helpers ──────────────────────────────────────────────

function clasificarZona(zip) {
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

function esFlexOrder(orden) {
  const tags = orden.tags || [];
  return tags.includes('d2c') || tags.includes('delivered_by_seller') ||
    tags.some(t => t.toLowerCase().includes('flex'));
}

function fechaEntrega(fechaCreacion, horarioCorte) {
  const d = new Date(fechaCreacion);
  if (d.getHours() >= horarioCorte) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function matchProducto(productos, sellerSku, titulo) {
  if (sellerSku) {
    const skuUp = sellerSku.toUpperCase();
    const byMain = productos.find(p => p.sku?.toUpperCase() === skuUp);
    if (byMain) return byMain;
    const byColor = productos.find(p =>
      (p.colores || []).some(c => c.sku?.toUpperCase() === skuUp)
    );
    if (byColor) return byColor;
  }
  if (titulo) {
    const t = titulo.toLowerCase();
    for (const p of productos) {
      const num = (p.sku || '').replace(/\D/g, '');
      if (num && t.includes(num)) return p;
    }
  }
  return null;
}

function getColor(attrs) {
  if (!Array.isArray(attrs)) return '';
  const c = attrs.find(a =>
    (a.id || '').toLowerCase().includes('color') ||
    (a.name || '').toLowerCase().includes('color')
  );
  return c?.value_name || '';
}

// ─── Sincronización principal ─────────────────────────────

async function sincronizarTodo(supabase, token) {
  const log = [];
  const at = token.access_token;

  // 1. Descargar todas las órdenes de ML
  const LIMIT = 50;
  let offset = 0;
  let total = Infinity;
  const ordenes = [];

  while (offset < total) {
    const data = await mlGet(
      `/orders/search?seller=${token.user_id}&sort=date_desc&limit=${LIMIT}&offset=${offset}`,
      at
    );
    const resultados = data.results || [];
    total = data.paging?.total ?? resultados.length;
    ordenes.push(...resultados);
    if (resultados.length < LIMIT) break;
    offset += LIMIT;
  }
  log.push(`Órdenes descargadas: ${ordenes.length}`);

  // Guardar en Supabase
  for (let i = 0; i < ordenes.length; i += 100) {
    const rows = ordenes.slice(i, i + 100).map(o => ({ order_id: String(o.id), data: o }));
    await supabase.from('kargo_ordenes_historial').upsert(rows);
  }

  // 2. Config Flex
  const { data: cfgRow } = await supabase.from('kargo_flex_config').select('*').eq('id', 1).maybeSingle();
  const horarioCorte = cfgRow?.horario_corte ?? 15;
  const horarioTarde = cfgRow?.horario_tarde ?? 9;

  // 3. Catálogo
  const { data: productosRaw } = await supabase.from('kargo_productos').select('*');
  const productos = (productosRaw || []).map(p => ({
    id: p.id, nombre: p.nombre, sku: p.sku,
    colores: p.colores || [],
  }));

  // 4. Órdenes ya procesadas (evitar duplicar transacciones)
  const { data: txRows } = await supabase.from('kargo_transacciones')
    .select('nota').ilike('nota', 'ML:%');
  const yaProcesadas = new Set((txRows || []).map(r => (r.nota || '').replace('ML:', '')));

  // 5. Procesar órdenes → transacciones y Flex
  let transaccionesCreadas = 0;
  let flexOrdenesDetectadas = 0;
  const flexPorFecha = {};
  const shipmentsContados = new Set();

  for (const orden of ordenes) {
    if (orden.status !== 'paid') continue;
    const orderId = String(orden.id);

    // ── Flex por tag d2c ────────────────────────────────
    if (esFlexOrder(orden)) {
      const shipId = String(orden.shipping?.id || '');
      if (!shipId || !shipmentsContados.has(shipId)) {
        if (shipId) shipmentsContados.add(shipId);
        flexOrdenesDetectadas++;
        if (orden.date_created) {
          const fecha = fechaEntrega(orden.date_created, horarioCorte);
          if (!flexPorFecha[fecha]) flexPorFecha[fecha] = { caba: 0, primerCordon: 0, segundoCordon: 0, aTiempo: 0, tarde: 0 };
          const zip = orden.shipping?.receiver_address?.zip_code || '';
          flexPorFecha[fecha][clasificarZona(zip)] += 1;
          const entregadoEn = orden.shipping?.date_shipped || orden.date_closed;
          if (entregadoEn) {
            new Date(entregadoEn).getHours() < horarioTarde
              ? flexPorFecha[fecha].aTiempo++
              : flexPorFecha[fecha].tarde++;
          }
        }
      }
    }

    // ── Transacciones (sin duplicar) ────────────────────
    if (yaProcesadas.has(orderId)) continue;

    for (const item of (orden.order_items || [])) {
      const sellerSku = item.item?.seller_sku || '';
      const titulo = item.item?.title || '';
      const cantidad = item.quantity || 1;
      const fecha = orden.date_closed || orden.date_created || new Date().toISOString();
      const producto = matchProducto(productos, sellerSku, titulo);
      const color = getColor(item.variation_attributes || []);

      const tx = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        fecha,
        producto_nombre: producto?.nombre || titulo,
        sku: sellerSku || producto?.sku || '',
        color,
        cantidad,
        destino: 'venta_ml',
        nota: `ML:${orderId}`,
        usuario: 'ML sync',
      };
      await supabase.from('kargo_transacciones').insert(tx);
      transaccionesCreadas++;
    }
  }

  // 6. Flex por shipment API para órdenes recientes sin tag d2c
  const hace90dias = new Date();
  hace90dias.setDate(hace90dias.getDate() - 90);

  for (const orden of ordenes) {
    if (orden.status !== 'paid') continue;
    if (esFlexOrder(orden)) continue;
    const shippingId = orden.shipping?.id;
    if (!shippingId) continue;
    if (shipmentsContados.has(String(shippingId))) continue;
    if (new Date(orden.date_created || '') < hace90dias) continue;

    try {
      const shipment = await mlGet(`/shipments/${shippingId}`, at);
      const lt = shipment?.logistic_type;
      if (lt === 'self_service') {
        shipmentsContados.add(String(shippingId));
        flexOrdenesDetectadas++;
        if (!orden.date_created) continue;
        const fecha = fechaEntrega(orden.date_created, horarioCorte);
        if (!flexPorFecha[fecha]) flexPorFecha[fecha] = { caba: 0, primerCordon: 0, segundoCordon: 0, aTiempo: 0, tarde: 0 };
        const zip = shipment.receiver_address?.zip_code || orden.shipping?.receiver_address?.zip_code || '';
        flexPorFecha[fecha][clasificarZona(zip)] += 1;
        const entregadoEn = shipment.date_shipped || orden.date_closed;
        if (entregadoEn) {
          new Date(entregadoEn).getHours() < horarioTarde
            ? flexPorFecha[fecha].aTiempo++
            : flexPorFecha[fecha].tarde++;
        }
      }
    } catch (_) {}
  }

  // 7. Guardar Flex
  let flexDiasActualizados = 0;
  for (const [fecha, d] of Object.entries(flexPorFecha)) {
    if (d.caba + d.primerCordon + d.segundoCordon > 0) {
      await supabase.from('kargo_flex_pedidos').upsert({
        fecha,
        caba: d.caba,
        primer_cordon: d.primerCordon,
        segundo_cordon: d.segundoCordon,
        a_tiempo: d.aTiempo,
        tarde: d.tarde,
      });
      flexDiasActualizados++;
    }
  }

  // Guardar timestamp del último sync
  await supabase.from('kargo_store').upsert({
    key: 'last_sync_at', value: new Date().toISOString(), updated_at: new Date().toISOString(),
  });

  log.push(`Transacciones creadas: ${transaccionesCreadas}`);
  log.push(`Flex detectados: ${flexOrdenesDetectadas} envíos, ${flexDiasActualizados} días`);

  return { ordenesTotal: ordenes.length, transaccionesCreadas, flexOrdenesDetectadas, flexDiasActualizados, log };
}

// ─── Handler HTTP ─────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const supabase = getSupabase();

  try {
    const token = await getValidMLToken(supabase);
    const result = await sincronizarTodo(supabase, token);
    res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('[sync-auto]', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
};
