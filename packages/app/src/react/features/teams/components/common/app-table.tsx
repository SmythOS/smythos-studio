/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment, useState } from 'react';

import { RefreshIcon } from '@react/shared/components/svgs';
import TableRowSkeleton from '@react/shared/components/ui/table/table.row.skeleton';

type Props<T extends { id: string }> = {
  rows: T[];
  isLoading: boolean;
  tableHeaders: { name: string }[];
  renderRow: (role: T) => JSX.Element; // eslint-disable-line no-unused-vars
  pageSize?: number;
};

/**
 * Generic table component with optional pagination via load more functionality
 * @param props - Component props including rows data, render function, loading state, headers, and optional page size
 * @returns JSX table element with optional load more button
 */
export const AppTable = <T extends { id: string }>(props: Props<T>) => {
  // Track how many rows are currently being displayed
  const [currentDisplayCount, setCurrentDisplayCount] = useState<number>(
    props.pageSize || props.rows.length,
  );

  // Track loading state for load more button
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  /**
   * Renders skeleton loading rows for loading state
   * @returns Array of skeleton row components
   */
  const renderSkeletonLoading = () => {
    const skeletonRows = [];
    Array.from({ length: 3 }).forEach((_, i) => {
      skeletonRows.push(<TableRowSkeleton key={i} className="py-5 my-3" />);
    });
    return skeletonRows;
  };

  /**
   * Handles load more button click by increasing display count by page size with loading delay
   */
  const handleLoadMore = () => {
    if (props.pageSize && !isLoadingMore) {
      setIsLoadingMore(true);

      // Add 2 second delay for loading animation
      setTimeout(() => {
        const newCount = Math.min(currentDisplayCount + props.pageSize, props.rows.length);
        setCurrentDisplayCount(newCount);
        setIsLoadingMore(false);
      }, 1200);
    }
  };

  // Determine which rows to display based on current display count
  const visibleRows = props.pageSize ? props.rows.slice(0, currentDisplayCount) : props.rows;

  // Check if there are more rows to load
  const hasMoreRows = props.pageSize ? currentDisplayCount < props.rows.length : false;

  // Show load more button only when page size is specified and there are more rows
  const shouldShowLoadMore = props.pageSize && hasMoreRows && !props.isLoading;

  /**
   * Renders the load more row with loading animation using DataPage design
   * @returns JSX table row element for load more functionality
   */
  const renderLoadMoreRow = () => {
    if (!shouldShowLoadMore) return null;

    return (
      <tr>
        <td colSpan={props.tableHeaders.length} className="p-0">
          <div className="px-6 py-4 text-center rounded-lg text-sm">
            <button
              onClick={handleLoadMore}
              type="button"
              className="text-gray-500 hover:underline flex items-center justify-center mx-auto"
              disabled={isLoadingMore}
            >
              <RefreshIcon color="text-gray-500" isLoading={isLoadingMore} />
              <span className="mx-2">Load More</span>
            </button>
          </div>
        </td>
      </tr>
    );
  };

  if (props.isLoading) {
    return renderSkeletonLoading();
  }

  return (
    <div className="relative sm:rounded-lg border border-solid border-gray-200 overflow-x-auto md:overflow-x-hidden  block w-full">
      <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
        <thead className="text-xs text-[#242424] uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
          <tr>
            {props.tableHeaders.map((header) => {
              return (
                <th
                  key={header.name}
                  scope="col"
                  className="px-4 sm:px-6 py-3 last:text-right tracking-wider font-semibold"
                >
                  {header.name}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => {
            return <Fragment key={row?.id}>{props.renderRow(row)}</Fragment>;
          })}
          {renderLoadMoreRow()}
        </tbody>
      </table>
    </div>
  );
};
