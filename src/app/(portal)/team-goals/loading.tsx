import { SkeletonBlock } from "@/components/portal/portal-ui";

export default function TeamGoalsLoading() {
  return (
    <div className="portal-page">
      <SkeletonBlock className="page-title-row" />
      <SkeletonBlock />
      <SkeletonBlock />
    </div>
  );
}
