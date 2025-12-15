import { CredentialConnection } from '@src/react/features/credentials/components/create-credentials.modal';
import {
  deriveCallbackUrl,
  handleApiResponse,
  isOAuth1Service,
  isOAuth2Service,
} from '@src/shared/helpers/oauth/oauth.utils';

/**
 * Extract OAuth info from connection data supporting both old and new structures
 */
export function getConnectionOauthInfo(connection: any, connectionId?: string): any {
  if (!connection) return null;

  // New structure: connection has auth_settings at the root
  if (connection.auth_settings) {
    // First check if oauth_info is nested within auth_settings (before backend flattening)
    if (connection.auth_settings.oauth_info) {
      return connection.auth_settings.oauth_info;
    }

    // If oauth_info was flattened by backend, reconstruct it from auth_settings
    // Check if auth_settings has OAuth fields directly (after backend normalization)
    if (connection.auth_settings.service || connection.auth_settings.oauth_keys_prefix) {
      // Backend has flattened oauth_info to auth_settings root, reconstruct it
      const reconstructed: any = {};
      const oauthFields = [
        'oauth_keys_prefix',
        'service',
        'platform',
        'scope',
        'authorizationURL',
        'tokenURL',
        'clientID',
        'clientSecret',
        'requestTokenURL',
        'accessTokenURL',
        'userAuthorizationURL',
        'consumerKey',
        'consumerSecret',
      ];

      oauthFields.forEach((field) => {
        if (connection.auth_settings[field] !== undefined) {
          reconstructed[field] = connection.auth_settings[field];
        }
      });

      // Ensure oauth_keys_prefix is set
      if (!reconstructed.oauth_keys_prefix && connectionId) {
        reconstructed.oauth_keys_prefix = connectionId.replace('_TOKENS', '');
      }

      return Object.keys(reconstructed).length > 0 ? reconstructed : null;
    }
  }

  // Old structure might have oauth_info at top level
  if (connection.oauth_info) {
    return connection.oauth_info;
  }

  // Legacy: construct oauth_info from flat fields
  const oauthInfo: any = {};
  const fields = [
    'oauth_keys_prefix',
    'service',
    'platform',
    'scope',
    'authorizationURL',
    'tokenURL',
    'clientID',
    'clientSecret',
    'requestTokenURL',
    'accessTokenURL',
    'userAuthorizationURL',
    'consumerKey',
    'consumerSecret',
  ];

  fields.forEach((field) => {
    if (connection[field] !== undefined) {
      oauthInfo[field] = connection[field];
    }
  });

  // Ensure oauth_keys_prefix is set
  if (!oauthInfo.oauth_keys_prefix && connectionId) {
    oauthInfo.oauth_keys_prefix = connectionId.replace('_TOKENS', '');
  }

  return Object.keys(oauthInfo).length > 0 ? oauthInfo : null;
}

/**
 * Extract service from connection supporting both structures
 */
export function extractServiceFromConnection(connection: any): string {
  if (!connection) return '';

  const oauthInfo = getConnectionOauthInfo(connection);
  return oauthInfo?.service || '';
}

// /**
//  * Derive service name from OAuth info URLs
//  */
// export function deriveServiceFromOauthInfo(oauthInfo: any): string {
//   if (!oauthInfo) return '';

//   // Check authorization URL first
//   if (oauthInfo.authorizationURL?.includes('google')) return 'Google';
//   if (oauthInfo.authorizationURL?.includes('linkedin')) return 'LinkedIn';
//   if (
//     oauthInfo.authorizationURL?.includes('twitter') ||
//     oauthInfo.authorizationURL?.includes('x.com')
//   )
//     return 'Twitter/X';

//   // Check other URLs
//   if (
//     oauthInfo.userAuthorizationURL?.includes('twitter') ||
//     oauthInfo.userAuthorizationURL?.includes('x.com')
//   )
//     return 'Twitter/X';
//   if (oauthInfo.tokenURL?.includes('google')) return 'Google';
//   if (oauthInfo.tokenURL?.includes('linkedin')) return 'LinkedIn';

//   return '';
// }

// /**
//  * Build OAuth select options from connections with unified name detection
//  */
// export function buildOAuthSelectOptions(
//   connections: Record<string, any>,
//   componentSpecificId?: string,
//   logPrefix?: string,
// ): Array<{ label: string; value: string }> {
//   const connectionOptions: Array<{ label: string; value: string }> = [
//     { label: 'None', value: 'None' },
//   ];

//   if (!connections || typeof connections !== 'object') {
//     return connectionOptions;
//   }

//   for (const [id, connection] of Object.entries(connections)) {
//     if (!id.startsWith('OAUTH_') || !id.endsWith('_TOKENS')) continue;

