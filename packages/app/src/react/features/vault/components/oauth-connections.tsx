// src/webappv2/pages/vault/oauth-connections.tsx
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button'; // Your custom button
import { useToast } from '@src/react/shared/hooks/useToast';
import {
  extractPlatformFromUrl,
  getBackendOrigin,
  mapOAuthTypeDisplay,
} from '@src/shared/utils/oauth.utils';
import { useQueryClient } from '@tanstack/react-query'; // Import useQueryClient
import { Circle, Copy, Pencil, PlusCircle, Trash2 } from 'lucide-react';
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

  const { toast } = useToast();
  const queryClient = useQueryClient(); // Get query client instance

  // --- React Query Hooks ---
  const { data: connectionsData, isLoading, error: fetchError } = useOAuthConnections();
  console.log('[OAuthConnections] useOAuthConnections hook result:', {
    connectionsData,
    isLoading,
    fetchError,
  });
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
    console.log('[OAuthConnections] Processing connectionsData:', connectionsData);
    if (!connectionsData) return [];
    const arr = Object.values(connectionsData);
    const sorted = arr.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }),
    );
    console.log('[OAuthConnections] Sorted connections array:', sorted);
    return sorted;
  }, [connectionsData]);

  // --- Authentication Message Handling ---
  const handleAuthMessage = useCallback(
    (event: MessageEvent) => {
      console.log('[OAuthConnections] handleAuthMessage received event:', event.data);
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
        console.log('[handleAuthMessage] Authentication successful for type:', type);
        toast({ title: 'Success', description: 'Authentication successful!' });
        // Invalidate the query cache to refetch data AFTER successful auth
        console.log('[handleAuthMessage] Invalidating OAuth queries to refetch data');
        queryClient.invalidateQueries({ queryKey: OAUTH_QUERY_KEY });
      } else if (type === 'error') {
        console.log('[handleAuthMessage] Authentication error:', data);
        toast({
          title: 'Authentication Error',
          description: data?.message || 'An unknown error occurred during authentication.',
          variant: 'destructive',
        });
      }
      // Keep the listener persistent so multiple auth attempts are handled
      // If you need per-attempt correlation, include a state param and filter here.
    },
    [toast, queryClient], // Add queryClient to dependencies
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
    console.log('[OAuthConnections] Effect triggered - connectionsData changed:', connectionsData);
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
      console.log(
        '[OAuthConnections] Checking auth status for connection:',
        conn.name,
        'prefix:',
        prefix,
      );
      checkAuthMutation.mutate(conn.oauth_info);
    });
  }, [connectionsData, checkAuthMutation]);

  // --- CRUD Handlers ---

  const handleSaveConnection = async (formData: OAuthConnectionFormData) => {
    console.log('[OAuthConnections] handleSaveConnection called with formData:', formData);
    setIsProcessing(true);
    try {
      if (editingConnection) {
        // Update existing connection
        console.log('[OAuthConnections] Updating existing connection:', editingConnection.id);
        await updateMutation.mutateAsync({
          connectionId: editingConnection.id,
          updatedFields: formData,
        });
        toast({ title: 'Success', description: 'OAuth connection updated.' });
      } else {
        // Create new connection
        console.log('[OAuthConnections] Creating new connection');
        await createMutation.mutateAsync(formData);
        toast({ title: 'Success', description: 'OAuth connection created.' });
        // After creating, proactively initiate auth for oauth/oauth2 (not client creds)
        const service = formData.oauthService;
        if (service && service !== 'OAuth2 Client Credentials') {
          console.log(
            '[OAuthConnections] Initiating auth for newly created connection with service:',
            service,
          );
          // The list will be refetched; to get the new item, delay slightly then initiate
          setTimeout(() => {
            // Find the newly created connection in the cache and trigger auth popup
            const latest =
              queryClient.getQueryData<Record<string, OAuthConnection>>(OAUTH_QUERY_KEY);
            console.log('[OAuthConnections] Latest query data for auth initiation:', latest);
            if (latest) {
              const created = Object.values(latest)
                .filter((c) => c.name === formData.name)
                .sort((a, b) => (a.id > b.id ? -1 : 1))[0];
              console.log('[OAuthConnections] Found newly created connection for auth:', created);
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
      toast({
        title: 'Error',
        description: `Failed to ${editingConnection ? 'update' : 'create'} connection: ${
          err.message || 'Unknown error'
        }`,
        variant: 'destructive',
      });
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
    console.log(
      '[OAuthConnections] handleDeleteConfirm called for connection:',
      connection.id,
      connection.name,
    );
    setIsProcessing(true);
    try {
      await deleteMutation.mutateAsync({ connectionId: connection.id });
      toast({ title: 'Success', description: 'OAuth connection deleted.' });
      // Close modal and clear state *after* successful deletion
      setIsDeleteModalOpen(false);
      setConnectionToDelete(undefined);
    } catch (err: any) {
      console.error('Error deleting connection:', err);
      toast({
        title: 'Error',
        description: `Failed to delete connection: ${err.message || 'Unknown error'}`,
        variant: 'destructive',
      });
      // Keep modal open on error? Or close? For now, we only close on success.
    } finally {
      console.log('Finished handleDeleteConfirm.');
      setIsProcessing(false);
    }
  };

  const handleDuplicateClick = async (connection: OAuthConnection) => {
    console.log(
      '[OAuthConnections] handleDuplicateClick called for connection:',
      connection.id,
      connection.name,
    );
    setIsProcessing(true);
    try {
      await duplicateMutation.mutateAsync({ connectionToDuplicate: connection });
      toast({ title: 'Success', description: `Connection "${connection.name}" duplicated.` });
    } catch (err: any) {
      console.error('Error duplicating connection:', err);
      toast({
        title: 'Error',
        description: `Failed to duplicate connection: ${err.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      console.log('Finished handleDuplicateClick.');
      setIsProcessing(false);
    }
  };

  // --- Authentication Handlers ---

  const handleAuthenticateClick = async (connection: OAuthConnection) => {
    console.log(
      '[OAuthConnections] handleAuthenticateClick called for connection:',
      connection.id,
      connection.name,
      connection.type,
    );

    try {
      // Fix: Check oauth_info.service instead of connection.type
      if (connection.oauth_info?.service === 'oauth2_client_credentials') {
        console.log(
          '[OAuthConnections] Using client credentials authentication for:',
          connection.name,
        );
        await authenticateClientCredsMutation.mutateAsync(connection.oauth_info);
        toast({
          title: 'Authenticated!',
          description: 'Client Credentials authentication was successful.',
        });
        // Reflect status in UI immediately
        queryClient.invalidateQueries({ queryKey: OAUTH_QUERY_KEY });
      } else {
        console.log('[OAuthConnections] Using OAuth flow authentication for:', connection.name);
        await initiateAuthMutation.mutateAsync(connection.oauth_info);
      }
    } catch (err: any) {
      console.error('Error initiating authentication:', err);
      toast({
        title: 'Authentication Error',
        description: `Could not start authentication: ${err.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  };

  const handleSignOutClick = async (connection: OAuthConnection) => {
    console.log(
      '[OAuthConnections] handleSignOutClick called for connection:',
      connection.id,
      connection.name,
    );
    setIsProcessing(true);
    try {
      await signOutMutation.mutateAsync({
        connectionId: connection.id,
      });
      toast({ title: 'Success', description: 'Successfully signed out.' });
      // No need to manually close modal or clear state here as it's an inline action
    } catch (err: any) {
      console.error('Error signing out:', err);
      toast({
        title: 'Error',
        description: `Failed to sign out: ${err.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      console.log('Finished handleSignOutClick.');
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
    <div className="w-full p-6 rounded-lg border border-solid border-[#d9d9d9] flex-col justify-start items-start gap-6 flex">
      <div className="self-stretch text-[#1e1e1e] text-lg font-semibold font-['Inter'] leading-snug">
        OAuth Connections
      </div>
      <div className="w-full">
        {' '}
        {/* Container for the table and button */}
        {isLoading ? (
          <div>Loading connections...</div>
        ) : connections.length === 0 ? (
          <div className="py-4 text-center text-gray-500">No OAuth connections found</div>
        ) : (
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Platform
                </th>
                <th scope="col" className="px-4 py-3">
                  Connection Name
                </th>
                <th scope="col" className="px-4 py-3">
                  Type
                </th>
                <th scope="col" className="px-4 py-3">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Actions
                </th>
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
                  <tr key={conn.id} className="bg-white border-b hover:bg-gray-50">
                    {/* Platform Column */}
                    <td className="px-4 py-3 truncate max-w-[150px]" title={platformDisplay}>
                      {platformDisplay || '-'} {/* Show hyphen if empty */}
                    </td>
                    {/* Name Column */}
                    <td
                      className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap truncate max-w-[200px]"
                      title={conn.name}
                    >
                      {conn.name}
                    </td>
                    {/* Type Column */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex h-5 items-center justify-center rounded-md bg-[#f3f4f6] px-2 text-xs font-medium text-[#6b7280]"
                        title={conn.type}
                      >
                        {mapOAuthTypeDisplay(conn.type)}
                      </span>
                    </td>
                    {/* Status Column */}
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center justify-start"
                        title={isActive ? 'Active' : 'Inactive'}
                      >
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
                        {/* Removed status text as requested */}
                      </div>
                    </td>
                    {/* Actions Column */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Authentication Buttons */}
                        {conn.oauth_info &&
                          (conn.isAuthenticated ||
                          (conn.type === 'oauth2_client_credentials' && conn.primary) ? (
                            <button
                              type="button"
                              onClick={() => handleSignOutClick(conn)}
                              disabled={
                                signOutMutation.isLoading || isProcessing || isCheckingStatus
                              }
                              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
                            >
                              Sign Out
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAuthenticateClick(conn)}
                              disabled={
                                initiateAuthMutation.isLoading || isProcessing || isCheckingStatus
                              }
                              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
                            >
                              Authenticate
                            </button>
                          ))}

                        {/* Duplicate Button */}
                        <button
                          type="button"
                          onClick={() => handleDuplicateClick(conn)}
                          className="h-8 w-8 p-0 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50"
                          title="Duplicate"
                          disabled={isDisabled}
                        >
                          <Copy className="h-4 w-4" />
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleEditClick(conn)}
                          className="h-8 w-8 p-0 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50"
                          title="Edit"
                          disabled={isDisabled}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteClick(conn)}
                          className="h-8 w-8 p-0 flex items-center justify-center text-gray-500 hover:text-red-500 disabled:opacity-50"
                          title="Delete"
                          disabled={isDisabled}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
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
