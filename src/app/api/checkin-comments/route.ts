import type { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { requireSession } from "@/lib/api/auth";
import { assertSheetAccess } from "@/lib/api/business";
import { forbidden, notFound } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/response";
import { checkinCommentSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    const body = checkinCommentSchema.parse(await request.json());

    if (session.user.role === "employee") {
      throw forbidden("Only managers and admins can submit check-in comments");
    }

    const sheet = await prisma.goalSheet.findUnique({
      where: { id: body.sheet_id },
      include: { employee: true },
    });

    if (!sheet) throw notFound("Goal sheet not found");
    if (session.user.role !== "admin" && sheet.employee.managerId !== session.user.id) {
      throw forbidden("Only the direct manager can comment on this sheet");
    }

    const comment = await prisma.checkinComment.upsert({
      where: {
        sheetId_quarter: {
          sheetId: sheet.id,
          quarter: body.quarter,
        },
      },
      create: {
        sheetId: sheet.id,
        managerId: session.user.id,
        quarter: body.quarter,
        overallComment: body.overall_comment,
        keyObservations: body.key_observations,
        areasOfImprovement: body.areas_of_improvement,
        supportRequired: body.support_required,
      },
      update: {
        managerId: session.user.id,
        overallComment: body.overall_comment,
        keyObservations: body.key_observations,
        areasOfImprovement: body.areas_of_improvement,
        supportRequired: body.support_required,
        checkinDate: new Date(),
      },
      include: {
        sheet: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                department: true,
                designation: true,
              },
            },
          },
        },
      },
    });

    await prisma.notification.create({
      data: {
        recipientId: sheet.employeeId,
        type: "checkin_comment_added",
        title: `${body.quarter} check-in comment added`,
        body: body.overall_comment,
        entityType: "goal_sheet",
        entityId: sheet.id,
      },
    });

    return ok(comment, "Check-in comment saved");
  });
}

export async function GET(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    const search = request.nextUrl.searchParams;
    const sheetId = search.get("sheet_id");
    const quarter = search.get("quarter");

    if (sheetId) await assertSheetAccess(session, sheetId);

    const where: Prisma.CheckinCommentWhereInput = {};
    if (sheetId) where.sheetId = sheetId;
    if (quarter) where.quarter = quarter as "Q1" | "Q2" | "Q3" | "Q4";

    if (session.user.role === "employee") {
      where.sheet = { employeeId: session.user.id };
    } else if (session.user.role === "manager") {
      where.sheet = { employee: { managerId: session.user.id } };
    }

    const comments = await prisma.checkinComment.findMany({
      where,
      include: {
        sheet: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                department: true,
                designation: true,
                employeeCode: true,
              },
            },
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { checkinDate: "desc" },
    });

    return ok(comments);
  });
}
