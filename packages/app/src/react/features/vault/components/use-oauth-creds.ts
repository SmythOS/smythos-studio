/*
const finalInternalService = oauthService
        ? mapServiceNameToInternal(oauthService)
        : currentData.oauth_info.service;
      const finalType = oauthService
        ? isOAuth1Service(finalInternalService)
          ? 'oauth'
          : finalInternalService === 'oauth2_client_credentials'
            ? 'oauth2_client_credentials'
            : 'oauth2'
        : currentData.type;

      // Build the updated oauth_info object
      // Start with ALL existing oauth_info fields, then selectively update
      const updatedOAuthInfo: OAuthInfo = {
        // Preserve ALL existing oauth_info fields first
        ...currentData.oauth_info,
        // Then update specific fields
        oauth_keys_prefix: currentData.oauth_info.oauth_keys_prefix, // Never change
        service: finalInternalService,
        name: 'name' in updatedFields ? name : currentData.name,
        platform: 'platform' in updatedFields ? platform : currentData.oauth_info.platform,
      };
*/
import {
  authenticateClientCredentials as authenticateClientCredentialsShared,
  checkOAuthAuthentication as checkOAuthAuthenticationShared,
  initiateOAuthFlow as initiateOAuthFlowShared,
  signOutOAuthConnection as signOutOAuthConnectionShared,
} from '@src/shared/helpers/oauth/oauth-api.helper';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  AuthenticateOAuthPayload,
  CheckAuthStatusPayload,
  OAuthConnection,
  OAuthInfo,
  SignOutOAuthPayload,
} from '../types/oauth-connection';

function parseExpirationTimestamp(expiresIn?: string | number): number | null {
  if (expiresIn === undefined || expiresIn === '[REDACTED]') return null;
  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn)) return expiresIn;
  if (typeof expiresIn === 'string') {
    const numeric = Number(expiresIn);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

/**
 * Returns true if token is NOT expired, considering a small safety buffer.
 */
function isTokenCurrentlyValid(expiresAtMs: number | null, bufferSeconds: number = 60): boolean {
  if (expiresAtMs === null) return true; // if no expiry data, assume valid until server proves otherwise
  const now = Date.now();
  const bufferedNow = now + bufferSeconds * 1000;
  return expiresAtMs > bufferedNow;
}

/**
 * Best-effort local auth status evaluation to reduce server checks.
 * - oauth2_client_credentials: require primary token and non-expired (if expiry present)
 * - oauth2: primary token present; if expiry provided, ensure not expired; otherwise unknown
 * - oauth (OAuth1): require both primary and secondary (token + tokenSecret)
 * Returns true/false when determinable from local data, otherwise undefined to trigger server check.
 *
 * When tokens are redacted, we assume they're valid to prevent infinite auth check loops.
 */
function computeLocalAuthStatus(connection: Partial<OAuthConnection>): boolean | undefined {
  const type = connection.type;
  const primary = connection.primary;
  const secondary = connection.secondary;
  const expiresAt = parseExpirationTimestamp(connection.expires_in);

  // Check if tokens exist (either actual values or [REDACTED] placeholders)
  const hasPrimary = primary && primary !== '';
  const hasSecondary = secondary && secondary !== '';

  if (type === 'oauth2_client_credentials') {
    if (!hasPrimary) return false;
    // If expires_in is redacted but token exists, assume valid (server will verify on actual API calls)
    if (connection.expires_in === '[REDACTED]') return true;
    return isTokenCurrentlyValid(expiresAt);
  }

  if (type === 'oauth2') {
    if (!hasPrimary) return false;
    // If expires_in is redacted but token exists, assume valid (server will verify on actual API calls)
    if (connection.expires_in === '[REDACTED]') return true;
    // If we know expiry, respect it. If not, leave unknown to allow precise server validation.
    if (expiresAt !== null) return isTokenCurrentlyValid(expiresAt);
    return undefined;
  }

  if (type === 'oauth') {
    // OAuth 1.0a typically has no expiry; both tokens must exist
    if (hasPrimary && hasSecondary) return true;
    return false;
  }

  return undefined;
}

/**
 * Initiates the OAuth authentication flow using fetch.
 * @param {AuthenticateOAuthPayload} payload - Contains OAuth configuration details.
 * @returns {Promise<{ authUrl: string }>} A promise resolving to the authentication URL.
 */
const initiateOAuth = async (payload: AuthenticateOAuthPayload): Promise<{ authUrl: string }> => {
  const result = await initiateOAuthFlowShared(payload, false); // false to not auto-open popup
  if (!result.authUrl) {
    throw new Error('No authentication URL received');
  }
  return { authUrl: result.authUrl };
};

/**
 * Checks the authentication status of an OAuth connection using fetch.
 * @param {CheckAuthStatusPayload} payload - Contains OAuth configuration details for checking.
 * @returns {Promise<{ success: boolean }>} A promise resolving to the authentication status.
 */
const checkAuthStatus = async (payload: CheckAuthStatusPayload): Promise<{ success: boolean }> => {
  try {
    return await checkOAuthAuthenticationShared(payload);
  } catch (error) {
    console.error('API: checkAuthStatus - Error:', error);
    throw error;
  }
};

/**
 * Signs out an OAuth connection by invalidating its tokens using fetch.
 * @param {SignOutOAuthPayload} payload - Contains the connectionId to sign out.
 * @returns {Promise<any>} A promise resolving with the API response.
 */
const signOutOAuth = async ({ connectionId }: SignOutOAuthPayload): Promise<any> => {
  return signOutOAuthConnectionShared(connectionId, true);
};

/**
 * Hook to initiate OAuth authentication flow.
 * @returns Mutation object for initiating OAuth flow.
 */
export function useInitiateOAuth() {
  const queryClient = useQueryClient();
  // This mutation doesn't directly change server state in our list,
  // but triggers an external flow. Success means the popup opened.
  return useMutation<{ authUrl: string }, Error, AuthenticateOAuthPayload>({
    mutationFn: initiateOAuth,
    onSuccess: (data, variables) => {
      // Open the popup window
      if (data.authUrl) {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        window.open(
          data.authUrl,
          '_blank',
          `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`,
        );
        // Add listener here or manage globally? Usually managed where the hook is called.
      } else {
        console.error('Authentication URL was not returned from the server.');
        // Optionally show a toast message to the user
        // toast({ title: 'Error', description: 'Could not start authentication.', variant: 'destructive' });
      }
    },
    onError: (error) => {
      console.error('Failed to initiate OAuth:', error);
      // Optionally show a toast message to the user
      // toast({ title: 'Error', description: `Authentication failed: ${error.message}`, variant: 'destructive' });
    },
  });
}

/**
 * Hook to check the authentication status of a connection.
 * This might be used for manually refreshing the status indicator.
 * @returns Mutation object for checking auth status.
 */
export function useCheckAuthStatus() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, CheckAuthStatusPayload>({
    mutationFn: checkAuthStatus,
    onSuccess: (data, variables) => {
      // Update cache ONLY with the isAuthenticated status
      //   queryClient.setQueryData<OAuthSettings>(OAUTH_QUERY_KEY, (oldData) => {
      //     if (!oldData) return oldData;
      //     const connectionId = variables.oauth_keys_prefix + '_TOKENS';
      //     const connection = oldData[connectionId];
      //     if (connection) {
      //       // Only update if the authenticated status actually changed
      //       if (connection.isAuthenticated === data.success) {
      //         return oldData; // Return original reference
      //       }
      //       return {
      //         ...oldData,
      //         [connectionId]: {
      //           ...connection,
      //           isAuthenticated: data.success,
      //         },
      //       };
      //     }
      //     return oldData;
      //   });
    },
    onError: (error, variables) => {
      console.error(`HOOK: useCheckAuthStatus - onError for ${variables.oauth_keys_prefix}`, error);
      // Update cache ONLY with the isAuthenticated status (false)
      //   queryClient.setQueryData<OAuthSettings>(OAUTH_QUERY_KEY, (oldData) => {
      //     if (!oldData) return oldData;
      //     const connectionId = variables.oauth_keys_prefix + '_TOKENS';
      //     const connection = oldData[connectionId];
      //     if (connection) {
      //       // Only update if the authenticated status is not already false
      //       if (connection.isAuthenticated === false) {
      //         return oldData; // Return original reference
      //       }
      //       return {
      //         ...oldData,
      //         [connectionId]: {
      //           ...connection,
      //           isAuthenticated: false, // Assume false on error
      //         },
      //       };
      //     }
      //     return oldData;
      //   });
    },
  });
}

