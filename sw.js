const CACHE_NAME = 'punch-kun-v20260324';
const urlsToCache = [
  'index.html?v=20260324',
  'manifest.json?v=20260324',
  'icon-192.png',
  'icon-512.png'
];

// インストール
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// アクティベート：古いキャッシュをすべて削除
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keyList => {
      return Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Now controlling clients');
      return self.clients.claim();
    })
  );
});

// フェッチ：幅広いリソースに対応
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 画像リクエスト
  if (url.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) return response;
        return fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return networkResponse;
        }).catch(() => {
          // フォールバック画像（シンプルなSVG）
          return new Response(
            `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <rect width="100%" height="100%" fill="#1e1e2f"/>
              <text x="50%" y="50%" font-family="system-ui" font-size="20" fill="#ffb347" text-anchor="middle">🐵🧸</text>
            </svg>`,
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        });
      })
    );
    return;
  }

  // HTML / CSS / JS / その他
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) return response;
      return fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    }).catch(() => {
      // オフライン時にHTMLフォールバック
      if (event.request.headers.get('accept')?.includes('text/html')) {
        return caches.match('/index.html?v=20260324');
      }
      return new Response('Offline', { status: 503 });
    })
  );
});