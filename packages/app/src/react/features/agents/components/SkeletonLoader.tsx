interface SkeletonLoaderProps {
  count?: number;
}

/**
 * Skeleton loader component for displaying loading placeholders for agent cards
 */
export function SkeletonLoader({ count = 4 }: SkeletonLoaderProps) {
  return (
    <>
      {Array(count)
        .fill(0)
        .map((_, index) => (
          <div
            role="status"
            key={`skeleton-${index}`}
            className="relative flex items-start bg-gray-50 border 
            h-[120px] rounded-lg border-solid border-gray-300 animate-pulse"
          >
            {/* Avatar section - 20% width */}
            <div className="w-[20%] h-[120px] p-1">
              <div className="w-full h-full rounded-l-md bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Content section */}
            <div className="flex-1 p-4">
              {/* Title */}
              <div className="h-4 bg-gray-200 rounded-full dark:bg-gray-700 w-3/4 mb-4" />

              {/* Description lines */}
              <div className="space-y-3">
                <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 w-full" />
                <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 w-5/6" />
                <div className="h-2 bg-gray-200 rounded-full dark:bg-gray-700 w-4/6" />
              </div>

              {/* Bottom metadata */}
              <div className="absolute bottom-4 left-[calc(20%_+_1rem)] right-4">
                <div className="flex items-center justify-between">
                  <div className="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-24" />
                  <div className="h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 w-16" />
                </div>
              </div>
            </div>

            <span className="sr-only">Loading...</span>
          </div>
        ))}
    </>
  );
} 