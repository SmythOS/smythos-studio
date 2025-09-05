import { errKeys } from '@react/shared/constants';
import {
  getAgentSettings,
  saveAgentSettingByKey,
} from '@src/react/features/agent-settings/clients';
import { EMBODIMENT_TYPE } from '@src/react/shared/enums';
import EventEmitter from './EventEmitter.class';
import { alert, confirm, showOverlay } from './ui/dialogs';
import { LocalStorageArrayRetriever, createLocalStorageArrayRetriever } from './utils';
import { Workspace } from './workspace/Workspace.class';
declare var workspace: Workspace;
export class Agent extends EventEmitter {
  public id: string;
  public name: string;
  public domain: string;
  public data: any;
  public lockStatus: string;
  public isNewAgent: boolean;

  private lock: {
    id: string;
    loaded: boolean;
    refreshLockIntervalFn: any;
    lockAgentRetryIntervalFn: any;
    refreshMilli: number;
    retryToAccquireLockMilli: number;
    promisedToLock: boolean;
    undetectedDisconnectPeriod: number;
    lStore: LocalStorageArrayRetriever;
    isAgentLockedPopupShown: boolean;
  } = {
    id: null,
    loaded: false,
    refreshLockIntervalFn: null,
    lockAgentRetryIntervalFn: null,
    refreshMilli: 10_000,
    retryToAccquireLockMilli: 10_000,
    undetectedDisconnectPeriod: 40_000,
    promisedToLock: false,
    lStore: createLocalStorageArrayRetriever('agent-locks'),
    isAgentLockedPopupShown: false,
  };

  private lockMsgs = {
    failedToLock:
      'This agent is currently being edited by another user. You can view but not make edits. Refresh later to check availability.',
    failedToLockAfterPromise:
      'Someone else has already started editing this agent. You can only view it. Refresh later to check availability.',
    lockAvailable: 'The agent is available for editing.',
    expiredLock:
      // 'Your agent editing session has expired and someone else started editing this agent. You can only view the agent now.',
      'Your session has expired. Please refresh the page to continue editing your workflow.',
    viewAccess: 'You do not have permission to edit this agent. You can only view it.',
  };

  constructor(private server) {
    super();
  }

  public get description() {
    return this.data?.description;
  }

  public set description(value) {
    this.data.description = value;
  }

  public get behavior() {
    return this.data?.behavior;
  }

  public set behavior(value) {
    this.data.behavior = value;
  }

  public get shortDescription() {
    return this.data?.shortDescription;
  }

  public set shortDescription(value) {
    this.data.shortDescription = value;
  }

  setData({ id, name, domain, data }) {
    this.id = id;
    this.name = name;
    this.domain = domain;
    this.data = data;
  }

  resetData() {
    this.id = null;
    this.name = null;
    this.domain = null;
    this.data = null;
  }

  async load(id, options?: { lockAfterFetch?: boolean }) {
    const url = `${this.server}/api/agent/${id}`;

    const result = await fetch(url).then((res) => res.json());

    if (result.success) {
      //this._agent = { id, name: result?.agent?.name, data: result?.agent?.data };

      // In a rare case, the result.agent.data is an empty object {},  we expect certain properties to be present.
      // To avoid errors, we set default values as a fallback.
      let data = result?.agent?.data || {};

      if (!('components' in data)) data.components = [];
      if (!('connections' in data)) data.connections = [];
      if (!('behavior' in data)) data.behavior = '';
      if (!('description' in data)) data.description = '';
      if (!('shortDescription' in data)) data.shortDescription = '';
      if (!('introMessage' in data)) data.introMessage = '';

      this.setData({
        id,
        name: result?.agent?.name,
        domain: result?.agent?.domain?.[0]?.name || '',
        data,
      });
      // console.log(result?.agent?.data);
      // this.import(result?.agent?.data).then(() => {
      //     console.log('imported', result?.agent?.data);
      //     this.setAgentInfo(id, result?.agent?.name, result?.agent?.data);
      // });

      if (!options?.lockAfterFetch) return true;

      // check if the user already had a lock on this agent
      const storedLock = this.lock.lStore.get(id);
      if (storedLock && storedLock.expiry > Date.now()) {
        this.lock.id = storedLock.id;
        this.lock.loaded = true;
        this.refreshLock({ registerTimer: true, immediateRun: true });
        return true;
      }

      this.lock.lStore.remove(id);

      this.emit('lock', this.lockStatus);
      this.lockStatus = 'lock';
      // const isLocked = result?.agent?.isLocked;
      // if (isLocked) {
      //     alert('Agent Locked', this.lockMsgs.failedToLock, ' OK ', 'bg-red-600 hover:bg-red-700 w-full')
      //         .then(() => {
      //             this.emit('lock-as-view-mode');
      //             this.retryToAccquireLock(id, { registerTimer: true });
      //         })
      //         .catch(() => {});
      // } else {
      await this.accquireLock(id);
      // }

      return true;
    }

    return false;
  }

