import { errorToast, successToast } from '@src/shared/components/toast';
import {
  getConnectionOauthInfo,
  saveOAuthConnection,
} from '@src/shared/helpers/oauth/oauth-api.helper';
import { OAuthServicesRegistry } from '@src/shared/helpers/oauth/oauth-services.helper';
import { mapInternalToServiceName } from '@src/shared/helpers/oauth/oauth.utils';
import { builderStore } from '@src/shared/state_stores/builder/store';
import type {
  OAuthConnection,
  OAuthInfo,
  OAuthServiceType,
  SelectOption,
  ValidationResult,
} from './oauth.types';

export class OAuthService {
  private authCheckPromises: Map<string, Promise<boolean>> = new Map();
  private connections: Record<string, OAuthConnection> = {};

  constructor(private workspace: any) {}

  /**
   * Load OAuth connections from workspace cache
   */
  async loadConnections(): Promise<Record<string, OAuthConnection>> {
    try {
      const data = await builderStore.getState().getOAuthConnections();
      this.connections = data || {};
      return this.connections;
    } catch (error) {
      console.error('[OAuthService] Failed to load connections:', error);
      return {};
    }
  }

  /**
   * Build select options from connections
   */
  buildSelectOptions(): SelectOption[] {
    const options: SelectOption[] = [];

    for (const [id, conn] of Object.entries(this.connections)) {
      const connectionName = conn?.auth_settings?.name;
      if (connectionName) {
        options.push({
          value: id,
          text: connectionName,
          badge: '',
        });
      }
    }

    return [{ value: 'None', text: 'None', badge: '' }, ...options];
  }

  /**
   * Validate OAuth payload
   */
  validatePayload(
    payload: OAuthInfo,
    connectionType: OAuthServiceType,
    derivedService: string,
  ): ValidationResult {
    const missingFields: string[] = [];
    const isClientCredentials =
      connectionType === 'oauth2_client_credentials' ||
      payload.service === 'oauth2_client_credentials';

    if (
      connectionType === 'oauth2' ||
      isClientCredentials ||
      ['Google', 'LinkedIn'].includes(derivedService)
    ) {
      if (!payload.tokenURL) missingFields.push('Token URL');
      if (!payload.clientID) missingFields.push('Client ID');
      if (!payload.clientSecret) missingFields.push('Client Secret');

      if (!isClientCredentials) {
        if (!payload.authorizationURL) missingFields.push('Auth URL');
        if (!payload.scope) missingFields.push('Scopes');
      }
    } else if (connectionType === 'oauth') {
      if (!payload.requestTokenURL) missingFields.push('Request Token URL');
      if (!payload.accessTokenURL) missingFields.push('Access Token URL');
      if (!payload.userAuthorizationURL) missingFields.push('User Auth URL');
      if (!payload.consumerKey) missingFields.push('Consumer Key');
      if (!payload.consumerSecret) missingFields.push('Consumer Secret');
    }

    return { valid: missingFields.length === 0, missingFields };
  }

  /**
   * Normalize callback URL origin
   */
  normalizeCallbackOrigin(
    cb: string | undefined,
    providerPath: string | undefined,
  ): string | undefined {
    if (!providerPath) return cb;

    const origin = this.getBackendOrigin();
    try {
      if (!cb) return `${origin}${providerPath}`;
      const current = new URL(cb);
      const desired = new URL(origin);
      if (current.origin !== desired.origin) {
        return `${desired.origin}${current.pathname}${current.search}${current.hash}`;
      }
      return cb;
    } catch {
      return `${origin}${providerPath}`;
    }
  }

