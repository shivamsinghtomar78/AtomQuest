import { ApprovalReviewPage } from "@/components/portal/approval-review-page";

export default async function ApprovalReviewRoute({
  params,
}: {
  params: Promise<{ employee_id: string }>;
}) {
  const { employee_id } = await params;

  return <ApprovalReviewPage employeeId={employee_id} />;
}
