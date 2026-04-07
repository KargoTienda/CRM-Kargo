export type Categoria = 'Bolso' | 'Mochila' | 'Morral' | 'Pechera' | 'Riñonera' | 'Billetera' | 'Porta-celu' | 'Otro';

export interface ColorVariante {
  color: string;
  stockDeposito: number;
  stockSede: number;
  hex?: string;
  sku?: string;
}

export interface TransaccionStock {
  id: string;
  fecha: string;
  productoNombre: string;
  sku: string;
  color: string;
  cantidad: number;
  destino: 'sede' | 'afuera' | 'venta_ml';
  nota?: string;
  usuario?: string;
}

export interface Producto {
  id: number;
  nombre: string;
  marca: string;
  categoria: Categoria;
  sku: string;
  codigoBarras?: string;
  descripcion?: string;
  imagen?: string; // base64

  usd: number;              // costo en USD
  costo: number;            // usd × dólar oficial (auto)
  precio: number;           // precio REAL de venta (con descuento aplicado)
  precioSinDesc: number;    // precio inflado (tachado en ML)
  promoPorc: number;        // % descuento (0.05 = 5%)

  colores: ColorVariante[];
}

export interface ConfigParams {
  dolarOficial: number;
  comisionML: number;         // % comisión ML (0.18 = 18%)
  fijoML_15k: number;
  fijoML_25k: number;
  fijoML_33k: number;
  envioGratis: number;        // costo estimado envío gratis
  umbralEnvioGratis: number;  // precio mínimo para que se descuente envío gratis
}

export const CONFIG_DEFAULT: ConfigParams = {
  dolarOficial: 1335,
  comisionML: 0.18,
  fijoML_15k: 1095,
  fijoML_25k: 2190,
  fijoML_33k: 2628,
  envioGratis: 6000,
  umbralEnvioGratis: 33000,  // ML cobra envío gratis a partir de $33k
};

export const CATEGORIAS: Categoria[] = [
  'Bolso', 'Mochila', 'Morral', 'Pechera', 'Riñonera', 'Billetera', 'Porta-celu', 'Otro'
];

export const CATEGORIA_EMOJI: Record<Categoria, string> = {
  Bolso: '👜', Mochila: '🎒', Morral: '🧳', Pechera: '🦺',
  Riñonera: '👝', Billetera: '💳', 'Porta-celu': '📱', Otro: '📦',
};

// ─── Funciones de cálculo ────────────────────────────────

export function calcFijoML(precio: number, config: ConfigParams): number {
  if (precio <= 15000) return config.fijoML_15k;
  if (precio <= 25000) return config.fijoML_25k;
  return config.fijoML_33k;
}

export function calcComisionML(precio: number, config: ConfigParams): number {
  return Math.round(precio * config.comisionML);
}

/** Plata que llega (sin descontar costos — eso es del dashboard) */
export function calcPlataqueLlega(precio: number, config: ConfigParams): number {
  const comision = calcComisionML(precio, config);
  const fijo = calcFijoML(precio, config);
  const envio = precio >= config.umbralEnvioGratis ? config.envioGratis : 0;
  return precio - comision - fijo - envio;
}

/** Ganancia bruta = plata que llega - costo */
export function calcGanBruta(producto: Producto, config: ConfigParams): number {
  return calcPlataqueLlega(producto.precio, config) - producto.costo;
}

export function calcMargen(ganBruta: number, precio: number): number {
  if (precio === 0) return 0;
  return Math.round((ganBruta / precio) * 100 * 10) / 10;
}

export function calcStockTotal(producto: Producto): number {
  return producto.colores.reduce((s, c) => s + (c.stockDeposito || 0) + (c.stockSede || 0), 0);
}

export function calcStockSede(producto: Producto): number {
  return producto.colores.reduce((s, c) => s + (c.stockSede || 0), 0);
}

export function calcCosto(usd: number, config: ConfigParams): number {
  return Math.round(usd * config.dolarOficial);
}
