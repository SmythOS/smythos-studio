// src/webappv2/pages/vault/use-vault-oauth.ts
import {
  authenticateClientCredentials as authenticateClientCredentialsShared,
  checkOAuthAuthentication as checkOAuthAuthenticationShared,
  deleteOAuthConnection as deleteOAuthConnectionShared,
  fetchOAuthConnections as fetchOAuthConnectionsShared,
  initiateOAuthFlow as initiateOAuthFlowShared,
  saveOAuthConnection as saveOAuthConnectionShared,
  signOutOAuthConnection as signOutOAuthConnectionShared
} from '@src/shared/helpers/oauth-api.helper';
import {
  generateOAuthId,
  isOAuth1Service,
  mapInternalToServiceName,
  mapServiceNameToInternal
} from '@src/shared/utils/oauth.utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AuthenticateOAuthPayload,
  CheckAuthStatusPayload,
  CreateOAuthConnectionPayload,
  DeleteOAuthConnectionPayload,
  OAuthConnection,
  OAuthInfo,
  OAuthSettings,
  SignOutOAuthPayload,
  UpdateOAuthConnectionPayload
} from '../types/oauth-connection';

export const OAUTH_QUERY_KEY = ['oauthConnections'];

// ============================================================================
// Local Auth Status Derivation Helpers
// ============================================================================

/**
 * Parses an expiration timestamp provided as string or number into a number (ms since epoch).
 * Returns null for undefined, redacted, or invalid values.
 */
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
 * Fetches all OAuth connection settings by calling the backend API.
 * Assumes the backend endpoint GET /vault/oauth-connections uses getTeamSettingsObj(req, 'oauth').
 * @returns {Promise<OAuthSettings>} A promise resolving to the OAuth settings object.
 */
/**
 * Fetches all OAuth connection settings by calling the backend API.
 * Assumes the backend endpoint GET /vault/oauth-connections uses getTeamSettingsObj(req, 'oauth').
 * Filters the results to only include connections that have a 'name' property.
 * @returns {Promise<OAuthSettings>} A promise resolving to the filtered OAuth settings object.
 */
