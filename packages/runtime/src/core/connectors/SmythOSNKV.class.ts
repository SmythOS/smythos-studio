/* eslint-disable no-param-reassign */
import {
  ACL,
  ACLAccessDeniedError,
  AccessRequest,
  AccountConnector,
  ConnectorService,
  IAccessCandidate,
  JSONContentHelper,
  NKVConnector,
  OAuthConfig,
  StorageData,
  TAccessLevel,
  TAccessResult,
  TAccessRole,
} from '@smythos/sre';
import axios, { AxiosInstance } from 'axios';
import Joi from 'joi';

import { SmythConfigs } from '@core/types/general.types';

export class SmythNKV extends NKVConnector {
  public name = 'SmythNKV';
  private smythAPI: AxiosInstance;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  private accountConnector: AccountConnector;
  constructor(protected _settings: SmythConfigs & OAuthConfig) {
    super();

    this.smythAPI = axios.create({
      baseURL: `${_settings.smythAPIBaseUrl}/v1`,
    });
    this.accountConnector = ConnectorService.getAccountConnector();
  }

  /**
   * Helper: Construct prefixed group name for NKV
   */
  private nkvGroup(namespace: string): string {
    return `nkv:${namespace}`;
  }

  /**
   * Helper: Get OAuth token with caching
   */
  private async getAuthToken(): Promise<string> {
    return Promise.resolve('M2M_TOKEN');
  }

  /**
   * Helper: Make authenticated API request
   */
  private async makeAuthenticatedRequest(method: string, url: string, data?: any): Promise<any> {
    const token = await this.getAuthToken();

    try {
      const response = await this.smythAPI.request({
        method,
        url,
        data,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data;
    } catch (error: any) {
      console.log('Error occured in makeAuthenticatedRequest', error?.response?.data);
      // Handle 401 by clearing token cache and retrying once
      if (error.response?.status === 401 && this.tokenCache) {
        this.tokenCache = null;
        const newToken = await this.getAuthToken();
        const response = await this.smythAPI.request({
          method,
          url,
          data,
          headers: {
            Authorization: `Bearer ${newToken}`,
          },
        });
        return response.data;
      }
      throw error;
    }
  }

  /**
   * Helper: Check if namespace is new (no ACL exists)
   */
  private async isNewNamespace(namespace: string, teamId: string): Promise<boolean> {
    try {
      await this.makeAuthenticatedRequest('GET', `/teams/${teamId}/settings/__acl__?group=${this.nkvGroup(namespace)}`);
      return false; // ACL exists, namespace is NOT new
    } catch (error: any) {
      if (error.response?.status === 404) {
        return true; // ACL doesn't exist, namespace IS new
      }
      throw error; // Other error
    }
  }

  /**
   * Helper: Initialize namespace with default ACL
   */
  private async initializeNamespace(namespace: string, teamId: string): Promise<void> {
    // Create ACL with team as owner
    const defaultACL = new ACL()
      .addAccess(TAccessRole.Team, teamId, TAccessLevel.Owner)
      .addAccess(TAccessRole.Team, teamId, TAccessLevel.Read)
      .addAccess(TAccessRole.Team, teamId, TAccessLevel.Write);

    const aclMetadata = {
      resourceId: namespace,
      acl: defaultACL,
      createdBy: teamId,
      createdAt: Date.now(),
    };

    await this.makeAuthenticatedRequest('PUT', `/teams/${teamId}/settings`, {
      group: this.nkvGroup(namespace),
      settingKey: '__acl__',
      settingValue: JSON.stringify(aclMetadata),
    });
  }

  @SmythNKV.ValidateParams
  @SmythNKV.NamespaceAccessControl
  protected async get(acRequest: AccessRequest, namespace: string, key: string): Promise<StorageData> {
    const teamId = await this.accountConnector.getCandidateTeam(acRequest.candidate);

    try {
      const response = await this.makeAuthenticatedRequest('GET', `/teams/${teamId}/settings/${key}?group=${this.nkvGroup(namespace)}`);
      return response.setting.settingValue;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return undefined;
      }
      throw error;
    }
  }

  @SmythNKV.ValidateParams
  @SmythNKV.NamespaceAccessControl
  protected async set(acRequest: AccessRequest, namespace: string, key: string, value: any): Promise<void> {
    const teamId = await this.accountConnector.getCandidateTeam(acRequest.candidate);

    // Check if namespace is new and initialize if needed
    const isNew = await this.isNewNamespace(namespace, teamId);
    if (isNew) {
      await this.initializeNamespace(namespace, teamId);
    }

    // Stringify the value for storage (API only handles text)

    // Set the actual key-value
    await this.makeAuthenticatedRequest('PUT', `/teams/${teamId}/settings`, {
      group: this.nkvGroup(namespace),
      settingKey: key,
      settingValue: value,
    });
  }

  @SmythNKV.ValidateParams
  @SmythNKV.NamespaceAccessControl
  protected async delete(acRequest: AccessRequest, namespace: string, key: string): Promise<void> {
    const teamId = await this.accountConnector.getCandidateTeam(acRequest.candidate);

    // Prevent direct deletion of ACL metadata
    if (key === '__acl__') {
      throw new Error('Cannot delete ACL metadata directly. Use deleteAll to remove the entire namespace.');
    }

    await this.makeAuthenticatedRequest('DELETE', `/teams/${teamId}/settings/${key}?group=${this.nkvGroup(namespace)}`);
  }

  @SmythNKV.ValidateParams
  @SmythNKV.NamespaceAccessControl
  protected async exists(acRequest: AccessRequest, namespace: string, key: string): Promise<boolean> {
    const teamId = await this.accountConnector.getCandidateTeam(acRequest.candidate);

    try {
      await this.makeAuthenticatedRequest('GET', `/teams/${teamId}/settings/${key}?group=${this.nkvGroup(namespace)}`);
      return true;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return false;
      }
      throw error;
    }
  }

