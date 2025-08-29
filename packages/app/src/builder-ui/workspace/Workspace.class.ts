import Panzoom, { PanzoomObject } from '@panzoom/panzoom';
import { saveAgentAuthData } from '@react/features/agent-settings/clients/agent-auth';
import { errorToast } from '@src/shared/components/toast';
import { SMYTHOS_DOCS_URL } from '@src/shared/constants/general';
import { jsPlumb } from 'jsplumb';
import { builderStore } from '../../shared/state_stores/builder/store';
import { Agent } from '../Agent.class';
import { AgentCard } from '../components/AgentCard.class';
import { Component } from '../components/Component.class';
import { getBuilderComponents } from '../components/index';
import { registerDbgMonitorUI } from '../debugger';
import EventEmitter from '../EventEmitter.class';
import { extendJsPlumb } from '../overrides/jsplumb.override';
import {
  updateBuilderTopbarAgentAvatar,
  updateBuilderTopbarAgentName,
} from '../pages/builder/agent-settings';
import { ComponentProperties } from '../types/component.types';
import { alert, confirm, hideOverlay, showOverlay } from '../ui/dialogs';
import { setReadonlyMode, unsetReadonlyMode } from '../ui/dom';
import { updateDebugControlsOnSelection } from '../utils/debugger.utils';
import { delay, ensureValidJsonString } from '../utils/general.utils';
import { ClipboardManager } from './ClipboardManager.class';
import { registerDropdown } from './Dropdown';
import { registerFileDrag } from './FileDrag';
import { registerGlobalVars } from './GlobalVars';
import { registerHotkeys } from './hotkeys';
import { registerMiniMap } from './MiniMap';
import { Monitor } from './Monitor';
import { StateManager } from './StateManager.class';
import * as workspaceHelper from './Workspace.helper';

extendJsPlumb();
declare var Metro: any;
//let panzoom;
function rgb2hex(rgb) {
  if (rgb.search('rgb') == -1) {
    return rgb;
  }
  rgb = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(,\s?\d+\.\d+)?\);?$/);
  function hex(x) {
    return ('0' + parseInt(x).toString(16)).slice(-2);
  }
  return '#' + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
}
export const WorkspaceDefaults = {
  conStartColor: '#3C89F9',
  conEndColor: '#F35063',
};

export class Workspace extends EventEmitter {
  public domElement: HTMLElement;
  public debugger: any;
  public clipboard = new ClipboardManager(this);
  public stateManager = new StateManager(this);
  private static instance: Workspace;
  private collapsed = false;
  private agentCard: AgentCard;
  public monitor: Monitor;

  private _locked = false;
  public get locked() {
    return this._locked || this._loading;
  }
  public set locked(value) {
    this._locked = value;
  }

  //points to the component that is being editing in the right sidebar
  public get RSidebarComponent() {
    return Component.curComponentSettings;
  }

  //public locked = false;

  public jsPlumbInstance = jsPlumb.getInstance();
  //private _agent: any = {};
  private _loading = false;
  private _saving = false;
  // public get agentInfo() {
  //     return this._agent;
  // }
  public scale = 1;
  public agent: Agent;
  public serverData: any = {
    debugUrl: '',
    docUrl: '',
  };
  private _serverDataItv;
  public userData: any = {};
  public teamData: any = {};
  public panzoom: PanzoomObject;
  public hoveredElement: HTMLElement = null;
  public mouseCoords: { x: number; y: number } = { x: 0, y: 0 };
  public _draggingConnection: any = null;
  private pendingAddComponent: any = null;
  public deployments: any = {};
  public domainData: any = {};
  public oauthConnections: any = null;
  public oauthConnectionsPromise: Promise<any> | null = null;

  public componentTemplates: any = {};
  public ACL = {};
  private constructor(
    public container: HTMLElement,
    public server: string,
  ) {
    super();
    this.agent = new Agent(this.server);
    this.registerAgentEvents();
    this.domElement = document.getElementById('workspace');
    if (!this.domElement) {
      this.domElement = document.createElement('div');
      this.domElement.id = 'workspace';
      if (container) {
        container.appendChild(this.domElement);
      }
    }

    window.addEventListener('queryClientInvalidate', (event: CustomEvent) => {
      if (event.detail.queryKey.includes('latest_deployment')) {
        this.getDeploymentInfo().then((result) => {
          this.emit('deploymentsUpdated', result);
        });
      }

      // Invalidate OAuth connections cache when they're updated from React
      if (event.detail.queryKey.includes('oauthConnections')) {
        // console.log('[Workspace] OAuth connections updated, invalidating cache');
        this.invalidateOAuthConnectionsCache();
      }
    });

    this.jsPlumbInstance.setContainer(this.domElement);

    this.jsPlumbInstance.importDefaults({
      Connector: ['SmythBezier', { curviness: 160 }],
      //we create connections with flowchart connector then we update them to custom Smyth Connectors
      //because smyth connectors require the endpoints to be set first
      // Connector: ['Flowchart', { stub: 15, gap: 4, cornerRadius: 30, alwaysRespectStubs: true }],
      //PaintStyle: { strokeWidth: 4, stroke: '#ffffff55' },

      PaintStyle: {
        strokeWidth: 2,
        stroke: `${WorkspaceDefaults.conStartColor}bb`,
        gradient: {
          stops: [
            [0, `${WorkspaceDefaults.conStartColor}bb`],
            [1, `${WorkspaceDefaults.conEndColor}bb`],
          ],
        },

        //strokeStyle: "#fff",
        //lineWidth: 4
      },
      Endpoint: ['Dot', { radius: 1 }],
      EndpointStyle: { fill: 'transparent' },
      Anchors: ['Right', 'Left'],
      Overlays: [
        [
          'Arrow',
          {
            width: 10,
            length: 10,
            location: 0.9,
            PaintStyle: { fill: '#ffffff55' },
          },
        ],
      ],
    });

    this.jsPlumbInstance.bind('beforeDrop', (info) => {
      // console.log('beforeDrop: ', info);
      if (this.collapsed) return false;
      if (this.locked) return false;
      // Check if a connection already exists between the source and target
      const existingConnections = (<any>this.jsPlumbInstance).getConnections({
        source: info.sourceId,
        target: info.targetId,
      });

      if (existingConnections.length > 0) {
        // If a connection already exists, abort the new connection
        return false;
      } else {
        // If no connection exists, allow the new connection
        return true;
      }
    });

    this.jsPlumbInstance.bind('connection', async (info: any) => {
      if (AgentCard.isCardConn(info)) {
        AgentCard.setConnPaintStyles(info.connection);
      }
      this.updateConnectionColors(info.connection);

      this.updateConnectionStyle(info.connection);
      info.connection.bind('click', async (connection) => {
        if (this.collapsed) return;
        if (this.locked) return false;
        const confirmed = await confirm('', 'Are you sure you want to delete this connection?', {
          btnNoLabel: 'No, Cancel',
          btnYesLabel: "Yes, I'm sure",
          btnYesClass: 'bg-smyth-red-500 border-smyth-red-500',
        });
        if (confirmed) {
          this.jsPlumbInstance.deleteConnection(connection);
        }
      });

      //this.setComponentsTags();
      // const sourceElement: any = info.connection.source.closest('.component');
      // const targetElement: any = info.connection.target.closest('.component');
      // const sourceComponent = sourceElement._control;
      // const targetComponent = targetElement._control;

      // if (sourceComponent.constructor.name !== 'Async' && sourceElement.___Async_tag !== 'async' && targetElement.___Async_tag === 'async') {
      //     alert(
      //         'You cannot connect this component',
      //         `Connection from Synchronous to Asynchronous component is not allowed ==> ${sourceComponent.drawSettings.displayName} -> ${targetComponent.drawSettings.displayName}<br /> The new connection will be deleted.`,
      //     );
      //     console.error(
      //         `Connection from Synchronous to Asynchronous component is not allowed ==> ${sourceComponent.drawSettings.displayName} -> ${targetComponent.drawSettings.displayName}`,
      //         sourceElement,
      //         targetElement,
      //         info,
      //     );

      //     this.jsPlumbInstance.deleteConnection(info.connection);
      // }

      // if (info.___Loop_tag != targetElement.___Loop_tag) {
      //     this.scrollToComponent(sourceElement);
      //     await alert(
      //         'Loop Branches Conflict Detected',
      //         `Loop Branches cannot be connected to other branches ==> ${sourceComponent.drawSettings.displayName} -> ${targetComponent.drawSettings.displayName}<br /> The new connection will be deleted.`,
      //     );
      //     console.error(
      //         `Loop Branches cannot be connected to other branches ==> ${sourceComponent.drawSettings.displayName} -> ${targetComponent.drawSettings.displayName}<br /> The new connection will be deleted.`,
      //         sourceElement,
      //         targetElement,
      //         info,
      //     );
      //     this.jsPlumbInstance.deleteConnection(info.connection);
      // }

      const conflict = await this.checkConnectionsConsistency(info.connection);

      if (conflict) this.jsPlumbInstance.deleteConnection(info.connection);

      const agentCardValid = AgentCard.checkConnValidity(info);
      if (!agentCardValid) this.jsPlumbInstance.deleteConnection(info.connection);

      //! SHOULDN'T WE ABORT EARLY IF THERE WAS A CONFLICT!!?? I feel like it aborts and works correctly
      //! but cannot detect how and where does it abort if a conflict or non-valid conn was detected

      const sourceComponent = info.source.closest('.component')?._control;
      const targetComponent = info.target.closest('.component')?._control;

      sourceComponent?.emit(
        'connectionAttached',
        info.source.getAttribute('smt-name'),
        info.source,
        info,
      );
      targetComponent?.emit(
        'connectionAttached',
        info.target.getAttribute('smt-name'),
        info.target,
        info,
      );
      //this.setComponentsTags();
      setTimeout(() => {
        this.saveAgent();
      }, 300);
    });

    this.jsPlumbInstance.bind('connectionDrag', (connection: any) => {
      //console.log('Connection being dragged: ', connection);
      this._draggingConnection = connection;
      connection._originalPaintStyle = connection.getPaintStyle();
      connection.setPaintStyle({
        stroke: WorkspaceDefaults.conStartColor,
        strokeWidth: 4,
      });

      connection.endpoints.forEach((endpoint: any) => {
        if (endpoint._domElement) endpoint._domElement.classList.add('active');
      });
    });

    this.jsPlumbInstance.bind('connectionDragStop', (connection: any) => {
      //console.log('Connection dragging stopped: ', connection);
      this._draggingConnection = null;
      if (connection._originalPaintStyle) {
        connection.setPaintStyle(connection._originalPaintStyle);
        delete connection._originalPaintStyle;
      }
      connection.endpoints.forEach((endpoint: any) => {
        if (endpoint._domElement) endpoint._domElement.classList.remove('active');
      });

      //this.updateConnectionStyle(connection);
      this.updateConnectionColors(connection);

      this.setComponentsTags();
    });

    this.jsPlumbInstance.bind('beforeDetach', (connection: any) => {
      if (this.collapsed) return false;
      if (this.locked) return false;
      if (connection._originalPaintStyle) {
        connection.setPaintStyle(connection._originalPaintStyle);
        delete connection._originalPaintStyle;
      }
      connection.endpoints.forEach((endpoint: any) => {
        if (endpoint._domElement) endpoint._domElement.classList.remove('active');
      });
    });

    this.jsPlumbInstance.bind('connectionDetached', (info: any) => {
      //this.setComponentsTags();
      //console.log('Connection detached: ', info);

      const sourceComponent = info.source.closest('.component')?._control;
      const targetComponent = info.target.closest('.component')?._control;

      if (sourceComponent) {
        sourceComponent.emit(
          'connectionDetached',
          info.source.getAttribute('smt-name'),
          info.source,
          info,
        );
      }
      if (targetComponent) {
        targetComponent.emit(
          'connectionDetached',
          info.target.getAttribute('smt-name'),
          info.target,
          info,
        );
      }
      setTimeout(async () => {
        await this.checkConnectionsConsistency();
        this.saveAgent();
      }, 300);
    });

    this.initEvents();
    registerHotkeys(this);

    registerMiniMap(this);
    registerGlobalVars(this);
    registerFileDrag(this);
    registerDropdown();

    this.initMonitor();
    registerDbgMonitorUI(this.monitor);
  }

