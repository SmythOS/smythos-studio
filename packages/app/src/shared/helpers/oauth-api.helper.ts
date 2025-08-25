import {
  deriveCallbackUrl,
  handleApiResponse,
  isOAuth1Service,
  isOAuth2Service,
  mapInternalToServiceName
} from '@src/shared/utils/oauth.utils';

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
        'oauth_keys_prefix', 'service', 'platform', 'scope',
        'authorizationURL', 'tokenURL', 'clientID', 'clientSecret',
        'requestTokenURL', 'accessTokenURL', 'userAuthorizationURL',
        'consumerKey', 'consumerSecret'
      ];

      oauthFields.forEach(field => {
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
    'oauth_keys_prefix', 'service', 'platform', 'scope',
    'authorizationURL', 'tokenURL', 'clientID', 'clientSecret',
    'requestTokenURL', 'accessTokenURL', 'userAuthorizationURL',
    'consumerKey', 'consumerSecret'
  ];

  fields.forEach(field => {
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

/**
 * Derive service name from OAuth info URLs
 */
export function deriveServiceFromOauthInfo(oauthInfo: any): string {
  if (!oauthInfo) return '';

  // Check authorization URL first
  if (oauthInfo.authorizationURL?.includes('google')) return 'Google';
  if (oauthInfo.authorizationURL?.includes('linkedin')) return 'LinkedIn';
  if (oauthInfo.authorizationURL?.includes('twitter') || oauthInfo.authorizationURL?.includes('x.com')) return 'Twitter/X';

  // Check other URLs
  if (oauthInfo.userAuthorizationURL?.includes('twitter') || oauthInfo.userAuthorizationURL?.includes('x.com')) return 'Twitter/X';
  if (oauthInfo.tokenURL?.includes('google')) return 'Google';
  if (oauthInfo.tokenURL?.includes('linkedin')) return 'LinkedIn';

  return '';
}

/**
 * Build OAuth select options from connections with unified name detection
 */
export function buildOAuthSelectOptions(
  connections: Record<string, any>,
  componentSpecificId?: string,
  logPrefix?: string
): Array<{ label: string; value: string }> {
  const connectionOptions: Array<{ label: string; value: string }> = [
    { label: 'None', value: 'None' }
  ];

  if (!connections || typeof connections !== 'object') {
    return connectionOptions;
  }

  for (const [id, connection] of Object.entries(connections)) {
    if (!id.startsWith('OAUTH_') || !id.endsWith('_TOKENS')) continue;

    try {
      // Parse if stringified
      const parsedConnection = typeof connection === 'string' ? JSON.parse(connection) : connection;

      // Support both new and old structures
      const isNewStructure = parsedConnection.auth_data && parsedConnection.auth_settings;
      const settingsPart = isNewStructure ? parsedConnection.auth_settings : parsedConnection;

      // Extract name with multiple fallback options
      let name = settingsPart?.name || '';

      if (!name) {
        // Try to derive from oauth_info
        const oauthInfo = getConnectionOauthInfo(parsedConnection, id);
        name = oauthInfo?.name || '';

        if (!name && oauthInfo?.service) {
          // Use service name as fallback
          const serviceName = mapInternalToServiceName(oauthInfo.service);
          name = serviceName !== oauthInfo.service ? serviceName : '';
        }

        if (!name) {
          // Try to derive from platform
          name = oauthInfo?.platform || deriveServiceFromOauthInfo(oauthInfo) || '';
        }
      }

      // Create label with ID prefix if needed
      const label = name ? `${name} (${id.substring(0, 15)}...)` : id;

      connectionOptions.push({
        label,
        value: id
      });

      if (logPrefix) {
        // console.log(`${logPrefix} Added option:`, { id, name, label });
      }

    } catch (error) {
      console.error(`Error processing connection ${id}:`, error);
      connectionOptions.push({
        label: id,
        value: id
      });
    }
  }

  return connectionOptions;
}

/**
 * Check if an OAuth connection is authenticated
 */
export async function checkOAuthAuthentication(
  oauthInfo: any
): Promise<{ success: boolean }> {
  try {
    const response = await fetch('/oauth/checkAuth', {
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
  openPopup: boolean = true
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
      `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
    );
  }

  return { authUrl: data.authUrl };
}

/**
 * Sign out from OAuth connection
 */
export async function signOutOAuthConnection(
  connectionId: string,
  invalidateAuthentication: boolean = true
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
export async function saveOAuthConnection(
  connectionId: string,
  authSettings: any
): Promise<void> {
  const response = await fetch('/api/page/vault/oauth-connections', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      entryId: connectionId,
      data: authSettings,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to save OAuth connection (Status: ${response.status})`
    );
  }
}

/**
 * Delete OAuth connection from backend
 */
export async function deleteOAuthConnection(connectionId: string): Promise<void> {
  const response = await fetch(`/api/page/vault/oauth-connections/${connectionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error || `Failed to delete OAuth connection (Status: ${response.status})`
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
export async function authenticateClientCredentials(oauthInfo: any): Promise<{ success: boolean; message: string }> {
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
