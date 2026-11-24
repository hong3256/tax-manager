/* 세금신고(강사 지급·원천세) — 서비스 워커
   - index.html 은 network-first: 열 때마다 새 판을 먼저 받고, 인터넷이 없으면 캐시로 연다.
   - SheetJS(xlsx.full.min.js)·아이콘·매니페스트는 캐시 우선(stale-while-revalidate).
   - 입력한 자료는 서비스 워커가 아니라 브라우저 localStorage 에만 있다.
*/
var CACHE = 'tax-manager-v3';
var SHELL = new URL('./index.html', self.location.href).href;
var CORE = [
  './',
  './index.html',
  './manifest.json',
  './xlsx.full.min.js',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './favicon.ico'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(CORE).catch(function () {
        return Promise.all(CORE.map(function (url) { return cache.add(url).catch(function () { }); }));
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   /* 구글 시트 연동 요청은 건드리지 않는다 */

  var isShell = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
  if (isShell) {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) { return hit || caches.match(SHELL); });
      })
    );
    return;
  }
  event.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
