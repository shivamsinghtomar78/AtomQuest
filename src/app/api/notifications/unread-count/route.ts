import { requireSession } from "@/lib/api/auth";
import { ok, route } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return route(async () => {
    const session = await requireSession();
    const count = await prisma.notification.count({
      where: { recipientId: session.user.id, isRead: false },
    });
    return ok({ count });
  });
}
