// ============================================================
// SERVICE WORKER — SpiriVie Révisions
// ============================================================
// IMPORTANT : à chaque mise à jour du contenu de l'appli (index.html),
// change le numéro de version ci-dessous (ex: 'v1' -> 'v2').
// Cela force les téléphones ayant déjà installé l'appli à récupérer
// la nouvelle version au lieu de garder l'ancienne en cache.
// ============================================================
const CACHE_VERSION = 'v1';
const CACHE_NAME = 'spirivie-cache-' + CACHE_VERSION;

// Fichiers de l'appli à mettre en cache pour un fonctionnement hors-ligne complet.
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Domaine hébergeant les fichiers audio (cours + méditations) : jamais mis en cache,
// car les fichiers sont volumineux et streamés à la demande — nécessite une connexion.
const AUDIO_HOST = 'da32ev14kd4yl.cloudfront.net';

// --- Installation : mise en cache de l'appli ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting(); // active immédiatement la nouvelle version au lieu d'attendre
});

// --- Activation : nettoyage des anciennes versions du cache ---
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim(); // prend le contrôle immédiatement, sans attendre un rechargement
});

// --- Interception des requêtes ---
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Les fichiers audio (CloudFront) passent toujours par le réseau, jamais mis en cache.
  if (url.hostname === AUDIO_HOST) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Pour tout le reste (l'appli elle-même) : on sert le cache en priorité,
  // et on va chercher sur le réseau seulement si rien n'est en cache
  // (ou pour mettre à jour le cache en arrière-plan si une connexion existe).
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // Met à jour le cache avec la version fraîche, pour la prochaine visite hors-ligne.
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => cached); // pas de réseau : on retombe sur le cache si disponible

      // Sert immédiatement la version en cache si elle existe (rapide, fonctionne hors-ligne),
      // sinon attend la réponse réseau.
      return cached || fetchPromise;
    })
  );
});