  /**
   * Perform authentication
   */
  async authenticate(connectionId: string): Promise<boolean> {
    const connection = this.connections[connectionId];
    const oauthInfo = getConnectionOauthInfo(connection, connectionId) as OAuthInfo;

    if (!connection || !oauthInfo?.service) {
      errorToast('OAuth connection details not found.', 'Error', 'alert');
      return false;
    }

    // Validate payload
    const derivedService = mapInternalToServiceName(oauthInfo.service);
    const validation = this.validatePayload(oauthInfo, oauthInfo.service, derivedService);

    if (!validation.valid) {
      errorToast(
        `Missing required fields: ${validation.missingFields.join(', ')}`,
        'Error',
        'alert',
      );
      return false;
    }

    // Normalize callback URLs
    this.normalizeCallbackUrls(oauthInfo);

    const isClientCredentials = oauthInfo.service === 'oauth2_client_credentials';
    const endpoint = isClientCredentials ? 'client_credentials' : 'init';
    const url = `${this.workspace.server}/oauth/${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oauthInfo),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Authentication failed with status ${response.status}`,
        );
      }

      const data = await response.json();

      if (data.authUrl) {
        window.open(data.authUrl, '_blank');
        return true;
      } else if ('success' in data) {
        if (data.success) {
          this.updateConnectionTokens(connectionId, data);
          successToast(data.message);
        } else {
          this.clearConnectionTokens(connectionId);
          errorToast(data.message, 'Error', 'alert');
        }
        return data.success;
      }

      throw new Error('Unexpected response from authentication server.');
    } catch (error) {
      errorToast(`Authentication Failed: ${error?.message || error}`, 'Error', 'alert');
      this.clearConnectionTokens(connectionId);
      return false;
    }
  }

  /**
   * Sign out from OAuth connection
   */
  async signOut(connectionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.workspace.server}/oauth/signOut`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oauth_keys_prefix: connectionId,
          invalidateAuthentication: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.invalidate) {
        this.clearConnectionAuthState(connectionId);
        if (data.message) successToast(data.message);
        return true;
      } else {
        errorToast(data.error, 'Error', 'alert');
        return false;
      }
    } catch (error) {
      errorToast(`Error during sign out: ${error.message}`, 'Error', 'alert');
      return false;
    }
  }

  /**
   * Check authentication status
   */
  async checkAuthentication(connectionId: string): Promise<boolean> {
    if (!connectionId || connectionId === 'None') return false;

    // Use cached promise if available
    const existingPromise = this.authCheckPromises.get(connectionId);
    if (existingPromise) return existingPromise;

    const authCheckPromise = this.performAuthCheck(connectionId);
    this.authCheckPromises.set(connectionId, authCheckPromise);

    // Clear cache after completion
    authCheckPromise.finally(() => {
      setTimeout(() => {
        if (this.authCheckPromises.get(connectionId) === authCheckPromise) {
          this.authCheckPromises.delete(connectionId);
        }
      }, 1000);
    });

    return authCheckPromise;
  }

  /**
   * Save OAuth connection
   */
  async saveConnection(connectionId: string, formData: Record<string, string>): Promise<void> {
    const service = this.mapServiceNameToInternal(formData.oauthService);
    const type = this.getConnectionType(formData.oauthService);
    const oauthPrefix = connectionId.replace('_TOKENS', '');

    const oauthInfo: any = {
      oauth_keys_prefix: oauthPrefix,
      service,
      name: formData.name.trim(),
      platform: formData.platform.trim(),
    };

    // Add type-specific fields
    if (type === 'oauth2' || type === 'oauth2_client_credentials') {
      oauthInfo.tokenURL = formData.tokenURL || '';
      oauthInfo.clientID = formData.clientID || '';
      oauthInfo.clientSecret = formData.clientSecret || '';

      if (type === 'oauth2') {
        oauthInfo.authorizationURL = formData.authorizationURL || '';
        oauthInfo.scope = formData.scope || '';
      }
    } else if (type === 'oauth') {
      oauthInfo.requestTokenURL = formData.requestTokenURL || '';
      oauthInfo.accessTokenURL = formData.accessTokenURL || '';
      oauthInfo.userAuthorizationURL = formData.userAuthorizationURL || '';
      oauthInfo.consumerKey = formData.consumerKey || '';
      oauthInfo.consumerSecret = formData.consumerSecret || '';
    }

    const authSettings = {
      name: oauthInfo.name,
      type,
      ...(oauthInfo.tokenURL && { tokenURL: oauthInfo.tokenURL }),
      oauth_info: oauthInfo,
    };

    await saveOAuthConnection(connectionId, authSettings);

    // Clear cache and reload connections
    this.authCheckPromises.delete(connectionId);
    builderStore.getState().invalidateOAuthConnectionsCache();
    await this.loadConnections();
  }

  // Private helper methods
  private getBackendOrigin(): string {
    const candidate = this.workspace?.server || window.location.origin;
    try {
      return new URL(candidate).origin;
    } catch {
      return String(candidate).replace(/\/$/, '');
    }
  }

  private normalizeCallbackUrls(oauthInfo: OAuthInfo): void {
    const serviceType = oauthInfo.service.toLowerCase();

    // Use centralized configuration to determine callback paths
    const isOAuth2 = OAuthServicesRegistry.isOAuth2Service(serviceType);
    const isOAuth1 = OAuthServicesRegistry.isOAuth1Service(serviceType);

    if (isOAuth2) {
      // Get callback path from centralized configuration, fallback to legacy logic for compatibility
      const callbackPath =
        OAuthServicesRegistry.getCallbackPath(serviceType) ||
        `/oauth/${['google', 'linkedin'].includes(serviceType) ? serviceType : 'oauth2'}/callback`;
      oauthInfo.oauth2CallbackURL = this.normalizeCallbackOrigin(
        oauthInfo.oauth2CallbackURL,
        callbackPath,
      );
    }

    if (isOAuth1) {
      // Get callback path from centralized configuration, fallback to legacy logic for compatibility
      const callbackPath =
        OAuthServicesRegistry.getCallbackPath(serviceType) ||
        `/oauth/${serviceType === 'twitter' ? 'oauth1' : serviceType}/callback`;
      oauthInfo.oauth1CallbackURL = this.normalizeCallbackOrigin(
        oauthInfo.oauth1CallbackURL,
        callbackPath,
      );
    }
  }

  private async performAuthCheck(connectionId: string): Promise<boolean> {
    const connection = this.connections[connectionId];
    if (!connection) return false;

    const oauthInfo = getConnectionOauthInfo(connection, connectionId) as OAuthInfo;
    const oauth_keys_prefix = oauthInfo?.oauth_keys_prefix || connectionId.replace('_TOKENS', '');

    if (!oauth_keys_prefix) return false;

    try {
      const response = await fetch(`${this.workspace.server}/oauth/checkAuth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oauth_keys_prefix }),
      });

      if (!response.ok) return false;

      const data = await response.json();
      const isAuthenticated = Boolean(data.success);

      // Update local cache
      if (this.connections[connectionId]) {
        this.connections[connectionId].isAuthenticated = isAuthenticated;
      }

      return isAuthenticated;
    } catch (error) {
      console.error(`Error during auth check for ${oauth_keys_prefix}:`, error);
      return false;
    }
  }

  private updateConnectionTokens(connectionId: string, data: any): void {
    const connection = this.connections[connectionId];
    if (!connection || !data.primary) return;

    connection.isAuthenticated = true;
    if (!connection.auth_data) connection.auth_data = {};

    connection.auth_data.primary = data.primary;
    if (data.secondary) connection.auth_data.secondary = data.secondary;
    if (data.expires_in) connection.auth_data.expires_in = data.expires_in;
  }

  private clearConnectionTokens(connectionId: string): void {
    const connection = this.connections[connectionId];
    if (!connection?.auth_data) return;

    delete connection.auth_data.primary;
    delete connection.auth_data.secondary;
    delete connection.auth_data.expires_in;
  }

  private clearConnectionAuthState(connectionId: string): void {
    const connection = this.connections[connectionId];
    if (!connection) return;

    connection.isAuthenticated = false;
    this.clearConnectionTokens(connectionId);
    this.authCheckPromises.delete(connectionId);
  }

  private mapServiceNameToInternal(serviceName: string): string {
    return OAuthServicesRegistry.mapServiceNameToInternal(serviceName);
  }

  private getConnectionType(
    oauthService: string,
  ): 'oauth' | 'oauth2' | 'oauth2_client_credentials' {
    if (OAuthServicesRegistry.isOAuth1Service(oauthService)) return 'oauth';
    if (OAuthServicesRegistry.isClientCredentialsService(oauthService))
      return 'oauth2_client_credentials';
    return 'oauth2';
  }
}
