import { ManagerCheckinsPage } from "@/components/portal/manager-checkins-page";

export default async function ManagerCheckinsRoute({
  params,
}: {
  params: Promise<{ sheet_id: string }>;
}) {
  const { sheet_id } = await params;

  return <ManagerCheckinsPage sheetId={sheet_id} />;
}
