// Centralized OAuth Services Registry
// This file provides a unified interface for OAuth service configurations
// eliminating duplication across React and Builder UI components

import oauthServicesConfig from './oauth-services.json';

export interface OAuthServiceConfig {
  displayName: string;
  internalName: string;
  type: 'oauth1' | 'oauth2' | 'oauth2_client_credentials' | 'none';
  category: 'predefined' | 'custom' | 'system';
  config: Record<string, string>;
  callbackPath: string;
  validation: {
    required: string[];
  };
}

export interface OAuthServiceDefaults {
  authorizationURL?: string;
  tokenURL?: string;
  scope?: string;
  requestTokenURL?: string;
  accessTokenURL?: string;
  userAuthorizationURL?: string;
}

/**
 * Centralized OAuth Services Registry
 *
 * This class provides a single source of truth for OAuth service configurations,
 * replacing hardcoded service definitions scattered across the codebase.
 *
 * @example
 * // Check service type
 * const isOAuth2 = OAuthServicesRegistry.isOAuth2Service('Google');
 *
 * // Get service defaults
 * const defaults = OAuthServicesRegistry.getServiceDefaults('Google');
 *
 * // Get validation rules
 * const required = OAuthServicesRegistry.getValidationRules('Google');
 */
export class OAuthServicesRegistry {
  private static services = oauthServicesConfig.services as Record<string, OAuthServiceConfig>;

  /**
   * Get service configuration by display name
   * @param displayName - The user-facing service name (e.g., 'Google', 'LinkedIn')
   * @returns Service configuration or null if not found
   */
  static getServiceConfig(displayName: string): OAuthServiceConfig | null {
    return this.services[displayName] || null;
  }

  /**
   * Get service configuration by internal name
   * @param internalName - The internal service identifier (e.g., 'google', 'linkedin')
   * @returns Service configuration or null if not found
   */
  static getServiceByInternalName(internalName: string): OAuthServiceConfig | null {
    return Object.values(this.services).find((s) => s.internalName === internalName) || null;
  }

  /**
   * Get all services of a specific type
   * @param type - OAuth service type
   * @returns Array of service configurations
   */
  static getServicesByType(type: string): OAuthServiceConfig[] {
    return Object.values(this.services).filter((s) => s.type === type);
  }

  /**
   * Get predefined service defaults (URLs, scopes, etc.)
   * @param displayName - The user-facing service name
   * @returns Default configuration values
   */
  static getServiceDefaults(displayName: string): OAuthServiceDefaults {
    const service = this.getServiceConfig(displayName);
    return service?.config || {};
  }

  /**
   * Check if service uses OAuth1.0/1.0a
   * @param serviceName - Service name (display or internal)
   * @returns True if OAuth1 service
   */
  static isOAuth1Service(serviceName: string): boolean {
    const service =
      this.getServiceConfig(serviceName) || this.getServiceByInternalName(serviceName);
    return service?.type === 'oauth1';
  }

  /**
   * Check if service uses OAuth2.0
   * @param serviceName - Service name (display or internal)
   * @returns True if OAuth2 service
   */
  static isOAuth2Service(serviceName: string): boolean {
    const service =
      this.getServiceConfig(serviceName) || this.getServiceByInternalName(serviceName);
    return service?.type === 'oauth2';
  }

  /**
   * Check if service uses OAuth2 Client Credentials flow
   * @param serviceName - Service name (display or internal)
   * @returns True if Client Credentials service
   */
  static isClientCredentialsService(serviceName: string): boolean {
    const service =
      this.getServiceConfig(serviceName) || this.getServiceByInternalName(serviceName);
    return service?.type === 'oauth2_client_credentials';
  }

  /**
   * Get callback path for service
   * @param serviceName - Service name (display or internal)
   * @returns Callback path for OAuth flow
   */
  static getCallbackPath(serviceName: string): string {
    const service =
      this.getServiceConfig(serviceName) || this.getServiceByInternalName(serviceName);
    return service?.callbackPath || '/oauth/oauth2/callback';
  }

  /**
   * Get validation rules for service
   * @param serviceName - Service name (display or internal)
   * @returns Array of required field names
   */
  static getValidationRules(serviceName: string): string[] {
    const service =
      this.getServiceConfig(serviceName) || this.getServiceByInternalName(serviceName);
    return service?.validation.required || [];
  }

  /**
   * Map display name to internal name
   * @param displayName - User-facing service name
   * @returns Internal service identifier
   */
  static mapServiceNameToInternal(displayName: string): string {
    const service = this.getServiceConfig(displayName);
    return service?.internalName || displayName.toLowerCase();
  }

  /**
   * Map internal name to display name
   * @param internalName - Internal service identifier
   * @returns User-facing service name
   */
  static mapInternalToServiceName(internalName: string): string {
    const service = this.getServiceByInternalName(internalName);
    return service?.displayName || internalName;
  }

  /**
   * Get all service display names
   * @returns Array of all available service names
   */
  static getAllServiceNames(): string[] {
    return Object.keys(this.services);
  }

  /**
   * Get services by category
   * @param category - Service category
   * @returns Array of service configurations in the category
   */
  static getServicesByCategory(category: 'predefined' | 'custom' | 'system'): OAuthServiceConfig[] {
    return Object.values(this.services).filter((s) => s.category === category);
  }

  /**
   * Get OAuth flow type for service (used for routing)
   * @param serviceName - Service name (display or internal)
   * @returns OAuth flow type
   */
  static getOAuthFlowType(
    serviceName: string,
  ): 'oauth' | 'oauth2' | 'oauth2_client_credentials' | 'none' {
    const service =
      this.getServiceConfig(serviceName) || this.getServiceByInternalName(serviceName);

    if (!service) return 'oauth2'; // Default fallback

    switch (service.type) {
      case 'oauth1':
        return 'oauth';
      case 'oauth2':
        return 'oauth2';
      case 'oauth2_client_credentials':
        return 'oauth2_client_credentials';
      case 'none':
        return 'none';
      default:
        return 'oauth2';
    }
  }

  /**
   * Check if service requires specific callback handling
   * @param serviceName - Service name (display or internal)
   * @returns True if service needs special callback handling
   */
  static requiresSpecialCallbackHandling(serviceName: string): boolean {
    const internalName = this.mapServiceNameToInternal(serviceName);
    // Twitter and other OAuth1 services need special handling
    return ['twitter', 'oauth1'].includes(internalName);
  }

  /**
   * Get service list for dropdowns/selects (excluding 'None')
   * @returns Array of service names suitable for UI dropdowns
   */
  static getSelectableServiceNames(): string[] {
    return Object.keys(this.services).filter((name) => name !== 'None');
  }

  /**
   * Validate if a service name is supported
   * @param serviceName - Service name to validate
   * @returns True if service is supported
   */
  static isValidService(serviceName: string): boolean {
    return (
      this.getServiceConfig(serviceName) !== null ||
      this.getServiceByInternalName(serviceName) !== null
    );
  }
}
