import axios, { AxiosInstance } from 'axios';

import {
  AccessRequest,
  ACL,
  ConnectorService,
  IAccessCandidate,
  Logger,
  OAuthConfig,
  SecureConnector,
  TAccessLevel,
  TAccessRole,
  VaultConnector,
} from '@smythos/sre';

import { getM2MToken } from '@core/helpers/logto.helper';

type SmythVaultConfig = {
  vaultAPIBaseUrl: string;
};

const console = Logger('SmythOSSVault');
export class SmythOSSVault extends VaultConnector {
  public name: string = 'SmythOSSVault';
  private oAuthAppId: string;
  private oAuthAppSecret: string;
  private oAuthBaseUrl: string;
  private oAuthResource?: string;
  private oAuthScope?: string;
  private vaultAPI: AxiosInstance;

  constructor(protected _settings: SmythVaultConfig & OAuthConfig) {
    super(_settings);
    //if (!SmythRuntime.Instance) throw new Error('SRE not initialized');

    this.oAuthAppId = _settings.oAuthAppID;
    this.oAuthAppSecret = _settings.oAuthAppSecret;
    this.oAuthBaseUrl = _settings.oAuthBaseUrl;
    this.oAuthResource = _settings.oAuthResource || '';
    this.oAuthScope = _settings.oAuthScope || '';
    this.vaultAPI = axios.create({
      baseURL: `${_settings.vaultAPIBaseUrl}/v1/api`,
    });
  }

  @SecureConnector.AccessControl
  protected async get(acRequest: AccessRequest, keyId: string) {
    const accountConnector = ConnectorService.getAccountConnector();
    const teamId = await accountConnector.getCandidateTeam(acRequest.candidate);
    const vaultAPIHeaders = await this.getVaultRequestHeaders();

    let key = '';
    try {
      const vaultResponse = await this.vaultAPI.get(`/vault/${teamId}/secrets/${keyId}`, { headers: vaultAPIHeaders });
      key = vaultResponse?.data?.secret?.value || null;
    } catch (error) {
      console.warn(`Warn: Failed to get key "${keyId}" from SmythVault, trying to get it from the legacy vault`);
    }

    if (!key) {
      const vaultResponse = await this.vaultAPI.get(`/vault/${teamId}/secrets/name/${keyId}`, { headers: vaultAPIHeaders });

      key = vaultResponse?.data?.secret?.value || null;
    }

    if (!key) {
      // * Note: Adjustment for legacy global vault keys, we can remove it after migrating all keys in Hashicorp Vault with proper key ID such as 'googleai' -> 'GoogleAI'
      const legacyGlobalVaultKey = keyId.toLowerCase();
      const globalVaultKey = legacyGlobalVaultKey === 'anthropic' ? 'claude' : legacyGlobalVaultKey; // Ensure backward compatibility: In SaaS the key was stored under 'claude';
      const vaultResponse = await this.vaultAPI.get(`/vault/${teamId}/secrets/${globalVaultKey}`, { headers: vaultAPIHeaders });

      return vaultResponse?.data?.secret?.value;
    }

    return key || null;
  }

  @SecureConnector.AccessControl
  protected async exists(acRequest: AccessRequest, keyId: string) {
    const accountConnector = ConnectorService.getAccountConnector();
    const teamId = await accountConnector.getCandidateTeam(acRequest.candidate);
    const vaultAPIHeaders = await this.getVaultRequestHeaders();
    const vaultResponse = await this.vaultAPI.get(`/vault/${teamId}/secrets/${keyId}`, { headers: vaultAPIHeaders });
    return vaultResponse?.data?.secret ? true : false;
  }

  @SecureConnector.AccessControl
  protected async listKeys(acRequest: AccessRequest) {
    //const accountConnector = ConnectorService.getAccountConnector();
    const teamId = acRequest.candidate.id;
    const vaultAPIHeaders = await this.getVaultRequestHeaders();
    const vaultResponse = await this.vaultAPI.get(`/vault/${teamId}/secrets`, {
      headers: vaultAPIHeaders,
    });
    if (vaultResponse?.data?.secrets) {
      vaultResponse?.data?.secrets?.forEach((secret: any) => {
        if (secret?.metadata?.scope) {
          try {
            secret.metadata.scope = JSON.parse(secret.metadata.scope);
          } catch (error) {
            secret.metadata.scope = [];
            console.error('Error:', error);
          }
        }
      });
    }

    return vaultResponse?.data?.secrets || [];
  }

  public async getResourceACL(resourceId: string, candidate: IAccessCandidate) {
    const accountConnector = ConnectorService.getAccountConnector();
    const teamId = await accountConnector.getCandidateTeam(candidate);

    const acl = new ACL();

    acl
      .addAccess(TAccessRole.Team, teamId, TAccessLevel.Owner)
      .addAccess(TAccessRole.Team, teamId, TAccessLevel.Read)
      .addAccess(TAccessRole.Team, teamId, TAccessLevel.Write);

    return acl;
  }

  private async getVaultRequestHeaders() {
    return {
      Authorization: `Bearer ${await getM2MToken({
        baseUrl: this.oAuthBaseUrl,
        oauthAppId: this.oAuthAppId,
        oauthAppSecret: this.oAuthAppSecret,
        resource: this.oAuthResource,
        scope: this.oAuthScope,
      })}`,
    };
  }
}
