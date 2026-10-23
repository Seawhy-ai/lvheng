/* 律衡 · Service Worker — 离线缓存 (v18)
   v18: 学生端恢复原有问题卡、情境卡与底部导航设计语言
   v17: 律衡教学智能体的教学设计、学习陪练与学情诊断
   v16: 自主学习并入学生空间，区分私人练习与班级学情
   v15: 教师端、学生端与共享教学管理后端
   v14: 统一问题梳理、情境训练、能力报告与资源中心
   v13: 决赛功能改为主页与学习中心固定入口
   v12: FastGPT 安全代理配置与在线失败自动降级
   v11: 决赛版情境学习、能力报告与教师看板
   v10: law.html 体验升级（AI 回复打字机渐显 / 法条预览 txt 优先 + 进度条 + 分帧渲染）
   v8: 增加 install 预缓存核心资源，主文档 network-first 且断网时回退缓存，真正离线可用
   v9: 预缓存 vendor/ 本地库（marked / highlight / mammoth / 主题 CSS），离线时渲染与文档导入可用 */
var CACHE = "lvheng-v38";

var PRECACHE = [
  "law.html",
  "classroom.html",
  "classroom.css",
  "agent.css",
  "student.css",
  "whale-ui.css",
  "whale-ui.js",
  "whale-modes.css",
  "resource-route.js",
  "classroom.js",
  "task-studio.js",
  "task-studio.css",
  "visual-polish.css",
  "desktop.css",
  "navigation-motion.css",
  "learning-report.css",
  "learning-report.js",
  "experience.css",
  "install-app.js",
  "law-manifest.json",
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
  ,"finals.css"
  ,"finals.js"
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
  // Only cache this site's static assets. Authenticated data must never be
  // stored or replayed across requests, users, or devices.
  var url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.includes("/api/") ||
      url.pathname.endsWith("/health") || req.headers.has("authorization") ||
      req.cache === "no-store") return;

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
