import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Devuelve las últimas 20 notificaciones del usuario actual + count de no leídas.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      include: {
        fromUser: { select: { handle: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({
      where: { userId: user.id, readAt: null },
    }),
  ]);

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      id: n.id,
      kind: n.kind,
      message: n.message,
      taskId: n.taskId,
      readAt: n.readAt,
      createdAt: n.createdAt,
      fromHandle: n.fromUser?.handle ?? null,
    })),
    unreadCount,
  });
}
