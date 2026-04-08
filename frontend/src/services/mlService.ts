import axios from 'axios';
import { supabase } from '../utils/db';

const CLIENT_ID     = process.env.REACT_APP_ML_CLIENT_ID!;
const CLIENT_SECRET = process.env.REACT_APP_ML_CLIENT_SECRET!;

// Redirect URI fijo: usa la env var, nunca la URL dinámica del navegador
function getRedirectUri(): string {
  return process.env.REACT_APP_ML_REDIRECT_URI || 'https://crm-kargo-qvdt.vercel.app/mercadolibre';
}

const TOKEN_KEY = 'ml_token';

// ─── Token storage (localStorage + Supabase) ─────────────

export interface MLToken {
  access_token: string;
  refresh_token: string;
  user_id: number;
  expires_at: number;
}

export function getToken(): MLToken | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function saveToken(data: any): Promise<MLToken> {
  const token: MLToken = {
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    user_id:       data.user_id,
    expires_at:    Date.now() + (data.expires_in - 60) * 1000,
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  // Persistir en Supabase para que sobreviva entre dispositivos
  try {
    await supabase.from('kargo_store').upsert({
      key: TOKEN_KEY,
      value: token,
      updated_at: new Date().toISOString(),
    });
  } catch {}
  return token;
}

export async function loadTokenFromSupabase(): Promise<MLToken | null> {
  try {
    const { data } = await supabase.from('kargo_store')
      .select('value').eq('key', TOKEN_KEY).maybeSingle();
    if (data?.value) {
      localStorage.setItem(TOKEN_KEY, JSON.stringify(data.value));
      return data.value as MLToken;
    }
  } catch {}
  return null;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  supabase.from('kargo_store').delete().eq('key', TOKEN_KEY).then(() => {});
}

export function isConnected(): boolean {
  const t = getToken();
  return !!t && Date.now() < t.expires_at;
}

// ─── PKCE helpers ─────────────────────────────────────────

function generateCodeVerifier(): string {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...Array.from(array)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(digest))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ─── OAuth ────────────────────────────────────────────────

export async function getAuthUrl(): Promise<string> {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  sessionStorage.setItem('ml_code_verifier', verifier);

  const redirectUri = getRedirectUri();
  sessionStorage.setItem('ml_redirect_uri', redirectUri);

  const params = new URLSearchParams({
    response_type:         'code',
    client_id:             CLIENT_ID,
    redirect_uri:          redirectUri,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
  });
  return `https://auth.mercadolibre.com.ar/authorization?${params}`;
}

export async function exchangeCode(code: string): Promise<MLToken> {
  const verifier = sessionStorage.getItem('ml_code_verifier');
  const redirectUri = sessionStorage.getItem('ml_redirect_uri') || getRedirectUri();
  if (!verifier) throw new Error('No se encontró el code_verifier. Intentá conectar de nuevo.');

  const { data } = await axios.post('/api/ml-token', {
    grant_type:    'authorization_code',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri:  redirectUri,
    code_verifier: verifier,
  });
  sessionStorage.removeItem('ml_code_verifier');
  sessionStorage.removeItem('ml_redirect_uri');
  return saveToken(data);
}

export async function refreshAccessToken(): Promise<MLToken> {
  const token = getToken();
  if (!token) throw new Error('No hay token guardado');
  const { data } = await axios.post('/api/ml-token', {
    grant_type:    'refresh_token',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: token.refresh_token,
  });
  return saveToken(data);
}

// ─── API helper ───────────────────────────────────────────

async function getValidToken(): Promise<MLToken> {
  let token = getToken();
  if (!token) {
    token = await loadTokenFromSupabase();
  }
  if (!token) throw new Error('No conectado');
  if (Date.now() >= token.expires_at) {
    token = await refreshAccessToken();
  }
  return token;
}

export async function mlGet(path: string) {
  const token = await getValidToken();
  const { data } = await axios.get(`/ml-api${path}`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  return data;
}

export async function mlPost(path: string, body: any) {
  const token = await getValidToken();
  const { data } = await axios.post(`/ml-api${path}`, body, {
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
  });
  return data;
}

// ─── Endpoints ────────────────────────────────────────────

export async function getMiPerfil() {
  return mlGet('/users/me');
}

/**
 * Carga TODAS las órdenes usando paginación.
 * La API de ML devuelve máximo 50 por llamada.
 * Guarda todo en Supabase para histórico.
 */
export async function getTodasLasOrdenes(): Promise<any[]> {
  const token = await getValidToken();
  const LIMIT = 50;
  let offset = 0;
  let total = Infinity;
  const todas: any[] = [];

  while (offset < total) {
    const data = await mlGet(
      `/orders/search?seller=${token.user_id}&sort=date_desc&limit=${LIMIT}&offset=${offset}`
    );
    const resultados = data.results || [];
    total = data.paging?.total ?? resultados.length;
    todas.push(...resultados);
    if (resultados.length < LIMIT) break;
    offset += LIMIT;
  }

  // Guardar en Supabase para histórico
  if (todas.length > 0) {
    const rows = todas.map(o => ({ order_id: String(o.id), data: o }));
    // upsert en bloques de 100
    for (let i = 0; i < rows.length; i += 100) {
      await supabase.from('kargo_ordenes_historial').upsert(rows.slice(i, i + 100));
    }
  }

  return todas;
}

// Para carga rápida inicial (últimas 50 visibles en pantalla)
export async function getOrdenes(limit = 50, offset = 0) {
  const token = await getValidToken();
  return mlGet(`/orders/search?seller=${token.user_id}&sort=date_desc&limit=${Math.min(limit, 50)}&offset=${offset}`);
}

export async function getMensajes(packId: string) {
  return mlGet(`/messages/packs/${packId}/sellers/${getToken()!.user_id}`);
}

export async function getPreguntas(status = 'UNANSWERED') {
  const token = await getValidToken();
  return mlGet(`/questions/search?seller_id=${token.user_id}&status=${status}&limit=50`);
}

export async function responderPregunta(questionId: number, texto: string) {
  return mlPost(`/answers`, { question_id: questionId, text: texto });
}

export async function getMensajesConversacion(packId: string) {
  const token = await getValidToken();
  return mlGet(`/messages/packs/${packId}/sellers/${token.user_id}?tag=post_sale`);
}

export async function enviarMensaje(packId: string, texto: string) {
  const token = await getValidToken();
  return mlPost(`/messages/packs/${packId}/sellers/${token.user_id}`, {
    from: { user_id: token.user_id },
    to: { user_id: 0 },
    text: texto,
  });
}

// ─── Flex: sincronizar desde ML ───────────────────────────

function clasificarZonaFlex(zip: string): 'caba' | 'primerCordon' | 'segundoCordon' {
  if (!zip) return 'primerCordon';
  const z = zip.trim().toUpperCase();
  // Formato nuevo: C1001ABC = CABA
  if (z.startsWith('C')) return 'caba';
  const num = parseInt(z);
  if (isNaN(num)) return 'primerCordon';
  if (num >= 1001 && num <= 1499) return 'caba';
  if (num >= 1600 && num <= 1779) return 'primerCordon';
  if (num >= 1780 && num <= 1999) return 'segundoCordon';
  return 'primerCordon';
}

function esFlexOrder(orden: any): boolean {
  const tags: string[] = orden.tags || [];
  return (
    tags.includes('d2c') ||
    tags.includes('delivered_by_seller') ||
    tags.some((t: string) => t.toLowerCase().includes('flex'))
  );
}

export interface DiaFlexSync {
  fecha: string;
  caba: number;
  primerCordon: number;
  segundoCordon: number;
  aTiempo: number;
  tarde: number;
}

export async function sincronizarFlexDesdeML(): Promise<DiaFlexSync[]> {
  // 1. Primero sincronizar órdenes recientes desde ML
  await getTodasLasOrdenes();

  // 2. Leer todas las órdenes guardadas en Supabase
  const { data } = await supabase
    .from('kargo_ordenes_historial')
    .select('data');

  const ordenes = (data || []).map((r: any) => r.data);

  // 3. Filtrar sólo órdenes Flex
  const flexOrdenes = ordenes.filter(esFlexOrder);

  // 4. Agrupar por fecha de envío/creación
  const porFecha: Record<string, DiaFlexSync> = {};

  for (const orden of flexOrdenes) {
    // Usar date_closed si existe (orden completada), sino date_created
    const fechaRaw = orden.shipping?.date_shipped || orden.date_closed || orden.date_created;
    if (!fechaRaw) continue;
    const fecha = fechaRaw.slice(0, 10);

    if (!porFecha[fecha]) {
      porFecha[fecha] = { fecha, caba: 0, primerCordon: 0, segundoCordon: 0, aTiempo: 0, tarde: 0 };
    }

    const zip = orden.shipping?.receiver_address?.zip_code || '';
    const zona = clasificarZonaFlex(zip);
    porFecha[fecha][zona]++;

    // Detección básica on-time: si la orden se completó antes de las 9am considera a tiempo
    try {
      const fechaEnvio = new Date(fechaRaw);
      const hora = fechaEnvio.getHours();
      if (hora < 9) porFecha[fecha].aTiempo++;
      else porFecha[fecha].tarde++;
    } catch {}
  }

  return Object.values(porFecha).sort((a, b) => a.fecha.localeCompare(b.fecha));
}
