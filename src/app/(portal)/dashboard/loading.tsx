import { SkeletonBlock } from "@/components/portal/portal-ui";

export default function DashboardLoading() {
  return (
    <div className="portal-page">
      <SkeletonBlock className="page-hero" />
      <div className="dashboard-grid">
        {Array.from({ length: 6 }).map((_, index) => <SkeletonBlock key={index} />)}
      </div>
    </div>
  );
}