  private async getDeploymentInfo() {
    const url = `${this.server}/api/page/builder/ai-agent/${this.agent.id}/deployments`;
    const result = await fetch(url).then((res) => res.json());
    this.deployments = result?.deployments;

    const domainDataResponse = await fetch('/api/page/builder/domains', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    this.domainData = await domainDataResponse.json();
    return result;
  }

  /**
   * Fetches OAuth connections and caches them
   * Returns cached data if already fetched
   */
  public async getOAuthConnections(forceRefresh: boolean = false): Promise<any> {
    // If we're forcing a refresh, clear the cache
    if (forceRefresh) {
      this.oauthConnections = null;
      this.oauthConnectionsPromise = null;
    }

    // Return cached data if available
    if (this.oauthConnections !== null) {
      return this.oauthConnections;
    }

    // If a fetch is already in progress, return that promise
    if (this.oauthConnectionsPromise !== null) {
      return this.oauthConnectionsPromise;
    }

    // Fetch OAuth connections
    this.oauthConnectionsPromise = fetch(`${this.server}/api/page/vault/oauth-connections`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        credentials: 'include',
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          console.error('[Workspace.getOAuthConnections] Error fetching OAuth connections:', response.status);
          throw new Error(`Failed to fetch OAuth connections: ${response.status}`);
        }
        const data = await response.json();
        this.oauthConnections = data || {};

        // Normalize: parse string values
        Object.keys(this.oauthConnections).forEach((id) => {
          const value = this.oauthConnections[id];
          if (typeof value === 'string') {
            try {
              this.oauthConnections[id] = JSON.parse(value);
            } catch (e) {
              console.warn(
                `[Workspace.getOAuthConnections] Could not parse stringified connection for id=${id}:`,
                e,
              );
            }
          }
        });

        // console.log('[Workspace.getOAuthConnections] OAuth connections cached:', this.oauthConnections);
        return this.oauthConnections;
      })
      .catch((error) => {
        console.error('[Workspace.getOAuthConnections] Failed to fetch OAuth connections:', error);
        this.oauthConnectionsPromise = null; // Reset promise on error
        throw error;
      });

