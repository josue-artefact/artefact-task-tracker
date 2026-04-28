import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import { prisma } from "./db";

const COOKIE = "artefact_session";

/**
 * El cookie de sesión es una cadena `handle.signature` donde la firma es
 * HMAC-SHA256 del handle con COOKIE_SECRET. Esto evita que alguien con curl
 * pueda suplantar a otro usuario simplemente seteando el cookie a su nombre.
 *
 * Si COOKIE_SECRET no está configurada, fallamos con un error claro al
 * iniciar — preferimos romper en boot que correr inseguros.
 */
function getSecret(): string {
  const s = process.env.COOKIE_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "COOKIE_SECRET no está configurada (mínimo 32 chars). " +
        "Genera uno con: node -e \"console.log(require('crypto').randomBytes(48).toString('base64'))\"",
    );
  }
  return s;
}

function sign(handle: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(handle)
    .digest("base64url");
}

function pack(handle: string): string {
  return `${handle}.${sign(handle)}`;
}

function unpack(value: string): string | null {
  const idx = value.lastIndexOf(".");
  if (idx <= 0 || idx === value.length - 1) return null;
  const handle = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const expected = sign(handle);
  // timingSafeEqual requires equal-length buffers
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  return handle;
}

export async function setSessionHandle(handle: string) {
  const jar = await cookies();
  jar.set(COOKIE, pack(handle), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSessionHandle(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(COOKIE)?.value;
  if (!value) return null;
  return unpack(value);
}

export async function getCurrentUser() {
  const handle = await getSessionHandle();
  if (!handle) return null;
  return prisma.user.findUnique({
    where: { handle },
    include: { team: true },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  return user;
}

export async function requirePM() {
  const user = await requireUser();
  if (user.role !== "PM") redirect("/inbox");
  return user;
}
