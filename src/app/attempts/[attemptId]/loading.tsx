import { SkeletonHeading, SkeletonList } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <SkeletonHeading />
      <div className="mt-8">
        <SkeletonList rows={3} />
      </div>
    </div>
  );
}
