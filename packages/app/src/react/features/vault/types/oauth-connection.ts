// src/webappv2/pages/vault/types/oauth-connection.ts
/**
 * Represents the detailed configuration for an OAuth connection.
 */
export interface OAuthInfo {
  oauth_keys_prefix: string; // e.g., OAUTH_ABC123XYZ
  service: string; // e.g., 'google', 'linkedin', 'oauth2', 'oauth', 'oauth2_client_credentials'
  name: string; // User-defined friendly name for the connection
  platform: string; // *** ADDED: The platform name (e.g., 'Google Mail', 'HubSpot') ***
  scope?: string;
  authorizationURL?: string;
  tokenURL?: string;
  clientID?: string;
  clientSecret?: string;
  oauth2CallbackURL?: string;
  requestTokenURL?: string; // OAuth 1.0a
  accessTokenURL?: string; // OAuth 1.0a
  userAuthorizationURL?: string; // OAuth 1.0a
  consumerKey?: string; // OAuth 1.0a
  consumerSecret?: string; // OAuth 1.0a
  oauth1CallbackURL?: string; // OAuth 1.0a
  // Allow any other string properties that might be added
  [key: string]: string | undefined;
}

/**
 * Represents a stored OAuth connection entry, including tokens if authenticated.
 */
export interface OAuthConnection {
  id: string; // The OAUTH_{UUID}_TOKENS key
  name: string; // User-defined friendly name
  primary?: string; // Access token or OAuth1 token
  secondary?: string; // Refresh token or OAuth1 token secret
  type: 'oauth' | 'oauth2' | 'oauth2_client_credentials'; // Type of OAuth flow used
  tokenURL?: string; // URL to refresh/get token
  clientID?: string; // Client ID (OAuth2)
  clientSecret?: string; // Client Secret (OAuth2) - Note: Sensitive, might be stored securely
  consumerKey?: string; // Consumer Key (OAuth1)
  consumerSecret?: string; // Consumer Secret (OAuth1) - Note: Sensitive
  expires_in?: string; // Timestamp (as string) when the token expires
  team?: string; // Team ID associated with the connection
  oauth_info: OAuthInfo; // Detailed configuration used for authentication
  isAuthenticated?: boolean; // Backend determines this, RQ fetches it
}

/**
 * Type for the data structure fetched from team settings under the 'oauth' key.
 * It's a record where keys are OAUTH_{UUID}_TOKENS and values are the connection details.
 */
export type OAuthSettings = Record<string, OAuthConnection>;

/**
 * Props for the CreateOAuthConnectionModal component.
 */
export interface CreateOAuthConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: OAuthConnectionFormData) => Promise<any>;
  editConnection?: OAuthConnection; // Provided when editing an existing connection
  isProcessing: boolean;
}

/**
 * Props for the DeleteOAuthConnectionModal component.
 */
export interface DeleteOAuthConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection?: OAuthConnection;
  onConfirm: (connection: OAuthConnection) => Promise<void>;
  isProcessing: boolean;
}

/**
 * Represents the form data collected in the Create/Edit modal.
 * Mirrors fields needed for OAuthInfo plus the friendly name.
 */
export interface OAuthConnectionFormData {
  name: string;
  platform: string; // *** ADDED: Platform field for the form ***
  oauthService: string; // Maps to oauth_info.service, e.g., 'Google', 'Custom OAuth2.0'
  scope?: string;
  authorizationURL?: string;
  tokenURL?: string;
  clientID?: string;
  clientSecret?: string;
  // oauth2CallbackURL is derived
  requestTokenURL?: string;
  accessTokenURL?: string;
  userAuthorizationURL?: string;
  consumerKey?: string;
  consumerSecret?: string;
  // oauth1CallbackURL is derived

  // Include potential unknown fields captured from the form
  [key: string]: any;
}

/**
 * Payload for creating a new OAuth connection.
 */
export interface CreateOAuthConnectionPayload extends OAuthConnectionFormData {
  id?: string; // ID is generated if not provided (for creation)
}

/**
 * Payload for updating an existing OAuth connection.
 */
export interface UpdateOAuthConnectionPayload {
  connectionId: string; // OAUTH_{UUID}_TOKENS
  updatedFields: Partial<OAuthConnectionFormData>;
}

/**
 * Payload for deleting an OAuth connection.
 */
export interface DeleteOAuthConnectionPayload {
  connectionId: string; // OAUTH_{UUID}_TOKENS
}

/**
 * Payload for initiating OAuth authentication.
 */
export interface AuthenticateOAuthPayload extends OAuthInfo {
  // OAuthInfo contains all necessary fields like clientID, URLs, scope, etc.
}

/**
 * Payload for checking OAuth authentication status.
 */
export interface CheckAuthStatusPayload extends OAuthInfo {
  // OAuthInfo contains necessary fields for the checkAuth backend call
}

/**
 * Payload for signing out an OAuth connection.
 */
export interface SignOutOAuthPayload {
  connectionId: string; // OAUTH_{UUID}_TOKENS
}