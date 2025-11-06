/**
 * VectorDatabases Component
 * 
 * Displays and manages vector database credential connections.
 * Features:
 * - List all vector database connections
 * - Create new connections
 * - Edit existing connections
 * - Delete connections
 * - Test connections
 * - Duplicate connections
 * 
 * @component
 */

import { Button } from '@src/react/shared/components/ui/button';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import { errorToast, successToast } from '@src/shared/components/toast';
import { Tooltip } from 'flowbite-react';
import { Info, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import credentialsSchema from '../credentials-schema.json';
import { useCredentials } from '../hooks/use-credentials';
import {
    CreateCredentialsModal,
    type CredentialConnection,
} from './create-credentials.modal';

/**
 * Provider schema definition
 */
interface ProviderSchema {
  id: string;
  name: string;
  group: string;
  auth_type: string;
  description: string;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
  }>;
  docs_url?: string;
  test_endpoint?: string;
}

/**
 * VectorDatabases Component
 */
export function VectorDatabases() {
  // State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<CredentialConnection | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch credentials using the hook
  const { credentials, isLoading } = useCredentials('vector_database');

  /**
   * Get provider display name from schema
   */
  const getProviderName = (providerId: string): string => {
    const provider = (credentialsSchema as ProviderSchema[]).find((p) => p.id === providerId);
    return provider?.name || providerId;
  };

  /**
   * Handle successful credential save (create or update)
   */
  const handleSuccess = (data: {
    id?: string;
    name: string;
    provider: string;
    credentials: Record<string, string>;
    isEdit: boolean;
  }) => {
    // Show success message
    if (data.isEdit) {
      successToast('Connection updated successfully.');
    } else {
      successToast('Connection created successfully.');
    }

    // Reset state
    setEditingConnection(undefined);
    
    // In production, you would refetch the credentials list here
    // queryClient.invalidateQueries(['credentials', 'vector_database']);
  };

  /**
   * Handle edit button click
   */
  const handleEditClick = (connection: CredentialConnection) => {
    setEditingConnection(connection);
    setIsCreateModalOpen(true);
  };

  /**
   * Handle delete button click
   */
  const handleDeleteClick = async (connection: CredentialConnection) => {
    // Simple confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${connection.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // eslint-disable-next-line no-console
      console.log('Deleting connection:', connection.id);
      successToast('Connection deleted successfully.');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error deleting connection:', error);
      errorToast('Failed to delete connection. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };


  /**
   * Handle modal close
   */
  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    setEditingConnection(undefined);
  };

  return (
    <div className="rounded-lg bg-card text-card-foreground border border-solid border-gray-200 shadow-sm">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pr-2 flex-wrap">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            Vector Databases
            <Tooltip
              className="w-72 text-center"
              content="Manage connections to vector databases for storing and retrieving embeddings"
            >
              <Info className="w-4 h-4" />
            </Tooltip>
          </h2>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-4 text-center text-muted-foreground">
              Loading connections...
            </div>
          ) : credentials.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-2">No vector database connections found</p>
              <p className="text-sm text-gray-500">
                Get started by adding your first connection
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[500px] text-sm text-left table-fixed">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="pr-4 py-2 w-1/3">Connection Name</th>
                  <th className="px-4 py-2 w-1/3">Provider</th>
                  <th className="px-4 py-2 w-1/3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((connection) => {
                  const isDisabled = isProcessing;

                  return (
                    <tr key={connection.id} className="border-t">
                      {/* Connection Name */}
                      <td className="pr-4 py-3 truncate" title={connection.name}>
                        <span className="font-medium">{connection.name}</span>
                      </td>

                      {/* Provider */}
                      <td className="px-4 py-3 truncate" title={getProviderName(connection.provider)}>
                        {getProviderName(connection.provider)}
                      </td>

                      {/* Actions */}
                      <td className="pl-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit Button */}
                          <Tooltip content="Edit">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(connection)}
                              disabled={isDisabled}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Tooltip>

                          {/* Delete Button */}
                          <Tooltip content="Delete">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(connection)}
                              disabled={isDisabled}
                            >
                              <Trash2 className="h-4 w-4 hover:text-red-500" />
                            </Button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Add Button */}
        <div className="w-full flex justify-center mt-4">
          <CustomButton
            variant="secondary"
            addIcon
            Icon={<PlusCircle className="mr-2 h-4 w-4" />}
            handleClick={() => {
              setEditingConnection(undefined);
              setIsCreateModalOpen(true);
            }}
            label="Add Vector Database"
            disabled={isLoading || isProcessing}
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      <CreateCredentialsModal
        isOpen={isCreateModalOpen}
        onClose={handleModalClose}
        onSuccess={handleSuccess}
        group="vector_database"
        editConnection={editingConnection}
      />
    </div>
  );
}

