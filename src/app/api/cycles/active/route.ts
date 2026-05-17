import { requireSession } from "@/lib/api/auth";
import { getActiveCycle } from "@/lib/api/business";
import { notFound } from "@/lib/api/errors";
import { ok, route } from "@/lib/api/response";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET() {
  return route(async () => {
    await requireSession();
    const cycle = await getActiveCycle();
    if (!cycle) throw notFound("No active cycle found");
    return ok(cycle);
  });
}
