import { NextRequest } from "next/server";
import { requireRole, requireSession } from "@/lib/api/auth";
import { notFound } from "@/lib/api/errors";
import { created, ok, route } from "@/lib/api/response";
import { thrustAreaCreateSchema, thrustAreaPatchSchema } from "@/lib/api/schemas";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  return route(async () => {
    const session = await requireSession();
    requireRole(session, ["admin"]);

    const thrustAreas = await prisma.thrustArea.findMany({
      orderBy: { name: "asc" },
      include: { creator: { select: { id: true, name: true, email: true } } },
    });

    return ok(thrustAreas);
  });
}

export async function POST(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const body = thrustAreaCreateSchema.parse(await request.json());

    const thrustArea = await prisma.thrustArea.create({
      data: {
        name: body.name,
        description: body.description,
        colorHex: body.color_hex,
        createdBy: session.user.id,
      },
    });

    return created(thrustArea, "Thrust area created");
  });
}

export async function PATCH(request: NextRequest) {
  return route(async () => {
    const session = await requireSession();
    requireRole(session, ["admin"]);
    const body = thrustAreaPatchSchema.parse(await request.json());

    const existing = await prisma.thrustArea.findUnique({ where: { id: body.id } });
    if (!existing) throw notFound("Thrust area not found");

    const thrustArea = await prisma.thrustArea.update({
      where: { id: body.id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.color_hex !== undefined ? { colorHex: body.color_hex } : {}),
        ...(body.is_active !== undefined ? { isActive: body.is_active } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "thrust_area",
        entityId: thrustArea.id,
        action: "thrust_area_updated",
        changedBy: session.user.id,
        changedByRole: "admin",
        previousValue: existing,
        newValue: thrustArea,
        reason: "Admin updated thrust area",
      },
    });

    return ok(thrustArea, "Thrust area updated");
  });
}
