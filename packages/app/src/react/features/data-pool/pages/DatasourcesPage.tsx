/**
 * Datasources Page
 *
 * Displays and manages datasources for a specific namespace
 */

import { Input as CustomInput } from '@src/react/shared/components/ui/input';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import TableRowSkeleton from '@src/react/shared/components/ui/table/table.row.skeleton';
import { useScreenSize } from '@src/react/shared/hooks/useScreenSize';
import { errorToast, successToast } from '@src/shared/components/toast';
import { Breadcrumb } from 'flowbite-react';
import { ChangeEvent, FC, useCallback, useEffect, useMemo, useState } from 'react';
import { HiHome } from 'react-icons/hi';
import { Link, useParams } from 'react-router-dom';
import { datasourceClient } from '../client/datasource.client';
import { DatasourcesTable } from '../components/DatasourcesTable';
import { DeleteDatasourceDialog } from '../components/DeleteDatasourceDialog';
import { UploadDatasourceDialog } from '../components/UploadDatasourceDialog';
import { ViewDatasourceDialog } from '../components/ViewDatasourceDialog';
import type { Datasource } from '../types/datasource.types';

const DatasourcesPage: FC = () => {
  const { namespaceLabel } = useParams<{ namespaceLabel: string }>();
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState<boolean>(false);
  const [datasourceToDelete, setDatasourceToDelete] = useState<Datasource | null>(null);
  const [datasourceToView, setDatasourceToView] = useState<Datasource | null>(null);
  const { isSmallScreen } = useScreenSize();

  /**
   * Fetch datasources from API
   */
  const fetchDatasources = useCallback(async () => {
    if (!namespaceLabel) return;

    try {
      setLoading(true);
      const fetchedDatasources = await datasourceClient.listDatasources(namespaceLabel);
      setDatasources(fetchedDatasources);
    } catch (error: unknown) {
      const errorMessage =
        (error as Error)?.message || 'Failed to fetch datasources. Please try again.';
      errorToast(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [namespaceLabel]);

  // Fetch on mount
  useEffect(() => {
    fetchDatasources();
  }, [fetchDatasources]);

  /**
   * Handle search change
   */
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  /**
   * Handle upload success
   */
  const handleUploadSuccess = () => {
    fetchDatasources();
  };

  /**
   * Open delete confirmation dialog
   */
  const handleDeleteClick = (datasource: Datasource) => {
    setDatasourceToDelete(datasource);
    setIsDeleteDialogOpen(true);
  };

  /**
   * Close delete confirmation dialog
   */
  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDatasourceToDelete(null);
  };

  /**
   * Open view details dialog
   */
  const handleViewClick = (datasource: Datasource) => {
    setDatasourceToView(datasource);
    setIsViewDialogOpen(true);
  };

  /**
   * Close view details dialog
   */
  const handleCloseViewDialog = () => {
    setIsViewDialogOpen(false);
    setDatasourceToView(null);
  };

  /**
   * Confirm and execute delete datasource
   */
  const handleConfirmDelete = async () => {
    if (!datasourceToDelete || !namespaceLabel) return;

    try {
      // Call API to delete
      await datasourceClient.deleteDatasource(namespaceLabel, datasourceToDelete.id);

      // Manually remove from list without refetching
      setDatasources((prev) => prev.filter((ds) => ds.id !== datasourceToDelete.id));

      successToast('Datasource deleted successfully');
      handleCloseDeleteDialog();
    } catch (error: unknown) {
      const errorMessage =
        (error as Error)?.message || 'Failed to delete datasource. Please try again.';
      errorToast(errorMessage);
      throw error; // Re-throw to let dialog handle loading state
    }
  };

  /**
   * Filter datasources based on search query
   */
  const filteredDatasources: Datasource[] = useMemo(() => {
    if (!searchQuery) return datasources;

    return datasources.filter(
      (ds) =>
        ds.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ds.id.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [datasources, searchQuery]);

  /**
   * Render skeleton loading rows
   */
  const renderSkeletonLoading = () => {
    return Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} className="py-5 my-3" />);
  };

  const breadcrumb = (
    <Breadcrumb aria-label="Breadcrumb" className="mb-4">
      <Breadcrumb.Item icon={HiHome}>
        <Link to="/">Home</Link>
      </Breadcrumb.Item>
      <Breadcrumb.Item>
        <Link to="/data">Data Spaces</Link>
      </Breadcrumb.Item>
      <Breadcrumb.Item>{namespaceLabel}</Breadcrumb.Item>
    </Breadcrumb>
  );

  if (!namespaceLabel) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-red-600">Error: No namespace label provided</p>
      </div>
    );
  }

  return (
    <div className={`${isSmallScreen ? 'small-screen-sidebar-margin' : ''} container mx-auto py-6`}>
      {/* Breadcrumb */}
      {breadcrumb}

      {/* Header Section */}
      <div className="flex items-center justify-between flex-wrap md:flex-nowrap pb-6 gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Datasources</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage datasources for <span className="font-medium">{namespaceLabel}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <CustomInput
              isSearch={true}
              placeholder="Search datasources"
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
              value={searchQuery}
            />
          </div>

          {/* Upload Datasource Button */}
          {datasources.length > 0 && (
            <CustomButton
              handleClick={() => setIsUploadDialogOpen(true)}
              addIcon={true}
              label="Upload Source"
            />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
        {/* Table */}
        {filteredDatasources.length > 0 && (
          <DatasourcesTable
            datasources={filteredDatasources}
            onDelete={handleDeleteClick}
            onView={handleViewClick}
          />
        )}

        {/* Empty State */}
        {!loading && filteredDatasources.length === 0 && (
          <div className="flex justify-center items-start py-16">
            <div className="max-w-md w-full mx-auto flex flex-col items-center p-4 text-center">
              {datasources.length === 0 ? (
                <>
                  <h4 className="text-xl md:text-2xl font-medium text-black text-center mb-2">
                    Upload your first datasource
                  </h4>
                  <p className="mb-8 text-sm md:text-base text-gray-600">
                    Add files or text content to index in this data space.
                  </p>
                  <CustomButton
                    handleClick={() => setIsUploadDialogOpen(true)}
                    addIcon={true}
                    label="Upload Source"
                    className="w-[190px]"
                  />
                </>
              ) : (
                <div className="text-center">
                  <h4 className="text-xl font-medium text-gray-700 mb-2">
                    No matching datasources found
                  </h4>
                  <p className="text-gray-600">
                    No datasources match your search query: &quot;{searchQuery}&quot;
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && renderSkeletonLoading()}
      </div>

      {/* Upload Datasource Dialog */}
      {namespaceLabel && (
        <UploadDatasourceDialog
          isOpen={isUploadDialogOpen}
          namespaceLabel={namespaceLabel}
          onClose={() => setIsUploadDialogOpen(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* Delete Datasource Confirmation Dialog */}
      {datasourceToDelete && (
        <DeleteDatasourceDialog
          isOpen={isDeleteDialogOpen}
          datasourceName={datasourceToDelete.name}
          onClose={handleCloseDeleteDialog}
          onConfirm={handleConfirmDelete}
        />
      )}

      {/* View Datasource Details Dialog */}
      <ViewDatasourceDialog
        isOpen={isViewDialogOpen}
        datasource={datasourceToView}
        onClose={handleCloseViewDialog}
      />
    </div>
  );
};

export default DatasourcesPage;

