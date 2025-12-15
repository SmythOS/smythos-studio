/**
 * OAuthConnectionRow Component
 * 
 * Handles a single OAuth connection row with its own authentication state and actions.
 * 
 * @component
 */

import { Button } from '@src/react/shared/components/ui/button';
import { Button as CustomButton } from '@src/react/shared/components/ui/newDesign/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@src/react/shared/components/ui/tooltip';
import { errorToast, successToast } from '@src/shared/components/toast';
import { Circle, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CredentialConnection } from '../../credentials/components/create-credentials.modal';
import credentialsSchema from '../../credentials/credentials-schema.json';
import { useCredentialById } from '../../credentials/hooks/use-credentials';
import {
  useAuthenticateClientCredentials,
  useCheckAuthStatus,
  useInitiateOAuth,
  useSignOutOAuth,
} from '../components/use-oauth-creds';
import { OAuthInfo } from '../types/oauth-connection';




// --- Helper Functions ---

/**
 * Build OAuth info object from credential connection
 */

const PROVIDER_TO_SERVICE_MAP: Record<string, string> = {
  google: 'google',
  linkedin: 'linkedin',
  twitter: 'twitter',
  custom_oauth2: 'oauth2',
  custom_oauth1: 'oauth1',
  oauth2_client_credentials: 'oauth2_client_credentials',
};
function buildOAuthInfoFromCred(connection: CredentialConnection): OAuthInfo | null {
  if (!connection.credentials || !connection.id) return null;

  const service = PROVIDER_TO_SERVICE_MAP[connection.provider] || connection.provider;

  const oauthInfo: OAuthInfo = {
    oauth_keys_prefix: connection.id,
    service,
    name: connection.name,
    platform: connection.credentials.platform || '',
    ...connection.credentials,
  };

  oauthInfo.tokens = connection.customProperties?.tokens;

  return oauthInfo;
}






/**
 * Get provider display info from schema
 */
function getProviderInfo(providerId: string) {
  const provider = (credentialsSchema as Array<{ id: string; name: string; logo_url?: string }>)
    .find((p) => p.id === providerId);
  
  return {
    name: provider?.name || providerId,
    logoUrl: provider?.logo_url,
  };
}

// --- Component Props ---
interface OAuthConnectionRowProps {
  connection: CredentialConnection;
  onEdit: (connection: CredentialConnection) => void;
  onDelete: (connection: CredentialConnection) => void;
  onAuthStatusChange?: (isAuthenticated: boolean) => void;
}

/**
 * OAuthConnectionRow Component
 */
