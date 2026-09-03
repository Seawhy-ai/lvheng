var CACHE = "lvheng-v4";
self.addEventListener("install", function(e) { self.skipWaiting(); });
self.addEventListener("activate", function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});
self.addEventListener("fetch", function(e) {
  if (e.request.destination === "document" || e.request.url.match(/\.html$/) || e.request.url.match(/\/lvheng\/?$/)) {
    e.respondWith(fetch(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(r) {
      // stale-while-revalidate: 立即返回缓存，同时后台拉取新版本更新缓存
      var network = fetch(e.request).then(function(resp) {
        if (resp.ok) { var clone = resp.clone(); caches.open(CACHE).then(function(c) { c.put(e.request, clone); }); }
        return resp;
      }).catch(function() { return r; });
      return r || network;
    })
  );
});