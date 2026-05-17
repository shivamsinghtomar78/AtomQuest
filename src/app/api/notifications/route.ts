import { requireSession } from "@/lib/api/auth";
import { ok, route } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return route(async () => {
    const session = await requireSession();
    const notifications = await prisma.notification.findMany({
      where: { recipientId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return ok(notifications);
  });
}
