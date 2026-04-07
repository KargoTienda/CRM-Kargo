/**
 * Operaciones Supabase con tablas dedicadas por entidad.
 * Cada tabla tiene su propia estructura — no más key-value genérico.
 */

import { createClient } from '@supabase/supabase-js';
import { Producto, ConfigParams, TransaccionStock } from '../components/catalogo/types';
import { Notificacion } from './notificaciones';

export const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL!,
  process.env.REACT_APP_SUPABASE_ANON_KEY!,
);

// ─── PRODUCTOS ───────────────────────────────────────────────────────────────

export async function getProductos(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from('kargo_productos')
    .select('*')
    .order('id');
  if (error) { console.error('[db] getProductos:', error.message); return []; }
  return (data || []).map(r => ({
    id: r.id, nombre: r.nombre, marca: r.marca, categoria: r.categoria,
    sku: r.sku, codigoBarras: r.codigo_barras, descripcion: r.descripcion,
    imagen: r.imagen, usd: r.usd, costo: r.costo, precio: r.precio,
    precioSinDesc: r.precio_sin_desc, promoPorc: r.promo_porc ?? 0,
    colores: r.colores || [],
  }));
}

export async function upsertProductos(productos: Producto[]): Promise<void> {
  if (!productos.length) return;
  const rows = productos.map(p => ({
    id: p.id, nombre: p.nombre, marca: p.marca, categoria: p.categoria,
    sku: p.sku, codigo_barras: p.codigoBarras ?? null,
    descripcion: p.descripcion ?? null, imagen: p.imagen ?? null,
    usd: p.usd, costo: p.costo, precio: p.precio,
    precio_sin_desc: p.precioSinDesc, promo_porc: p.promoPorc ?? 0,
    colores: p.colores, updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from('kargo_productos').upsert(rows);
  if (error) console.error('[db] upsertProductos:', error.message);
}

export async function deleteProducto(id: number): Promise<void> {
  const { error } = await supabase.from('kargo_productos').delete().eq('id', id);
  if (error) console.error('[db] deleteProducto:', error.message);
}

// ─── CONFIG ML ───────────────────────────────────────────────────────────────

export async function getConfig(): Promise<ConfigParams | null> {
  const { data, error } = await supabase
    .from('kargo_config').select('*').eq('id', 1).maybeSingle();
  if (error) { console.error('[db] getConfig:', error.message); return null; }
  if (!data) return null;
  return {
    dolarOficial: data.dolar_oficial, comisionML: data.comision_ml,
    fijoML_15k: data.fijo_ml_15k, fijoML_25k: data.fijo_ml_25k,
    fijoML_33k: data.fijo_ml_33k, envioGratis: data.envio_gratis,
    umbralEnvioGratis: data.umbral_envio_gratis,
  };
}

export async function saveConfig(c: ConfigParams): Promise<void> {
  const { error } = await supabase.from('kargo_config').upsert({
    id: 1, dolar_oficial: c.dolarOficial, comision_ml: c.comisionML,
    fijo_ml_15k: c.fijoML_15k, fijo_ml_25k: c.fijoML_25k,
    fijo_ml_33k: c.fijoML_33k, envio_gratis: c.envioGratis,
    umbral_envio_gratis: c.umbralEnvioGratis,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error('[db] saveConfig:', error.message);
}

// ─── TRANSACCIONES STOCK ─────────────────────────────────────────────────────

export async function getTransacciones(): Promise<TransaccionStock[]> {
  const { data, error } = await supabase
    .from('kargo_transacciones').select('*')
    .order('created_at', { ascending: false });
  if (error) { console.error('[db] getTransacciones:', error.message); return []; }
  return (data || []).map(r => ({
    id: r.id, fecha: r.fecha, productoNombre: r.producto_nombre,
    sku: r.sku, color: r.color, cantidad: r.cantidad,
    destino: r.destino, nota: r.nota,
  }));
}

export async function insertTransaccion(tx: TransaccionStock): Promise<void> {
  const { error } = await supabase.from('kargo_transacciones').insert({
    id: tx.id, fecha: tx.fecha, producto_nombre: tx.productoNombre,
    sku: tx.sku, color: tx.color, cantidad: tx.cantidad,
    destino: tx.destino, nota: tx.nota ?? null, usuario: tx.usuario ?? null,
  });
  if (error) console.error('[db] insertTransaccion:', error.message);
}

// ─── FLEX PEDIDOS ────────────────────────────────────────────────────────────

export interface DiaFlex {
  fecha: string; caba: number; primerCordon: number;
  segundoCordon: number; aTiempo: number; tarde: number;
}

export async function getFlexPedidos(): Promise<DiaFlex[]> {
  const { data, error } = await supabase.from('kargo_flex_pedidos').select('*');
  if (error) { console.error('[db] getFlexPedidos:', error.message); return []; }
  return (data || []).map(r => ({
    fecha: r.fecha, caba: r.caba, primerCordon: r.primer_cordon,
    segundoCordon: r.segundo_cordon, aTiempo: r.a_tiempo, tarde: r.tarde,
  }));
}

export async function upsertFlexDia(d: DiaFlex): Promise<void> {
  const { error } = await supabase.from('kargo_flex_pedidos').upsert({
    fecha: d.fecha, caba: d.caba, primer_cordon: d.primerCordon,
    segundo_cordon: d.segundoCordon, a_tiempo: d.aTiempo, tarde: d.tarde,
  });
  if (error) console.error('[db] upsertFlexDia:', error.message);
}

export async function deleteFlexDia(fecha: string): Promise<void> {
  const { error } = await supabase.from('kargo_flex_pedidos').delete().eq('fecha', fecha);
  if (error) console.error('[db] deleteFlexDia:', error.message);
}

// ─── FLEX CONFIG ─────────────────────────────────────────────────────────────

export interface ConfigFlex {
  costoCaba: number; costoPrimerCordon: number; costoSegundoCordon: number;
  mlCaba: number; mlPrimerCordon: number; mlSegundoCordon: number;
}

export async function getFlexConfig(): Promise<ConfigFlex | null> {
  const { data, error } = await supabase
    .from('kargo_flex_config').select('*').eq('id', 1).maybeSingle();
  if (error) { console.error('[db] getFlexConfig:', error.message); return null; }
  if (!data) return null;
  return {
    costoCaba: data.costo_caba, costoPrimerCordon: data.costo_primer_cordon,
    costoSegundoCordon: data.costo_segundo_cordon, mlCaba: data.ml_caba,
    mlPrimerCordon: data.ml_primer_cordon, mlSegundoCordon: data.ml_segundo_cordon,
  };
}

export async function saveFlexConfig(c: ConfigFlex): Promise<void> {
  const { error } = await supabase.from('kargo_flex_config').upsert({
    id: 1, costo_caba: c.costoCaba, costo_primer_cordon: c.costoPrimerCordon,
    costo_segundo_cordon: c.costoSegundoCordon, ml_caba: c.mlCaba,
    ml_primer_cordon: c.mlPrimerCordon, ml_segundo_cordon: c.mlSegundoCordon,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error('[db] saveFlexConfig:', error.message);
}

// ─── NOTIFICACIONES ──────────────────────────────────────────────────────────

export async function getNotificaciones(): Promise<Notificacion[]> {
  const { data, error } = await supabase
    .from('kargo_notificaciones').select('*')
    .order('created_at', { ascending: false }).limit(50);
  if (error) { console.error('[db] getNotificaciones:', error.message); return []; }
  return (data || []).map(r => ({
    id: r.id, tipo: r.tipo, titulo: r.titulo,
    descripcion: r.descripcion, fecha: r.fecha, leida: r.leida,
  }));
}

export async function insertNotificacion(n: Notificacion): Promise<void> {
  const { error } = await supabase.from('kargo_notificaciones').insert({
    id: n.id, tipo: n.tipo, titulo: n.titulo,
    descripcion: n.descripcion, fecha: n.fecha, leida: n.leida,
  });
  if (error) console.error('[db] insertNotificacion:', error.message);
}

export async function updateNotificacionLeida(id: string): Promise<void> {
  const { error } = await supabase
    .from('kargo_notificaciones').update({ leida: true }).eq('id', id);
  if (error) console.error('[db] updateNotificacionLeida:', error.message);
}

export async function updateTodasLeidas(): Promise<void> {
  const { error } = await supabase
    .from('kargo_notificaciones').update({ leida: true }).eq('leida', false);
  if (error) console.error('[db] updateTodasLeidas:', error.message);
}

// ─── ÓRDENES ML ──────────────────────────────────────────────────────────────

export async function getOrdenesHistorial(): Promise<any[]> {
  const { data, error } = await supabase
    .from('kargo_ordenes_historial').select('data');
  if (error) { console.error('[db] getOrdenesHistorial:', error.message); return []; }
  return (data || []).map(r => r.data);
}

export async function upsertOrdenHistorial(orden: any): Promise<void> {
  const { error } = await supabase.from('kargo_ordenes_historial').upsert({
    order_id: String(orden.id), data: orden,
  });
  if (error) console.error('[db] upsertOrdenHistorial:', error.message);
}

export async function getOrdenesProcesadas(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('kargo_ordenes_procesadas').select('order_id');
  if (error) { console.error('[db] getOrdenesProcesadas:', error.message); return new Set(); }
  return new Set((data || []).map(r => r.order_id));
}

export async function insertOrdenProcesada(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('kargo_ordenes_procesadas').upsert({ order_id: orderId });
  if (error) console.error('[db] insertOrdenProcesada:', error.message);
}

// ─── USUARIO PERFIL ──────────────────────────────────────────────────────────

export interface UsuarioPerfil {
  displayName: string;
  avatar: string | null;
  color: string;
}

export async function getUsuarioPerfil(username: string): Promise<UsuarioPerfil | null> {
  const { data, error } = await supabase
    .from('kargo_usuarios').select('*').eq('username', username).maybeSingle();
  if (error || !data) return null;
  return { displayName: data.display_name, avatar: data.avatar ?? null, color: data.color ?? '#004085' };
}

export async function saveUsuarioPerfil(username: string, perfil: UsuarioPerfil): Promise<void> {
  const { error } = await supabase.from('kargo_usuarios').upsert({
    username, display_name: perfil.displayName, avatar: perfil.avatar, color: perfil.color,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error('[db] saveUsuarioPerfil:', error.message);
}
