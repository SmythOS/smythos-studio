// Shared OAuth helpers used across Builder UI and React Vault
// Updated to use centralized OAuth services configuration

import { OAuthServicesRegistry } from './oauth-services.helper';

export interface OAuthInfoLike {
  authorizationURL?: string;
  requestTokenURL?: string;
  userAuthorizationURL?: string;
  accessTokenURL?: string;
  tokenURL?: string;
}

// OAuth Service Constants - now derived from centralized configuration
export const OAUTH_SERVICES = OAuthServicesRegistry.getAllServiceNames() as readonly string[];

export type OAuthServiceType = (typeof OAUTH_SERVICES)[number];

// Maps the user-facing service name to the internal service identifier
export function mapServiceNameToInternal(serviceName: string): string {
  return OAuthServicesRegistry.mapServiceNameToInternal(serviceName);
}

// Maps the internal service identifier back to the user-facing service name
export function mapInternalToServiceName(internalName: string): string {
  return OAuthServicesRegistry.mapInternalToServiceName(internalName);
}

// Gets the backend origin for OAuth callbacks
export function getBackendOrigin(): string {
  try {
    const { protocol, hostname } = window.location;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    if (isLocal) {
      return `${protocol}//localhost:4000`;
    }
    return window.location.origin;
  } catch {
    return window.location.origin;
  }
}

// Derives the callback URL based on service and OAuth type
export function deriveCallbackUrl(service: string, type: 'oauth' | 'oauth2'): string | undefined {
  if (service === 'none') return undefined;

  const baseUrl = getBackendOrigin();
  const callbackPath = `/oauth/${service}/callback`;

  try {
    return new URL(callbackPath, baseUrl).toString();
  } catch (e) {
    console.error('Error constructing callback URL:', e);
    return undefined;
  }
}

// Determines OAuth type from service name
export function getOAuthTypeFromService(
  service: string,
): 'oauth' | 'oauth2' | 'oauth2_client_credentials' | 'none' {
  return OAuthServicesRegistry.getOAuthFlowType(service);
}

// Check if service uses OAuth1
export function isOAuth1Service(service: string): boolean {
  return OAuthServicesRegistry.isOAuth1Service(service);
}

// Check if service uses OAuth2
export function isOAuth2Service(service: string): boolean {
  return OAuthServicesRegistry.isOAuth2Service(service);
}

// Check if service uses Client Credentials
export function isClientCredentialsService(service: string): boolean {
  return OAuthServicesRegistry.isClientCredentialsService(service);
}

// Attempts to extract a provider/service name from a URL's hostname
export function extractPlatformFromUrl(url?: string): string {
  if (!url) return 'unknown';
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    // Quick checks for common providers
    if (hostname.includes('google')) return 'Google';
    if (hostname.includes('linkedin')) return 'LinkedIn';
    if (hostname.includes('twitter') || hostname.includes('x.com')) return 'Twitter/X';
    if (hostname.includes('facebook')) return 'Facebook';
    if (hostname.includes('github')) return 'GitHub';
    if (hostname.includes('microsoft') || hostname.includes('azure')) return 'Microsoft';
    if (hostname.includes('slack')) return 'Slack';
    if (hostname.includes('salesforce')) return 'Salesforce';
    if (hostname.includes('hubspot')) return 'HubSpot';

    // Generic extraction: capture first significant label
    const generic = hostname.match(
      /(?:^|\.)?([a-z0-9-]+)\.(?:com|net|org|io|co|app|ai|dev|cloud|us|tv)(?:$|\.)/i,
    );
    if (generic && generic[1]) {
      const label = generic[1].toLowerCase();
      if (!['www', 'api', 'auth', 'oauth', 'accounts', 'login', 'app'].includes(label)) {
        return label.charAt(0).toUpperCase() + label.slice(1);
      }
    }

    // Fallback: consider the left-most label if meaningful
    const parts = hostname.split('.');
    if (parts.length > 1) {
      const first = parts[0];
      if (!['www', 'api', 'auth', 'oauth', 'accounts', 'login', 'app'].includes(first)) {
        return first.charAt(0).toUpperCase() + first.slice(1);
      }
    }
    return 'unknown';
  } catch {
    return 'invalid_url';
  }
}

// Derives a provider/service name by checking typical OAuth URLs
export function deriveServiceFromOauthInfo(oauthInfo?: Partial<OAuthInfoLike>): string {
  if (!oauthInfo) return '';
  const urls = [
    oauthInfo.authorizationURL,
    oauthInfo.requestTokenURL,
    oauthInfo.userAuthorizationURL,
    oauthInfo.accessTokenURL,
    oauthInfo.tokenURL,
  ];
  for (const u of urls) {
    const platform = extractPlatformFromUrl(u);
    if (platform && platform !== 'unknown' && platform !== 'invalid_url') return platform;
  }
  return '';
}

// Map OAuth type to display string
export function mapOAuthTypeDisplay(type: string): string {
  switch (type) {
    case 'oauth':
      return 'OAuth1';
    case 'oauth2':
      return 'OAuth2';
    case 'oauth2_client_credentials':
      return 'Client Creds';
    default:
      return 'Unknown';
  }
}

// Generate a unique ID for OAuth connections
export function generateOAuthId(): string {
  return (Date.now() + Math.random()).toString(36).replace('.', '').toUpperCase();
}

// Handle API response with proper error handling
export async function handleApiResponse(response: Response): Promise<any> {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      // Ignore if body isn't JSON
    }
    const errorMessage = errorData?.message || `HTTP error! status: ${response.status}`;
    throw new Error(errorMessage);
  }

  // Handle empty responses (e.g., 204 No Content)
  if (response.status === 204) {
    return undefined;
  }

  return response.json();
}

// Map HTTP status codes to user-friendly messages
export function mapStatusCodeToMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad Request. Please verify your request and try again.';
    case 401:
      return 'Unauthorized. Please ensure you are logged in and have the necessary permissions.';
    case 403:
      return 'Forbidden. Access is denied.';
    case 404:
      return 'Not Found. The requested resource was not found.';
    case 500:
      return 'Internal Server Error. Something went wrong on our end.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}
