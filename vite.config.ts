import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.png',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'Diariamente - Diario & Riflessione',
          short_name: 'Diariamente',
          description: 'Diario personale quotidiano per riflessione, gratitudine e tracking del focus',
          theme_color: '#050508',
          background_color: '#050508',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({ request }) =>
                request.destination === 'style' ||
                request.destination === 'script' ||
                request.destination === 'worker',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-assets-cache',
              },
            },
            {
              urlPattern: ({ request }) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
      {
        name: 'suppress-vite-hmr-noise',
        transformIndexHtml() {
          return [
            {
              tag: 'script',
              injectTo: 'head-prepend',
              children: `
(function() {
  if (typeof window === 'undefined') return;

  if (window.WebSocket) {
    var NativeWebSocket = window.WebSocket;
    window.WebSocket = function(url, protocols) {
      var urlStr = String(url || '');
      var isViteHmr =
        protocols === 'vite-hmr' ||
        (Array.isArray(protocols) && protocols.indexOf('vite-hmr') !== -1) ||
        urlStr.indexOf('vite-hmr') !== -1;
      if (isViteHmr) {
        var noop = function() {};
        var listeners = {};
        var dummySocket = {
          readyState: 1,
          url: urlStr,
          protocol: 'vite-hmr',
          send: noop,
          close: noop,
          addEventListener: function(event, fn) {
            listeners[event] = listeners[event] || [];
            listeners[event].push(fn);
            if (event === 'open') {
              setTimeout(fn, 10);
            }
          },
          removeEventListener: function(event, fn) {
            if (listeners[event]) {
              listeners[event] = listeners[event].filter(function(cb) { return cb !== fn; });
            }
          },
          dispatchEvent: function() { return false; },
          onopen: null,
          onclose: null,
          onerror: null,
          onmessage: null,
        };
        setTimeout(function() {
          if (typeof dummySocket.onopen === 'function') dummySocket.onopen();
        }, 10);
        return dummySocket;
      }
      return new NativeWebSocket(url, protocols);
    };
    window.WebSocket.prototype = NativeWebSocket.prototype;
  }

  var filterVite = function(args) {
    if (!args || !args.length) return false;
    for (var i = 0; i < args.length; i++) {
      var item = args[i];
      var text = '';
      try {
        if (typeof item === 'string') {
          text = item;
        } else if (item && typeof item === 'object') {
          text = (item.message || '') + ' ' + (item.stack || '') + ' ' + (item.type || '') + ' ' + String(item);
        } else {
          text = String(item || '');
        }
      } catch (e) {
        text = '';
      }
      if (
        text.indexOf('[vite]') !== -1 ||
        text.indexOf('vite-hmr') !== -1 ||
        text.indexOf('WebSocket') !== -1 ||
        text.indexOf('closed without opened') !== -1 ||
        text.indexOf('connecting...') !== -1
      ) {
        return true;
      }
    }
    return false;
  };

  var origErr = console.error;
  console.error = function() { if (!filterVite(arguments)) origErr.apply(console, arguments); };
  var origWarn = console.warn;
  console.warn = function() { if (!filterVite(arguments)) origWarn.apply(console, arguments); };
  var origLog = console.log;
  console.log = function() { if (!filterVite(arguments)) origLog.apply(console, arguments); };
  var origInfo = console.info;
  console.info = function() { if (!filterVite(arguments)) origInfo.apply(console, arguments); };
  var origDebug = console.debug;
  console.debug = function() { if (!filterVite(arguments)) origDebug.apply(console, arguments); };
})();
              `,
            },
          ];
        },
      },
    ],
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-dom/client', 'motion/react', 'lucide-react'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      hmr: false,
      ws: false,
    },
  };
});