import { NextRequest } from "next/server";
import {
  assertGoalWeightageLimit,
  assertSheetOwnerCanEdit,
  recalculateSheetWeightage,
  dateOnly,
  goalInclude,
} from "@/lib/api/business";
import { badRequest } from "@/lib/api/errors";
import { created, route } from "@/lib/api/response";
import { goalBodySchema } from "@/lib/api/schemas";
import { requireSession } from "@/lib/api/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    const body = goalBodySchema.parse(await request.json());
    const sheet = await assertSheetOwnerCanEdit(session, body.sheet_id);

    if (sheet.goals.length >= 8) {
      throw badRequest("A goal sheet can have a maximum of 8 goals");
    }

    await assertGoalWeightageLimit(sheet.id, body.weightage);

    const goal = await prisma.goal.create({
      data: {
        sheetId: sheet.id,
        thrustAreaId: body.thrust_area_id,
        title: body.title,
        description: body.description,
        uomType: body.uom_type,
        targetValue: body.target_value ?? null,
        targetDate: body.target_date ? dateOnly(body.target_date) : null,
        weightage: body.weightage,
        displayOrder: sheet.goals.length + 1,
      },
      include: goalInclude,
    });

    await recalculateSheetWeightage(sheet.id);

    return created(goal, "Goal created");
  });
}