  @SmythNKV.NamespaceAccessControl
  public async list(acRequest: AccessRequest, namespace: string): Promise<{ key: string; data: StorageData }[]> {
    const teamId = await this.accountConnector.getCandidateTeam(acRequest.candidate);

    try {
      const response = await this.makeAuthenticatedRequest('GET', `/teams/${teamId}/settings?group=${this.nkvGroup(namespace)}`);

      if (!Array.isArray(response.settings)) {
        return [];
      }

      return response.settings
        .filter((setting: any) => setting.settingKey !== '__acl__')
        .map((setting: any) => ({
          key: setting.settingKey,
          data: setting.settingValue,
        }));
    } catch (error: any) {
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  }

  @SmythNKV.NamespaceAccessControl
  public async deleteAll(acRequest: AccessRequest, namespace: string): Promise<void> {
    // TODO: implement bulk delete from the API
    const teamId = await this.accountConnector.getCandidateTeam(acRequest.candidate);

    // Get all keys in the namespace (this already filters out __acl__)
    const allSettings = await this.list(acRequest, namespace);

    // Delete all user keys
    const deletePromises = allSettings.map(setting =>
      this.makeAuthenticatedRequest('DELETE', `/teams/${teamId}/settings/${setting.key}?group=${this.nkvGroup(namespace)}`),
    );

    await Promise.all(deletePromises);

    // Finally, delete the ACL metadata to completely remove the namespace
    try {
      await this.makeAuthenticatedRequest('DELETE', `/teams/${teamId}/settings/__acl__?group=${this.nkvGroup(namespace)}`);
    } catch (error: any) {
      // Ignore 404 if ACL doesn't exist
      if (error.response?.status !== 404) {
        throw error;
      }
    }
  }

  public async getResourceACL(resourceId: string, candidate: IAccessCandidate): Promise<ACL> {
    const teamId = await this.accountConnector.getCandidateTeam(candidate);

    try {
      const response = await this.makeAuthenticatedRequest('GET', `/teams/${teamId}/settings/__acl__?group=${this.nkvGroup(resourceId)}`);
      const aclMetadata = JSONContentHelper.create(response.setting.settingValue).tryParse();

      if (aclMetadata && aclMetadata.acl) {
        return new ACL(aclMetadata.acl);
      }

      return this.getDefaultACL(teamId);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return this.getDefaultACL(teamId);
      }

      console.error(error);
      console.error(error.response?.data);
      throw error;
    }
  }

  /**
   * Helper: Get default ACL for a team
   */
  private getDefaultACL(teamId: string): ACL {
    return new ACL()
      .addAccess(TAccessRole.Team, teamId, TAccessLevel.Owner)
      .addAccess(TAccessRole.Team, teamId, TAccessLevel.Read)
      .addAccess(TAccessRole.Team, teamId, TAccessLevel.Write);
  }

  static NamespaceAccessControl(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Store the original method in a variable
    const originalMethod = descriptor.value;

    // Modify the descriptor's value to wrap the original method
    descriptor.value = async function (...args: any[]): Promise<any> {
      // Extract the method arguments
      const [acRequest, namespace, key] = args;

      // Access control is at NAMESPACE level only
      // Key parameter is ignored for ACL checks
      const resourceId = namespace;

      // Get access ticket for the namespace
      const accessTicket = await this.getAccessTicket(resourceId, acRequest);

      if (accessTicket.access !== TAccessResult.Granted) {
        throw new ACLAccessDeniedError('Access Denied');
      }

      // Call the original method with the original arguments
      return originalMethod.apply(this, args);
    };

    // Return the modified descriptor
    return descriptor;
  }

  static ValidateParams(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    // Store the original method in a variable
    const originalMethod = descriptor.value;

    // Modify the descriptor's value to wrap the original method
    descriptor.value = async function (...args: any[]) {
      // Extract the method arguments
      const [acRequest, namespace, key] = args;

      // Validate the arguments
      const schemaValidator = Joi.object().keys({
        namespace: Joi.string().min(1).required(),
        key: Joi.string().min(1).required(),
      });
      const validationResult = schemaValidator.validate({ namespace, key });

      if (validationResult.error) {
        throw new Error(`Validation Error: ${validationResult.error.message}`);
      }

      // Call the original method with the original arguments
      return originalMethod.apply(this, args);
    };

    // Return the modified descriptor
    return descriptor;
  }
}