/**
 * Hook to sign out an OAuth connection.
 * @returns Mutation object for signing out.
 */
export function useSignOutOAuth() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, SignOutOAuthPayload>({
    mutationFn: signOutOAuth,
    onSuccess: (data, variables) => {
      if (data.invalidate) {
        // queryClient.setQueryData<OAuthSettings>(OAUTH_QUERY_KEY, (oldData) => {
        //   if (!oldData) return oldData;
        //   const connection = oldData[variables.connectionId];
        //   if (connection) {
        //     // Create a new object for the updated connection
        //     const updatedConnection = {
        //       ...connection,
        //       primary: undefined,
        //       secondary: undefined,
        //       expires_in: undefined,
        //       isAuthenticated: false, // Explicitly set to false
        //     };
        //     // Return the updated state
        //     return {
        //       ...oldData,
        //       [variables.connectionId]: updatedConnection,
        //     };
        //   }
        //   return oldData;
        // });
      }
    },
    onError: (error) => {
      console.error('Failed to sign out:', error);
      // Optionally show a toast message to the user
      // toast({ title: 'Error', description: `Sign out failed: ${error.message}`, variant: 'destructive' });
    },
  });
}

const authenticateClientCredentials = async (
  payload: OAuthInfo,
): Promise<{ success: boolean; message: string }> => {
  return authenticateClientCredentialsShared(payload);
};

export function useAuthenticateClientCredentials() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; message: string }, Error, OAuthInfo>({
    mutationFn: authenticateClientCredentials,
    onSuccess: () => {
      // queryClient.invalidateQueries({ queryKey: OAUTH_QUERY_KEY });
    },
    onError: (error) => {
      console.error('Failed to authenticate client credentials:', error);
    },
  });
}
