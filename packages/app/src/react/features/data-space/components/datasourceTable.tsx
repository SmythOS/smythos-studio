import { getDatasources } from '@react/features/data-space/client/dataspace.api-client.service';
import { RefreshIcon } from '@react/shared/components/svgs';
import TableRowSkeleton from '@react/shared/components/ui/table/table.row.skeleton';
import { Datasource } from '@react/shared/types/api-results.types';
import DatasourceTableItem from '@src/react/features/data-space/components/datasourceTableItem';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

interface Props {
  namespaceName: string;
  searchQuery: string;
}

export default function DatasourceTable({ namespaceName, searchQuery }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const [dsList, setDsList] = useState<Datasource[]>([]);
  const [totalDatasources, setTotalDatasources] = useState(0);

  const dsListQuery = useQuery({
    //@ts-ignore
    queryKey: [`datasources-${namespaceName}`, currentPage],
    queryFn: () => getDatasources(namespaceName, currentPage),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    onSuccess: (data) => {
      if (currentPage === 1) {
        setDsList(data.dataSources);
      } else {
        setDsList((prev) => [...new Set([...prev, ...data.dataSources])]);
      }
      setTotalDatasources(data.total);
    },
    keepPreviousData: true,
  });

  const filteredDatasources = dsList.filter((datasource) =>
    datasource.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  function removeItem(id: string) {
    const updatedList = filteredDatasources?.filter((item: Datasource) => item.id !== id);
    setDsList(updatedList);
  }

  function handleLoadMore() {
    if (!dsListQuery.isFetching) {
      setCurrentPage(currentPage + 1);
    }
  }

  /**
   * Renders skeleton loading rows.
   */
  const renderSkeletonLoading = () => {
    return Array.from({ length: 3 }).map((_, i) => (
      <TableRowSkeleton key={i} className="py-5 my-3" />
    ));
  };

  return (
    <div className="relative w-full">
      <div className="bg-white rounded-lg w-full">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full table-auto border border-solid border-gray-100">
            <thead className="bg-gray-50 rounded-lg overflow-hidden">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#242424] uppercase tracking-wider whitespace-nowrap">
                  Data Spaces
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#242424] uppercase tracking-wider whitespace-nowrap">
                  File Preview
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#242424] uppercase tracking-wider whitespace-nowrap">
                  Indexing Status
                </th>
                <th className="px-4 py-3 min-w-[80px]"></th>
              </tr>
            </thead>
            <tbody className="bg-white bg-white divide-y divide-gray-200">
              {dsListQuery.isSuccess &&
                filteredDatasources?.length > 0 &&
                filteredDatasources.map((item: Datasource, index) => (
                  <DatasourceTableItem
                    item={item}
                    key={index}
                    namespaceName={namespaceName}
                    remove={() => removeItem(item.id)}
                  />
                ))}
            </tbody>
          </table>
        </div>

        {(dsListQuery.isLoading || dsListQuery.isFetching) && renderSkeletonLoading()}

        {dsListQuery.isError && !dsListQuery.isLoading && (
          <div className="flex justify-center items-start py-16 pl-12 md:pl-0">
            <div className="max-w-md w-full mx-auto flex flex-col items-center p-4 text-center">
              <h4 className="text-2xl font-medium text-black text-center ml-2 mb-2">
                Error fetching data sources
              </h4>
            </div>
          </div>
        )}

        {dsListQuery.isSuccess &&
          filteredDatasources.length === 0 &&
          !dsListQuery.isLoading &&
          !dsListQuery.isFetching && (
            <div className="flex justify-center items-start py-16 pl-12 md:pl-0">
              <div className="max-w-md w-full mx-auto flex flex-col items-center p-4 text-center">
                <h4 className="text-2xl font-medium text-black text-center ml-2 mb-2">
                  No data sources found
                </h4>
                {searchQuery && (
                  <p className="text-gray-600 mb-8">
                    No data sources match your search query: &quot;{searchQuery}&quot;
                  </p>
                )}
              </div>
            </div>
          )}

        {!searchQuery && filteredDatasources.length < totalDatasources && (
          <div className="px-6 py-4 text-center border border-solid border-gray-200 text-sm">
            <button
              onClick={handleLoadMore}
              type="button"
              className="text-gray-500 hover:underline flex items-center justify-center mx-auto"
              disabled={dsListQuery.isLoading || dsListQuery.isFetching}
            >
              <RefreshIcon
                color="text-gray-500"
                isLoading={dsListQuery.isLoading || dsListQuery.isFetching}
              />
              <span className="mx-2">Load More</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
