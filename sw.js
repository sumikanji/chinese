/*! © 2026 Sumi — service worker: mở nhanh, dùng được khi mạng yếu */
const V = 'sumi-zh-v5';
const CORE = ["./", "index.html", "style.css", "manifest.webmanifest", "icon-192.png", "pwa.js", "data/levels.js", "data/hsk1.js", "data/hsk2.js", "data/hsk3.js", "data/hsk4.js", "data/hsk5.js", "data/hsk6.js", "data/stats.js", "data/py.js", "data/shadow.js", "data/audio.js", "icons.js", "avatars.js", "hiyo.js", "speech.js", "store.js", "firebase-config.js", "cloud.js", "extra.js", "data/dict-zh.js", "dict.js", "community.js", "shadow.js", "app.js"];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).catch(() => { }).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('sumi-zh-') && k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  // Chỉ xử lý file của chính trang; âm thanh mp3 để trình duyệt tự tải (tránh lỗi tua audio)
  if (r.method !== 'GET' || u.origin !== location.origin || /\.mp3$/i.test(u.pathname) || r.headers.has('range')) return;
  // Mạng trước (luôn thấy bản mới nhất), mất mạng thì dùng bản đã lưu
  e.respondWith(fetch(r).then(res => {
    if (res.ok && res.type === 'basic') { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('./') : Response.error()))));
});
