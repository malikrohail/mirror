import { Skeleton } from '@/components/ui/skeleton';

export function PageSkeleton() {
  return (
    <div>
      {/* Header bar skeleton */}
      <div className="flex h-[42px] items-center gap-3 pl-3 pr-6 border-b border-border">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Content skeleton */}
      <div className="space-y-6 px-[100px] pt-[40px] pb-[100px]">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}