const fetchOAuthConnections = async (): Promise<OAuthSettings> => {
  const rawData = await fetchOAuthConnectionsShared();

  const normalizedSettings: OAuthSettings = {};

  // Helper: safe hasOwnProperty
  const hasOwn = (obj: any, key: string) => Object.prototype.hasOwnProperty.call(obj ?? {}, key);

  // Helper: normalize one stored entry into a runtime OAuthConnection
  const normalizeEntry = (id: string, entry: any): OAuthConnection | null => {
    let connectionData = entry;

    // Parse if stringified
    if (typeof connectionData === 'string') {
      try {
        connectionData = JSON.parse(connectionData);
      } catch (e) {
        console.warn(`[fetchOAuthConnections] Could not parse stringified connection for id=${id}:`, e);
        return null;
      }
    }

    // Must be an object
    if (typeof connectionData !== 'object' || connectionData === null) {
      console.warn(`[fetchOAuthConnections] Invalid data type for id=${id} after parsing.`);
      return null;
    }

    // Flatten new structure or use old as-is
    let runtimeConnectionData: Partial<OAuthConnection> = {};
    if (connectionData.auth_data && connectionData.auth_settings) {
      runtimeConnectionData = {
        ...(connectionData.auth_settings),
        primary: connectionData.auth_data.primary,
        secondary: connectionData.auth_data.secondary,
        expires_in: connectionData.auth_data.expires_in,
      };
    } else {
      runtimeConnectionData = { ...connectionData };
    }

    // Remove forbidden fields
    if (runtimeConnectionData && (runtimeConnectionData as any).team) {
      delete (runtimeConnectionData as any).team;
    }

    // Synthesize oauth_info for runtime consumers
    const synthKeys = [
      'oauth_keys_prefix', 'service', 'platform', 'scope', 'authorizationURL', 'tokenURL',
      'clientID', 'clientSecret', 'requestTokenURL', 'accessTokenURL', 'userAuthorizationURL',
      'consumerKey', 'consumerSecret'
    ];
    const existingOauthInfo = (runtimeConnectionData as any).oauth_info;
    const oauthInfoSynth: any = existingOauthInfo ? { ...existingOauthInfo } : {};
    for (const k of synthKeys) {
      if (oauthInfoSynth[k] === undefined && (runtimeConnectionData as any)[k] !== undefined) {
        oauthInfoSynth[k] = (runtimeConnectionData as any)[k];
      }
    }
    (runtimeConnectionData as any).oauth_info = oauthInfoSynth;

    // Check if connection has an original name property (not synthetic)
    const hasOriginalName =
      hasOwn(runtimeConnectionData, 'name') ||
      hasOwn(connectionData, 'name') ||
      (connectionData.auth_settings && hasOwn(connectionData.auth_settings, 'name'));

    // If no original name property exists, skip this connection
    if (!hasOriginalName) {
      // console.log(`[fetchOAuthConnections] Skipping connection ${id} - no original name property`);
      return null;
    }

    // Get the actual name value (could be empty string, but must exist)
    const actualName =
      runtimeConnectionData.name ??
      connectionData.name ??
      connectionData.auth_settings?.name;

    // Ensure name is a string (even if empty)
    if (typeof actualName !== 'string') {
      console.warn(`[fetchOAuthConnections] Connection ${id} has non-string name:`, actualName);
      return null;
    }

    const provisional: OAuthConnection = {
      ...(runtimeConnectionData as any),
      id: id,
      name: actualName, // Use the actual name, even if empty
      isAuthenticated: undefined,
    } as OAuthConnection;

    // Derive local status when determinable
    const locallyDerived = computeLocalAuthStatus(provisional);
    if (typeof locallyDerived === 'boolean') {
      provisional.isAuthenticated = locallyDerived;
    }

    return provisional;
  };

  for (const id in rawData) {
    // Basic validation for the entry
    if (
      Object.prototype.hasOwnProperty.call(rawData, id) &&
      id.startsWith('OAUTH_') &&
      id.endsWith('_TOKENS')
    ) {
      // console.log(`[fetchOAuthConnections] Processing connection ${id}:`, rawData[id]);
      const normalized = normalizeEntry(id, rawData[id]);
      if (normalized) {
        // console.log(`[fetchOAuthConnections] Including connection ${id} with name: "${normalized.name}"`);
        normalizedSettings[id] = normalized;
      } else {
        // console.log(`[fetchOAuthConnections] Filtered out connection ${id} - no original name property`);
      }
    }
  }

  return normalizedSettings; // Return the normalized data
};

/**
 * Saves (creates or updates) OAuth connection *settings* by calling the backend API.
 * Assumes the backend endpoint PUT /vault/oauth-connections handles merging settings
 * and preserving existing token data (auth_data).
 * @param {object} payload - The payload containing connection ID and settings data.
 * @param {string} payload.connectionId - The ID (OAUTH_{UUID}_TOKENS) of the connection.
 * @param {Record<string, any>} payload.settingsData - The connection settings data (expected to be the auth_settings part).
 * @returns {Promise<unknown>} A promise resolving with the API response.
 */
const saveOAuthConnectionSettings = async ({
  connectionId,
  settingsData, // Renamed from 'data' to reflect it only contains settings
}: {
  connectionId: string;
  settingsData: Record<string, any>; // Type appropriately, expecting the auth_settings structure
}): Promise<unknown> => {
  return saveOAuthConnectionShared(connectionId, settingsData);
};

/**
 * Deletes an OAuth connection setting by calling the backend API.
 * Assumes the backend endpoint DELETE /vault/oauth-connections/:connectionId uses deleteTeamSettingsObj.
 * @param {DeleteOAuthConnectionPayload} payload - Contains the connectionId to delete.
 * @returns {Promise<any>} A promise resolving with the API response.
 */
const deleteOAuthConnection = async ({
  connectionId,
}: DeleteOAuthConnectionPayload): Promise<any> => {
  await deleteOAuthConnectionShared(connectionId);
  return { success: true };
};

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

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook to fetch OAuth connections.
 */
export function useOAuthConnections() {
  return useQuery<OAuthSettings, Error>({
    queryKey: OAUTH_QUERY_KEY,
    queryFn: fetchOAuthConnections, // Uses the fetch function calling the backend API
    // staleTime: 5 * 60 * 1000, // Optional: 5 minutes
  });
}

