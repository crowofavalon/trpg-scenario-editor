// ============================================================
//  LogosWeaver - Service Worker
//  バージョン: 1.0.7
//  制作者: 九郎
// ============================================================

const CACHE_NAME = 'logosweaver-v1.0.7';

// キャッシュ対象ファイル
const CACHE_FILES = [
  './LogosWeaver_full.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=JetBrains+Mono:wght@400;500&display=swap',
];

// ── インストール：キャッシュを事前に積む ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_FILES).catch(err => {
        // フォントなど外部リソースの失敗は無視してインストール続行
        console.warn('[LogosWeaver SW] キャッシュ追加の一部失敗（続行）:', err);
      });
    })
  );
  // 新しいSWをすぐにアクティブにする（skipWaitingメッセージでも起動）
  self.skipWaiting();
});

// ── アクティベート：古いキャッシュを削除 ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[LogosWeaver SW] 古いキャッシュを削除:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── フェッチ：キャッシュ優先、なければネットワーク ──
self.addEventListener('fetch', event => {
  // POST等はキャッシュしない
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          // 有効なレスポンスのみキャッシュに追加
          if (
            response &&
            response.status === 200 &&
            response.type !== 'opaque'
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // オフライン時にHTMLへのリクエストはメインページを返す
          if (event.request.destination === 'document') {
            return caches.match('./LogosWeaver_full.html');
          }
        });
    })
  );
});

// ── メッセージ受信：skipWaiting（更新通知からの即時更新） ──
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
