import { ManagerCheckinsPage } from "@/components/portal/manager-checkins-page";

export default async function ManagerCheckinsRoute({
  params,
}: {
  params: Promise<{ sheetId: string }>;
}) {
  const { sheetId } = await params;
  return <ManagerCheckinsPage sheetId={sheetId} />;
}
