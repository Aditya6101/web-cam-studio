import { defineConfig, type Plugin } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
import fs from 'fs';

function serveOrtMiddleware(): Plugin {
  return {
    name: 'serve-ort-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && req.url.startsWith('/ort/')) {
          const cleanUrl = req.url.split('?')[0];
          const filename = path.basename(cleanUrl);
          const filePath = path.resolve(import.meta.dirname, 'node_modules/onnxruntime-web/dist', filename);
          if (fs.existsSync(filePath)) {
            if (filename.endsWith('.wasm')) {
              res.setHeader('Content-Type', 'application/wasm');
            } else if (filename.endsWith('.mjs') || filename.endsWith('.js')) {
              res.setHeader('Content-Type', 'application/javascript');
            }
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
            res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
            res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const isHttps = mode === 'https' || process.env.HTTPS === 'true';

  return {
    plugins: [
      serveOrtMiddleware(),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/onnxruntime-web/dist/ort-wasm*',
            dest: 'ort',
            rename: { stripBase: true }
          }
        ]
      }),
      ...(isHttps ? [basicSsl()] : [])
    ],
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      }
    },
    preview: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
        'Cross-Origin-Resource-Policy': 'cross-origin'
      }
    }
  };
});
