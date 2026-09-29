/* =====================================================================
   네이버 화면 - 서비스워커
   · 앱으로 설치할 수 있게 해주고, 인터넷이 끊겨도 실행되게 한다.
   · index.html 과 seed.js 는 항상 '서버 우선'으로 가져오므로
     GitHub 에 새 파일을 올리면 앱을 다시 열 때 자동으로 최신 버전이 된다.
   · 아이콘/기타 파일까지 완전히 새로 받고 싶으면 아래 CACHE 날짜를 바꾼다.
===================================================================== */
const CACHE = 'naver-mock-2026-09-29';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(SHELL))
      .catch(()=>{})                 /* 파일 하나가 없어도 설치는 계속 */
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;

  let url;
  try{ url = new URL(req.url); }catch(_){ return; }
  if(url.origin !== location.origin) return;              /* 외부 주소는 그대로 통과 */

  const p = url.pathname;
  const fresh = req.mode === 'navigate' || p.endsWith('/') || p.endsWith('index.html') || p.endsWith('seed.js');

  if(fresh){
    /* 화면과 데이터 : 서버 우선 → 실패하면 캐시 (오프라인) */
    e.respondWith(
      fetch(req)
        .then(res=>{
          const copy = res.clone();
          caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{});
          return res;
        })
        .catch(()=>caches.match(req).then(r=>r || caches.match('./index.html')))
    );
    return;
  }

  /* 아이콘 등 : 캐시 우선 → 없으면 받아서 저장 */
  e.respondWith(
    caches.match(req).then(r=>r || fetch(req).then(res=>{
      const copy = res.clone();
      caches.open(CACHE).then(c=>c.put(req, copy)).catch(()=>{});
      return res;
    }))
  );
});
