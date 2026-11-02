// Service worker do Reembolso. Cacheia SOMENTE a casca (HTML, manifest, ícones).
// Dado clínico nunca passa por aqui: qualquer requisição que não seja da própria
// origem (a API do Apps Script) vai direto à rede, sem cache, e POST nunca é interceptado.
var VERSAO = 'reemb-casca-v3';
var CASCA = ['./', 'index.html', 'validacao.js', 'dominio.js', 'painel.js', 'ciclo.js', 'profissionais.js', 'documentos.js', 'manifest.webmanifest', 'icone.svg', 'icone-192.png', 'icone-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSAO).then(function (c) { return c.addAll(CASCA); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSAO; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return;
  // rede primeiro: a casca nova entra assim que existir; o cache só cobre estar offline
  e.respondWith(fetch(r).then(function (res) {
    if (res && res.ok) { var cp = res.clone(); caches.open(VERSAO).then(function (c) { c.put(r, cp); }); }
    return res;
  }).catch(function () { return caches.match(r).then(function (m) { return m || caches.match('index.html'); }); }));
});
