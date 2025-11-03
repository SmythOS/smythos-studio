// src/webappv2/pages/vault/oauth-connections.tsx
import { Button } from '@src/react/shared/components/ui/button'; // Standard Button component for consistency
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button'; // Your custom button
import { errorToast, successToast } from '@src/shared/components/toast';
import {
  extractPlatformFromUrl,
  getBackendOrigin,
  mapOAuthTypeDisplay,
} from '@src/shared/helpers/oauth/oauth.utils';
import { useQueryClient } from '@tanstack/react-query'; // Import useQueryClient
import { Tooltip } from 'flowbite-react';
import { Circle, CopyPlus, Info, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import {
  OAUTH_QUERY_KEY, // Import the query key
  useAuthenticateClientCredentials,
  useCheckAuthStatus,
  useCreateOAuthConnection,
  useDeleteOAuthConnection,
  useDuplicateOAuthConnection,
  useInitiateOAuth,
  useOAuthConnections,
  useSignOutOAuth,
  useUpdateOAuthConnection,
} from '../components/use-vault-oauth';
import type { OAuthConnection, OAuthConnectionFormData } from '../types/oauth-connection';
import { CreateOAuthConnectionModal } from './create-oauth-connection-modal';
import { DeleteOAuthConnectionModal } from './delete-oauth-connection-modal';
//import { Skeleton } from '@/components/ui/skeleton'; // For loading state

export function OAuthConnections() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<OAuthConnection | undefined>();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [connectionToDelete, setConnectionToDelete] = useState<OAuthConnection | undefined>();
  const [isProcessing, setIsProcessing] = useState(false); // General processing state

  const queryClient = useQueryClient(); // Get query client instance

  // --- React Query Hooks ---
  const { data: connectionsData, isLoading, error: fetchError } = useOAuthConnections();
  // console.log('[OAuthConnections] useOAuthConnections hook result:', {
  //   connectionsData,
  //   isLoading,
  //   fetchError,
  // });
  const createMutation = useCreateOAuthConnection();
  const updateMutation = useUpdateOAuthConnection();
  const deleteMutation = useDeleteOAuthConnection();
  const duplicateMutation = useDuplicateOAuthConnection();
  const initiateAuthMutation = useInitiateOAuth();
  const checkAuthMutation = useCheckAuthStatus();
  const signOutMutation = useSignOutOAuth();
  const authenticateClientCredsMutation = useAuthenticateClientCredentials();

  // Derived state: convert connectionsData object to array for mapping
  const connections = React.useMemo(() => {
    // console.log('[OAuthConnections] Processing connectionsData:', connectionsData);
    if (!connectionsData) return [];
    const arr = Object.values(connectionsData);
    const sorted = arr.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }),
    );
    // console.log('[OAuthConnections] Sorted connections array:', sorted);
    return sorted;
  }, [connectionsData]);

  // --- Authentication Message Handling ---
  const handleAuthMessage = useCallback(
    (event: MessageEvent) => {
      // console.log('[OAuthConnections] handleAuthMessage received event:', event.data);
      // Environment-aware origin check
      const allowedOrigins = new Set<string>([
        window.location.origin, // frontend origin
        getBackendOrigin(), // backend origin
      ]);

      if (!allowedOrigins.has(event.origin)) {
        console.warn('Message received from unexpected origin:', event.origin);
        return; // Reject messages from unknown origins
      }

      const { type, data } = event.data || {};

      if (type === 'oauth' || type === 'oauth2') {
        // console.log('[handleAuthMessage] Authentication successful for type:', type);
        successToast('Authentication successful!');
        // Invalidate the query cache to refetch data AFTER successful auth
        // console.log('[handleAuthMessage] Invalidating OAuth queries to refetch data');
        queryClient.invalidateQueries({ queryKey: OAUTH_QUERY_KEY });
      } else if (type === 'error') {
        // console.log('[handleAuthMessage] Authentication error:', data);
        errorToast(
          `Authentication Error: ${data?.message || 'An unknown error occurred during authentication.'}`,
        );
      }
      // Keep the listener persistent so multiple auth attempts are handled
      // If you need per-attempt correlation, include a state param and filter here.
    },
    [queryClient], // Add queryClient to dependencies
  );

  // Effect to add/remove the global message listener
  useEffect(() => {
    // Add listener when the component mounts or when auth is initiated
    // Remove listener when the component unmounts
    // Note: This simple approach might have issues if multiple auth flows are triggered.
    // A more robust solution might involve passing a unique state to the OAuth flow
    // and listening for messages matching that state.
    window.addEventListener('message', handleAuthMessage);
    return () => {
      window.removeEventListener('message', handleAuthMessage);
    };
  }, [handleAuthMessage]);

  // Effect to check authentication status for connections when data changes
  useEffect(() => {
    // console.log('[OAuthConnections] Effect triggered - connectionsData changed:', connectionsData);
    if (!connectionsData) return;

    // Prevent duplicate concurrent checks per prefix
    const pending = new Set<string>();

    Object.values(connectionsData).forEach((conn) => {
      // Skip client credentials: we derive locally
      if (conn.type === 'oauth2_client_credentials') return;

      // Skip when already known locally (true/false)
      if (typeof conn.isAuthenticated === 'boolean') return;

      const prefix = conn.oauth_info?.oauth_keys_prefix;
      if (!prefix || pending.has(prefix)) return;

      pending.add(prefix);
      // console.log(
      //   '[OAuthConnections] Checking auth status for connection:',
      //   conn.name,
      //   'prefix:',
      //   prefix,
      // );
      checkAuthMutation.mutate(conn.oauth_info);
    });
  }, [connectionsData, checkAuthMutation]);

  // --- CRUD Handlers ---

  const handleSaveConnection = async (formData: OAuthConnectionFormData) => {
    // console.log('[OAuthConnections] handleSaveConnection called with formData:', formData);
    setIsProcessing(true);
    try {
      if (editingConnection) {
        // Update existing connection
        // console.log('[OAuthConnections] Updating existing connection:', editingConnection.id);
        await updateMutation.mutateAsync({
          connectionId: editingConnection.id,
          updatedFields: formData,
        });
        successToast('OAuth connection updated.');
      } else {
        // Create new connection
        // console.log('[OAuthConnections] Creating new connection');
        await createMutation.mutateAsync(formData);
        successToast('OAuth connection created.');
        // After creating, proactively initiate auth for oauth/oauth2 (not client creds)
        const service = formData.oauthService;
        if (service && service !== 'OAuth2 Client Credentials') {
          // console.log(
          //   '[OAuthConnections] Initiating auth for newly created connection with service:',
          //   service,
          // );
          // The list will be refetched; to get the new item, delay slightly then initiate
          setTimeout(() => {
            // Find the newly created connection in the cache and trigger auth popup
            const latest =
              queryClient.getQueryData<Record<string, OAuthConnection>>(OAUTH_QUERY_KEY);
            // console.log('[OAuthConnections] Latest query data for auth initiation:', latest);
            if (latest) {
              const created = Object.values(latest)
                .filter((c) => c.name === formData.name)
                .sort((a, b) => (a.id > b.id ? -1 : 1))[0];
              // console.log('[OAuthConnections] Found newly created connection for auth:', created);
              if (created?.oauth_info) {
                initiateAuthMutation.mutate(created.oauth_info);
              }
            }
          }, 350);
        }
      }
      setIsCreateModalOpen(false);
      setEditingConnection(undefined);
    } catch (err: any) {
      console.error('Error saving connection:', err);
      errorToast(
        `Failed to ${editingConnection ? 'update' : 'create'} connection: ${err.message || 'Unknown error'}`,
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEditClick = (connection: OAuthConnection) => {
    setEditingConnection(connection);
    setIsCreateModalOpen(true);
  };

  const handleDeleteClick = (connection: OAuthConnection) => {
    setConnectionToDelete(connection);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async (connection: OAuthConnection) => {
    // console.log(
    //   '[OAuthConnections] handleDeleteConfirm called for connection:',
    //   connection.id,
    //   connection.name,
    // );
    setIsProcessing(true);
    try {
      await deleteMutation.mutateAsync({ connectionId: connection.id });
      successToast('OAuth connection deleted.');
      // Close modal and clear state *after* successful deletion
      setIsDeleteModalOpen(false);
      setConnectionToDelete(undefined);
    } catch (err: any) {
      console.error('Error deleting connection:', err);
      errorToast(`Failed to delete connection: ${err.message || 'Unknown error'}`);
      // Keep modal open on error? Or close? For now, we only close on success.
    } finally {
      // console.log('Finished handleDeleteConfirm.');
      setIsProcessing(false);
    }
  };

  const handleDuplicateClick = async (connection: OAuthConnection) => {
    // console.log(
    //   '[OAuthConnections] handleDuplicateClick called for connection:',
    //   connection.id,
    //   connection.name,
    // );
    setIsProcessing(true);
    try {
      await duplicateMutation.mutateAsync({ connectionToDuplicate: connection });
      successToast(`Connection "${connection.name}" duplicated.`);
    } catch (err: any) {
      console.error('Error duplicating connection:', err);
      errorToast(`Failed to duplicate connection: ${err.message || 'Unknown error'}`);
    } finally {
      // console.log('Finished handleDuplicateClick.');
      setIsProcessing(false);
    }
  };

  // --- Authentication Handlers ---

  const handleAuthenticateClick = async (connection: OAuthConnection) => {
    // console.log(
    //   '[OAuthConnections] handleAuthenticateClick called for connection:',
    //   connection.id,
    //   connection.name,
    //   connection.type,
    // );

    try {
      // Fix: Check oauth_info.service instead of connection.type
      if (connection.oauth_info?.service === 'oauth2_client_credentials') {
        // console.log(
        //   '[OAuthConnections] Using client credentials authentication for:',
        //   connection.name,
        // );
        await authenticateClientCredsMutation.mutateAsync(connection.oauth_info);
        successToast('Authenticated! Client Credentials authentication was successful.');
        // Reflect status in UI immediately
        queryClient.invalidateQueries({ queryKey: OAUTH_QUERY_KEY });
      } else {
        // console.log('[OAuthConnections] Using OAuth flow authentication for:', connection.name);
        await initiateAuthMutation.mutateAsync(connection.oauth_info);
      }
    } catch (err: any) {
      console.error('Error initiating authentication:', err);
      errorToast(`Could not start authentication: ${err.message || 'Unknown error'}`);
    }
  };

  const handleSignOutClick = async (connection: OAuthConnection) => {
    // console.log(
    //   '[OAuthConnections] handleSignOutClick called for connection:',
    //   connection.id,
    //   connection.name,
    // );
    setIsProcessing(true);
    try {
      await signOutMutation.mutateAsync({
        connectionId: connection.id,
      });
      successToast('Successfully signed out.');
      // No need to manually close modal or clear state here as it's an inline action
    } catch (err: any) {
      console.error('Error signing out:', err);
      errorToast(`Failed to sign out: ${err.message || 'Unknown error'}`);
    } finally {
      // console.log('Finished handleSignOutClick.');
      setIsProcessing(false);
    }
  };

  // --- Helper Functions ---

  // Function to determine the platform display value
  const getPlatformDisplay = (conn: OAuthConnection): string => {
    // 1. Use explicitly set platform if available
    if (conn.oauth_info.platform && conn.oauth_info.platform.trim() !== '') {
      return conn.oauth_info.platform;
    }

    // 2. Use predefined names for known services
    const service = conn.oauth_info.service;
    if (service === 'google') return 'Google';
    if (service === 'linkedin') return 'LinkedIn';
    if (service === 'twitter') return 'Twitter/X'; // Handle twitter/x case

    // 3. Try extracting from URL
    const urlToParse = conn.oauth_info.authorizationURL || conn.oauth_info.userAuthorizationURL;
    if (urlToParse) {
      const extracted = extractPlatformFromUrl(urlToParse);
      // Avoid showing 'unknown' or 'invalid_url' directly if possible
      return extracted !== 'unknown' && extracted !== 'invalid_url' ? extracted : '';
    }

    // 4. Fallback to empty string if nothing else works
    return '';
  };

  // --- Render Logic ---

  if (fetchError) {
    return (
      <div className="rounded-lg bg-white text-gray-800 border border-solid border-gray-200 shadow-sm p-6">
        <div className="text-red-500">Error loading OAuth connections: {fetchError.message}</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-card text-card-foreground border border-solid border-gray-200 shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4 pr-2 flex-wrap">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            OAuth Connections
            <Tooltip
              className="w-72 text-center"
              content="Manage OAuth connections to authenticate and integrate with external services and APIs"
            >
              <Info className="w-4 h-4" />
            </Tooltip>
          </h2>
        </div>
        <div className="overflow-x-auto">
          {/* Table */}
          {isLoading ? (
            <div>Loading connections...</div>
          ) : connections.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground">No OAuth connections found</div>
          ) : (
            <table className="w-full min-w-[500px] text-sm text-left table-fixed">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="pr-4 py-2 w-1/6">Platform</th>
                  <th className="px-4 py-2 w-1/3">Connection Name</th>
                  <th className="px-4 py-2 w-1/6">Type</th>
                  <th className="px-4 py-2 w-1/6">Status</th>
                  <th className="px-4 py-2 w-1/6 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {connections.map((conn) => {
                  const isCheckingStatus =
                    checkAuthMutation.isLoading &&
                    checkAuthMutation.variables?.oauth_keys_prefix ===
                      conn.oauth_info.oauth_keys_prefix;

                  // Derive local active state when server status is unknown
                  const isClientCreds = conn.type === 'oauth2_client_credentials';
                  const isActive = Boolean(
                    (typeof conn.isAuthenticated === 'boolean' ? conn.isAuthenticated : false) ||
                      (isClientCreds && conn.primary),
                  );
                  const isProcessingAny =
                    isProcessing ||
                    duplicateMutation.isLoading ||
                    deleteMutation.isLoading ||
                    signOutMutation.isLoading ||
                    initiateAuthMutation.isLoading;
                  const isDisabled = isProcessingAny || isCheckingStatus;
                  const platformDisplay = getPlatformDisplay(conn);

                  return (
                    <tr key={conn.id} className="border-t">
                      {/* Platform Column */}
                      <td className="pr-4 py-2 truncate" title={platformDisplay}>
                        {platformDisplay || '-'}
                      </td>
                      {/* Name Column */}
                      <td className="px-4 py-2 truncate" title={conn.name}>
                        {conn.name}
                      </td>
                      {/* Type Column */}
                      <td className="px-4 py-2">
                        <span
                          className="inline-flex h-5 items-center justify-center rounded-md bg-[#f3f4f6] px-2 text-xs font-medium text-[#6b7280]"
                          title={conn.type}
                        >
                          {mapOAuthTypeDisplay(conn.type)}
                        </span>
                      </td>
                      {/* Status Column */}
                      <td className="px-4 py-2">
                        <div className="flex" title={isActive ? 'Active' : 'Inactive'}>
                          {isCheckingStatus ? (
                            <div
                              className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-gray-400"
                              title="Checking..."
                            ></div>
                          ) : (
                            <Circle
                              className={`h-3 w-3 ${
                                isActive
                                  ? 'fill-green-500 text-green-500'
                                  : 'fill-gray-400 text-gray-400'
                              }`}
                            />
                          )}
                        </div>
                      </td>
                      {/* Actions Column */}
                      <td className="pl-4 py-2">
                        <div className="flex items-center justify-end gap-1">
                          {/* Authentication Buttons */}
                          {conn.oauth_info &&
                            (conn.isAuthenticated ||
                            (conn.type === 'oauth2_client_credentials' && conn.primary) ? (
                              <CustomButton
                                variant="secondary"
                                handleClick={() => handleSignOutClick(conn)}
                                disabled={
                                  signOutMutation.isLoading || isProcessing || isCheckingStatus
                                }
                                label="Sign Out"
                                className="h-8 px-3 text-xs whitespace-nowrap"
                              />
                            ) : (
                              <CustomButton
                                variant="secondary"
                                handleClick={() => handleAuthenticateClick(conn)}
                                disabled={
                                  initiateAuthMutation.isLoading || isProcessing || isCheckingStatus
                                }
                                label="Authenticate"
                                className="h-8 px-3 text-xs whitespace-nowrap"
                              />
                            ))}

                          {/* Duplicate Button */}
                          <Tooltip content="Duplicate">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicateClick(conn)}
                              disabled={isDisabled}
                            >
                              <CopyPlus className="h-4 w-4" />
                            </Button>
                          </Tooltip>

                          {/* Edit Button */}
                          <Tooltip content="Edit">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(conn)}
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
                              onClick={() => handleDeleteClick(conn)}
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

        {/* Add Button - Placed below the table */}
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

      {/* Modals */}
      <CreateOAuthConnectionModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          if (!isProcessing && !createMutation.isLoading && !updateMutation.isLoading) {
            setIsCreateModalOpen(false);
            setEditingConnection(undefined);
          }
        }}
        onSubmit={handleSaveConnection}
        editConnection={editingConnection}
        isProcessing={isProcessing || createMutation.isLoading || updateMutation.isLoading}
      />
      <DeleteOAuthConnectionModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!deleteMutation.isLoading) {
            setIsDeleteModalOpen(false);
            setConnectionToDelete(undefined);
          }
        }}
        connection={connectionToDelete}
        onConfirm={handleDeleteConfirm}
        isProcessing={deleteMutation.isLoading || isProcessing}
      />
    </div>
  );
}
