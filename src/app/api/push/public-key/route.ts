import { NextResponse } from "next/server";
import { getPublicKey } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Devuelve la VAPID public key para que el cliente pueda registrarse.
 * No es secreta — el navegador la necesita para crear la subscription.
 */
export async function GET() {
  const key = getPublicKey();
  if (!key) return NextResponse.json({ error: "push not configured" }, { status: 503 });
  return NextResponse.json({ publicKey: key });
}
