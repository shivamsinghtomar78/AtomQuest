import { NextRequest } from "next/server";
import { requireSession } from "@/lib/api/auth";
import { assertSheetAccess } from "@/lib/api/business";
import { ok, route } from "@/lib/api/response";
import { uuidSchema } from "@/lib/api/schemas";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return route(async () => {
    const session = await requireSession();
    const { id } = await params;
    const sheet = await assertSheetAccess(session, uuidSchema.parse(id));
    return ok(sheet);
  });
}
