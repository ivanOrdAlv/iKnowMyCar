/**
 * iKnowMyCar Service Worker
 * 
 * Estrategia de caché:
 * - Archivos estáticos (HTML, CSS, JS, iconos): Cache First
 * - CDNs externos (Chart.js, Leaflet): Network First con fallback a caché
 * - Peticiones BLE/API: Network Only (no cachear datos en vivo)
 */

const CACHE_NAME = 'iknowmycar-v1.3.0';
const STATIC_CACHE = 'iknowmycar-static-v1';
const CDN_CACHE = 'iknowmycar-cdn-v1';

// Archivos locales a cachear en la instalación
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/performance.css',
  '/css/hud.css',
  '/js/obd-parser.js',
  '/js/obd-manager.js',
  '/js/fuel-estimator.js',
  '/js/event-detector.js',
  '/js/dtc-data.js',
  '/js/trip-storage.js',
  '/js/location-tracker.js',
  '/js/settings-manager.js',
  '/js/vehicle-profile.js',
  '/js/maintenance.js',
  '/js/dashboard.js',
  '/js/route.js',
  '/js/racing.js',
  '/js/history.js',
  '/js/dtc.js',
  '/js/vehicle-view.js',
  '/js/settings.js',
  '/js/performance-storage.js',
  '/js/performance-view.js',
  '/js/hud-view.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-192x192.png',
  '/icons/icon-maskable-512x512.png',
];

// CDNs externas a cachear
const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js',
];

// ================================================================
//  INSTALL - Cachear archivos estáticos
// ================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('[SW] Cache error:', err);
      })
  );
});

// ================================================================
//  ACTIVATE - Limpiar caches antiguas
// ================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== CDN_CACHE && (key.startsWith('iknowmycar') || key.startsWith('telemdrive')))
            .map((key) => {
              console.log('[SW] Deleting old cache:', key);
              return caches.delete(key);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activated');
        return self.clients.claim();
      })
  );
});

// ================================================================
//  FETCH - Estrategia de caché
// ================================================================

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // No cachear peticiones Bluetooth ni POST
  if (event.request.method !== 'GET') return;

  // Archivos locales: Cache First
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(event.request, STATIC_CACHE));
    return;
  }

  // CDNs: Network First con fallback a caché
  if (isCDN(url)) {
    event.respondWith(networkFirst(event.request, CDN_CACHE));
    return;
  }

  // Otros: Network Only
  // (No interferir con peticiones a APIs externas, BLE, etc.)
});

/**
 * Cache First: intenta servir desde caché, si no existe va a la red y cachea.
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Si no hay red ni caché, devolver página offline para HTML
    if (request.destination === 'document') {
      return caches.match('/index.html');
    }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

/**
 * Network First: intenta la red, si falla usa caché.
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

function isCDN(url) {
  return url.hostname.includes('jsdelivr.net') ||
         url.hostname.includes('unpkg.com') ||
         url.hostname.includes('cdnjs.cloudflare.com');
}

// ================================================================
//  MENSAJES desde la app
// ================================================================

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data === 'clearCache') {
    caches.keys().then(keys => {
      keys.forEach(key => caches.delete(key));
    });
  }
});
