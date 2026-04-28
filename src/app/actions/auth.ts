"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { setSessionHandle, clearSession } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const raw = (formData.get("handle") as string | null)?.trim() ?? "";
  const handle = raw.replace(/^@/, "").toLowerCase();

  if (!handle) {
    redirect("/?error=empty");
  }

  const user = await prisma.user.findUnique({ where: { handle } });
  if (!user) {
    redirect("/?error=unknown&handle=" + encodeURIComponent(handle));
  }

  await setSessionHandle(user.handle);
  redirect(user.role === "PM" ? "/admin" : "/inbox");
}

export async function logoutAction() {
  await clearSession();
  redirect("/");
}
