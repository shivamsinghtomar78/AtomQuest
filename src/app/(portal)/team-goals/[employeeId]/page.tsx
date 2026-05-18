import { ApprovalReviewPage } from "@/components/portal/approval-review-page";

export default async function TeamGoalEmployeeRoute({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  return <ApprovalReviewPage employeeId={employeeId} />;
}
