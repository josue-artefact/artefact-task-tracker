import webpush from "web-push";
import { prisma } from "./db";

let configured = false;
function configure() {
  if (configured) return true;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    console.warn("[push] VAPID keys missing — push notifications disabled.");
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

/**
 * Envía un push a TODAS las subscriptions del usuario.
 * Si una subscription falla con 410 (Gone) o 404, la borra del DB.
 * Errores no fatales se ignoran silenciosamente — no queremos romper el flujo
 * principal porque un push falle.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!configure()) return 0;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return 0;

  const json = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          json,
        );
        sent++;
      } catch (e: unknown) {
        const err = e as { statusCode?: number; message?: string };
        // 404 / 410: subscription expirada o no válida — borra del DB
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        } else {
          console.warn("[push] error sending:", err.message ?? err);
        }
      }
    }),
  );

  return sent;
}

export function getPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}
