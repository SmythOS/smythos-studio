/**
 * Type definitions for ChatGPT Plugin Manifest
 * Based on OpenAI's ChatGPT Plugin specification
 */

/**
 * Authentication methods supported by ChatGPT plugins
 */
type ChatGPTAuthType = 'none' | 'oauth' | 'service_http';

/**
 * Base authentication interface
 */
interface ChatGPTAuthBase {
  type: ChatGPTAuthType;
}

/**
 * No authentication required
 */
interface ChatGPTAuthNone extends ChatGPTAuthBase {
  type: 'none';
}

/**
 * OAuth authentication configuration
 */
interface ChatGPTAuthOAuth extends ChatGPTAuthBase {
  type: 'oauth';
  client_url: string;
  scope: string;
  authorization_url: string;
  authorization_content_type: string;
  verification_tokens?: {
    openai?: string;
  };
}

/**
 * Service HTTP authentication (Bearer token)
 */
interface ChatGPTAuthServiceHttp extends ChatGPTAuthBase {
  type: 'service_http';
  authorization_type: 'bearer';
  verification_tokens?: {
    openai?: string;
  };
}

/**
 * Union type for all authentication methods
 */
type ChatGPTAuth = ChatGPTAuthNone | ChatGPTAuthOAuth | ChatGPTAuthServiceHttp;

/**
 * API configuration for the plugin
 */
interface ChatGPTAPI {
  type: 'openapi';
  url: string;
  is_user_authenticated: boolean;
}

/**
 * Complete ChatGPT Plugin Manifest structure
 */
export interface ChatGPTManifest {
  /** Schema version of the manifest */
  schema_version: 'v1';

  /** Human-readable name for the plugin */
  name_for_human: string;

  /** Name used by the model to reference the plugin */
  name_for_model: string;

  /** Human-readable description of the plugin */
  description_for_human: string;

  /** Model-focused description of the plugin's capabilities */
  description_for_model: string;

  /** Authentication configuration */
  auth: ChatGPTAuth;

  /** API specification */
  api: ChatGPTAPI;

  /** URL to the plugin's logo */
  logo_url: string;

  /** Contact email for the plugin */
  contact_email: string;

  /** URL to legal information about the plugin */
  legal_info_url: string;
}
