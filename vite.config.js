import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin.html')
      }
    }
  },
  plugins: [
    {
      name: 'admin-route-rewrite',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/admin' || req.url === '/admin/') {
            req.url = '/admin.html';
          }
          next();
        });
      }
    },
    {
      name: 'api-routes-dev-middleware',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/')) {
            try {
              // Parse body for JSON POST requests
              if (req.method === 'POST') {
                const buffers = [];
                for await (const chunk of req) {
                  buffers.push(chunk);
                }
                const rawBody = Buffer.concat(buffers).toString();
                try {
                  req.body = JSON.parse(rawBody);
                } catch {
                  req.body = rawBody;
                }
              }

              if (req.url.startsWith('/api/upload')) {
                const handler = (await import('./api/upload.js')).default;
                return handler(req, res);
              }
              if (req.url.startsWith('/api/memories')) {
                const handler = (await import('./api/memories.js')).default;
                return handler(req, res);
              }
              if (req.url.startsWith('/api/drive')) {
                const handler = (await import('./api/drive.js')).default;
                return handler(req, res);
              }
            } catch (err) {
              console.error('API Error in dev server:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
          }
          next();
        });
      }
    }
  ]
});
