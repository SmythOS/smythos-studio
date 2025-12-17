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
import { successToast } from '@src/shared/components/toast';
import { Tooltip } from 'flowbite-react';
import { Info, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import {
  CreateCredentialsModal,
  type CredentialConnection,
} from '../../credentials/components/create-credentials.modal';
import { CredentialsListSkeleton } from '../../credentials/components/credentials-list-skeleton';
import { DeleteCredentialsModal } from '../../credentials/components/delete-credentials.modal';
import credentialsSchema from '../../credentials/credentials-schema.json';
import { useCredentials } from '../../credentials/hooks/use-credentials';

/**
 * Provider schema definition
 */
interface ProviderSchema {
  id: string;
  name: string;
  group: string;
  auth_type: string;
  description: string;
  logo_url?: string;
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
  const [deletingConnection, setDeletingConnection] = useState<CredentialConnection | undefined>();

  // Fetch credentials using the hook
  const { credentials, isLoading, refetch } = useCredentials('vector_db_creds');

  /**
   * Get provider display name from schema
   */
  const getProviderName = (providerId: string): string => {
    const provider = (credentialsSchema as ProviderSchema[]).find((p) => p.id === providerId);
    return provider?.name || providerId;
  };

  /**
   * Get provider logo URL from schema
   */
  const getProviderLogo = (providerId: string): string | undefined => {
    const provider = (credentialsSchema as ProviderSchema[]).find((p) => p.id === providerId);
    return provider?.logo_url;
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
    
    // Refetch the credentials list
    refetch();
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
  const handleDeleteClick = (connection: CredentialConnection) => {
    setDeletingConnection(connection);
  };

  /**
   * Handle successful deletion
   */
  const handleDeleteSuccess = () => {
    setDeletingConnection(undefined);
    refetch();
  };

  /**
   * Handle delete modal close
   */
  const handleDeleteModalClose = () => {
    setDeletingConnection(undefined);
  };


  /**
   * Handle modal close
   */
  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    setEditingConnection(undefined);
  };

  return (
    <div
    id="vector-databases"
    className="rounded-lg bg-card text-card-foreground border border-solid border-gray-200 shadow-sm">
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
            <CredentialsListSkeleton rows={3} />
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
                {credentials.map((connection) => (
                  <tr key={connection.id} className="border-t">
                    {/* Connection Name */}
                    <td className="pr-4 py-3 truncate" title={connection.name}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{connection.name}</span>
                        {connection.isManaged && (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border border-blue-200 ml-2 shadow-sm"
                            title="This is an internal connection automatically managed by SmythOS"
                          >
                            <svg
                              className="w-3 h-3 mr-1 text-blue-400"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                              aria-hidden="true"
                            >
                              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm.93 12.412a.75.75 0 11-1.86 0l-1.406-5.624A.75.75 0 017.38 7h5.24a.75.75 0 01.716.788l-1.406 5.624zm-.93-7.162a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                            Managed
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Provider */}
                    <td className="px-4 py-3" title={getProviderName(connection.provider)}>
                      <div className="flex items-center gap-2">
                        {getProviderLogo(connection.provider) && (
                          <img
                            src={getProviderLogo(connection.provider)}
                            alt={getProviderName(connection.provider)}
                            className="w-5 h-5 object-contain"
                          />
                        )}
                        <span className="truncate">{getProviderName(connection.provider)}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    

                    {!connection.isReadOnly && (
                      <td className="pl-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit Button */}
                        <Tooltip content="Edit">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(connection)}
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
                          >
                            <Trash2 className="h-4 w-4 hover:text-red-500" />
                          </Button>
                        </Tooltip>
                      </div>
                    </td>
                    )}
                  </tr>
                ))}
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
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      <CreateCredentialsModal
        isOpen={isCreateModalOpen}
        onClose={handleModalClose}
        onSuccess={handleSuccess}
        group="vector_db_creds"
        editConnection={editingConnection}
      />

      {/* Delete Confirmation Modal */}
      {deletingConnection && (
        <DeleteCredentialsModal
          isOpen={!!deletingConnection}
          credentialId={deletingConnection.id}
          credentialName={deletingConnection.name}
          group="vector_db_creds"
          onClose={handleDeleteModalClose}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}

