// ============================================================
//  TRPG Scenario Editor - Service Worker
//  制作者: 九郎 / ver 1.0.6
// ============================================================

const CACHE_NAME = 'trpg-editor-v1.0.6';

// キャッシュするファイル
const CACHE_FILES = [
  './trpg-scenario-editor.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// ── インストール：キャッシュを作成 ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // フォントなど外部リソースは失敗してもインストールを止めない
      return cache.addAll(CACHE_FILES).catch(() => {
        return Promise.all(
          CACHE_FILES.map(url =>
            cache.add(url).catch(() => {/* 失敗しても続行 */})
          )
        );
      });
    })
  );
  // 新しいSWをすぐにアクティブにする
  self.skipWaiting();
});

// ── アクティベート：古いキャッシュを削除 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => {
      // 新しいSWをすべてのクライアントに即時適用
      return self.clients.claim();
    })
  );
});

// ── フェッチ：キャッシュ優先、なければネットワーク ──
self.addEventListener('fetch', event => {
  // POST等はキャッシュしない
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // キャッシュがあればそれを返しつつ、バックグラウンドで更新を確認
        const fetchPromise = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }).catch(() => {/* オフライン時はそのままキャッシュを使う */});
        return cached;
      }
      // キャッシュがなければネットワークから取得
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(() => {
        // オフラインでもキャッシュがあればそれを返す
        return caches.match('./trpg-scenario-editor.html');
      });
    })
  );
});

// ── メッセージ：手動アップデート確認 ──
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
