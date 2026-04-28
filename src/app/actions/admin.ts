"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePM } from "@/lib/auth";

/* -------- Teams -------- */

export async function createTeam(formData: FormData) {
  await requirePM();
  const name = ((formData.get("name") as string) || "").trim();
  if (!name) return;
  await prisma.team.create({ data: { name } });
  revalidatePath("/admin/teams");
  revalidatePath("/admin");
}

export async function updateTeam(formData: FormData) {
  await requirePM();
  const id = formData.get("id") as string;
  const name = ((formData.get("name") as string) || "").trim();
  if (!id || !name) return;
  await prisma.team.update({ where: { id }, data: { name } });
  revalidatePath("/admin/teams");
  revalidatePath("/admin");
}

export async function deleteTeam(formData: FormData) {
  await requirePM();
  const id = formData.get("id") as string;
  if (!id) return;

  const counts = await prisma.team.findUnique({
    where: { id },
    select: { _count: { select: { members: true, tasks: true } } },
  });
  if (counts && (counts._count.members > 0 || counts._count.tasks > 0)) {
    redirect("/admin/teams?error=team_in_use");
  }

  await prisma.team.delete({ where: { id } });
  revalidatePath("/admin/teams");
  revalidatePath("/admin");
}

/* -------- Members -------- */

export async function createMember(formData: FormData) {
  await requirePM();
  const handle = ((formData.get("handle") as string) || "").trim().replace(/^@/, "").toLowerCase();
  const name = ((formData.get("name") as string) || "").trim();
  const role = (formData.get("role") as string) || "MEMBER";
  const teamId = ((formData.get("teamId") as string) || "") || null;
  if (!handle || !name) return;
  if (!["PM", "MEMBER"].includes(role)) return;

  await prisma.user.upsert({
    where: { handle },
    create: { handle, name, role, teamId },
    update: { name, role, teamId },
  });

  revalidatePath("/admin/teams");
  revalidatePath("/admin");
}

export async function updateMember(formData: FormData) {
  await requirePM();
  const id = formData.get("id") as string;
  const name = ((formData.get("name") as string) || "").trim();
  const role = (formData.get("role") as string) || "MEMBER";
  const teamId = ((formData.get("teamId") as string) || "") || null;
  if (!id || !name) return;
  if (!["PM", "MEMBER"].includes(role)) return;

  await prisma.user.update({
    where: { id },
    data: { name, role, teamId },
  });
  revalidatePath("/admin/teams");
  revalidatePath("/admin");
}

export async function deleteMember(formData: FormData) {
  const me = await requirePM();
  const id = formData.get("id") as string;
  if (!id) return;

  if (id === me.id) {
    redirect("/admin/teams?error=self");
  }

  // Up-front check: a member with authored tasks, comments, or transfers
  // cannot be hard-deleted (those FKs are restrict).
  const target = await prisma.user.findUnique({
    where: { id },
    select: {
      handle: true,
      _count: {
        select: {
          createdTasks: true,
          comments: true,
          transfersFrom: true,
          transfersTo: true,
        },
      },
    },
  });

  if (!target) {
    redirect("/admin/teams");
  }

  const referenceCount =
    target._count.createdTasks +
    target._count.comments +
    target._count.transfersFrom +
    target._count.transfersTo;

  if (referenceCount > 0) {
    redirect(`/admin/teams?error=in_use&handle=${encodeURIComponent(target.handle)}`);
  }

  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/teams");
  revalidatePath("/admin");
}

/* -------- Clients -------- */

export async function createClient(formData: FormData) {
  await requirePM();
  const name = ((formData.get("name") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim() || null;
  if (!name) return;
  await prisma.client.create({ data: { name, description } });
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
}

export async function updateClient(formData: FormData) {
  await requirePM();
  const id = formData.get("id") as string;
  const name = ((formData.get("name") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim() || null;
  if (!id || !name) return;
  await prisma.client.update({ where: { id }, data: { name, description } });
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
}

export async function deleteClient(formData: FormData) {
  await requirePM();
  const id = formData.get("id") as string;
  if (!id) return;

  const counts = await prisma.client.findUnique({
    where: { id },
    select: { _count: { select: { tasks: true } } },
  });
  if (counts && counts._count.tasks > 0) {
    redirect("/admin/clients?error=client_in_use");
  }

  await prisma.client.delete({ where: { id } });
  revalidatePath("/admin/clients");
  revalidatePath("/admin");
}

