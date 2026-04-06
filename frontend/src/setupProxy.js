const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/ml-api',
    createProxyMiddleware({
      target: 'https://api.mercadolibre.com',
      changeOrigin: true,
      pathRewrite: { '^/ml-api': '' },
    })
  );
};