// Helper function to get relevant CONFIGURATION fields for oauth_info based on type
// It now expects the form payload (`rest`) as input data.
const getRelevantOAuthInfoFields = (type: 'oauth' | 'oauth2' | 'oauth2_client_credentials', formData: Record<string, any>): Partial<OAuthInfo> => {
  const relevantInfo: Partial<OAuthInfo> = {};

  // *** ADDED: Always include platform if provided ***
  if (formData['platform'] !== undefined) relevantInfo['platform'] = formData['platform'];

  // Always include scope if provided, regardless of type (it might be used conceptually)
  if (formData['scope'] !== undefined) relevantInfo['scope'] = formData['scope'];

  if (type === 'oauth2') {
    // OAuth2 specific config fields from the form
    ['authorizationURL', 'tokenURL', 'clientID', 'clientSecret'].forEach(key => {
      if (formData[key] !== undefined) relevantInfo[key] = formData[key];
    });
    // oauth2CallbackURL is derived, not directly from form data passed here
  } else if (type === 'oauth2_client_credentials') {
    // Client Credentials specific config fields from the form
    ['tokenURL', 'clientID', 'clientSecret'].forEach(key => {
      if (formData[key] !== undefined) relevantInfo[key] = formData[key];
    });
  } else if (type === 'oauth') {
    // OAuth 1.0a specific config fields from the form
    ['requestTokenURL', 'accessTokenURL', 'userAuthorizationURL', 'consumerKey', 'consumerSecret'].forEach(key => {
      if (formData[key] !== undefined) relevantInfo[key] = formData[key];
    });
    // oauth1CallbackURL is derived, not directly from form data passed here
  }
  return relevantInfo;
};

/**
 * Hook to create a new OAuth connection.
 */
export function useCreateOAuthConnection() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, CreateOAuthConnectionPayload>({
    mutationFn: async (payload: CreateOAuthConnectionPayload) => {
      const connectionId = `OAUTH_${generateOAuthId()}_TOKENS`;
      const { oauthService, name, platform, ...rest } = payload;

      // Determine type and internal service name
      const type = ['Custom OAuth1.0', 'Twitter'].includes(oauthService)
        ? 'oauth'
        : oauthService === 'OAuth2 Client Credentials'
          ? 'oauth2_client_credentials'
          : 'oauth2';
      const internalService = mapServiceNameToInternal(oauthService);
      const oauthPrefix = connectionId.replace('_TOKENS', '');

      // Build the oauth_info part which contains all configuration
      const relevantConfigFields = getRelevantOAuthInfoFields(type, payload);
      const oauthInfoData: OAuthInfo = {
        oauth_keys_prefix: oauthPrefix,
        service: internalService,
        name: name,
        platform: platform,
        ...relevantConfigFields,
        // Note: Callback URLs are derived but not strictly part of the *saved* settings
        // They might be added here for completeness if needed elsewhere, but won't be saved directly.
        // oauth2CallbackURL: (type === 'oauth2') ? deriveCallbackUrl(...) : undefined,
        // oauth1CallbackURL: (type === 'oauth') ? deriveCallbackUrl(...) : undefined,
      };

      // Build the auth_settings object
      // This includes name, type, tokenURL (if applicable), and the detailed oauth_info
      const authSettings = {
        name: name,
        type: type,
        tokenURL: (type === 'oauth2' || type === 'oauth2_client_credentials') ? oauthInfoData.tokenURL : undefined,
        oauth_info: oauthInfoData,
        // team: undefined, // Team is typically added by the backend if needed
      };

      // Clean up undefined tokenURL before saving
      if (authSettings.tokenURL === undefined) delete authSettings.tokenURL;
      // Call the helper to save only the settings
      return saveOAuthConnectionSettings({ connectionId, settingsData: authSettings });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OAUTH_QUERY_KEY });
    },
  });
}

/**
 * Hook to update an existing OAuth connection.
 */
