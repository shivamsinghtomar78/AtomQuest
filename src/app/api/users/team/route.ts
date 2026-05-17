import { requireRole, requireSession } from "@/lib/api/auth";
import { requireActiveCycle } from "@/lib/api/business";
import { ok, route } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return route(async () => {
    const session = await requireSession();
    requireRole(session, ["manager", "admin"]);
    const cycle = await requireActiveCycle();

    const users = await prisma.user.findMany({
      where:
        session.user.role === "manager"
          ? { managerId: session.user.id, isActive: true }
          : { role: "employee", isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        designation: true,
        employeeCode: true,
        goalSheets: {
          where: { cycleId: cycle.id },
          select: {
            id: true,
            status: true,
            totalWeightage: true,
            updatedAt: true,
          },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });

    return ok(
      users.map((user) => ({
        ...user,
        sheet_status: user.goalSheets[0]?.status ?? "not_started",
        sheet_id: user.goalSheets[0]?.id ?? null,
      }))
    );
  });
}
