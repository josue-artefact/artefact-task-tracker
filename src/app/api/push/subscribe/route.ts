import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Registra una push subscription para el usuario actual.
 * Body: { endpoint, keys: { p256dh, auth }, userAgent? }
 * Idempotente: si el endpoint ya existe, lo actualiza al user actual.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
    userAgent?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const endpoint = body.endpoint;
  const p256dh = body.keys?.p256dh;
  const auth = body.keys?.auth;
  const userAgent = body.userAgent ?? req.headers.get("user-agent") ?? null;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh, auth, userAgent },
    update: { userId: user.id, p256dh, auth, userAgent },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.endpoint) return NextResponse.json({ error: "missing endpoint" }, { status: 400 });

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: body.endpoint, userId: user.id },
  });

  return NextResponse.json({ ok: true });
}
