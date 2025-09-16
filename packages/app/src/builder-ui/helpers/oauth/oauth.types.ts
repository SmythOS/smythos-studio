/**
 * OAuth-related types and interfaces for Gmail Trigger
 */

export type OAuthServiceType = 'oauth' | 'oauth1' | 'oauth2' | 'oauth2_client_credentials' | string;

export interface OAuthInfo {
  oauth_keys_prefix?: string;
  service: OAuthServiceType;
  name?: string;
  platform?: string;
  // OAuth2
  tokenURL?: string;
  clientID?: string;
  clientSecret?: string;
  authorizationURL?: string;
  scope?: string;
  oauth2CallbackURL?: string;
  // OAuth1
  requestTokenURL?: string;
  accessTokenURL?: string;
  userAuthorizationURL?: string;
  consumerKey?: string;
  consumerSecret?: string;
  oauth1CallbackURL?: string;
}

export interface OAuthAuthData {
  primary?: string;
  secondary?: string;
  expires_in?: number;
}

export interface OAuthAuthSettings {
  name: string;
  type: 'oauth' | 'oauth2' | 'oauth2_client_credentials';
  tokenURL?: string;
  oauth_info: OAuthInfo;
}

export interface OAuthConnection {
  auth_settings?: OAuthAuthSettings;
  auth_data?: OAuthAuthData;
  isAuthenticated?: boolean;
  [key: string]: unknown;
}

export interface SelectOption {
  value: string;
  text: string;
  badge?: string;
}

export interface ValidationResult {
  valid: boolean;
  missingFields: string[];
}
