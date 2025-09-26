// Service Worker for Student Dashboard PWA
const CACHE_NAME = 'student-dashboard-v1.0.0';
const STATIC_CACHE_NAME = 'student-dashboard-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'student-dashboard-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_ASSETS = [
  './',
  './student_dashboard.html',
  './login.html',
  './student_dashboard.js',
  './login.js',
  './student.css',
  './Logo2.jpg',
  './favicon.ico',
  './manifest.json',
  // External CDN resources
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css'
];

// API endpoints to cache dynamically
const API_ENDPOINTS = [
  'https://department-mangement-system-97wj.onrender.com/api/auth/login',
  'https://department-mangement-system-97wj.onrender.com/api/auth/profile',
  'https://department-mangement-system-97wj.onrender.com/api/student/assignments',
  'https://department-mangement-system-97wj.onrender.com/api/student/notifications',
  'https://department-mangement-system-97wj.onrender.com/api/student/courses'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting(); // Force activation
      })
      .catch((error) => {
        console.error('Failed to cache static assets:', error);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

// Fetch Strategy: Cache First for static assets, Network First for API calls
self.addEventListener('fetch', (event) => {
  const requestURL = new URL(event.request.url);
  
  // Skip chrome-extension URLs and other unsupported schemes
  if (!['http:', 'https:'].includes(requestURL.protocol)) {
    return; // Let browser handle these requests normally
  }
  
  // Handle API requests
  if (requestURL.origin === 'https://department-mangement-system-97wj.onrender.com') {
    event.respondWith(networkFirstStrategy(event.request));
    return;
  }
  
  // Handle static assets
  if (event.request.method === 'GET') {
    event.respondWith(cacheFirstStrategy(event.request));
    return;
  }
  
  // For other requests, try network first
  event.respondWith(fetch(event.request));
});

// Cache First Strategy - Good for static assets
async function cacheFirstStrategy(request) {
  try {
    // Check if request scheme is supported
    const requestURL = new URL(request.url);
    if (!['http:', 'https:'].includes(requestURL.protocol)) {
      console.log('Skipping unsupported scheme:', requestURL.protocol);
      return fetch(request);
    }

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      try {
        const cache = await caches.open(STATIC_CACHE_NAME);
        await cache.put(request, networkResponse.clone());
      } catch (cacheError) {
        console.warn('Failed to cache response:', cacheError);
        // Continue even if caching fails
      }
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    // Return offline page or fallback
    return new Response('Offline - Please check your connection', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Network First Strategy - Good for API calls
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200 && request.method === 'GET') {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Network request failed, trying cache:', error);
    
    // Try to get from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return error response
    return new Response(JSON.stringify({
      error: 'Network unavailable',
      message: 'Please check your internet connection'
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// Background Sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle any queued actions when back online
      handleBackgroundSync()
    );
  }
});

async function handleBackgroundSync() {
  try {
    // Get any queued actions from IndexedDB or localStorage
    // and execute them when back online
    console.log('Handling background sync...');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: './Logo2.jpg',
      badge: './Logo2.jpg',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'View Details',
          icon: './Logo2.jpg'
        },
        {
          action: 'close',
          title: 'Close',
          icon: './Logo2.jpg'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification('Student Dashboard', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./student_dashboard.html')
    );
  }
});
