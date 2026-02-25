/**
 * ArtLife Service Worker — Offline-First
 * 
 * Caches game assets for offline play.
 * Strategy: Cache-first for assets, network-first for HTML.
 */

const CACHE_NAME = 'artlife-v5'; // Bumped to bust stale MasterCMS bundle (added PageEditor)

// Core assets to pre-cache on install
// Use relative paths so the SW works on any deployment subpath (e.g. GitHub Pages /ArtLife-Game/)
const PRECACHE_ASSETS = [
    './',
    './index.html',
    './icons/icon-192.png',
    './icons/icon-512.png',
];

// Asset extensions to cache on fetch
const CACHEABLE_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.webp', '.woff2', '.woff', '.json'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    // Activate immediately
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            ))
            .then(() => self.clients.claim())
            .then(() => self.clients.matchAll({ type: 'window' }))
            .then((clients) => {
                // Force all open tabs to reload so they get the new JS bundle.
                // This runs in the SW (not the page), so it works even if the
                // old page code doesn't have a controllerchange listener.
                clients.forEach((client) => client.navigate(client.url));
            })
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip cross-origin requests (e.g. Google Fonts CDN — those have their own cache)
    if (url.origin !== self.location.origin) return;

    // HTML pages: network-first (always get latest)
    if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // JS/CSS bundles: network-first (they have content hashes in filenames,
    // so stale cached chunks cause "Failed to fetch dynamically imported module" errors)
    if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Other static assets (images, fonts, JSON): cache-first
    const isCacheable = CACHEABLE_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
    if (isCacheable) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return response;
                });
            })
        );
        return;
    }
});
