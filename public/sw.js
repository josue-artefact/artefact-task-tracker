/**
 * Service worker para Artefact Task Tracker.
 *
 * Solo maneja:
 *  - 'push' events: muestra notificación nativa del OS
 *  - 'notificationclick': abre la app (o foco si ya está abierta) en la URL del payload
 *
 * No hace caching offline — Next.js ya tiene su propia capa de caching
 * y no queremos servir páginas stale.
 */

self.addEventListener("install", (event) => {
  // Activar inmediatamente sin esperar a que se cierren tabs viejas
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Tomar control de páginas existentes inmediatamente
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Artefact", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Artefact Task Tracker";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
    tag: data.tag || undefined, // tag agrupa notificaciones del mismo tipo
    renotify: data.renotify || false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Si ya hay una pestaña abierta, enfócala y navega
      for (const client of windowClients) {
        if ("focus" in client && "navigate" in client) {
          return client.focus().then(() => client.navigate(targetUrl));
        }
      }
      // Si no, abre una nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    }),
  );
});
