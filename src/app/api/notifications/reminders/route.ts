import { NextRequest } from "next/server";
import { requireSession } from "@/lib/api/auth";
import { forbidden } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/response";
import { reminderSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    if (session.user.role === "employee") {
      throw forbidden("Only managers and admins can send reminders");
    }

    const body = reminderSchema.parse(await request.json());
    const sheets = await prisma.goalSheet.findMany({
      where: { id: { in: body.sheet_ids } },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            managerId: true,
          },
        },
      },
    });

    const allowedSheets = sheets.filter(
      (sheet) =>
        session.user.role === "admin" ||
        sheet.employee.managerId === session.user.id
    );

    if (!allowedSheets.length) {
      throw forbidden("No selected goal sheets can be reminded by this user");
    }

    await prisma.notification.createMany({
      data: allowedSheets.map((sheet) => ({
        recipientId: sheet.employeeId,
        type: "reminder",
        title: "Goal workflow reminder",
        body:
          body.message ??
          "Please review your goal sheet or quarterly check-in status in AtomQuest.",
        entityType: "goal_sheet",
        entityId: sheet.id,
      })),
    });

    return ok({ count: allowedSheets.length }, "Reminder notifications sent");
  });
}
