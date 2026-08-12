import { SkeletonHeading, SkeletonList } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <SkeletonHeading />
      <div className="mt-6">
        <SkeletonList rows={6} />
      </div>
    </div>
  );
}