//     try {
//       // Parse if stringified
//       const parsedConnection = typeof connection === 'string' ? JSON.parse(connection) : connection;

//       // Support both new and old structures
//       const isNewStructure = parsedConnection.auth_data && parsedConnection.auth_settings;
//       const settingsPart = isNewStructure ? parsedConnection.auth_settings : parsedConnection;

//       // Extract name with multiple fallback options
//       let name = settingsPart?.name || '';

//       if (!name) {
//         // Try to derive from oauth_info
//         const oauthInfo = getConnectionOauthInfo(parsedConnection, id);
//         name = oauthInfo?.name || '';

//         if (!name && oauthInfo?.service) {
//           // Use service name as fallback
//           const serviceName = mapInternalToServiceName(oauthInfo.service);
//           name = serviceName !== oauthInfo.service ? serviceName : '';
//         }

//         if (!name) {
//           // Try to derive from platform
//           name = oauthInfo?.platform || deriveServiceFromOauthInfo(oauthInfo) || '';
//         }
//       }

//       // Create label with ID prefix if needed
//       const label = name ? `${name} (${id.substring(0, 15)}...)` : id;

//       connectionOptions.push({
//         label,
//         value: id,
//       });

//       if (logPrefix) {
//         // console.log(`${logPrefix} Added option:`, { id, name, label });
//       }
//     } catch (error) {
//       console.error(`Error processing connection ${id}:`, error);
//       connectionOptions.push({
//         label: id,
//         value: id,
//       });
//     }
//   }

//   return connectionOptions;
// }

/**
 * Check if an OAuth connection is authenticated
 */
export async function checkOAuthAuthentication(oauthInfo: any): Promise<{ success: boolean }> {
  try {
    const response = await fetch('/oauth/check-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(oauthInfo),
    });

    if (!response.ok) {
      console.error(`Auth check failed:`, response.status);
      return { success: false };
    }

    const result = await response.json();
    return { success: result.success === true };
  } catch (error) {
    console.error(`Error checking auth:`, error);
    return { success: false };
  }
}

/**
 * Initiate OAuth authentication flow - returns auth URL or opens popup
 */
export async function initiateOAuthFlow(
  oauthInfo: any,
  openPopup: boolean = true,
): Promise<{ authUrl?: string }> {
  // Enhance payload with callback URLs if needed
  const service = oauthInfo.service;
  const isOAuth1 = isOAuth1Service(service);
  const isOAuth2 = isOAuth2Service(service);

  let enhancedPayload = { ...oauthInfo };
  if (isOAuth1 && !enhancedPayload.oauth1CallbackURL) {
    enhancedPayload.oauth1CallbackURL = deriveCallbackUrl(service, 'oauth');
  } else if (isOAuth2 && !enhancedPayload.oauth2CallbackURL) {
    enhancedPayload.oauth2CallbackURL = deriveCallbackUrl(service, 'oauth2');
  }

  const response = await fetch('/oauth/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enhancedPayload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to initiate OAuth (Status: ${response.status})`);
  }

  const data = await response.json();

  if (data.authUrl && openPopup) {
    // Open OAuth popup
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      data.authUrl,
      'oauth_popup',
      `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`,
    );
  }

  return { authUrl: data.authUrl };
}

/**
 * Sign out from OAuth connection
 */
