/* 律衡 · Service Worker — 离线缓存 (v10)
   v10: law.html 体验升级（AI 回复打字机渐显 / 法条预览 txt 优先 + 进度条 + 分帧渲染）
   v8: 增加 install 预缓存核心资源，主文档 network-first 且断网时回退缓存，真正离线可用
   v9: 预缓存 vendor/ 本地库（marked / highlight / mammoth / 主题 CSS），离线时渲染与文档导入可用 */
var CACHE = "lvheng-v10";

var PRECACHE = [
  "law.html",
  "gate.html",
  "index.html",
  "app-icon.jpg",
  "apple-touch-icon.png",
  "apple-touch-icon-152.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "vendor/marked.min.js",
  "vendor/highlight.min.js",
  "vendor/mammoth.browser.min.js",
  "vendor/atom-one-light.min.css",
  "vendor/atom-one-dark.min.css"
];

self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(PRECACHE);
    }).then(function() { self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener("fetch", function(e) {
  var req = e.request;
  if (req.method !== "GET") return;

  /* 主文档 & html：network-first，断网回退缓存（保证离线可用） */
  if (req.destination === "document" || req.url.match(/\.html$/) || req.url.match(/\/lvheng\/?$/)) {
    e.respondWith(
      fetch(req).then(function(resp) {
        if (resp && resp.ok) {
          var clone = resp.clone();
          caches.open(CACHE).then(function(c) { c.put(req, clone); });
        }
        return resp;
      }).catch(function() {
        return caches.match(req).then(function(r) {
          if (r) return r;
          return caches.match("law.html");
        });
      })
    );
    return;
  }

  /* 其余 GET：stale-while-revalidate */
  e.respondWith(
    caches.match(req).then(function(r) {
      var network = fetch(req).then(function(resp) {
        if (resp && resp.ok) {
          var clone = resp.clone();
          caches.open(CACHE).then(function(c) { c.put(req, clone); });
        }
        return resp;
      }).catch(function() { return r; });
      return r || network;
    })
  );
});