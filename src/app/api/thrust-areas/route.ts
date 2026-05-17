import { requireSession } from "@/lib/api/auth";
import { ok, route } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET() {
  return route(async () => {
    await requireSession();
    const thrustAreas = await prisma.thrustArea.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return ok(thrustAreas);
  });
}
