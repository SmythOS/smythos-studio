/**
 * Data Pool Page
 *
 * Main page for managing data pools/namespaces
 */

import { Input as CustomInput } from '@src/react/shared/components/ui/input';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import TableRowSkeleton from '@src/react/shared/components/ui/table/table.row.skeleton';
import { useScreenSize } from '@src/react/shared/hooks/useScreenSize';
import { errorToast, successToast } from '@src/shared/components/toast';
import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';
import { ChangeEvent, FC, useCallback, useEffect, useMemo, useState } from 'react';
import { dataPoolClient } from '../client/datapool.client';
import { CreateNamespaceModal } from '../components/CreateNamespaceModal';
import { DeleteNamespaceDialog } from '../components/DeleteNamespaceDialog';
import { NamespaceTable } from '../components/NamespaceTable';
import { DataPoolProvider, useDataPoolContext } from '../contexts/data-pool.context';
import type { Namespace, NamespaceWithProvider } from '../types';
import { DEFAULT_PAGINATION_LIMIT } from '../types';

const DataPoolPageContent: FC = () => {
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [namespaceToDelete, setNamespaceToDelete] = useState<NamespaceWithProvider | null>(null);

  const { enrichNamespaceWithProvider, credentials, credentialsLoading } = useDataPoolContext();
  const { isSmallScreen } = useScreenSize();

  /**
   * Fetch namespaces from API
   */
  const fetchNamespaces = useCallback(
    async (currentPage: number = 1) => {
      try {
        setLoading(true);
        const response = await dataPoolClient.listNamespaces({
          page: currentPage,
          limit: DEFAULT_PAGINATION_LIMIT,
        });

        const { namespaces: fetchedNamespaces } = response;

        setNamespaces((prev) =>
          currentPage === 1 ? fetchedNamespaces : [...prev, ...fetchedNamespaces],
        );
        setHasMore(fetchedNamespaces.length === DEFAULT_PAGINATION_LIMIT);
      } catch (error: unknown) {
        const errorMessage = (error as Error)?.message || 'Failed to fetch data spaces. Please try again.';
        errorToast(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Fetch on mount
  useEffect(() => {
    fetchNamespaces();
  }, [fetchNamespaces]);

  /**
   * Handle load more
   */
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNamespaces(nextPage);
  };

  /**
   * Handle search change
   */
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  /**
   * Handle create success
   */
  const handleCreateSuccess = () => {
    setPage(1);
    fetchNamespaces(1);
  };

  /**
   * Open delete confirmation dialog
   */
  const handleDeleteClick = (namespace: NamespaceWithProvider) => {
    setNamespaceToDelete(namespace);
    setIsDeleteDialogOpen(true);
  };

  /**
   * Close delete confirmation dialog
   */
  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setNamespaceToDelete(null);
  };

  /**
   * Confirm and execute delete namespace
   */
  const handleConfirmDelete = async () => {
    if (!namespaceToDelete) return;

    try {
      // Call API to delete
      await dataPoolClient.deleteNamespace(namespaceToDelete.label);
      
      // Manually remove from list without refetching
      setNamespaces((prev) => prev.filter((ns) => ns.label !== namespaceToDelete.label));
      
      successToast('Data space deleted successfully');
      handleCloseDeleteDialog();
    } catch (error: unknown) {
      const errorMessage = (error as Error)?.message || 'Failed to delete data space. Please try again.';
      errorToast(errorMessage);
      throw error; // Re-throw to let dialog handle loading state
    }
  };

  /**
   * Filter namespaces based on search query
   */
  const filteredNamespaces: NamespaceWithProvider[] = useMemo(() => {
    const enriched = namespaces.map((ns) => enrichNamespaceWithProvider(ns));
    
    if (!searchQuery) return enriched;
    
    return enriched.filter((ns) =>
      ns.label?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false,
    );
  }, [namespaces, searchQuery, enrichNamespaceWithProvider]);

  /**
   * Render skeleton loading rows
   */
  const renderSkeletonLoading = () => {
    return Array.from({ length: 3 }).map((_, i) => (
      <TableRowSkeleton key={i} className="py-5 my-3" />
    ));
  };

  return (
    <div className={`${isSmallScreen ? 'small-screen-sidebar-margin' : ''} container mx-auto py-6`}>
      {/* Header Section */}
      <div className="flex items-center justify-end flex-wrap md:flex-nowrap pb-6 gap-2">
        {/* Search Input */}
        <div className="relative">
          <CustomInput
            isSearch={true}
            placeholder="Search Data Space"
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
            value={searchQuery}
          />
        </div>

        {/* Add Data Space Button */}
        {namespaces.length > 0 && (
          <CustomButton
            handleClick={() => setIsCreateModalOpen(true)}
            addIcon={true}
            label="Add Data Space"
            disabled={credentialsLoading || credentials.length === 0}
          />
        )}
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
        {/* Table */}
        {filteredNamespaces.length > 0 && (
          <NamespaceTable
            namespaces={filteredNamespaces}
            onDelete={handleDeleteClick}
          />
        )}

        {/* Empty State */}
        {!loading && filteredNamespaces.length === 0 && (
          <div className="flex justify-center items-start py-16">
            <div className="max-w-md w-full mx-auto flex flex-col items-center p-4 text-center">
              {namespaces.length === 0 ? (
                <>
                  <h4 className="text-xl md:text-2xl font-medium text-black text-center mb-2">
                    Create your first data space
                  </h4>
                  <p className="mb-8 text-sm md:text-base text-gray-600">
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
                      label="Learn more"
                      variant="secondary"
                    />
                    <CustomButton
                      handleClick={() => setIsCreateModalOpen(true)}
                      addIcon={true}
                      label="Add Data Space"
                      className="flex-1 w-[190px] md:w-auto"
                      disabled={credentialsLoading || credentials.length === 0}
                    />
                  </div>
                  {credentials.length === 0 && !credentialsLoading && (
                    <p className="text-xs text-amber-600 mt-4">
                      Please add a vector database connection in the Vault page first.
                    </p>
                  )}
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

        {/* Loading State */}
        {loading && renderSkeletonLoading()}

        {/* Load More */}
        {!searchQuery && hasMore && !loading && namespaces.length > 0 && (
          <div className="px-6 py-4 text-center border-t">
            <button
              onClick={handleLoadMore}
              type="button"
              className="text-gray-500 hover:underline"
            >
              Load More
            </button>
          </div>
        )}
      </div>

      {/* Create Namespace Modal */}
      <CreateNamespaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete Namespace Confirmation Dialog */}
      {namespaceToDelete && (
        <DeleteNamespaceDialog
          isOpen={isDeleteDialogOpen}
          namespaceName={namespaceToDelete.label}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};

/**
 * Data Pool Page with Context Provider
 */
const DataPoolPage: FC = () => {
  return (
    <DataPoolProvider>
      <DataPoolPageContent />
    </DataPoolProvider>
  );
};

export default DataPoolPage;

