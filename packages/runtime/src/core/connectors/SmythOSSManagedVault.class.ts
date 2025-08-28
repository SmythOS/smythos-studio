import {
  ACL,
  AccessRequest,
  ConnectorService,
  IAccessCandidate,
  Logger,
  ManagedVaultConnector,
  OAuthConfig,
  SecureConnector,
  TAccessLevel,
  TAccessRole,
} from "@smythos/sre";
import axios, { AxiosInstance } from "axios";
import { SmythConfigs } from "@core/types/general.types";
import { getM2MToken } from "@core/services/logto-helper";
const console = Logger("SmythOSSManagedVault");
export class SmythOSSManagedVault extends ManagedVaultConnector {
  public name: string = "SmythOSSManagedVault";
  private oAuthAppId: string;
  private oAuthAppSecret: string;
  private oAuthBaseUrl: string;
  private oAuthResource?: string;
  private oAuthScope?: string;
  private smythAPI: AxiosInstance;
  private vaultName: string;

  constructor(
    protected _settings: SmythConfigs & OAuthConfig & { vaultName: string }
  ) {
    super(_settings);
    //if (!SmythRuntime.Instance) throw new Error('SRE not initialized');

    this.oAuthAppId = _settings.oAuthAppID;
    this.oAuthAppSecret = _settings.oAuthAppSecret;
    this.oAuthBaseUrl = _settings.oAuthBaseUrl;
    this.oAuthResource = _settings.oAuthResource || "";
    this.oAuthScope = _settings.oAuthScope || "";
    this.smythAPI = axios.create({
      baseURL: `${_settings.smythAPIBaseUrl}`,
    });
    this.vaultName = _settings.vaultName || "vault";
  }

  @SecureConnector.AccessControl
  protected async get(acRequest: AccessRequest, keyId: string) {
    const accountConnector = ConnectorService.getAccountConnector();
    const teamId = await accountConnector.getCandidateTeam(acRequest.candidate);
    const vaultSetting = await accountConnector.getTeamSetting(
      acRequest,
      teamId,
      this.vaultName
    );
    const vaultData = JSON.parse(vaultSetting || "{}");
    return vaultData[keyId];
  }

  @SecureConnector.AccessControl
  protected async set(acRequest: AccessRequest, keyId: string, value: string) {
    const accountConnector = ConnectorService.getAccountConnector();
    const teamId = await accountConnector.getCandidateTeam(acRequest.candidate);
    const vaultSetting = await accountConnector.getTeamSetting(
      acRequest,
      teamId,
      this.vaultName
    );
    const vaultData = JSON.parse(vaultSetting || "{}");
    vaultData[keyId] = value;
    await this.smythAPI.put(
      `/v1/teams/${teamId}/settings`,
      {
        settingKey: this.vaultName,
        settingValue: JSON.stringify(vaultData),
      },
      { headers: await this.getSmythRequestHeaders() }
    );
  }

  @SecureConnector.AccessControl
  protected async delete(acRequest: AccessRequest, keyId: string) {
    const accountConnector = ConnectorService.getAccountConnector();
    const teamId = await accountConnector.getCandidateTeam(acRequest.candidate);
    const vaultSetting = await accountConnector.getTeamSetting(
      acRequest,
      teamId,
      this.vaultName
    );
    const vaultData = JSON.parse(vaultSetting || "{}");
    delete vaultData[keyId];
    await this.smythAPI.put(
      `/v1/teams/${teamId}/settings`,
      {
        settingKey: this.vaultName,
        settingValue: JSON.stringify(vaultData),
      },
      { headers: await this.getSmythRequestHeaders() }
    );
  }

  @SecureConnector.AccessControl
  protected async exists(acRequest: AccessRequest, keyId: string) {
    const accountConnector = ConnectorService.getAccountConnector();
    const teamId = await accountConnector.getCandidateTeam(acRequest.candidate);
    const vaultSetting = await accountConnector.getTeamSetting(
      acRequest,
      teamId,
      this.vaultName
    );
    const vaultData = JSON.parse(vaultSetting || "{}");
    return keyId in vaultData;
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

  private async getSmythRequestHeaders() {
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