export function useUpdateOAuthConnection() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, UpdateOAuthConnectionPayload>({
    mutationFn: async (payload: UpdateOAuthConnectionPayload) => {
      const { connectionId, updatedFields } = payload;
      const { oauthService, name, platform, ...rest } = updatedFields;

      // Fetch existing connection data (normalized to old structure by fetcher)
      const currentSettings = queryClient.getQueryData<OAuthSettings>(OAUTH_QUERY_KEY) || {};
      const currentData = currentSettings[connectionId];
      if (!currentData) {
        throw new Error(`Connection with ID ${connectionId} not found in cache.`);
      }

      // Determine the final type and service name after update
      const finalInternalService = oauthService
        ? mapServiceNameToInternal(oauthService)
        : currentData.oauth_info.service;
      const finalType = oauthService
        ? (isOAuth1Service(finalInternalService)
          ? 'oauth'
          : finalInternalService === 'oauth2_client_credentials'
            ? 'oauth2_client_credentials'
            : 'oauth2')
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

      // Now selectively update OAuth-specific fields based on type
      // Only update fields that have actually been provided with new values
      if (finalType === 'oauth2' || finalType === 'oauth2_client_credentials') {
        // Update OAuth2 fields only if explicitly provided in updatedFields
        if ('tokenURL' in updatedFields) {
          updatedOAuthInfo.tokenURL = updatedFields.tokenURL;
        }
        if ('clientID' in updatedFields) {
          updatedOAuthInfo.clientID = updatedFields.clientID;
        }
        if ('clientSecret' in updatedFields) {
          updatedOAuthInfo.clientSecret = updatedFields.clientSecret;
        }
        if (finalType === 'oauth2') {
          if ('authorizationURL' in updatedFields) {
            updatedOAuthInfo.authorizationURL = updatedFields.authorizationURL;
          }
          if ('scope' in updatedFields) {
            updatedOAuthInfo.scope = updatedFields.scope;
          }
        }
        // For client credentials, ensure auth URL and scope are removed
        if (finalType === 'oauth2_client_credentials') {
          delete updatedOAuthInfo.authorizationURL;
          delete updatedOAuthInfo.scope;
        }
      } else if (finalType === 'oauth') {
        // Update OAuth1 fields only if explicitly provided in updatedFields
        if ('requestTokenURL' in updatedFields) {
          updatedOAuthInfo.requestTokenURL = updatedFields.requestTokenURL;
        }
        if ('accessTokenURL' in updatedFields) {
          updatedOAuthInfo.accessTokenURL = updatedFields.accessTokenURL;
        }
        if ('userAuthorizationURL' in updatedFields) {
          updatedOAuthInfo.userAuthorizationURL = updatedFields.userAuthorizationURL;
        }
        if ('consumerKey' in updatedFields) {
          updatedOAuthInfo.consumerKey = updatedFields.consumerKey;
        }
        if ('consumerSecret' in updatedFields) {
          updatedOAuthInfo.consumerSecret = updatedFields.consumerSecret;
        }
      }

      // Build the updated auth_settings object to send to the backend
      const updatedAuthSettings = {
        name: updatedOAuthInfo.name, // Use the potentially updated name
        type: finalType, // Use the potentially updated type
        tokenURL: (finalType === 'oauth2' || finalType === 'oauth2_client_credentials') ? updatedOAuthInfo.tokenURL : undefined,
        oauth_info: updatedOAuthInfo, // Include the fully updated oauth_info
      };

      // Clean up undefined tokenURL
      if (updatedAuthSettings.tokenURL === undefined) delete updatedAuthSettings.tokenURL;

      // Call the helper to save only the updated settings
      // The backend PUT handler is responsible for merging these settings
      // with the existing entry and preserving auth_data.
      await saveOAuthConnectionSettings({ connectionId, settingsData: updatedAuthSettings });

      return { success: true }; // Indicate success
    },
    onSuccess: (data: unknown, variables) => {
      queryClient.invalidateQueries({ queryKey: OAUTH_QUERY_KEY });
    },
    onError: (error, variables) => {
      console.error(`Error updating connection ${variables.connectionId}:`, error);
    }
  });
}

/**
 * Hook to delete an OAuth connection.
 * @returns Mutation object for deleting an OAuth connection.
 */
export function useDeleteOAuthConnection() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, DeleteOAuthConnectionPayload>({
    mutationFn: deleteOAuthConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OAUTH_QUERY_KEY });
    },
    // Consider optimistic update for better UX
    // onMutate: async (deletePayload) => { ... },
    // onError: (err, deletePayload, context) => { ... },
    // onSettled: () => { ... },
  });
}

/**
 * Hook to duplicate an OAuth connection.
 * @returns Mutation object for duplicating an OAuth connection.
 */
