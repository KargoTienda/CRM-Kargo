import axios from 'axios';

const CLIENT_ID     = process.env.REACT_APP_ML_CLIENT_ID!;
const CLIENT_SECRET = process.env.REACT_APP_ML_CLIENT_SECRET!;
const REDIRECT_URI  = process.env.REACT_APP_ML_REDIRECT_URI!;

const TOKEN_KEY = 'ml_token';

// ─── Token storage ────────────────────────────────────────

export interface MLToken {
  access_token: string;
  refresh_token: string;
  user_id: number;
  expires_at: number; // timestamp ms
}

export function getToken(): MLToken | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function saveToken(data: any): MLToken {
  const token: MLToken = {
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
    user_id:       data.user_id,
    expires_at:    Date.now() + (data.expires_in - 60) * 1000,
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  return token;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
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

  const params = new URLSearchParams({
    response_type:          'code',
    client_id:              CLIENT_ID,
    redirect_uri:           REDIRECT_URI,
    scope:                  'read write offline_access',
    code_challenge:         challenge,
    code_challenge_method:  'S256',
  });
  return `https://auth.mercadolibre.com.ar/authorization?${params}`;
}

export async function exchangeCode(code: string): Promise<MLToken> {
  const verifier = sessionStorage.getItem('ml_code_verifier');
  if (!verifier) throw new Error('No se encontró el code_verifier. Intentá conectar de nuevo desde el botón.');

  const { data } = await axios.post('/ml-api/oauth/token', {
    grant_type:    'authorization_code',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri:  REDIRECT_URI,
    code_verifier: verifier,
  });
  sessionStorage.removeItem('ml_code_verifier');
  return saveToken(data);
}

export async function refreshAccessToken(): Promise<MLToken> {
  const token = getToken();
  if (!token) throw new Error('No hay token guardado');
  const { data } = await axios.post('/ml-api/oauth/token', {
    grant_type:    'refresh_token',
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: token.refresh_token,
  });
  return saveToken(data);
}

// ─── API helper ───────────────────────────────────────────

export async function mlGet(path: string) {
  let token = getToken();
  if (!token) throw new Error('No conectado');
  if (Date.now() >= token.expires_at) {
    token = await refreshAccessToken();
  }
  const { data } = await axios.get(`/ml-api${path}`, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  return data;
}

export async function mlPost(path: string, body: any) {
  let token = getToken();
  if (!token) throw new Error('No conectado');
  if (Date.now() >= token.expires_at) token = await refreshAccessToken();
  const { data } = await axios.post(`/ml-api${path}`, body, {
    headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
  });
  return data;
}

// ─── Endpoints ────────────────────────────────────────────

export async function getMiPerfil() {
  return mlGet('/users/me');
}

export async function getOrdenes(limit = 50, offset = 0) {
  const token = getToken();
  if (!token) throw new Error('No conectado');
  return mlGet(`/orders/search?seller=${token.user_id}&sort=date_desc&limit=${Math.min(limit, 50)}&offset=${offset}`);
}

export async function getMensajes(packId: string) {
  return mlGet(`/messages/packs/${packId}/sellers/${getToken()!.user_id}`);
}

export async function getPreguntas(status = 'UNANSWERED') {
  const token = getToken();
  if (!token) throw new Error('No conectado');
  return mlGet(`/questions/search?seller_id=${token.user_id}&status=${status}&limit=50`);
}

export async function responderPregunta(questionId: number, texto: string) {
  return mlPost(`/answers`, { question_id: questionId, text: texto });
}

export async function getMensajesConversacion(packId: string) {
  const token = getToken();
  if (!token) throw new Error('No conectado');
  return mlGet(`/messages/packs/${packId}/sellers/${token.user_id}?tag=post_sale`);
}

export async function enviarMensaje(packId: string, texto: string) {
  const token = getToken();
  if (!token) throw new Error('No conectado');
  return mlPost(`/messages/packs/${packId}/sellers/${token.user_id}`, {
    from: { user_id: token.user_id },
    to: { user_id: 0 },
    text: texto,
  });
}
