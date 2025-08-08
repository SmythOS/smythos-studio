import { DEFAULT_PAGINATION_LIMIT } from '@react/features/data-space/client/dataspace.api-client.service';
import ConfigureCustomStorageTrigger from '@react/features/data-space/components/configureCustomStorageTrigger';
import VectorsTable from '@react/features/data-space/components/vectorsTable';
import AddNamespaceDialog from '@react/features/data-space/dialogs/addNamespace';
import { RefreshIcon } from '@react/shared/components/svgs';
import { Input as CustomInput } from '@react/shared/components/ui/input';
import { Button as CustomButton } from '@react/shared/components/ui/newDesign/button';
import TableRowSkeleton from '@react/shared/components/ui/table/table.row.skeleton';
import { useAuthCtx } from '@react/shared/contexts/auth.context';
import { useScreenSize } from '@react/shared/hooks/useScreenSize';
import { extractError } from '@react/shared/utils/errors';
import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';
import { ChangeEvent, FC, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';

/**
 * Type definition for a Namespace entity.
 */
type Namespace = {
  id: string;
  name: string;
  // Add other properties as needed
};

const DataPage: FC = () => {
  const [namespaceData, setNamespaceData] = useState<Namespace[]>([]);
  const [addNamespaceLoading, setAddNamespaceLoading] = useState<boolean>(false);
  const [openNamespaceDialog, setOpenNamespaceDialog] = useState<boolean>(false);
  const [namespaceError, setNamespaceError] = useState<boolean | string>(false);
  const [inputValue, setInputValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const { hasReadOnlyPageAccess } = useAuthCtx();
  const isReadOnlyAccess: boolean = hasReadOnlyPageAccess('/data');
  const { isSmallScreen } = useScreenSize();

  /**
   * Fetches all namespaces from the API and updates the state.
   */
  const fetchAndProcessData = useCallback(async (currentPage: number = 1) => {
    try {
      setLoading(true);
      const response: any = await fetch(
        `/api/page/vectors/vectorsNamespaceList?page=${currentPage}&limit=${DEFAULT_PAGINATION_LIMIT}`,
      ).then((res) => res.json());
      const { namespaces, total } = response;

      setNamespaceData(currentPage === 1 ? namespaces : (prev) => [...prev, ...namespaces]);
      setHasMore(namespaces.length === DEFAULT_PAGINATION_LIMIT);
    } catch (error) {
      console.error('Error fetching namespaces:', error);
      toast.error('Failed to fetch namespaces');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAndProcessData();
  }, [fetchAndProcessData]);

  /**
   * Handles the addition of a new namespace.
   * @param useUserCustomStorage - Indicates if custom storage should be used.
   */
  const handleClick = async (useUserCustomStorage: boolean) => {
    setAddNamespaceLoading(true);
    try {
      const data: any = await fetch('/api/page/vectors/namespaces', {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          name: inputValue,
          useCustomVectorStorage: useUserCustomStorage || false,
        }),
      }).then((res) => res.json());
      const namespace: Namespace = data.namespace;
      setNamespaceData((prev) => [namespace, ...prev]);
      toast.success('Data Space added successfully');
      setAddNamespaceLoading(false);
      setOpenNamespaceDialog(false);
      setInputValue('');
    } catch (error: any) {
      console.error('Error adding namespace:', error);
      setAddNamespaceLoading(false);
      const _errorMessage =
        error.status === 403 && extractError(error) === 'Forbidden'
          ? 'You are not authorized to add data space'
          : extractError(error) || 'An error occurred while adding the data space';
      setNamespaceError(_errorMessage);
    }
  };

  /**
   * Handles changes to the input value.
   * @param value - The new input value.
   */
  const handleChange = (value: string) => {
    setInputValue(value);
    setNamespaceError(false);
  };

  /**
   * Closes the Add Namespace dialog and resets input.
   */
  const handleClose = () => {
    setOpenNamespaceDialog(false);
    setInputValue('');
  };

  /**
   * Handles changes to the search query.
   * @param value - The new search query.
   */
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  /**
   * Renders skeleton loading rows.
   */
  const renderSkeletonLoading = () => {
    return Array.from({ length: 3 }).map((_, i) => (
      <TableRowSkeleton key={i} className="py-5 my-3" />
    ));
  };

  /**
   * Handles actions after a namespace is deleted.
   */
  const handleNamespacesAfterDelete = () => {
    fetchAndProcessData();
  };

  /**
   * Loads more namespaces by increasing the display count.
   */
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchAndProcessData(nextPage);
  };

  /**
   * Filters and slices the namespace data based on the search query.
   */
  const filteredNamespaceData: Namespace[] = useMemo(() => {
    return namespaceData.filter((namespace) =>
      namespace.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [namespaceData, searchQuery]);

  return (
    <div className={`${isSmallScreen ? 'small-screen-sidebar-margin' : ''}`}>
      <div className="flex items-center justify-end flex-wrap md:flex-nowrap pb-6">
        <div className="w-max flex justify-center items-center flex-wrap md:flex-nowrap">
          <div className="flex md:justify-ce items-center flex-wrap md:flex-nowrap gap-2">
            <div className="relative">
              <CustomInput
                isSearch={true}
                placeholder="Search Data Space"
                onChange={(e: ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
                value={searchQuery}
              />
              <i className="absolute left-3 top-3 text-gray-400"></i>
            </div>
            {!isReadOnlyAccess && (
              <>
                <ConfigureCustomStorageTrigger />
                {namespaceData.length > 0 && (
                  <CustomButton
                    handleClick={() => setOpenNamespaceDialog(true)}
                    addIcon={true}
                    label="Add Data Space"
                    dataAttributes={{ 'data-test': 'add-data-space-button' }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg overflow-hidden">
        {filteredNamespaceData.length > 0 && (
          <VectorsTable
            setNamespaceData={setNamespaceData}
            dataArray={filteredNamespaceData}
            handleNamespacesAfterDelete={handleNamespacesAfterDelete}
          />
        )}
        {/* Display message when no namespaces are found after search */}
        {!loading && filteredNamespaceData.length === 0 && (
          <div className="flex justify-center items-start py-16 md:pl-0">
            <div className="max-w-md w-full mx-auto flex flex-col items-center p-4 text-center">
              {namespaceData.length === 0 ? (
                <>
                  <h4 className="text-xl md:text-2xl font-medium text-black text-center mb-2">
                    Create your first data space
                  </h4>
                  <p className="mb-8 text-sm md:text-base">
                    Use data space to import your external data into SmythOS.
                  </p>
                  <div className="flex justify-between items-center gap-4 mt-2 w-full flex-col md:flex-row">
                    <CustomButton
                      handleClick={() => {
                        window.open(
                          `${SMYTHOS_DOCS_URL}/agent-collaboration/data-pool/data-spaces`,
                          '_blank',
                          'noopener,noreferrer',
                        );
                      }}
                      className="flex-1 w-[190px] md:w-auto"
                      label={'Learn more'}
                      variant="secondary"
                    />
                    <CustomButton
                      handleClick={() => setOpenNamespaceDialog(true)}
                      addIcon={true}
                      label={'Add Data Space'}
                      className="flex-1 w-[190px] md:w-auto"
                    />
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <h4 className="text-xl font-medium text-gray-700 mb-2">
                    No matching data spaces found
                  </h4>
                  <p className="text-gray-600">
                    No data spaces match your search query: &quot;{searchQuery}&quot;
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        {loading && renderSkeletonLoading()}
        {!searchQuery && hasMore && (
          <div className="px-6 py-4 text-center border border-solid border-gray-200 rounded-lg text-sm">
            <button
              onClick={handleLoadMore}
              type="button"
              className="text-gray-500 hover:underline flex items-center justify-center mx-auto"
              disabled={loading}
            >
              <RefreshIcon color="text-gray-500" isLoading={loading} />
              <span className="mx-2">Load More</span>
            </button>
          </div>
        )}
      </div>
      <AddNamespaceDialog
        onClose={handleClose}
        handleClick={(useUserCustomStorage: boolean) => handleClick(useUserCustomStorage)}
        disableBtn={inputValue.trim() === '' || addNamespaceLoading}
        open={openNamespaceDialog}
        loading={addNamespaceLoading}
        handleChange={(event: ChangeEvent<HTMLInputElement>) => handleChange(event.target.value)}
        inputValue={inputValue}
        namespaceError={namespaceError}
      />
    </div>
  );
};

export default DataPage;
