interface SkeletonComponent {
  className?: string;
}
const TableRowSkeleton = ({ className }: SkeletonComponent) => (
  <>
    <div
      role="status"
      className={`w-full p-4 border border-gray-200 shadow animate-pulse md:p-6 dark:border-gray-700 h-2.5 bg-gray-200 rounded-full dark:bg-gray-700 ${className}`}
    />
    <span className="sr-only">Loading...</span>
  </>
);

export default TableRowSkeleton;
