import { ApprovalReviewPage } from "@/components/portal/approval-review-page";

export default async function ApprovalReviewRoute({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  return <ApprovalReviewPage employeeId={employeeId} />;
}
