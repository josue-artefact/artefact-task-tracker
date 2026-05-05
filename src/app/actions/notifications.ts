"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/** Marca una notificación específica como leída. */
export async function markAsRead(formData: FormData) {
  const user = await requireUser();
  const id = formData.get("id") as string;
  if (!id) return;

  await prisma.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/admin");
  revalidatePath("/inbox");
}

/** Marca todas las notificaciones del usuario como leídas. */
export async function markAllAsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/admin");
  revalidatePath("/inbox");
}
