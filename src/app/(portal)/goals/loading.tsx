import { SkeletonBlock } from "@/components/portal/portal-ui";

export default function GoalsLoading() {
  return (
    <div className="portal-page">
      <SkeletonBlock className="page-title-row" />
      <div className="goal-card-grid">
        {Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} />)}
      </div>
    </div>
  );
}