export function useDuplicateOAuthConnection() {
  const queryClient = useQueryClient();
  const createMutation = useCreateOAuthConnection(); // Use the create hook

  return useMutation<any, Error, { connectionToDuplicate: OAuthConnection }>({
    mutationFn: async ({ connectionToDuplicate }) => {
      if (!connectionToDuplicate) {
        throw new Error('No connection provided for duplication.');
      }

      const newName = `${connectionToDuplicate.name} (Copy)`;

      // Prepare payload similar to create, but using existing oauth_info
      // Exclude token fields (primary, secondary, expires_in)
      const createPayload: CreateOAuthConnectionPayload = {
        name: newName,
        oauthService: mapInternalToServiceName(connectionToDuplicate.oauth_info.service), // Map internal service name back to display name
        // Copy relevant fields from oauth_info
        scope: connectionToDuplicate.oauth_info.scope,
        authorizationURL: connectionToDuplicate.oauth_info.authorizationURL,
        tokenURL: connectionToDuplicate.oauth_info.tokenURL,
        clientID: connectionToDuplicate.oauth_info.clientID,
        clientSecret: connectionToDuplicate.oauth_info.clientSecret,
        requestTokenURL: connectionToDuplicate.oauth_info.requestTokenURL,
        accessTokenURL: connectionToDuplicate.oauth_info.accessTokenURL,
        userAuthorizationURL: connectionToDuplicate.oauth_info.userAuthorizationURL,
        consumerKey: connectionToDuplicate.oauth_info.consumerKey,
        consumerSecret: connectionToDuplicate.oauth_info.consumerSecret,
        platform: connectionToDuplicate.oauth_info.platform, // <-- Fix: include platform
      };

      // Call the create mutation function
      return createMutation.mutateAsync(createPayload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OAUTH_QUERY_KEY });
    },
  });
}


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
          `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
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
      queryClient.setQueryData<OAuthSettings>(OAUTH_QUERY_KEY, (oldData) => {
        if (!oldData) return oldData;
        const connectionId = variables.oauth_keys_prefix + '_TOKENS';
        const connection = oldData[connectionId];
        if (connection) {
          // Only update if the authenticated status actually changed
          if (connection.isAuthenticated === data.success) {
            return oldData; // Return original reference
          }
          return {
            ...oldData,
            [connectionId]: {
              ...connection,
              isAuthenticated: data.success,
            },
          };
        }
        return oldData;
      });
    },
    onError: (error, variables) => {
      console.error(`HOOK: useCheckAuthStatus - onError for ${variables.oauth_keys_prefix}`, error);
      // Update cache ONLY with the isAuthenticated status (false)
      queryClient.setQueryData<OAuthSettings>(OAUTH_QUERY_KEY, (oldData) => {
        if (!oldData) return oldData;
        const connectionId = variables.oauth_keys_prefix + '_TOKENS';
        const connection = oldData[connectionId];
        if (connection) {
          // Only update if the authenticated status is not already false
          if (connection.isAuthenticated === false) {
            return oldData; // Return original reference
          }
          return {
            ...oldData,
            [connectionId]: {
              ...connection,
              isAuthenticated: false, // Assume false on error
            },
          };
        }
        return oldData;
      });
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
        // Invalidate the whole list to refetch status
        queryClient.invalidateQueries({ queryKey: OAUTH_QUERY_KEY });
        // Or, more optimistically, update the specific item in the cache
        queryClient.setQueryData<OAuthSettings>(OAUTH_QUERY_KEY, (oldData) => {
          if (!oldData) return oldData;
          const connection = oldData[variables.connectionId];
          if (connection) {
            // Create a new object for the updated connection
            const updatedConnection = {
              ...connection,
              primary: undefined,
              secondary: undefined,
              expires_in: undefined,
              isAuthenticated: false, // Explicitly set to false
            };
            // Return the updated state
            return {
              ...oldData,
              [variables.connectionId]: updatedConnection,
            };
          }
          return oldData;
        });
      }
    },
    onError: (error) => {
      console.error('Failed to sign out:', error);
      // Optionally show a toast message to the user
      // toast({ title: 'Error', description: `Sign out failed: ${error.message}`, variant: 'destructive' });
    },
  });
}

const authenticateClientCredentials = async (payload: OAuthInfo): Promise<{ success: boolean; message: string }> => {
  return authenticateClientCredentialsShared(payload);
};

export function useAuthenticateClientCredentials() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; message: string }, Error, OAuthInfo>({
    mutationFn: authenticateClientCredentials,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OAUTH_QUERY_KEY });
    },
    onError: (error) => {
      console.error('Failed to authenticate client credentials:', error);
    },
  });
}

