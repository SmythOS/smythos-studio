import { Skeleton } from '@react/features/ai-chat/components';

/**
 * Loading skeleton that mimics the chat UI layout
 * Displayed while chat data is being fetched
 */
export const LoadingSkeleton = () => (
  <>
    {/* Header skeleton */}
    <div className="w-full max-w-4xl flex justify-between items-center pt-2">
      <div className="w-full flex items-center gap-2.5">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-col gap-0.5">
          <Skeleton className="w-32 h-4 rounded" />
          <Skeleton className="w-20 h-3 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Skeleton className="size-7 rounded-xl" />
        <Skeleton className="size-7 rounded-xl" />
      </div>
    </div>

    {/* Chat area skeleton */}
    <div className="w-full h-full flex-1" />

    {/* Footer skeleton */}
    <div className="w-full max-w-4xl py-4 space-y-4">
      <Skeleton className="w-full h-[124px] rounded-xl" />
      <Skeleton className="w-4/6 h-4 rounded-md mx-auto" />
    </div>
  </>
);
