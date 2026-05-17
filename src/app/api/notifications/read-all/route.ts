import { requireSession } from "@/lib/api/auth";
import { ok, route } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH() {
  return route(async () => {
    const session = await requireSession();
    const result = await prisma.notification.updateMany({
      where: { recipientId: session.user.id, isRead: false },
      data: { isRead: true },
    });
    return ok({ count: result.count }, "All notifications marked as read");
  });
}
