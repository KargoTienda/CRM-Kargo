/**
 * Proxy para la API de MercadoLibre.
 * Llamado directamente: GET /api/ml-proxy?path=/users/me&seller=123...
 * El parámetro 'path' es el endpoint de ML, el resto son query params adicionales.
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { path, ...extraParams } = req.query;
  if (!path) { res.status(400).json({ error: 'Missing path param' }); return; }

  // Construir URL de ML con params adicionales
  const qs = Object.keys(extraParams).length
    ? '?' + new URLSearchParams(extraParams).toString()
    : '';
  const mlUrl = `https://api.mercadolibre.com${path}${qs}`;

  const headers = {};
  if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;
  if (req.method !== 'GET') headers['Content-Type'] = 'application/json';

  const options = { method: req.method, headers };
  if (req.method !== 'GET' && req.body) {
    options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  try {
    const response = await fetch(mlUrl, options);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { error: text }; }
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Proxy error', detail: err.message });
  }
};
