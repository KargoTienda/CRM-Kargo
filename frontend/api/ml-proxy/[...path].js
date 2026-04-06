/**
 * Vercel serverless function: proxy para MercadoLibre API.
 * En desarrollo local, setupProxy.js maneja /ml-api/* directamente.
 * En producción (Vercel), vercel.json redirige /ml-api/* a esta función.
 */
export default async function handler(req, res) {
  const { path: pathParts, ...queryParams } = req.query;

  const pathStr = Array.isArray(pathParts) ? pathParts.join('/') : (pathParts || '');
  const queryStr = new URLSearchParams(queryParams).toString();
  const url = `https://api.mercadolibre.com/${pathStr}${queryStr ? `?${queryStr}` : ''}`;

  const fetchOptions = {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
  };

  if (req.headers.authorization) {
    fetchOptions.headers.Authorization = req.headers.authorization;
  }

  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    fetchOptions.body = JSON.stringify(req.body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy error', message: error.message });
  }
}
