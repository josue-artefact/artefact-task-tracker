/**
 * Helpers de push del lado cliente. NO importar en server components.
 */

export type PushStatus =
  | "unsupported"   // browser no soporta push
  | "needs-permission" // soporta pero no hemos pedido permiso aún
  | "denied"        // usuario rechazó
  | "subscribed"    // todo OK, registrado en backend
  | "subscribing"   // en proceso
  | "error";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) out[i] = rawData.charCodeAt(i);
  return out;
}

export async function getPushStatus(): Promise<PushStatus> {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";

  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) return "subscribed";
    if (Notification.permission === "default") return "needs-permission";
    return "needs-permission";
  } catch {
    return "error";
  }
}

/**
 * Registra el service worker, pide permiso si hace falta, y crea/sincroniza
 * la subscription con el backend. Idempotente — seguro de llamar varias veces.
 */
export async function ensurePushSubscribed(): Promise<PushStatus> {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";

  try {
    // 1. Registrar service worker (idempotente — si ya está, devuelve el existente)
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    // 2. Pedir permiso si está en 'default'
    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      if (result !== "granted") return result === "denied" ? "denied" : "error";
    }
    if (Notification.permission !== "granted") return "denied";

    // 3. Obtener VAPID public key del server
    const keyRes = await fetch("/api/push/public-key");
    if (!keyRes.ok) return "error";
    const { publicKey } = (await keyRes.json()) as { publicKey: string };

    // 4. Suscribirse (o reusar suscripción existente)
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    // 5. Mandar al backend
    const subJson = sub.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: subJson.keys,
        userAgent: navigator.userAgent,
      }),
    });
    if (!res.ok) return "error";

    return "subscribed";
  } catch (e) {
    console.warn("[push-client] ensure subscribe failed:", e);
    return "error";
  }
}

export async function unsubscribePush(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;

  await fetch("/api/push/subscribe", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  await sub.unsubscribe();
}
