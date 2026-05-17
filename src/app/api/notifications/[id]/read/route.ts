import { NextRequest } from "next/server";
import { requireSession } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/response";
import { uuidSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return route(async () => {
    const session = await requireSession();
    const { id } = await params;
    const notification = await prisma.notification.findFirst({
      where: { id: uuidSchema.parse(id), recipientId: session.user.id },
    });
    if (!notification) throw notFound("Notification not found");

    const updated = await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });
    return ok(updated, "Notification marked as read");
  });
}
