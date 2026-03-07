/**
 * OAuthConnectionsCredentials Component
 *
 * Main container for displaying and managing OAuth credential connections.
 *
 * @component
 */

import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@src/react/shared/components/ui/tooltip';
import { errorToast, successToast } from '@src/shared/components/toast';
import { signOutOAuthConnection } from '@src/shared/helpers/oauth/oauth-api.helper';
import { getBackendOrigin } from '@src/shared/helpers/oauth/oauth.utils';
import { Info, PlusCircle } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CreateCredentialsModal,
  type CredentialConnection,
} from '../../credentials/components/create-credentials.modal';
import { CredentialsListSkeleton } from '../../credentials/components/credentials-list-skeleton';
import { DeleteCredentialsModal } from '../../credentials/components/delete-credentials.modal';
import { useCredentials } from '../../credentials/hooks/use-credentials';
import { OAuthConnectionRow } from './oauth-connection-row';

/**
 * OAuthConnectionsCredentials Component
 */
export function OAuthConnectionsCredentials() {
  // --- State ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<CredentialConnection | undefined>();
  const [deletingConnection, setDeletingConnection] = useState<CredentialConnection | undefined>();

  const {
    credentials: allCredentials,
    isLoading,
    refetch,
  } = useCredentials('oauth_connections_creds');

  const credentials = useMemo(() => {
    if (!allCredentials) return [];

    return allCredentials.filter((c) => !c.customProperties?._isHidden);
  }, [allCredentials]);

  // --- Authentication Message Handler ---
  const handleAuthTabMessage = useCallback(
    (event: MessageEvent) => {
      const allowedOrigins = new Set([window.location.origin, getBackendOrigin()]);

      if (!allowedOrigins.has(event.origin)) return;

      const { type, data } = event.data || {};
      console.log('[handleAuthTabMessage] Message received:', event.data);

      if (type === 'oauth' || type === 'oauth2') {
        successToast('Authentication successful!');
        refetch();
      } else if (type === 'error') {
        errorToast(`Authentication Error: ${data?.message || 'An unknown error occurred'}`);
      }
    },
    [refetch],
  );

  // --- Effects ---
  useEffect(() => {
    window.addEventListener('message', handleAuthTabMessage);
    return () => window.removeEventListener('message', handleAuthTabMessage);
  }, [handleAuthTabMessage]);

  // --- Event Handlers ---
  const handleSuccess = async (data: {
    id?: string;
    name: string;
    provider: string;
    credentials: Record<string, string>;
    isEdit: boolean;
  }) => {
    successToast(
      data.isEdit ? 'Connection updated successfully.' : 'Connection created successfully.',
    );

    if (data.isEdit) {
      // /signOut to let user authenticate again using the new credentials
      await signOutOAuthConnection(data.id, true);
    }
    setEditingConnection(undefined);
    refetch();
  };

  const handleEditClick = (connection: CredentialConnection) => {
    setEditingConnection(connection);
    setIsCreateModalOpen(true);
  };

  const handleDeleteClick = (connection: CredentialConnection) => {
    setDeletingConnection(connection);
  };

  const handleDeleteSuccess = () => {
    setDeletingConnection(undefined);
    refetch();
  };

  const handleModalClose = () => {
    setIsCreateModalOpen(false);
    setEditingConnection(undefined);
  };

  // const handleAuthSuccess = () => {
  //   refetch();
  // };

  // --- Render ---
  return (
    <div
      id="oauth-connections-credentials"
      className="rounded-lg bg-card text-card-foreground border border-solid border-gray-200 shadow-sm"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pr-2 flex-wrap">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            OAuth Connections
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="w-72 text-center">
                <p>Manage connections to OAuth services for storing and retrieving credentials</p>
              </TooltipContent>
            </Tooltip>
          </h2>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <CredentialsListSkeleton rows={3} />
          ) : credentials.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground mb-2">No OAuth connections found</p>
              <p className="text-sm text-gray-500">Get started by adding your first connection</p>
            </div>
          ) : (
            <table className="w-full min-w-[500px] text-sm text-left table-fixed">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="pr-4 py-2 w-1/4">Connection Name</th>
                  <th className="px-4 py-2 w-1/4">Provider</th>
                  <th className="px-4 py-2 w-1/6">Status</th>
                  <th className="px-4 py-2 w-1/3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((connection) => (
                  <OAuthConnectionRow
                    key={connection.id}
                    connection={connection}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                    // onAuthSuccess={handleAuthSuccess}
                  />
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
            label="Add OAuth Connection"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      <CreateCredentialsModal
        isOpen={isCreateModalOpen}
        onClose={handleModalClose}
        onSuccess={handleSuccess}
        group="oauth_connections_creds"
        editConnection={editingConnection}
      />

      {/* Delete Confirmation Modal */}
      {deletingConnection && (
        <DeleteCredentialsModal
          isOpen={!!deletingConnection}
          credentialId={deletingConnection.id}
          credentialName={deletingConnection.name}
          group="oauth_connections_creds"
          onClose={() => setDeletingConnection(undefined)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
}