export function OAuthConnectionRow({ connection, onEdit, onDelete, onAuthStatusChange }: OAuthConnectionRowProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const hasCheckedAuth = useRef(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const providerInfo = getProviderInfo(connection.provider);

  // --- OAuth Mutations ---
  const checkAuthMutation = useCheckAuthStatus();
  const initiateAuthMutation = useInitiateOAuth();
  const signOutMutation = useSignOutOAuth();
  const authenticateClientCredsMutation = useAuthenticateClientCredentials();


const {getData} = useCredentialById(connection.id, 'oauth_connections_creds', { lazy: true, resolveVaultKeys: true });

const getOAuthFullInfo = useCallback(async () => {
  const oauthFullCredRecord = await getData();
  return buildOAuthInfoFromCred(oauthFullCredRecord);
}, [getData]);

  // Check authentication status on mount (only once)
  useEffect(() => {
   async function fetch() {
    const oauthInfo = await getOAuthFullInfo();
    if (hasCheckedAuth.current || !oauthInfo) return;
    
    // Skip client credentials and already authenticated
    if (oauthInfo.service === 'oauth2_client_credentials') return;
    if (typeof connection.isActive === 'boolean') return;

    hasCheckedAuth.current = true;
    checkAuthMutation.mutate(oauthInfo);
   }


   fetch();
  }, [connection, checkAuthMutation, getOAuthFullInfo]);

  useEffect(() => {
    async function isActiveFetch() {
      const oauthInfo = await getOAuthFullInfo();
      // const isActive =  isConnectionActive(oauthInfo);
      if (typeof oauthInfo.isActive === 'boolean') return oauthInfo.isActive;
    
      // const isClientCreds = oauthInfo?.service.includes('oauth');
      const _isActive = Boolean((oauthInfo?.tokens as any)?.primary);
      setIsAuthenticated(_isActive);
     }

    isActiveFetch();

  }, [connection, getOAuthFullInfo]);

  // --- Event Handlers ---
  const handleAuthenticateClick = async () => {
    if (!connection.id) {
      errorToast('OAuth configuration not found for this connection.');
      return;
    }

    setIsProcessing(true);
    try {
      const oauthInfo = await getOAuthFullInfo();
      if (oauthInfo.service === 'oauth2_client_credentials') {
        await authenticateClientCredsMutation.mutateAsync(oauthInfo);
        successToast('Authenticated! Client Credentials authentication was successful.');
        setIsAuthenticated(true);
        onAuthStatusChange && onAuthStatusChange(true);
      } else {
        await initiateAuthMutation.mutateAsync(oauthInfo);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      errorToast(`Could not start authentication: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignOutClick = async () => {
    setIsProcessing(true);
    try {
      await signOutMutation.mutateAsync({ connectionId: connection.id });
      successToast('Successfully signed out.');
      hasCheckedAuth.current = false; // Allow re-checking
      setIsAuthenticated(false);
      onAuthStatusChange && onAuthStatusChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      errorToast(`Failed to sign out: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // const isCheckingStatus = checkAuthMutation.isLoading && 
  //   oauthInfo && 
  //   checkAuthMutation.variables?.oauth_keys_prefix === oauthInfo.oauth_keys_prefix;

  const isDisabled = isProcessing || 
    signOutMutation.isLoading || 
    initiateAuthMutation.isLoading || 
    authenticateClientCredsMutation.isLoading; 

  // --- Render ---
  return (
    <tr className="border-t">
      {/* Connection Name */}
      <td className="pr-4 py-3 truncate" title={connection.name}>
        <div className="flex items-center gap-2">
          <span className="font-medium">{connection.name}</span>
          {connection.isManaged && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border border-blue-200 shadow-sm"
              title="This is an internal connection automatically managed by SmythOS"
            >
              <svg className="w-3 h-3 mr-1 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm.93 12.412a.75.75 0 11-1.86 0l-1.406-5.624A.75.75 0 017.38 7h5.24a.75.75 0 01.716.788l-1.406 5.624zm-.93-7.162a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
              Managed
            </span>
          )}
        </div>
      </td>

      {/* Provider */}
      <td className="px-4 py-3" title={providerInfo.name}>
        <div className="flex items-center gap-2">
          {providerInfo.logoUrl && (
            <img src={providerInfo.logoUrl} alt={providerInfo.name} className="w-5 h-5 object-contain" />
          )}
          <span className="truncate">{providerInfo.name}</span>
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <div className="flex" title={isAuthenticated ? 'Active' : 'Inactive'}>
          {/* {isCheckingStatus ? (
            <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-gray-400" title="Checking..." />
          ) : (
          )} */}
          <Circle className={`h-3 w-3 ${isAuthenticated ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'}`} />
        </div>
      </td>

      {/* Actions */}
      {!connection.isReadOnly && (
        <td className="pl-4 py-3">
          <div className="flex items-center justify-end gap-1">
            {/* Authentication Button */}
            {connection.id && (
              isAuthenticated ? (
                <CustomButton
                  variant="secondary"
                  handleClick={handleSignOutClick}
                  disabled={isDisabled}
                  label="Sign Out"
                  className="h-8 px-3 text-xs whitespace-nowrap"
                />
              ) : (
                <CustomButton
                  variant="secondary"
                  handleClick={handleAuthenticateClick}
                  disabled={isDisabled}
                  label="Authenticate"
                  className="h-8 px-3 text-xs whitespace-nowrap"
                />
              )
            )}

            {/* Edit Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => onEdit(connection)} disabled={isDisabled}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Edit</p></TooltipContent>
            </Tooltip>

            {/* Delete Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => onDelete(connection)} disabled={isDisabled}>
                  <Trash2 className="h-4 w-4 hover:text-red-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Delete</p></TooltipContent>
            </Tooltip>
          </div>
        </td>
      )}
    </tr>
  );
}