export async function signOutOAuthConnection(
  connectionId: string,
  invalidateAuthentication: boolean = true,
): Promise<{ invalidate: boolean }> {
  const response = await fetch('/oauth/signOut', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      oauth_keys_prefix: connectionId.replace('_TOKENS', ''),
      invalidateAuthentication,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to sign out (Status: ${response.status})`);
  }

  const result = await response.json();
  if (!result.invalidate) {
    throw new Error('Sign out was not successful');
  }

  return result;
}

/**
 * Save OAuth connection to backend
 */
/**
 * Save OAuth connection using new credentials API
 * Converts from legacy format to new credentials format
 */
export async function saveOAuthConnection(connectionId: string, authSettings: any): Promise<void> {
  const { name, type, oauth_info } = authSettings;

  if (!oauth_info) {
    throw new Error('oauth_info is required in authSettings');
  }

  // Build credentials object from oauth_info
  const credentials: Record<string, { value: string; sensitive: boolean }> = {};

  // Add platform and name
  if (oauth_info.platform) {
    credentials.platform = { value: oauth_info.platform, sensitive: false };
  }

  // Map OAuth2 fields
  if (oauth_info.authorizationURL) {
    credentials.authorizationURL = { value: oauth_info.authorizationURL, sensitive: false };
  }
  if (oauth_info.tokenURL) {
    credentials.tokenURL = { value: oauth_info.tokenURL, sensitive: false };
  }
  if (oauth_info.clientID) {
    credentials.clientID = { value: oauth_info.clientID, sensitive: true };
  }
  if (oauth_info.clientSecret) {
    credentials.clientSecret = { value: oauth_info.clientSecret, sensitive: true };
  }
  if (oauth_info.scope) {
    credentials.scope = { value: oauth_info.scope, sensitive: false };
  }

  // Map OAuth1 fields
  if (oauth_info.requestTokenURL) {
    credentials.requestTokenURL = { value: oauth_info.requestTokenURL, sensitive: false };
  }
  if (oauth_info.accessTokenURL) {
    credentials.accessTokenURL = { value: oauth_info.accessTokenURL, sensitive: false };
  }
  if (oauth_info.userAuthorizationURL) {
    credentials.userAuthorizationURL = { value: oauth_info.userAuthorizationURL, sensitive: false };
  }
  if (oauth_info.consumerKey) {
    credentials.consumerKey = { value: oauth_info.consumerKey, sensitive: true };
  }
  if (oauth_info.consumerSecret) {
    credentials.consumerSecret = { value: oauth_info.consumerSecret, sensitive: true };
  }

  // Determine if we're creating or updating based on whether the credential exists
  const checkResponse = await fetch(
    `/api/app/credentials/${encodeURIComponent(connectionId)}?group=oauth_connections_creds`,
    {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    },
  );

  const isUpdate = checkResponse.ok;
  const method = isUpdate ? 'PUT' : 'POST';
  const url = isUpdate
    ? `/api/app/credentials/${encodeURIComponent(connectionId)}`
    : '/api/app/credentials';

  const body: any = {
    group: 'oauth_connections_creds',
    name: name || oauth_info.name || 'OAuth Connection',
    provider: oauth_info.service || type || 'custom_oauth2',
    credentials,
  };

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to save OAuth connection (Status: ${response.status})`,
    );
  }
}

/**
 * Delete OAuth connection using new credentials API
 */
export async function deleteOAuthConnection(connectionId: string): Promise<void> {
  const response = await fetch(
    `/api/app/credentials/${encodeURIComponent(connectionId)}?group=oauth_connections_creds`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to delete OAuth connection (Status: ${response.status})`,
    );
  }
}

/**
 * Fetch OAuth connections from backend
 */
export async function fetchOAuthConnections(): Promise<Record<string, any>> {
  const response = await fetch('/api/page/vault/oauth-connections');
  const rawData = await handleApiResponse(response);

  // Normalize the data: parse any stringified values
  const normalizedData: Record<string, any> = {};

  if (rawData && typeof rawData === 'object') {
    Object.keys(rawData).forEach((id) => {
      const value = rawData[id];
      if (typeof value === 'string') {
        try {
          normalizedData[id] = JSON.parse(value);
        } catch (e) {
          console.warn(`Could not parse stringified connection for id=${id}:`, e);
          normalizedData[id] = value;
        }
      } else {
        normalizedData[id] = value;
      }
    });
  }

  return normalizedData;
}

/**
 * Authenticate OAuth2 Client Credentials
 */
export async function authenticateClientCredentials(
  oauthInfo: any,
): Promise<{ success: boolean; message: string }> {
  const response = await fetch('/oauth/client_credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(oauthInfo),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to authenticate (Status: ${response.status})`);
  }

  return await response.json();
}

type OAuthInfo = {
  [key: string]: any; // you can refine this if you know the schema
};

type AuthSettings = {
  name?: string;
  platform?: string;
  oauth_info?: OAuthInfo;
  [key: string]: any; // other arbitrary setting fields
};

type AuthData = {
  primary?: string;
  secondary?: string;
  expires_in?: number;
};

export type ExistingEntryData = {
  // NEW structure
  auth_data?: AuthData;
  auth_settings?: AuthSettings;
};

export function transformOAuthCredEntry(
  credentialEntry: CredentialConnection & { tokens: any },
): ExistingEntryData {
  // if old flow, return the old structure
  if (credentialEntry.credentials?.primary) {
    const { primary, secondary, expires_in, ...credentials } = credentialEntry.credentials;
    return {
      auth_data: {
        primary,
        secondary,
        expires_in: expires_in ? parseInt(expires_in) : undefined,
      },
      auth_settings: {
        ...credentials,
        name: credentialEntry.name,
        service: credentialEntry.provider,
        platform: credentialEntry.name,
      },
    };
  }

  // if new flow, return the new structure
  return {
    auth_data: {
      primary: credentialEntry.tokens?.primary,
      secondary: credentialEntry.tokens?.secondary,
      expires_in: credentialEntry.tokens?.expires_in,
    },
    auth_settings: {
      name: credentialEntry.name,
      service: credentialEntry.provider,
      platform: credentialEntry.name,
      ...credentialEntry.credentials,
    },
  };
}