    return this.oauthConnectionsPromise;
  }

  /**
   * Invalidates the OAuth connections cache
   * Call this when OAuth connections are updated
   */
  public invalidateOAuthConnectionsCache(): void {
    // console.log('[Workspace] Invalidating OAuth connections cache');
    this.oauthConnections = null;
    this.oauthConnectionsPromise = null;
  }

  private _suspendConnectionRestyle = false;
  public updateConnectionStyle(_connection) {
    if (this._suspendConnectionRestyle) return;
    const _source = _connection.source;
    const _target = _connection.target;
    if (!_source || !_target) return;
    const _sourceComponent = _source.closest('.component');
    const _targetComponent = _target.closest('.component');

    if (!_sourceComponent || !_targetComponent) return;

    _connection.removeAllOverlays();

    const sourceBR = _source.getBoundingClientRect();
    const targetBR = _target.getBoundingClientRect();
    const sourceComponentBR = _sourceComponent.getBoundingClientRect();
    const targetComponentBR = _targetComponent.getBoundingClientRect();

    if (sourceBR.right > targetBR.left) {
      const cornerRadius =
        sourceComponentBR.left - targetComponentBR.left > 100 &&
          sourceComponentBR.top - targetComponentBR.bottom > 100
          ? 80
          : 30;

      _connection.setConnector([
        'SmythFlowchart',
        { stub: 15, gap: 4, cornerRadius, alwaysRespectStubs: true },
      ]);

      _connection.removeOverlay('Custom');
      if (_connection?.__smt_overlay) {
        _connection.addOverlay([
          'Custom',
          {
            create: function (component) {
              const element = document.createElement('div');
              element.innerHTML = _connection?.__smt_overlay;
              return element;
            },
            location: 0.3, // Position on the connection
            id: 'Custom',
          },
        ]);
      } else {
        _connection.addOverlay([
          'Arrow',
          {
            width: 10,
            length: 10,
            location: cornerRadius == 30 ? 0.8 : 0.9,
            PaintStyle: { fill: '#ffffff55' },
          },
        ]);
      }
    } else {
      const hdiff = targetBR.left - sourceBR.right;
      if (hdiff < 200) {
        if (_connection.connector.type !== 'SmythBezier') {
          _connection.setConnector(['SmythBezier', { curviness: 160 }]);
        }
      } else {
        if (_connection.connector.type !== 'SmythFlowchart') {
          _connection.setConnector([
            'SmythFlowchart',
            { stub: 15, gap: 4, cornerRadius: 30, alwaysRespectStubs: true },
          ]);
        }
      }
      _connection.removeOverlay('Custom');

      if (_connection?.__smt_overlay) {
        _connection.addOverlay([
          'Custom',
          {
            create: function (component) {
              const element = document.createElement('div');
              element.innerHTML = _connection?.__smt_overlay;
              return element;
            },
            location: 0.3, // Position on the connection
            id: 'Custom',
          },
        ]);
      } else {
        _connection.addOverlay([
          'Arrow',
          {
            width: 10,
            length: 10,
            location: hdiff >= 200 ? 0.9 : 0.8,
            PaintStyle: { fill: '#ffffff55' },
          },
        ]);
      }
    }
  }

  public updateConnectionColors(connection) {
    const startEP = connection?.endpoints?.[0]?._domElement?.querySelector('.ep');
    if (!startEP) return;
    const startColor =
      connection?.__smt_color ||
      connection?.__smt_startColor ||
      rgb2hex(
        connection?.endpoints?.[0]?._domElement?.querySelector('.ep')?.style.backgroundColor,
      ) ||
      `${WorkspaceDefaults.conStartColor}`;
    const endColor =
      connection?.__smt_color ||
      connection?.__smt_endColor ||
      rgb2hex(
        connection?.endpoints?.[1]?._domElement?.querySelector('.ep')?.style.backgroundColor,
      ) ||
      `${WorkspaceDefaults.conEndColor}`;

    const thickness =
      connection?.__smt_thickness ||
      parseInt(
        connection?.endpoints?.[0]?._domElement
          ?.querySelector('.ep')
          ?.getAttribute('smt-con-thickness') || 2,
      );

    const hideOverlays =
      connection?.endpoints?.[0]?._domElement
        ?.querySelector('.ep')
        ?.getAttribute('smt-con-hide-overlays') === 'true'
        ? true
        : false;

    const dashstyle = connection?.__smt_dashstyle || undefined;

    connection.setHoverPaintStyle({
      stroke: `${WorkspaceDefaults.conStartColor}`,
      strokeWidth: thickness + 1,
      gradient: {
        stops: [
          [0, startColor],
          [1, endColor],
        ],
      },
    });

    connection.setPaintStyle({
      strokeWidth: thickness,
      stroke: startColor + 'cc',
      ...(dashstyle ? { dashstyle } : {}),
      gradient: {
        stops: [
          [0, startColor + 'cc'],
          [1, endColor + 'cc'],
        ],
      },
    });

    if (hideOverlays) connection.hideOverlays();
    // update connection colors is called when editing different aspects of the connection
    // it's a good time to save the agent here

    connection.removeOverlay('Custom');
    if (connection?.__smt_overlay) {
      connection.addOverlay([
        'Custom',
        {
          create: function (component) {
            const element = document.createElement('div');
            element.innerHTML = connection?.__smt_overlay;
            return element;
          },
          location: 0.3, // Position on the connection
          id: 'Custom',
        },
      ]);
    }

    setTimeout(this.saveAgent.bind(this), 300);
  }
  public static getInstance(defaults: any = { container: HTMLElement, server: String }): Workspace {
    if (!Workspace.instance) {
      Workspace.instance = new Workspace(defaults.container, defaults.server);
    }
    return Workspace.instance;
  }

  async loadAgent(id, options?: { lockAfterFetch?: boolean }) {
    const result = await this.agent.load(id, { lockAfterFetch: options?.lockAfterFetch || false });
    if (result) {
      this.import(this.agent.data).then(() => {
        this.emit('agentUpdated', this.agent);
        this.setAgentInfo(this.agent.id, this.agent.name, this.agent.domain, this.agent.data);
        // triggered when agent is loaded and ready to be used
        this.emit('AgentReady', this.agent);
      });
    }

    if (this.agent.data?.ui?.panzoom) {
      const zoomElement = document.getElementById('zoom');
      const origTransition = zoomElement.style.transition;
      zoomElement.style.transition = 'none';
      const panzoomConfig = this.agent.data.ui.panzoom;
      this.domElement.style.opacity = '0';
      await delay(300);
      if (panzoomConfig?.currentPan)
        this.panzoom?.pan(panzoomConfig?.currentPan.x, panzoomConfig?.currentPan.y);
      if (panzoomConfig?.currentZoom) this.panzoom?.zoom(panzoomConfig?.currentZoom);
      this.scale = panzoomConfig?.currentZoom;
      this.jsPlumbInstance.setZoom(panzoomConfig?.currentZoom);
      await delay(100);
      this.domElement.style.opacity = '1';
      zoomElement.style.transition = origTransition;
    }

    // triggered when agent is loaded ONLY
    this.emit('AgentLoaded', this.agent);

    this.getDeploymentInfo();
    this.populateSharedState();
  }

  populateSharedState() {
    // * ALL GLOBAL STATE UPDATES GOES HERE

    let prodDomain = this.agent.domain;
    const defaultProd = `${this.agent.id}.${this.serverData.prod_agent_domain}`;

    if (!prodDomain && this.deployments?.length > 0) {
      const domainData = this.domainData?.filter((d) => d.aiAgent.id === this.agent.id);
      if (domainData.length > 0) {
        prodDomain = domainData[0].name;
      } else {
        prodDomain = defaultProd;
      }
    }

    const scheme = this.serverData?.agent_domain?.includes(':') ? 'http' : 'https';

    builderStore.setState({
      agentDomains: {
        dev: `${this.agent.id}.${this.serverData.agent_domain}`,
        prod: prodDomain || null,
        defaultProd: defaultProd,
        scheme: scheme,
      },
    });
    // console.log('Populated shared state');
  }

  async loadUserSubscription() {
    try {
      const result = await fetch(`/api/page/user/me/subscription`);
      const subscription = await result.json();
      this.userData.subscription = subscription?.teamsSubs;
    } catch (error) {
      console.error('Failed to load user subscription:', error);
      this.userData.subscription = null;
    }
  }

  /**
   * Save the agent data to the server
   * @param name
   * @param domain
   * @param data
   * @param id
   * @param fireEvent if set, the function will fire the AgentSaving and AgentSaved events and request export() method to fire DataExported event (used by StateManager to save undo/redo state)
   * @returns
   */
  async saveAgent(name?, domain?, data?, id?, fireEvent = true) {
    await delay(400); // wait for stateManager to unlock workspace
    if (this._loading) return;
    if (this._saving) {
      //console.log('Agent already saving ... skip');
      if (fireEvent) await this.export(fireEvent); //just export the data in order to trigger stateManager diff

      return;
    }
    this._saving = true;

    this.setComponentsTags();

    if (!name) name = this.agent?.name;
    if (!id) id = this.agent?.id;
    if (!data) data = await this.export(fireEvent);
    if (!domain) domain = this.agent?.domain;
    if (fireEvent) this.emit('AgentSaving', this.agent, data);
    this.updateAgentSaveStatus('', 'progress');

    try {
      const result = await this.agent.save(name, domain, data, id);
      if (result) {
        this.setAgentInfo(result.id, result.name, result.domain, result.data);
      }

      await this.setComponentsTags();

      //await delay(100); // cool down
      this._saving = false;
      //this.locked = false;
      if (fireEvent) this.emit('AgentSaved', this.agent, data);
      this.updateAgentSaveStatus('', 'success');
      // console.log('Agent saved');

      if (name) {
        document.title = name + ' | SmythOS';
      }
      return result;
    } catch (error) {
      this._saving = false;
      console.error('Error', error);
      if (typeof error?.error === 'string') {
        if (error.error.includes('403')) {
          errorToast('You are not authorized to save or create agent');
        } else {
          errorToast(error.error);
        }
      }
      this.updateAgentSaveStatus('Error', 'alert');

      // if (error?.errorCode === 'LOCKED_AGENT') {
      //     alert(error.message, 'Agent Lock', 'OK')
      //         .then((result) => {})
      //         .catch((error) => {});
      //     // this.locked = true;
      // } else {
      //     toast(error.message ?? 'Saving Failed', 'Error', 'alert');
      // }
      // return null;
    }
  }

  async createAgent(name, description = '', callback?) {
    const data = { description, components: [], connections: [] };
    //this._agent = {}; //reset agent
    this.agent.resetData();
    if (typeof callback === 'function') callback(data); //this can be used to preload agent template or other information
    return this.saveAgent(name, '', data);
  }

  private setAgentInfo(id, name, domain, data) {
    this.agent.setData({ id, name, domain, data });
    const nameInput = document.getElementById('agent-name-input') as HTMLInputElement;
    const idInput = document.getElementById('agent-id-input') as HTMLInputElement;
    const agentBehaviorTA = document.getElementById('agent-behavior-input') as HTMLTextAreaElement;
    if (idInput) {
      idInput.value = id;
    }
    if (nameInput) {
      nameInput.value = name;
    }
    if (agentBehaviorTA) {
      agentBehaviorTA.value = data.behavior || data.description; //data.description is deprecated
    }

    updateBuilderTopbarAgentName(name);
    updateBuilderTopbarAgentAvatar(name);

    this.emit('agentUpdated', this.agent);
  }

  updateAgentSaveStatus(status: string, type?: 'success' | 'alert' | 'info' | 'progress') {
    const saveStatusBar = document.getElementById('agent-top-bar-status');
    const saveStatus = document.getElementById('agent-save-status');
    if (saveStatusBar) {
      saveStatusBar.classList.remove('st-success', 'st-alert', 'st-info', 'st-progress');
      if (type) saveStatusBar.classList.add('st-' + type);
    }

    if (!saveStatus || !saveStatus.textContent) return;
    saveStatus.textContent = status;
    saveStatus.classList.remove('st-success', 'st-alert', 'st-info', 'st-progress');
    if (type) saveStatus.classList.add('st-' + type);
  }

  async deleteAgent(id) {
    // const url = `${this.server}/api/agent/${id}`;
    // const result = await fetch(url, {
    //     method: 'DELETE',
    // }).then((res) => res.json());
    // return result;

    try {
      const result = await this.agent.delete(id);
      // console.log('Agent Delete result', result);
      if (result.error || !result?.success) {
        return false;
      } else {
        this.domElement.innerHTML = '';
        return true;
      }
    } catch (error) {
      errorToast(error.message ?? 'Deleting Failed');
      return false;
    }
  }

  public redraw() {
    this.jsPlumbInstance.repaintEverything();
  }

  private toggleJsPlumbInteractions(flag) {
    // Get all draggable elements. Adjust the selector according to your setup.
    var draggableElems = document.querySelectorAll('.jsplumb-draggable');

    draggableElems.forEach(function (elem) {
      // Get endpoints for the current element
      var endpoints = this.jsPlumbInstance.getEndpoints(elem);

      if (endpoints) {
        endpoints.forEach(function (endpoint) {
          endpoint.setDraggable(flag);
        });
      }

      // Also disable dragging for the element itself
      this.jsPlumbInstance.setDraggable(elem, flag);
    });
  }

  public areComponentsCollapsed() {
    return this.collapsed;
  }
  public collapseComponents() {
    this.domElement.classList.add('collapsed');
    this.redraw();
    this.collapsed = true;
    this.toggleJsPlumbInteractions(false);
  }
  public expandComponents() {
    this.domElement.classList.remove('collapsed');
    this.redraw();
    this.collapsed = false;
    this.toggleJsPlumbInteractions(true);
  }
  public async copyComponent(componentId) {
    const componentElement: any = document.getElementById(componentId);
    const component: Component = componentElement._control;
    if (!componentElement || !component) return null;
    const name = component.constructor.name;
    const properties = JSON.parse(JSON.stringify(component.properties));
    delete properties.uid;
    delete properties.sender;
    properties.top = parseInt(properties.top) + 100 + 'px';
    properties.left = parseInt(properties.left) + 40 + 'px';
    const newComponentElement = await this.addComponent(name, properties, false);

    // Ensure copied component appears on top
    newComponentElement.style.zIndex = '999';

    newComponentElement.classList.add('selected');
    return newComponentElement;
  }

  public async zoomTo(scale: number) {
    const values = this.panzoom.zoom(scale, {
      animate: true,
      duration: 150,
      easing: 'ease-out',
    });
    this.scale = values.scale;
    this.jsPlumbInstance.setZoom(values.scale);
  }
  private initEvents() {
    this.initServerData();
    const jsPlumbInstance = this.jsPlumbInstance;
    jsPlumbInstance.ready(() => {
      setTimeout(() => {
        document
          .querySelectorAll('.ribbon-menu button')
          .forEach((b) => b.setAttribute('disabled', 'disabled'));
      }, 100);

      const workspaceContainer = this.container;
      const workspaceElement: any = this.domElement;

      const zoom = document.getElementById('zoom');
      let _scale = 1,
        panning = false,
        pointX = 0,
        pointY = 0,
        start = { x: 0, y: 0 };
      workspaceElement.addEventListener('click', async (e) => {
        const rect = workspaceElement.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.x) / _scale);
        const y = Math.round((e.clientY - rect.y) / _scale);

        //console.log('click', e.clientX, e.clientY, { pointX, pointY }, start, x, y);
        if (this.pendingAddComponent) {
          const name = this.pendingAddComponent.name;
          const properties = this.pendingAddComponent.properties;
          const triggerSettings = this.pendingAddComponent.triggerSettings;

          if (!properties.top) properties.top = y - 20 + 'px';
          if (!properties.left) properties.left = x - 85 + 'px';

          if (properties.sender) {
            properties.sender.classList.remove('active');
          }
          const components = getBuilderComponents();
          const Component = components[name] || components['Component'];

          const component = new Component(this, { ...properties }, triggerSettings);
          await component.ready();

          if (properties.data) component.data = properties.data;
          const div = component.domElement;

          this.pendingAddComponent.resolve(div);

          this.pendingAddComponent = null;
        }
      });

      this.panzoom = Panzoom(zoom, {
        canvas: false,
        animate: true,
        noBind: true,
        excludeClass: 'exclude-panzoom',
        cursor: 'default',
        smoothScroll: true,
        duration: 300,
        easing: 'ease-out',
        handleStartEvent(e) { },
      });

      const parent = zoom.parentElement;

      workspaceContainer.addEventListener('pointerdown', (event) => {
        this.panzoom.handleDown(event);
      });
      document.addEventListener('pointermove', (event) => {
        if (event.ctrlKey || event.metaKey) return;
        this.panzoom.handleMove(event);
      });
      document.addEventListener('pointerup', this.panzoom.handleUp);

      // Completely custom wheel handling for better touchpad experience
      parent.addEventListener('wheel', (event) => {
        // Handle regular scrolling (not zooming)
        if (!event.ctrlKey && !event.metaKey) {
          if (
            this.hoveredElement.tagName == 'TEXTAREA' ||
            this.hoveredElement.tagName == 'INPUT' ||
            this.hoveredElement.classList.contains('dbg') ||
            this.hoveredElement.closest('.dbg')
          )
            return;

          if (event.shiftKey) {
            // Horizontal panning
            const currentPan = this.panzoom.getPan();
            this.panzoom.pan(currentPan.x - (event.deltaY * 0.7) / this.scale, currentPan.y);
            return;
          }

          // Vertical scrolling
          const currentPan = this.panzoom.getPan();
          this.panzoom.pan(currentPan.x, currentPan.y - (event.deltaY * 0.7) / this.scale);
          return;
        }

        // DISABLED: OLD Zooming logic. we disabled it since it was not good for touchpad.
        /*
        const currValues = this.panzoom.zoomWithWheel(event);
        jsPlumbInstance.setZoom(currValues.scale);
        this.scale = currValues.scale;
        */

        // From here on, this is zooming with ctrl/cmd + wheel (NEW LOGIC. still under experimentation)
        event.preventDefault();

        // Get current scale and position
        const currentScale = this.panzoom.getScale();

        // Determine if this is likely a touchpad gesture based on delta magnitude
        const isTouchpad = Math.abs(event.deltaY) < 50;

        // Adjust sensitivity based on touchpad vs mouse wheel
        // Much lower values for touchpad
        const zoomFactor = isTouchpad ? 0.04 : 0.1;

        // Calculate new scale with extremely gradual changes for touchpad
        let newScale = currentScale;
        if (event.deltaY > 0) {
          // Zoom out - slowly decrease scale
          newScale = Math.max(
            currentScale - zoomFactor * currentScale,
            this.panzoom.getOptions().minScale,
          );
        } else {
          // Zoom in - slowly increase scale
          newScale = Math.min(
            currentScale + zoomFactor * currentScale,
            this.panzoom.getOptions().maxScale,
          );
        }

        // Very subtle change for touchpad to avoid jumpy behavior
        if (Math.abs(newScale - currentScale) < 0.001) return;

        // Use the original event directly for accurate cursor position
        // This is the key part to ensure zooming happens exactly at cursor position
        const result = this.panzoom.zoomToPoint(newScale, event, {
          animate: true,
          duration: 150,
          easing: 'ease-out',
        });

        this.scale = result.scale;
        jsPlumbInstance.setZoom(result.scale);
      });

      this.handleSelection();

      this.preloadComponentsTemplates();

      //disable browser zoom-in/out to prevent interference
      document.addEventListener(
        'wheel',
        (event) => {
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
          }
        },
        { passive: false },
      );
    });

    document.addEventListener('mouseover', (event) => {
      this.hoveredElement = event.target as HTMLElement;
    });

    document.addEventListener('mousemove', (event) => {
      //find mouse coordinates relative to the workspace
      const rect = this.domElement.getBoundingClientRect();
      const x = Math.round((event.clientX - rect.x) / this.scale);
      const y = Math.round((event.clientY - rect.y) / this.scale);

      this.mouseCoords.x = x;
      this.mouseCoords.y = y;
    });
  }

  private handleSelection() {
    let isDrawingRectangle = false;
    let rectangleStartPoint = { x: 0, y: 0 };
    let selectionRectangle = null;

    document.getElementById('workspace-container').addEventListener('mousedown', (event) => {
      const isContextMenu = !!(event.target as HTMLElement).closest('[data-context-menu="true"]');
      if (isContextMenu) return;
      document
        .querySelectorAll('#workspace-container .component')
        .forEach((e) => e.classList.remove('selected', 'unselected'));

      updateDebugControlsOnSelection();
    });
    // Function to handle the mouse down event
    document.addEventListener('mousedown', (event) => {
      const target: any = event.target;
      if ((event.ctrlKey || event.metaKey) && !target.classList.contains('component')) {
        isDrawingRectangle = true;
        rectangleStartPoint = { x: event.clientX, y: event.clientY };
        selectionRectangle = document.createElement('div');
        selectionRectangle.classList.add('selection-rectangle');
        selectionRectangle.style.left = `${event.clientX}px`;
        selectionRectangle.style.top = `${event.clientY}px`;
        document.body.appendChild(selectionRectangle);
        selectionRectangle.style.border = '1px dashed black';
        selectionRectangle.style.background = '#00000010';
        selectionRectangle.style.position = 'fixed';
        selectionRectangle.style.pointerEvents = 'none';
      }
    });

    // Function to handle the mouse move event
    document.addEventListener('mousemove', (event) => {
      if (isDrawingRectangle) {
        const width = event.clientX - rectangleStartPoint.x;
        const height = event.clientY - rectangleStartPoint.y;
        selectionRectangle.style.width = `${Math.abs(width)}px`;
        selectionRectangle.style.height = `${Math.abs(height)}px`;
        selectionRectangle.style.left = `${width > 0 ? rectangleStartPoint.x : event.clientX}px`;
        selectionRectangle.style.top = `${height > 0 ? rectangleStartPoint.y : event.clientY}px`;
      }
    });

    // Function to handle the mouse up event
    document.addEventListener('mouseup', () => {
      if (isDrawingRectangle) {
        const activeComponent = document.querySelector('.component.active');
        if (activeComponent) activeComponent?.classList?.remove('active');
        isDrawingRectangle = false;
        const rect = selectionRectangle.getBoundingClientRect();
        document.body.removeChild(selectionRectangle);
        selectionRectangle = null;

        Array.from(document.querySelectorAll('.component')).forEach((element) => {
          const elemRect = element.getBoundingClientRect();
          if (
            elemRect.top >= rect.top &&
            elemRect.bottom <= rect.bottom &&
            elemRect.left >= rect.left &&
            elemRect.right <= rect.right
          ) {
            element.classList.add('selected');
            element.classList.remove('unselected');
          } else {
            element.classList.remove('selected');
            element.classList.add('unselected');
          }
        });
      }
    });
  }

  public async preloadComponentsTemplates() {
    let url = '/api/page/builder/app-config/components';

    const result = await fetch(url)
      .then((res) => res.json())
      .catch((e) => []);

    const components = result?.components || [];

    components.forEach((component) => {
      try {
        this.componentTemplates[component.id] = JSON.parse(component.data);
      } catch (error) { }
    });
  }
  private async initServerData() {
    const url = `/api/status`;
    const result = await fetch(url).then((res) => res.json());

    this.serverData.baseUrl = result.status.url;
    this.serverData.frontUrl = result.status.frontUrl;
    this.serverData.debugUrl = result.status.url + '/api';
    this.serverData.docUrl = SMYTHOS_DOCS_URL;
    this.serverData.dbgUrl = result.status.dbg_url;
    this.serverData.agent_domain = result.status.agent_domain;
    this.serverData.env = result.status.env;
    this.serverData.status = result.status.server;
    this.serverData.prod_agent_domain = result.status.prod_agent_domain;

    this.userData = {
      ...result.status.user,
    };

    this.teamData = {
      ...result.status.team,
    };

    this.emit('ServerDataLoaded');
  }
  public waitServerData() {
    return new Promise((resolve) => {
      if (this.serverData.baseUrl) {
        resolve(this.serverData);
      } else {
        const _serverDataItv = setInterval(() => {
          if (this.serverData.baseUrl) {
            clearInterval(_serverDataItv);
            resolve(this.serverData);
          }
        }, 100);
      }
    });
  }
  public addComponent(
    name,
    properties: ComponentProperties = {
      outputs: undefined,
      inputs: undefined,
      data: {},
      top: '',
      left: '',
      sender: null,
    },
    triggerSettings,
  ): Promise<any> {
    return new Promise(async (resolve, reject) => {
      //#region Ensure valid JSON strings

      // API Call component headers
      if (properties?.data?.headers) {
        properties.data.headers = ensureValidJsonString(properties.data.headers);
      }

      // API Call component body
      if (properties?.data?.body) {
        properties.data.body = ensureValidJsonString(properties.data.body);
      }

      // Data Source Indexer component metadata
      if (properties?.data?.metadata) {
        properties.data.metadata = ensureValidJsonString(properties.data.metadata);
      }

      // Integration component data
      if (properties?.data) {
        for (const key in properties.data) {
          if (key.startsWith('KVJSON')) {
            const value = properties.data[key];
            properties.data[key] = ensureValidJsonString(value);
          }
        }
      }

      // Integration component template vars
      if (properties?.data?._templateVars) {
        for (const key in properties.data._templateVars) {
          if (key.startsWith('KVJSON')) {
            const value = properties.data._templateVars[key];
            properties.data._templateVars[key] = ensureValidJsonString(value);
          }
        }
      }
      //#region Ensure valid JSON strings

      if (properties.uid) {
        //if the component already exist just return it
        const existingComponent = document.getElementById(properties.uid);
        if (existingComponent) {
          console.warn('Tried to create the same component twice ==> returning existing component');
          return resolve(existingComponent);
        }
      }

      if (properties.sender) {
        if (properties.sender.classList.contains('active')) {
          properties.sender.classList.remove('active');
          properties.sender.parentElement.classList.remove('active');
          this.pendingAddComponent = null;
          return resolve(null);
        }
        document.querySelectorAll('#left-menu [smt-component]').forEach((menuEntry: any) => {
          menuEntry.classList.remove('active');
          menuEntry.parentElement.classList.remove('active');
        });

        //console.log('Activating sender', properties.sender);
        //properties.sender.classList.add('active');
        this.pendingAddComponent = {
          name,
          properties,
          triggerSettings,
          resolve,
          reject,
        };
      }

      const components = getBuilderComponents();
      const Component = components[name] || components['Component'];

      const component = new Component(this, { ...properties }, triggerSettings);
      await component.ready();

      this.emit('componentAdded', component);

      if (properties.data) component.data = properties.data;
      const div = component.domElement;

      this.pendingAddComponent = null;
      resolve(div);
    });
  }

  public addConnection(
    sourceComponentId: string | HTMLElement,
    targetComponentId: string | HTMLElement,
    sourceEndpointID: string | number,
    targetEndpointID: string | number,
    repaint = true,
  ) {
    const sourceComponent =
      typeof sourceComponentId === 'string'
        ? document.getElementById(sourceComponentId)
        : sourceComponentId;
    const targetComponent =
      typeof targetComponentId === 'string'
        ? document.getElementById(targetComponentId)
        : targetComponentId;
    let sourceEndpoint: any;
    let targetEndpoint: any;

    if (typeof sourceEndpointID === 'string') {
      sourceEndpoint = sourceComponent.querySelector(
        `.output-endpoint[smt-name='${sourceEndpointID}']`,
      );
      if (!sourceEndpoint) {
        //try to find it by expression
        sourceEndpoint = sourceComponent.querySelector(
          `.output-endpoint[smt-expression='${sourceEndpointID}']`,
        );
      }
    } else {
      sourceEndpoint = [...sourceComponent.querySelectorAll(`.output-endpoint`)][sourceEndpointID];
    }
    if (typeof targetEndpointID === 'string') {
      targetEndpoint = targetComponent.querySelector(
        `.input-endpoint[smt-name='${targetEndpointID}']`,
      );
      if (!targetEndpoint) {
        //try to find it by expression
        targetEndpoint = targetComponent.querySelector(
          `.input-endpoint[smt-expression='${targetEndpointID}']`,
        );
      }
    } else {
      targetEndpoint = [...targetComponent.querySelectorAll(`.input-endpoint`)][targetEndpointID];
    }

    // @ts-ignore
    const existingConnection = this.jsPlumbInstance.getConnections({
      source: sourceEndpoint,
      target: targetEndpoint,
    });

    if (existingConnection.length > 0) {
      console.warn('Connection already exists, Skip AddConnection  ...');
      return;
    }

    const con: any = this.jsPlumbInstance.connect({
      source: sourceEndpoint.endpoint,
      target: targetEndpoint.endpoint,
      detachable: true,
      cssClass: 'exclude-panzoom',
    });
    this.updateConnectionStyle(con);

    //Repaint the source and target components after a delay to ensure the connection is properly rendered
    if (repaint) {
      setTimeout(() => {
        this.jsPlumbInstance.repaint(sourceComponent);
        this.jsPlumbInstance.repaint(targetComponent);
      }, 300);
    }

    return con;
  }

  public deleteConnection(
    sourceComponentId: string | HTMLElement,
    targetComponentId: string | HTMLElement,
    sourceEndpointID: string | number,
    targetEndpointID: string | number,
  ) {
    const sourceComponent =
      typeof sourceComponentId === 'string'
        ? document.getElementById(sourceComponentId)
        : sourceComponentId;
    const targetComponent =
      typeof targetComponentId === 'string'
        ? document.getElementById(targetComponentId)
        : targetComponentId;
    let sourceEndpoint: any;
    let targetEndpoint: any;

    if (typeof sourceEndpointID === 'string') {
      sourceEndpoint = sourceComponent.querySelector(
        `.output-endpoint[smt-name='${sourceEndpointID}']`,
      );
    } else {
      sourceEndpoint = [...sourceComponent.querySelectorAll(`.output-endpoint`)][sourceEndpointID];
    }
    if (typeof targetEndpointID === 'string') {
      targetEndpoint = targetComponent.querySelector(
        `.input-endpoint[smt-name='${targetEndpointID}']`,
      );
    } else {
      targetEndpoint = [...targetComponent.querySelectorAll(`.input-endpoint`)][targetEndpointID];
    }

    // @ts-ignore
    const existingConnection = this.jsPlumbInstance.getConnections({
      source: sourceEndpoint,
      target: targetEndpoint,
    });

    if (existingConnection.length > 0) {
      this.jsPlumbInstance.deleteConnection(existingConnection[0]);
    }
  }

  private extractComponentInputProps(domComponent, endpointDomElement) {
    const component: Component = domComponent._control;
    const props = {};
    for (let entry in component.inputSettings) {
      let attrVal = endpointDomElement.getAttribute(`smt-${entry}`);

      // Make sure to store boolean values as boolean
      if (attrVal === 'true') attrVal = true;
      if (attrVal === 'false') attrVal = false;

      if (attrVal) {
        props[entry] = attrVal;
      }
    }

    return props;
  }

  private extractComponentOutputProps(domComponent, endpointDomElement) {
    const component: Component = domComponent._control;
    const props = {};
    for (let entry in component.outputSettings) {
      let attrVal = endpointDomElement.getAttribute(`smt-${entry}`);

      // Make sure to store boolean values as boolean
      if (attrVal === 'true') attrVal = true;
      if (attrVal === 'false') attrVal = false;

      if (attrVal) {
        props[entry] = attrVal;
      }
    }
    return props;
  }

  public async export(fireEvent = true) {
    const components = [...this.domElement.querySelectorAll('.component')].map(
      (domComponent: any) => {
        const control: Component = domComponent._control;

        return {
          id: domComponent.id,
          name: domComponent.querySelector('.title-bar').getAttribute('smt-name'), // added name to export
          outputs: [...domComponent.querySelectorAll('.output-endpoint')].map(
            (outputDomElement, index) => ({
              name: outputDomElement.getAttribute('smt-name'),
              color: outputDomElement.getAttribute('smt-color'),
              //description: c.getAttribute('smt-description'),
              ...this.extractComponentOutputProps(domComponent, outputDomElement),
              index,
              uuid: outputDomElement.endpoint?.getUuid(),
              default: control.properties.defaultOutputs.includes(
                outputDomElement.getAttribute('smt-name'),
              ),
            }),
          ),
          inputs: [...domComponent.querySelectorAll('.input-endpoint')].map(
            (inputDomElement, index) => ({
              name: inputDomElement.getAttribute('smt-name'),
              type: inputDomElement.getAttribute('smt-type'), // [INPUT DATA TYPE]
              friendlyInputType: inputDomElement.getAttribute('smt-friendly-input-type'),
              coreInputType: inputDomElement.getAttribute('smt-core-input-type'),
              color: inputDomElement.getAttribute('smt-color'),
              //description: r.getAttribute('smt-description'),
              optional: inputDomElement.getAttribute('smt-optional') === 'true' ? true : false,
              ...this.extractComponentInputProps(domComponent, inputDomElement),
              index,
              uuid: inputDomElement.endpoint?.getUuid(),
              default: control.properties.defaultInputs.includes(
                inputDomElement.getAttribute('smt-name'),
              ),
            }),
          ),
          data: control.data,
          top: domComponent.style.top,
          left: domComponent.style.left,
          width: domComponent.style.width,
          height: domComponent.style.height,
          displayName: control.drawSettings.displayName,
          title: control.title,
          aiTitle: control.aiTitle,
          description: control.description,
          template: control.properties.template,
        };
      },
    );

    const connections = this.jsPlumbInstance
      .getAllConnections()
      .map((connection) => {
        const source = connection.source;
        const target = connection.target;
        const sourceComponent = source.closest('.component');
        const targetComponent = target.closest('.component');

        if (!sourceComponent || !targetComponent) return null; //exclude connections that are not connected to components, these can be used for other visual stuff
        return {
          sourceId: source.closest('.component').id,
          sourceIndex: [...source.parentElement.querySelectorAll('.output-endpoint')].findIndex(
            (c) => c === source,
          ),
          targetId: target.closest('.component').id,
          targetIndex: [...target.parentElement.querySelectorAll('.input-endpoint')].findIndex(
            (r) => r === target,
          ),
        };
      })
      .filter((c) => c);

    const debugSessionEnabled = this.domElement.classList.contains('debug-enabled');
    let auth = this.agent.data?.auth;
    const variables = this.agent.data.variables;

    let currentPan;
    let currentZoom;
    if (this.panzoom) {
      currentPan = this.panzoom.getPan();
      currentZoom = this.panzoom.getScale();
    }

    // #region Save agent auth data to the agent settings
    // As we may have the method in auth so we need to check if the provider is present for legacy agents
    if (auth?.provider) {
      try {
        const agentAuthData = await saveAgentAuthData(this.agent.id, auth);

        if (agentAuthData?.success) {
          // Keep the auth method only to decide whether we should get auth data from agent settings in SRE
          auth = {
            method: auth.method,
          };
        }
      } catch (error) {
        console.error('Error saving agent auth data', error);
      }
    }
    // #endregion

    let agentCardElm: HTMLElement = document.querySelector('.agent-card');
    let agentCard: { left: string; top: string } = { left: '', top: '' };
    if (agentCardElm) {
      agentCard.left = agentCardElm.style.left;
      agentCard.top = agentCardElm.style.top;
    }

    const configuration = {
      version: '1.0.0',
      id: this.agent.id,
      name: this.agent.name,
      teamId: this.teamData.id, // for old agents teamId in this.agent.data.teamId is not available without saving and reloading the agent again, that's why we use this.teamData.id
      parentTeamId: this.teamData.parentId, // parentTeamId considered as Organization ID
      components,
      connections,
      description: this.agent.description,
      shortDescription: this.agent.shortDescription,
      behavior: this.agent.data.behavior,
      variables,
      debugSessionEnabled,
      auth,
      ui: { panzoom: { currentPan, currentZoom }, agentCard },
      introMessage: this.agent.data.introMessage || '',
    };

    // Template Info
    const templateIdElm = document.getElementById('agent-template-id-input') as HTMLInputElement;

    // Make sure to include the template info only if the template id is set, that means a template already saved from this agent
    if (templateIdElm?.value) {
      configuration['templateInfo'] = this.getTemplateInfo();
    }

    if (fireEvent) this.emit('DataExported', configuration);
    return configuration;
    //document.getElementById('configuration').value = configuration;
  }

  private migrateConfiguration(configuration) {
    const newConfig = JSON.parse(JSON.stringify(configuration));
    if (!newConfig.version) {
      //version 0 ==> translating receptors/connectors to inputs/outputs
      for (const component of newConfig.components) {
        component.outputs = component.connectors;
        component.inputs = component.receptors;
        component.outputProps = component.connectorProps;
        component.inputProps = component.receptorProps;
        delete component.connectors;
        delete component.receptors;
        delete component.connectorProps;
        delete component.receptorProps;
      }
    }

    if (newConfig.version === '1.0.0') {
      for (const component of newConfig.components) {
        if (component?.template?.settings) {
          for (let key in component.template.settings) {
            const prop = component.template.settings[key];
            if (prop.attributes && prop.attributes['data-vault'] == 'true') {
              //patch wrong value for component templates
              prop.attributes['data-vault'] = `${component.name},ALL`;
              //console.log('migrated data');
            }
          }
        }
      }

      //migrate .description to .behavior
      if (newConfig.description && !newConfig.behavior) {
        newConfig.behavior = newConfig.description;
        //delete newConfig.description;

        //also patch agent data
        this.agent.data.behavior = newConfig.behavior;
      }
    }
    return newConfig;
  }
  public async import(configuration) {
    try {
      configuration = this.migrateConfiguration(configuration);
      //console.log('migrated config = ', configuration);

      this._loading = true;
      showOverlay('Loading Agent Data ...');
      //const configuration = JSON.parse(document.getElementById('configuration').value);

      // Clear the current content
      this.domElement.innerHTML = '';
      //this.jsPlumbInstance.reset();
      this.jsPlumbInstance.deleteEveryConnection();
      this.jsPlumbInstance.deleteEveryEndpoint();

      showOverlay('Importing Components ...');
      // Load the components
      const componentMap = {};
      for (const component of configuration.components) {
        const newComponent = await this.addComponent(
          component.name,
          {
            outputs: component.outputs.map((c) => c.name),
            inputs: component.inputs.map((r) => r.name),
            outputProps: component.outputs,
            inputProps: component.inputs,
            data: component.data,
            top: component.top,
            left: component.left,
            width: component.width,
            title: component.title || '',
            aiTitle: component.aiTitle || '',
            description: component.description || '',
            //height: component.height, importing height breaks the component layout
            uid: component.id,
            template: component.template,
          },
          false,
        );
        componentMap[component.id] = newComponent.id;
      }

      showOverlay('Connecting Components ...');

      // Load the connections after a delay to ensure endpoints are registered properly
      await delay(300);

      const connections = {};

      const sTime = Date.now();
      //(jsPlumb as any).batch(() =>{
      this._suspendConnectionRestyle = true;
      configuration.connections.forEach(async (connection) => {
        const conId = `${connection.sourceId}.${connection.sourceIndex}:${connection.targetId}.${connection.targetIndex}`;
        if (connections[conId]) return; //skip existing connections ==> avoid duplicate connections

        const con = this.addConnection(
          connection.sourceId,
          connection.targetId,
          connection.sourceIndex,
          connection.targetIndex,
          false,
        );
        connections[conId] = con;
      });

      //});
      this._suspendConnectionRestyle = false;

      for (const con of Object.values(connections)) {
        setImmediate(() => {
          this.updateConnectionStyle(con);
        });
      }

      console.log('time taken', Date.now() - sTime);

      this.renderAgentCard(configuration);

      await this.setComponentsTags();

      showOverlay('Almost Ready ...');
      await delay(200);

      this.redraw();
      //await delay(500);

      hideOverlay();

      const inViewPort = this.getComponentsInViewPort();

      if (!inViewPort.length) {
        // if no components are in the viewport, scroll to the first component
        const firstComponent = this.domElement.querySelector('.component');
        this.scrollToComponent(firstComponent);
      }

      setTimeout(() => this.checkConnectionsConsistency(), 1000);
      this._loading = false;

      // Add this line to emit an event after importing
      this.emit('agentUpdated', this.agent);

      // If window.refetchSettingsSidebarData exists, call it to refresh the UI
      if (window.refetchSettingsSidebarData) {
        window.refetchSettingsSidebarData();
      }

      return true;
    } catch (error) {
      hideOverlay();
      this._loading = false;
      console.error('Error', error);
      errorToast('Loading failed');
    }
  }

  private renderAgentCard(configuration) {
    // if the ui.agentCard is present, then place it using the saved coordinates
    // if not and new agent or no existing skills, then place it in midscreen.
    // if not and existing agent, then get first skill and place it above it to the left. x - agent_card_width, y - agent_card_height / 2

    let requiresSave = false;
    let isFirstVisit = false;

    let properties: ComponentProperties = {};
    if (configuration?.ui?.agentCard) {
      properties.left = configuration.ui.agentCard.left;
      properties.top = configuration.ui.agentCard.top;
    } else {
      const skills = configuration?.components?.filter((c) => c.name === 'APIEndpoint');
      // console.log('skills to compare', skills);

      if (skills.length > 0) {
        // get the skill with the least Y and place the card above it to the left. x - agent_card_width, y - agent_card_height / 2
        const referenceSkill = skills
          // .map((s) => {
          //   const top = s?.top?.split?.('px')[0] || 0;
          //   return { ...s, top: Number(top) };
          // })
          .reduce((prev, current) => {
            return Number(prev.top.split('px')[0] || 0) < Number(current.top.split('px')[0] || 0)
              ? prev
              : current;
          });
        properties.left = referenceSkill.left.split('px')[0] - 630 + 'px';
        properties.top = referenceSkill.top.split('px')[0] - 250 + 'px';
        requiresSave = true;
      } else {
        // handle first time loading
        properties.left = '-700px';
        properties.top = '-6px';
        requiresSave = true;
        isFirstVisit = true;
      }
    }

    this.agentCard = new AgentCard(this, properties, configuration);
    if (isFirstVisit) {
      // it will always be triggered after initialization of the agent card since redraw() is an async operation (next tick)
      this.agentCard.addEventListener('AgentCardCreated', () => {
        this.scrollToAgentCard();
      });
    }

    if (requiresSave) {
      this.saveAgent();
    }
  }

  public getLock() {
    return this.locked;
  }

  public waitUnlock(maxTime = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        if (!this.locked) {
          clearInterval(interval);
          resolve(true);
        } else if (Date.now() - startTime > maxTime) {
          clearInterval(interval);
          reject();
        }
      }, 500);
    });
  }
  public lock(options?: { showViewOnlyMsg?: boolean }) {
    // console.log('Locking Workspace');
    this.locked = true;
    document.querySelector('#builder-container')?.classList.remove('locked');
    if (options?.showViewOnlyMsg) this.toggleViewOnlyModeMsg(true);

    // TODO: should be handled with CSS classes since we have a global root that have the "lock" class
    setReadonlyMode(document.querySelector('.agentTab'));
    setReadonlyMode(document.querySelector('.deployTab'));
    setReadonlyMode(document.querySelector('.authTab'));
    setReadonlyMode(document.querySelector('.templateTab'));
    setReadonlyMode(document.querySelector('.agentBuilderTab'), ['stop-btn', 'close-btn']);
    setReadonlyMode(document.querySelector('#deploy-button-topbar'));

    window.dispatchEvent(
      new CustomEvent('update-widget-access', { detail: { writeAccess: false } }),
    );

    this.container.classList.add('locked');
    document.body.classList.add('locked');
  }

  public unlock() {
    // console.log('Unlocking Workspace');
    this.locked = false;
    document.querySelector('#builder-container')?.classList.remove('locked');
    this.toggleViewOnlyModeMsg(false);

    unsetReadonlyMode(document.querySelector('.agentTab'));
    unsetReadonlyMode(document.querySelector('.deployTab'));
    unsetReadonlyMode(document.querySelector('.authTab'));
    unsetReadonlyMode(document.querySelector('.templateTab'));
    unsetReadonlyMode(document.querySelector('.agentBuilderTab'));
    unsetReadonlyMode(document.querySelector('#deploy-button-topbar'));

    window.dispatchEvent(
      new CustomEvent('update-widget-access', { detail: { writeAccess: true } }),
    );

    this.container.classList.remove('locked');
    document.body.classList.remove('locked');
  }

  private toggleViewOnlyModeMsg(enable: boolean = false) {
    // update the UI to show that the agent is in view-only mode
    const viewOnlyMode = document.getElementById('view-only-mode');
    if (!viewOnlyMode) return;

    if (enable) {
      viewOnlyMode.classList.remove('opacity-0');
      viewOnlyMode.classList.add('opacity-100');
      viewOnlyMode.classList.remove('hidden');
    } else {
      viewOnlyMode.classList.remove('opacity-100');
      viewOnlyMode.classList.add('opacity-0');
      viewOnlyMode.classList.add('hidden');
    }
  }

  private registerAgentEvents() {
    this.agent.addEventListener('lock-as-view-mode', (prevStatus) => {
      if (prevStatus?.startsWith('unlock') || !prevStatus) {
        this.lock({ showViewOnlyMsg: true });
      }
    });
    this.agent.addEventListener('lock', (prevStatus) => {
      // console.log('lock', prevStatus);
      if (prevStatus?.startsWith('unlock') || !prevStatus) {
        this.lock({ showViewOnlyMsg: false });
      }
    });

    this.agent.addEventListener('unlock', (prevStatus) => {
      if (prevStatus?.startsWith('lock')) {
        this.unlock(); //unlock the workspace if it was not locked before agent lock
      }
    });

    // this.agent.addEventListener('reload-agent-and-unlock', async () => {
    //     const zoom = document.getElementById('zoom');
    //     zoom.style.opacity = '0';

    //     await this.loadAgent(this.agent.id);
    //     this.unlock();

    //     await delay(100);
    //     zoom.style.opacity = '1';
    // });
  }

  getComponentsInViewPort() {
    const components = this.domElement.querySelectorAll('.component');
    const viewport = document.querySelector('#workspace-container');
    const viewportRect = viewport.getBoundingClientRect();
    const inViewPort = [];
    for (let component of components) {
      const componentRect = component.getBoundingClientRect();
      if (
        componentRect.top < viewportRect.bottom &&
        componentRect.bottom > viewportRect.top &&
        componentRect.left < viewportRect.right &&
        componentRect.right > viewportRect.left
      ) {
        inViewPort.push(component);
      }
    }
    return inViewPort;
  }

  scrollToComponent(component) {
    if (!component) return;
    if (!component.classList.contains('component') || component.classList.contains('agent-card'))
      return;
    const panzoom = this.panzoom;
    const scale = this.scale; // Assuming this is the current scale factor

    // Get the bounding rectangle of the component and the viewport
    const componentRect = component.getBoundingClientRect();
    const viewport = document.querySelector('#workspace-container'); // Adjust if the ID is different
    const viewportRect = viewport.getBoundingClientRect();

    // Check if component is not in the viewport
    if (
      componentRect.top < viewportRect.top ||
      componentRect.left < viewportRect.left ||
      componentRect.bottom > viewportRect.bottom ||
      componentRect.right > viewportRect.right
    ) {
      // Calculate the difference in position and adjust by the scale
      const deltaX = (viewportRect.left - componentRect.left + 100) / scale;
      const deltaY = (viewportRect.top - componentRect.top + 100) / scale;

      // Get the current Panzoom translation values
      const currentX = panzoom.getPan().x;
      const currentY = panzoom.getPan().y;

      // Calculate the new position
      const newX = Math.max(-10000, Math.min(currentX + deltaX, 10000));
      const newY = Math.max(-10000, Math.min(currentY + deltaY, 10000));

      // Use Panzoom to translate the view, taking the scale into account
      panzoom.pan(newX, newY);
    }
  }

  scrollToAgentCard() {
    const panzoom = this.panzoom;
    const scale = this.scale; // Assuming this is the current scale factor

    // Get the bounding rectangle of the component and the viewport
    if (!this.agentCard) return;
    const cardRect = this.agentCard.domElement.getBoundingClientRect();
    const viewport = document.querySelector('#workspace-container'); // Adjust if the ID is different
    const viewportRect = viewport.getBoundingClientRect();

    // Check if component is not in the viewport
    if (
      cardRect.top < viewportRect.top ||
      cardRect.left < viewportRect.left ||
      cardRect.bottom > viewportRect.bottom ||
      cardRect.right > viewportRect.right
    ) {
      // Calculate the difference in position and adjust by the scale
      const deltaX = (viewportRect.left - cardRect.left + 100) / scale;
      const deltaY = (viewportRect.top - cardRect.top + 100) / scale;

      // Get the current Panzoom translation values
      const currentX = panzoom.getPan().x;
      const currentY = panzoom.getPan().y;

      // Calculate the new position
      const newX = Math.max(-10000, Math.min(currentX + deltaX, 10000));
      const newY = Math.max(-10000, Math.min(currentY + deltaY, 10000));

      // Use Panzoom to translate the view, taking the scale into account
      panzoom.pan(newX, newY);
    }
  }

  public getJsplumbConnection(connection) {
    const sourceComponent = document.querySelector(`#${connection.sourceId}`);
    const targetComponent = document.querySelector(`#${connection.targetId}`);
    if (!sourceComponent || !targetComponent) return null;
    const sourceEndpoint = sourceComponent.querySelector(
      `.output-endpoint:nth-child(${connection.sourceIndex + 1})`,
    );
    const targetEndpoint = targetComponent.querySelector(
      `.input-endpoint:nth-child(${connection.targetIndex + 1})`,
    );
    if (!sourceEndpoint || !targetEndpoint) return null;

    const source = sourceEndpoint;
    const target = targetEndpoint;

    const jsPlumbInstance: any = this.jsPlumbInstance;
    return jsPlumbInstance.getConnections({ source, target })[0];
  }
  public async checkConnectionsConsistency(newConnection = null) {
    const jsPlumbInstance: any = this.jsPlumbInstance;
    let conflict = false;
    if (this._loading) return conflict;

    //we need to reset connection tags once before settingComponentsTags in order to detect conflicts accurately
    const allWorkspaceConnections: any[] = this.jsPlumbInstance.getAllConnections();
    for (let connection of allWorkspaceConnections) {
      delete connection.___Async_tag;
      delete connection.___Loop_tag;
    }

    this.setComponentsTags();

    const jsPlumbConnections: any[] = this.jsPlumbInstance.getAllConnections();
    for (let connection of jsPlumbConnections) {
      let reported = false;
      const sourceElement: any = connection.source.closest('.component');
      const targetElement: any = connection.target.closest('.component');
      if (!sourceElement || !targetElement) continue;
      const sourceComponent: Component = sourceElement._control;
      const targetComponent: Component = targetElement._control;
      if (!sourceComponent || !targetComponent) continue;

      if (!newConnection) newConnection = connection;
      if (
        (targetComponent.constructor.name == 'Async' && sourceElement.___Async_tag == 'async') ||
        (targetComponent.constructor.name == 'Async' && sourceComponent.constructor.name == 'Async')
      ) {
        conflict = true;
        this.scrollToComponent(sourceElement);
        const conflictConnections = jsPlumbInstance.getConnections({
          source: [...sourceElement.querySelectorAll('.output-endpoint')],
        });
        for (let con of conflictConnections) {
          con.__smt_overlay = '<b style="color:red;position:relative;top:-20px">Conflict !!!</b>';
          con.__smt_color = '#ff0000';
          con.__smt_thickness = 8;
          this.updateConnectionColors(con);
          reported = true;
        }
        // newConnection.__smt_overlay = '<b style="color:red;position:relative;top:-20px">Conflict !!!</b>';
        // newConnection.__smt_color = '#ff0000';
        // newConnection.__smt_thickness = 4;
        // this.updateConnectionColors(newConnection);

        await alert(
          'Connection Consistency Check Failed',
          `Nested Async Component is not allowed ==> ${sourceComponent.drawSettings.displayName} -> ${targetComponent.drawSettings.displayName}`,
        );
        console.error(
          `Nested Async Component is not allowed ==> ${sourceComponent.drawSettings.displayName} -> ${targetComponent.drawSettings.displayName}`,
          sourceElement,
          sourceElement.___Async_tag,
          targetElement,
          targetElement.___Async_tag,
          connection,
        );
      } else if (
        sourceComponent.constructor.name !== 'Async' &&
        sourceElement.___Async_tag !== 'async' &&
        targetElement.___Async_tag === 'async'
      ) {
        //const jsPlumbCon = this.getJsplumbConnection(connection);
        conflict = true;
        this.scrollToComponent(sourceElement);
        const conflictConnections = jsPlumbInstance.getConnections({
          source: [...sourceElement.querySelectorAll('.output-endpoint')],
        });
        for (let con of conflictConnections) {
          con.__smt_overlay = '<b style="color:red;position:relative;top:-20px">Conflict !!!</b>';
          con.__smt_color = '#ff0000';
          con.__smt_thickness = 8;
          this.updateConnectionColors(con);
          reported = true;
        }
        // newConnection.__smt_overlay = '<b style="color:red;position:relative;top:-20px">Conflict !!!</b>';
        // newConnection.__smt_color = '#ff0000';
        // newConnection.__smt_thickness = 4;
        // this.updateConnectionColors(newConnection);

        await alert(
          'Connection Consistency Check Failed',
          `Connection from Synchronous to Asynchronous component is not allowed ==> ${sourceComponent.drawSettings.displayName} -> ${targetComponent.drawSettings.displayName}`,
        );
        console.error(
          `Connection from Synchronous to Asynchronous component is not allowed ==> ${sourceComponent.drawSettings.displayName} -> ${targetComponent.drawSettings.displayName}`,
          sourceElement,
          sourceElement.___Async_tag,
          targetElement,
          targetElement.___Async_tag,
          connection,
        );

        //this.jsPlumbInstance.deleteConnection(connection);
      }

      if (connection.___Loop_tag && connection.___Loop_tag != targetElement.___Loop_tag) {
        conflict = true;
        this.scrollToComponent(sourceElement);
        const conflictConnections = jsPlumbInstance.getConnections({
          source: [...sourceElement.querySelectorAll('.output-endpoint')],
        });
        for (let con of conflictConnections) {
          con.__smt_overlay = '<b style="color:red;position:relative;top:-20px">Conflict !!!</b>';
          con.__smt_color = '#ff0000';
          con.__smt_thickness = 8;
          this.updateConnectionColors(con);
          reported = true;
        }
        // newConnection.__smt_overlay = '<b style="color:red;position:relative;top:-20px">Conflict !!!</b>';
        // newConnection.__smt_color = '#ff0000';
        // newConnection.__smt_thickness = 4;
        // this.updateConnectionColors(newConnection);

        await alert(
          'Loop Branches Conflict Detected',
          `Loop Branches cannot be connected to other branches ==> ${sourceComponent.drawSettings.displayName} -> ${targetComponent.drawSettings.displayName}`,
        );
        console.error(
          `Loop Branches cannot be connected to other branches ==> ${sourceComponent.drawSettings.displayName} -> ${targetComponent.drawSettings.displayName}`,
          sourceElement,
          targetElement,
          connection,
        );
      }

      if (!reported && connection.__smt_overlay) {
        delete connection.__smt_overlay;
        delete connection.__smt_color;
        delete connection.__smt_thickness;
        this.updateConnectionColors(connection);
      }
    }

    //console.log('Connections Consistency Check finished...');
    return conflict;
  }

  /**
   * We use this helper function to tag components with metadata that helps handling connections consistencies for complex components like Async and ForEach
   */
  public async setComponentsTags() {
    const agent = this.agent;
    const allWorkspaceComponentElements: any[] = [
      ...this.domElement.querySelectorAll('.component'),
    ];
    const allWorkspaceComponents: Component[] = allWorkspaceComponentElements.map(
      (e: any) => e._control,
    );

    const allAsyncComponentElements = allWorkspaceComponentElements.filter(
      (e) => e._control.constructor.name == 'Async',
    );
    const allLoopComponentElements = allWorkspaceComponentElements.filter(
      (e) => e._control.constructor.name == 'ForEach',
    );

    //const allAsyncComponents = allWorkspaceComponents.filter((e) => e.constructor.name == 'Async');

    for (let cptElement of allWorkspaceComponentElements) {
      //const cptElement: any = document.querySelector(`#${cpt.id}`);
      delete cptElement.___Async_tag;
      delete cptElement.___Loop_tag;
      cptElement.classList.remove('async');
      cptElement._control.async = false;
    }

    //we tag all async components first
    for (let cptElement of allAsyncComponentElements) {
      //const nextElements = agent.data.connections.filter((e) => e.sourceId == cpt.uid);
      const nextElements = [
        ...new Set(
          this.jsPlumbInstance
            .getAllConnections()
            .filter(
              (e) =>
                e.source.closest('.component') == cptElement &&
                e.source.getAttribute('smt-name') !== 'JobID',
            ) //JobID input is synchronous and returns immediately
            .map((connection) => ({
              connection,
              component: connection.target.closest('.component'),
            })),
        ),
      ].filter((e) => e.component); //remove nulls
      for (let nextElt of nextElements) {
        //const nextCpt = nextElt.component;
        this.recursiveSetChildTag(nextElt, 'Async', 'async');
      }
    }

    for (let cptElement of allLoopComponentElements) {
      //const nextElements = agent.data.connections.filter((e) => e.sourceId == cpt.uid);
      const nextElements = [
        ...new Set(
          this.jsPlumbInstance
            .getAllConnections()
            .filter((e) => e.source.closest('.component') == cptElement)
            .map((connection) => ({
              connection,
              component: connection.target.closest('.component'),
            })),
        ),
      ].filter((e) => e); //remove nulls
      let loopId = 1;
      for (let nextElt of nextElements) {
        //const nextCpt = nextElt.component;
        this.recursiveSetChildTag(nextElt, 'Loop', loopId++, false);
      }
    }

    for (let cptElement of allWorkspaceComponentElements) {
      //const cptElement: any = document.querySelector(`#${cpt.id}`);
      if (cptElement.___Async_tag) continue;
      cptElement.classList.add('sync');
      cptElement.___Async_tag = 'sync';
    }

    // for (let cptElement of allWorkspaceComponentElements) {
    //     delete cptElement.___Async_tag;
    //     delete cptElement.___Loop_tag;
    // }
  }

  recursiveSetChildTag(cptEntry, tagName, tag, overwrite = true) {
    const cptElement = cptEntry.component;
    if (!cptElement) return;

    const cptConnection = cptEntry.connection;

    const component: Component = cptElement._control;
    cptElement.classList.add(tag);
    const tagId = `___${tagName}_tag`;

    //already tagged branch ?
    if (cptElement?.[tagId] === tag && cptConnection?.[tagId] === tag) return;

    if ((cptElement[tagId] && overwrite) || cptElement[tagId] === undefined) {
      cptElement[tagId] = tag;
    }

    if ((cptConnection[tagId] && overwrite) || cptConnection[tagId] === undefined) {
      cptConnection[tagId] = tag;
    }

    // if (component) {
    //     component.async = true;
    // }
    const nextElements = [
      ...new Set(
        this.jsPlumbInstance
          .getAllConnections()
          .filter((e) => e.source.closest('.component') == cptElement)
          .map((connection) => ({
            connection,
            component: connection.target.closest('.component'),
          })),
      ),
    ];
    for (let nextElt of nextElements) {
      //const nextCpt = nextElt.component;
      this.recursiveSetChildTag(nextElt, tagName, tag);
    }
  }

  public async exportTemplate() {
    return workspaceHelper.exportTemplate.call(this);
  }

  private getTemplateInfo() {
    return workspaceHelper.getTemplateInfo.call(this);
  }

  /**
   * Initialize the monitor
   */
  private initMonitor(): void {
    // console.log('INIT MONITOR');

    // Close existing monitor if any
    if (this.monitor) {
      this.monitor.close();
    }

    // Create new monitor
    this.monitor = new Monitor(this);
    try {
      this.monitor.init();
    } catch (error) {
      console.error('Failed to initialize monitor:', error);
    }
  }

  /**
   * Refresh the selection of the component
   * @param component - The component to refresh the selection of
   * If no component is provided, reset all components to default state
   */
  public refreshComponentSelection(component?: HTMLElement): void {
    const allComponents = document.querySelectorAll('#workspace-container .component');
    allComponents.forEach((c) => {
      // Reset all components to default state
      c.classList.remove('selected', 'unselected');

      if (!component) return;

      // Unselect all other components except the one that's provided as argument
      if (c.id !== component.id) {
        c.classList.add('unselected');
        return;
      }
      // Select the component that's provided as argument
      c.classList.add('selected');
    });
  }

  public async updateWeaverData(data: Record<string, any>) {
    this.userData.weaver = data;
  }
}
