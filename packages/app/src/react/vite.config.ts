import react from '@vitejs/plugin-react-swc';
import expandEnv from 'dotenv-expand';
import dotenvFlow from 'dotenv-flow';
import path from 'path';
import { defineConfig } from 'vite';

expandEnv.expand(
  dotenvFlow.config({
    files: ['../../.env', '../../../../.env'],
  }),
);

// https://vite.dev/config/

const proxyRoutes = ['/api', '/app', '/js', '/css', '/metroui', '/img', '/assets', '/oauth'];
const redirectRoutes = ['/builder', '/logs', '/logto'];

// Helper function to check if request should be proxied
const shouldProxy = (pathname: string): boolean => {
  // Don't proxy requests for files with extensions (module resolution)
  // Handle both /file.tsx and /file.tsx?query=params
  if (pathname.match(/\.(tsx|jsx)(\?.*)?$/i)) {
    return false;
  }

  // Don't proxy requests that look like TypeScript imports (contain @ symbols)
  if (pathname.includes('@')) {
    return false;
  }

  // Only proxy if it starts with one of our proxy routes
  return proxyRoutes.some((route) => pathname.startsWith(route));
};

const EXPRESS_SERVER_PORT = parseInt(process.env.APP_PORT || process.env.PORT || '4000', 10);

export default defineConfig({
  server: {
    // port: EXPRESS_SERVER_PORT + 2,
    port: +process.env.APP_DEV_SERVER_PORT || EXPRESS_SERVER_PORT + 1,
    proxy: Object.fromEntries(
      proxyRoutes.map((route) => [
        route,
        {
          target: `http://localhost:${EXPRESS_SERVER_PORT}`,
          changeOrigin: true,
          secure: false,
          // Add bypass function to filter out module resolution requests
          bypass: (req, res, options) => {
            const pathname = req.url || '';
            if (!shouldProxy(pathname)) {
              return pathname; // Let Vite handle it
            }
            return null; // Proxy to backend
          },
        },
      ]),
    ),
  },
  plugins: [react(), redirectPlugin()],
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, '../'),
      '@react': path.resolve(__dirname, '../react'),
      '@legacy_react': path.resolve(__dirname, '../webapp'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  publicDir: path.resolve(__dirname, '../../static'),
  build: {
    target: 'esnext',
    outDir: 'dist/assets',
    emptyOutDir: true,
    sourcemap: true,
    manifest: true,

    rollupOptions: {
      input: 'index.tsx',
      output: {
        format: 'esm',
        entryFileNames: 'app.bundle.dev.js',
        chunkFileNames: '[name]-[hash].dev.js',
        assetFileNames: '[name]-[hash][extname]',
      },
    },
  },
});

function redirectPlugin() {
  return {
    name: 'vite-plugin-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // if the path is in the redirectRoutes, redirect to express server
        const isRedirect = redirectRoutes.some((route) => req.url?.startsWith(route));
        if (isRedirect) {
          res.writeHead(302, { Location: `http://localhost:${EXPRESS_SERVER_PORT}${req.url}` });
          res.end();
        } else {
          next();
        }
      });
    },
  };
}
