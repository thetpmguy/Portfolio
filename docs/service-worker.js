// Service Worker for Portfolio Site Caching
// Cache version - increment this to force cache refresh
const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `portfolio-cache-${CACHE_VERSION}`;

// Get the base path (handles GitHub Pages subdirectory scenarios)
const getBasePath = () => {
    return self.location.pathname.replace(/\/service-worker\.js$/, '');
};

// Assets to cache immediately on install
const getStaticAssets = () => {
    const basePath = getBasePath();
    return [
        basePath || '/',
        `${basePath}/index.html`.replace('//', '/'),
        `${basePath}/styles.css`.replace('//', '/'),
        `${basePath}/script.js`.replace('//', '/'),
        `${basePath}/about.md`.replace('//', '/'),
        `${basePath}/mywork.md`.replace('//', '/'),
        `${basePath}/resume.md`.replace('//', '/'),
        `${basePath}/education.md`.replace('//', '/'),
        `${basePath}/assets/logo.png`.replace('//', '/'),
        `${basePath}/assets/profile.jpg`.replace('//', '/'),
        `${basePath}/assets/workcard 1.jpg`.replace('//', '/'),
        `${basePath}/assets/workcard 2.jpg`.replace('//', '/'),
        `${basePath}/assets/workcard 3.jpg`.replace('//', '/'),
        `${basePath}/assets/workcard 4.jpg`.replace('//', '/'),
        `${basePath}/assets/workcard 5.jpg`.replace('//', '/'),
        `${basePath}/assets/workcard 6.jpg`.replace('//', '/'),
        `${basePath}/assets/favicon.ico`.replace('//', '/'),
        // External fonts (optional - can be cached or loaded from CDN)
        'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap'
    ];
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...', CACHE_NAME);
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching static assets');
                const assets = getStaticAssets();
                return cache.addAll(assets.map(url => new Request(url, { cache: 'reload' })))
                    .catch((error) => {
                        console.warn('[Service Worker] Some assets failed to cache:', error);
                        // Continue even if some assets fail
                        return Promise.resolve();
                    });
            })
            .then(() => {
                // Force the waiting service worker to become active
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            // Delete old caches that don't match current version
                            return cacheName.startsWith('portfolio-cache-') && 
                                   cacheName !== CACHE_NAME;
                        })
                        .map((cacheName) => {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                // Take control of all pages immediately
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip cross-origin requests (except fonts which we want to cache)
    if (url.origin !== self.location.origin && 
        !url.href.includes('fonts.googleapis.com') &&
        !url.href.includes('fonts.gstatic.com')) {
        return;
    }
    
    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                // For HTML and markdown files, try network first for freshness
                if (request.destination === 'document' || 
                    url.pathname.endsWith('.md')) {
                    return networkFirstStrategy(request, cachedResponse);
                }
                
                // For static assets (images, CSS, JS), use cache first
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // If not in cache, fetch from network
                return fetch(request)
                    .then((response) => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response (streams can only be consumed once)
                        const responseToCache = response.clone();
                        
                        // Add to cache for future use
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(request, responseToCache);
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // If network fails and we have a cached version, return it
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Otherwise return offline page or error
                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: new Headers({ 'Content-Type': 'text/plain' })
                        });
                    });
            })
    );
});

// Network first strategy for HTML/Markdown (check network, fallback to cache)
function networkFirstStrategy(request, cachedResponse) {
    return fetch(request)
        .then((networkResponse) => {
            // If network response is successful, update cache and return
            if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(request, responseToCache);
                    });
                return networkResponse;
            }
            // If network fails, return cached version
            return cachedResponse || networkResponse;
        })
        .catch(() => {
            // Network failed, return cached version or offline page
            if (cachedResponse) {
                return cachedResponse;
            }
            // Return a simple offline HTML response
            return new Response(
                '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>You are offline</h1><p>Please check your internet connection and try again.</p></body></html>',
                {
                    headers: { 'Content-Type': 'text/html' }
                }
            );
        });
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.delete(CACHE_NAME)
                .then(() => {
                    return self.clients.matchAll();
                })
                .then((clients) => {
                    clients.forEach((client) => {
                        client.postMessage({ type: 'CACHE_CLEARED' });
                    });
                })
        );
    }
});
