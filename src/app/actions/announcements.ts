"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePM } from "@/lib/auth";

function bumpAllRevalidations() {
  revalidatePath("/admin");
  revalidatePath("/inbox");
}

export async function createAnnouncement(formData: FormData) {
  const pm = await requirePM();
  const title = ((formData.get("title") as string) || "").trim();
  const body = ((formData.get("body") as string) || "").trim();
  const pinned = formData.get("pinned") === "on";
  const expiresAtRaw = (formData.get("expiresAt") as string) || "";
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  if (!title || !body) return;

  await prisma.announcement.create({
    data: { title, body, pinned, expiresAt, authorId: pm.id },
  });
  bumpAllRevalidations();
}

export async function updateAnnouncement(formData: FormData) {
  await requirePM();
  const id = formData.get("id") as string;
  const title = ((formData.get("title") as string) || "").trim();
  const body = ((formData.get("body") as string) || "").trim();
  const pinned = formData.get("pinned") === "on";
  const expiresAtRaw = (formData.get("expiresAt") as string) || "";
  const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;

  if (!id || !title || !body) return;

  await prisma.announcement.update({
    where: { id },
    data: { title, body, pinned, expiresAt },
  });
  bumpAllRevalidations();
}

export async function deleteAnnouncement(formData: FormData) {
  await requirePM();
  const id = formData.get("id") as string;
  if (!id) return;
  await prisma.announcement.delete({ where: { id } });
  bumpAllRevalidations();
}