  async save(name, domain, data, id = null) {
    // FIRST: check if the agent lock info is loaded
    if (!this.lock.loaded && id !== null && !this.lock.lockAgentRetryIntervalFn) {
      const lockResult = await this.accquireLock(id);
      if (!lockResult.success) {
        // maybe we should throw an error here?
        throw { message: lockResult.message, errorCode: lockResult?.errorCode };
      }
    }

    const url = `${this.server}/api/agent`;
    const body = {
      name,
      data,
      id,
      lockId: this.lock.id,
    };
    const result = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-type': 'application/json; charset=UTF-8',
      },
    }).then((res) => res.json());
    this.isNewAgent = !id;
    if (this.isNewAgent && result.success && result.id) {
      this.configureEmbodimentsStates(result.id);
    }
    if (result.success) {
      //this.setAgentInfo(result.id, name, data);
      return { id: result.id, name, domain, data };
    }
    return null;
  }

  async delete(id) {
    // FIRST: check if the agent lock info is loaded
    if (!this.lock.loaded) {
      const lockResult = await this.accquireLock(id);
      if (!lockResult.success) {
        throw new Error(lockResult.message);
      }
    }

    // const url = `${this.server}/api/agent/${id}?lockId=${this.lock.id}`;
    const url = `${this.server}/api/agent/${id}`;
    const result = await fetch(url, {
      method: 'DELETE',
    }).then((res) => res.json());

    return result;
  }

  private showViewOnlyOverlay() {
    showOverlay(
      'View Only',
      100,
      true,
      '<div class="absolute bottom-0 w-full h-8 text-xl">View Only</div>',
      false,
    );
  }
  private async accquireLock(
    id,
  ): Promise<{ success: boolean; message: string; errorCode?: string }> {
    //Get User Role
    const url = `${this.server}/api/agent/lock`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ agentId: id }),
        headers: {
          'Content-type': 'application/json; charset=UTF-8',
        },
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);

      this.lock.id = result?.lock?.id;
      this.lock.loaded = true;
      this.lock.lStore.set(id, {
        id: this.lock.id,
        expiry: Date.now() + this.lock.undetectedDisconnectPeriod,
      });

      //if (reloadAgent) this.emit('reload-agent-and-unlock');

      this.refreshLock({
        registerTimer: true,
      });

      console.log('Unlocking Workspace ...');
      workspace.unlock();

      return {
        success: true,
        message: 'Lock accquired',
      };
    } catch (error) {
      console.log(error);
      this.emit('lock-as-view-mode', this.lockStatus);
      this.lockStatus = 'lock-as-view-mode';
      // if (error.status == 401 || error.status == 403) return; // unauthorized or forbidden

      if (error.status == 403 && workspace.userData.acl['/builder'] == 'r') {
        const errMsg = this.lockMsgs.viewAccess;
        this.lock.promisedToLock = false;
        if (!this.lock.isAgentLockedPopupShown) {
          this.lock.isAgentLockedPopupShown = true;
          alert('Agent Locked', errMsg, 'OK', null, () => {
            this.showViewOnlyOverlay();
          })
            .then(() => {})
            .catch((error) => {})
            .finally(() => {
              this.lock.isAgentLockedPopupShown = false;
            });
        }
        return;
      }
      if (error?.errKey !== errKeys.AGENT_LOCK_FAIL) return;
      const errMsg = this.lock.promisedToLock
        ? this.lockMsgs.failedToLockAfterPromise
        : this.lockMsgs.failedToLock;
      this.lock.promisedToLock = false;
      if (!this.lock.isAgentLockedPopupShown) {
        this.lock.isAgentLockedPopupShown = true;
        alert('Agent Locked', errMsg, 'OK')
          .then(() => {
            console.log('EROR IN LOAD');
            this.emit('lock-as-view-mode', this.lockStatus);
            this.lockStatus = 'lock-as-view-mode';
            this.retryToAccquireLock(id, { registerTimer: true });
            alert('Agent Locked', errMsg, 'OK', null, () => {
              this.showViewOnlyOverlay();
            });
          })
          .catch((error) => {})
          .finally(() => {
            this.lock.isAgentLockedPopupShown = false;
          });
      }

      return {
        success: false,
        message: error?.message ?? this.lockMsgs.failedToLock,
        errorCode: 'LOCKED_AGENT',
      };
    }
  }

  private async refreshLock(options?: {
    registerTimer?: boolean;
    immediateRun?: boolean;
  }): Promise<{ success: boolean; message: string }> {
    if (options?.registerTimer) {
      this.lock.refreshLockIntervalFn && clearInterval(this.lock.refreshLockIntervalFn);
      this.lock.refreshLockIntervalFn = setInterval(async () => {
        // handle the case where the user navigates away from the agent page (if we later had Single Page App)
        this.refreshLock();
      }, this.lock.refreshMilli);

      if (!options?.immediateRun) return;
    }
    const url = `${this.server}/api/agent/refresh-lock`;
    try {
      const response = await fetch(url, {
        method: 'PUT',
        body: JSON.stringify({ lockId: this.lock.id, agentId: this.id }),
        headers: {
          'Content-type': 'application/json; charset=UTF-8',
        },
      });
      const result = await response.json();

      // update the expiry time in the local storage
      this.lock.lStore.set(this.id, {
        id: this.lock.id,
        expiry: Date.now() + this.lock.undetectedDisconnectPeriod,
      });

      if (result.success) {
        this.emit('unlock', this.lockStatus);
        this.lockStatus = 'unlock';
        return {
          success: true,
          message: 'Lock refreshed',
        };
      }
    } catch (error) {
      this.emit('lock-as-view-mode', this.lockStatus);
      this.lockStatus = 'lock-as-view-mode';
      // if (error.status == 401 || error.status == 403) return; // unauthorized or forbidden
      if (error?.errKey !== errKeys.AGENT_LOCK_FAIL) return;

      this.resetLockState();

      // write a friendly message to the user to let him know that his lock session has expired
      alert('Agent Locked', this.lockMsgs.expiredLock, 'OK')
        .then((result) => {
          this.retryToAccquireLock(this.id, { registerTimer: true });
          this.showViewOnlyOverlay();
        })
        .catch((error) => {});

      return {
        success: false,
        message: error?.message ?? 'Failed to refresh lock.',
      };
    }
  }

  private resetLockState() {
    this?.lock?.refreshLockIntervalFn && clearInterval(this.lock.refreshLockIntervalFn);
    this.lock.id = null;
    this.lock.loaded = false;
    this.lock.refreshLockIntervalFn = null;
    // this.lock.lStore.remove(this.id);
  }

  private async releaseLock(): Promise<{ success: boolean; message: string }> {
    const url = `${this.server}/api/agent/release-lock`;
    try {
      console.log('releasing lock', this.id);
      // this.workspace?.unlock();
      const response = await fetch(url, {
        method: 'PUT',
        body: JSON.stringify({ lockId: this.lock.id, agentId: this.id }),
        headers: {
          'Content-type': 'application/json; charset=UTF-8',
        },
      });
      const result = await response.json();
      if (result.success) {
        this.resetLockState();
        return {
          success: true,
          message: 'Lock released',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error?.message ?? 'Failed to release lock.',
      };
    }
  }

  private async retryToAccquireLock(
    agentId: any,
    options?: {
      registerTimer?: boolean;
      immediateRun?: boolean;
    },
  ) {
    if (options?.registerTimer) {
      this.lock.lockAgentRetryIntervalFn && clearInterval(this.lock.lockAgentRetryIntervalFn);

      this.lock.lockAgentRetryIntervalFn = setInterval(async () => {
        this.retryToAccquireLock(agentId);
      }, this.lock.retryToAccquireLockMilli);

      if (!options?.immediateRun) return;
    }

    try {
      const reqUrl = `${this.server}/api/agent/${agentId}/lock-status`;
      const lockStatusRes = await fetch(reqUrl).then((res) => res.json());
      const isLocked = lockStatusRes?.status.isLocked;
      if (isLocked) throw new Error('Agent is locked');
      this.lock.lockAgentRetryIntervalFn && clearInterval(this.lock.lockAgentRetryIntervalFn);

      await workspace.loadAgent(workspace.agent.id);
      // let userAcceptedToAccquireLock = await confirmYesNo({
      //     message: this.lockMsgs.lockAvailable,
      //     title: 'Agent Available',
      //     btnYesLabel: 'Switch to Edit mode',
      //     btnNoLabel: 'Coninue Viewing',
      // });
      let userAcceptedToAccquireLock = await confirm(
        'Agent Available',
        this.lockMsgs.lockAvailable,
        {
          btnYesLabel: 'Switch to Edit mode',
          btnNoLabel: 'Continue Viewing',
        },
      );
      if (!userAcceptedToAccquireLock) return;
      this.lock.promisedToLock = true;
      await this.accquireLock(agentId);
      workspace.unlock();
    } catch (error) {
      console.log('failed to accquire lock');
    }
  }

  hasAPIEndpoints() {
    return this.data?.components?.find((c) => c.name === 'APIEndpoint') ? true : false;
  }

  hasLLMAPIEndpoints() {
    return this.data?.components?.find((c) => c.name === 'APIEndpoint' && c.data?.ai_exposed)
      ? true
      : false;
  }

  getAvailableEmbodiments() {
    const embodiments = {};
    if (this.hasLLMAPIEndpoints()) {
      embodiments['chatgpt'] = {};
      embodiments['chatbot'] = {};
      embodiments['llm'] = {};
      embodiments['form'] = {};
    }

    return embodiments;
  }

  getEndpoints() {
    const endpoints = this.data?.components?.filter((c) => c.name === 'APIEndpoint');
    return endpoints;
  }

  public async configureEmbodimentsStates(agentId: string) {
    // Fetch current settings for the agent
    try {
      /**
       * List of required settings and their default values as shown in the image.
       * 'mcp' value is a stringified JSON.
       */

      const requiredSettings: Record<string, string> = {
        [EMBODIMENT_TYPE.CHAT_BOT]: 'true',
        [EMBODIMENT_TYPE.CHAT_GPT]: 'true',
        [EMBODIMENT_TYPE.LLM]: 'true',
        [EMBODIMENT_TYPE.API.toUpperCase()]: 'true',
        [EMBODIMENT_TYPE.MCP]: '{"isEnabled":true}',
        [EMBODIMENT_TYPE.ALEXA]: 'true',
      };
      const currentSettings = await getAgentSettings(agentId);

      // Extract existing keys from the settings array
      const existingKeys = currentSettings?.settings?.map((setting: any) => setting.key) || [];

      // Check if all required keys are missing
      const allMissing = Object.keys(requiredSettings).every((key) => !existingKeys.includes(key));

      if (allMissing) {
        // Add all required settings with default values in parallel
        await Promise.all(
          Object.entries(requiredSettings).map(([key, value]) =>
            saveAgentSettingByKey(key, value, agentId),
          ),
        );
      }
    } catch (error) {
      // Log error but do not block the main flow
      console.error('Error ensuring default agent settings:', error);
    }
  }
}
