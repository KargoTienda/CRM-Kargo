/**
 * Vercel serverless proxy para MercadoLibre API.
 * Todas las llamadas a /ml-api/* se redirigen acá via vercel.json.
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { path, ...queryParams } = req.query;
  const pathStr = Array.isArray(path) ? path.join('/') : (path || '');
  const qs = Object.keys(queryParams).length
    ? '?' + new URLSearchParams(queryParams).toString()
    : '';

  const mlUrl = `https://api.mercadolibre.com/${pathStr}${qs}`;

  const headers = { 'Content-Type': 'application/json' };
  if (req.headers.authorization) headers['Authorization'] = req.headers.authorization;

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
