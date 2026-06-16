// Service worker minimale per il Gestionale.
// Scopo: abilitare il pulsante "Installa" (PWA) del browser.
// Strategia VOLUTAMENTE "rete-prima": l'app passa sempre dalla rete, così
// a ogni deploy su Netlify gli agenti vedono SUBITO la versione aggiornata.
// (Una cache aggressiva rischierebbe di servire una versione vecchia: da evitare
// su un'app che aggiorni di continuo.)

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
