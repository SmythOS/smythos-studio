/**
 * Type definitions for ChatGPT Plugin Manifest
 * Based on OpenAI's ChatGPT Plugin specification
 */

/**
 * Authentication methods supported by ChatGPT plugins
 */
export type ChatGPTAuthType = 'none' | 'oauth' | 'service_http';

/**
 * Base authentication interface
 */
export interface ChatGPTAuthBase {
    type: ChatGPTAuthType;
}

/**
 * No authentication required
 */
export interface ChatGPTAuthNone extends ChatGPTAuthBase {
    type: 'none';
}

/**
 * OAuth authentication configuration
 */
export interface ChatGPTAuthOAuth extends ChatGPTAuthBase {
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
export interface ChatGPTAuthServiceHttp extends ChatGPTAuthBase {
    type: 'service_http';
    authorization_type: 'bearer';
    verification_tokens?: {
        openai?: string;
    };
}

/**
 * Union type for all authentication methods
 */
export type ChatGPTAuth = ChatGPTAuthNone | ChatGPTAuthOAuth | ChatGPTAuthServiceHttp;

/**
 * API configuration for the plugin
 */
export interface ChatGPTAPI {
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

/**
 * Template variables used for generating the manifest
 */
export interface ChatGPTManifestTemplate {
    human_name: string;
    model_name: string;
    human_description: string;
    model_description: string;
    icon_url: string;
    contact_email: string;
    legal_info_url: string;
    domain: string;
}

/**
 * ChatGPT embodiment properties from agent configuration
 */
export interface ChatGPTEmbodimentProperties {
    /** Description for the model */
    modelDescription?: string;

    /** Human-readable name */
    humanName?: string;

    /** Model name */
    modelName?: string;

    /** Human-readable description */
    humanDescription?: string;

    /** Contact email */
    contactEmail?: string;

    /** Legal information URL */
    legalInfoUrl?: string;

    /** Logo URL */
    logoUrl?: string;
}
