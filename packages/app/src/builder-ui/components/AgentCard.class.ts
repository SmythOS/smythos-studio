import { TooltipV2 } from '@src/react/shared/components/_legacy/ui/tooltip/tooltipV2';
import { Observability } from '@src/shared/observability';
import interact from 'interactjs';
import jsPlumb from 'jsplumb';
import EventEmitter from '../EventEmitter.class';
import { ComponentProperties, DrawSettingsType, Settings } from '../types/component.types';
import { alert, openAgentSettingsRightSidebar } from '../ui/dialogs';
import { renderAgentSettingsSidebar } from '../ui/react-injects';
import { delay, uid } from '../utils';
import { destroyMenu as destroyCanvasContextMenu } from '../workspace/CanvasContextMenu';
import { Workspace } from '../workspace/Workspace.class';
import { Component } from './Component.class';

import VariablesWidget from '@src/react/features/builder/components/VariablesWidget';
import { queryClient } from '@src/react/shared/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import ReactDOM from 'react-dom/client';
// Keep track of all agent cards
const AgentCardList: Record<string, AgentCard> = {};

/**
 * AgentCard class for displaying agent information in a card format
 * This class extends EventEmitter to handle events
 */
export class AgentCard extends EventEmitter {
  /**
   * Unique identifier for the agent card
   */
  protected _uid: string;

  /**
   * Settings for the agent card
   */
  public settings: Settings = {};

  /**
   * Data for the agent card
   */
  public data: any = {};

  /**
   * Draw settings for the agent card
   */
  public drawSettings: DrawSettingsType = {
    cssClass: 'agent-card',
    shortDescription: '',
    color: '#3B82F6', // Blue color for the agent card
  };

  /**
   * Flag to track if the card has been destroyed
   */
  private _destroyed = false;

  /**
   * DOM element for the agent card
   */
  public domElement: HTMLElement;

  /**
   * Container for the agent card settings
   */
  public settingsContainer: HTMLElement;

  /**
   * Placeholder element for mounting the React variables viewer
   */
  public variablesPlaceholder: HTMLElement | null = null;

  /**
   * React root instance for the variables viewer
   */
  private variablesReactRoot: ReactDOM.Root | null = null;

  /**
   * Track if the variables component is currently mounted
   */
  private isVariablesComponentMounted = false;

  /**
   * Agent name display
   */
  public displayName: string;

  /**
   * Agent skills
   */
  public skills: string[] = [];

  /**
   * Flag to track if the card is ready
   */
  protected _init_state_populated = false;

  public static connPaintStyles = { stroke: '#8F8F8F', strokeWidth: 2, dashstyle: '4 4' };

  /**
   * Getter for the unique identifier
   */
  get uid(): string {
    return this._uid;
  }

  /**
   * Constructor for the AgentCard class
   *
   * @param workspace - The workspace instance
   * @param properties - Properties for the agent card
   */
  constructor(
    public workspace: Workspace,
    public properties: ComponentProperties = {
      data: {},
      top: '20px',
      left: '20px',
      width: '',
      height: '',
      uid: null,
    },
    private configuration: any = {},
  ) {
    super();
    this._uid = this.properties.uid || 'A' + uid();
    if (!this.properties) this.properties = { top: '', left: '' };

    this.data = this.properties.data || {};

    // Initialize the agent card
    this.prepare()
      .then(this.init.bind(this))
      .then(() => {
        // Render the card
        this.redraw().then(() => {
          this.handleSkillsConnections(this.configuration).then(() => {
            this._init_state_populated = true;
          });

          this.workspace.addEventListener('componentAdded', (component: Component) => {
            if (component.displayName === 'APIEndpoint') {
              this.handleCompConn(component.uid);
            }
          });
        });
      })
      .catch((err) => {
        console.error('Error initializing agent card:', err);
      });

    // Add to the global list of agent cards
    AgentCardList[this.uid] = this;
  }

  /**
   * Prepare the agent card
   */
  protected async prepare(): Promise<void> {
    // Preparation steps if needed
    return Promise.resolve();
  }

  /**
   * Initialize the agent card
   */
  protected async init(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Redraw the agent card
   */
  public async redraw(): Promise<void> {
    // Get a reference to the workspace
    const workspace = this.workspace;
    const agentCard = this;

    // Create the card element
    const div = document.createElement('div');
    div.className = `agent-card exclude-panzoom ${this.drawSettings.cssClass || ''}`;
    div.id = `agent-card-${this._uid}`;
    div.style.position = 'absolute';
    div.style.left = this.properties.left || '20px';
    div.style.top = this.properties.top || '20px';
    if (this.properties.width) div.style.width = this.properties.width;
    if (this.properties.height) div.style.height = this.properties.height;

    let agentAvatar = null;
    const agentAvatarElm: HTMLImageElement | null = document.querySelector('#agent-avatar');
    if (agentAvatarElm) {
      agentAvatar = agentAvatarElm.src;
    } else {
      agentAvatar = window.sessionStorage.getItem(`agent-avatar-${this.workspace.agent?.id}`);
      window.sessionStorage.removeItem(`agent-avatar-${this.workspace.agent?.id}`);
    }

    // Create the card content
    // Create the card content structure using DOM elements
    const cardContent = document.createElement('div');
    cardContent.className = 'agent-card-content';

    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.className = 'agent-image-container';

    // Create and configure agent image
    const agentImage = document.createElement('img');
    agentImage.src = agentAvatar || '';
    agentImage.alt = 'Agent';
    agentImage.className = `agent-image ${agentAvatar ? '' : 'hidden'}`;
    agentImage.id = 'agent-card-avatar';
    imageContainer.appendChild(agentImage);

    // create a placeholder for the agent image (if no image found). the placeholder will be the first letter of the agent name. use tailwind
    const agentImagePlaceholder = document.createElement('div');
    agentImagePlaceholder.id = 'agent-card-avatar-placeholder';
    agentImagePlaceholder.className = `h-full w-full flex items-center justify-center bg-uipink rounded-[7px]  w-8 h-8 flex items-center justify-center text-white font-medium truncate ${
      agentAvatar ? 'hidden' : ''
    }`;
    agentImagePlaceholder.style.fontSize = '77px';
    setTimeout(() => {
      agentImagePlaceholder.textContent =
        this.workspace.agent?.data?.name?.charAt(0) ||
        document.querySelector('.agent-avatar-placeholder-topbar')?.textContent ||
        '';
    }, 200);
    imageContainer.appendChild(agentImagePlaceholder);

    // Create agent info container
    const agentInfo = document.createElement('div');
    agentInfo.className = 'agent-info';

    // Create agent header
    const agentHeader = document.createElement('div');
    agentHeader.className = 'agent-header flex justify-between items-start';

    // Create agent name and description container
    const agentNameContainer = document.createElement('div');
    agentNameContainer.className = 'flex-1 min-w-0';

    // Create and configure agent name
    const agentName = document.createElement('h2');
    agentName.className = 'agent-name';
    setTimeout(() => {
      agentName.textContent = this.workspace.agent?.data?.name || '';
    }, 200);
    agentNameContainer.appendChild(agentName);

    // Create and configure agent description
    // const agentDescription = document.createElement('p');
    // agentDescription.className = 'agent-description one-line-ellipsis text-sm text-gray-500';
    // agentDescription.textContent = this.workspace.agent?.data?.shortDescription || '';
    // agentNameContainer.appendChild(agentDescription);

    // Create menu button
    const menuButton = document.createElement('div');
    menuButton.className =
      'px-1 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded transition-colors cursor-pointer menu-button';
    menuButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="1"></circle>
        <circle cx="12" cy="5" r="1"></circle>
        <circle cx="12" cy="19" r="1"></circle>
      </svg>
    `;

    new TooltipV2(menuButton, {
      text: 'Agent Setting',
      position: 'top',
      showWhen: 'hover',
    });

    // Assemble agent header
    agentHeader.appendChild(agentNameContainer);
    agentHeader.appendChild(menuButton);
    agentInfo.appendChild(agentHeader);

    // Create agent actions
    const agentActions = document.createElement('div');
    agentActions.className = 'agent-actions py-2';

    // Create add skill control
    const epControl = document.createElement('div');
    epControl.className = 'ep-control inputs justify-self-end flex items-center ';

    // Create skill text label
    const skillLabel = document.createElement('span');
    skillLabel.className = 'text-[#5A5A5A] font-medium pr-2';
    skillLabel.textContent = 'Add skill';
    epControl.appendChild(skillLabel);

    // Create add button
    const addButton = document.createElement('button');
    addButton.className =
      'btn-add-endpoint button mini w-6 h-6 bg-smythos-blue-500 text-white rounded';
    addButton.id = 'add-skill-button';
    addButton.style.fontSize = '20px';
    addButton.textContent = '+';
    epControl.appendChild(addButton);

    const endpoint = document.createElement('div');
    endpoint.className = 'flex justify-self-end mt-2 agent-card-connection';
    endpoint.setAttribute('smt-name', 'Skills');
    endpoint.setAttribute('smt-color', '#3C89F9');
    const endpointName = document.createElement('span');
    endpointName.className = 'name';
    endpointName.style.borderImage =
      'linear-gradient(90deg, transparent 20%, rgb(60, 137, 249)) 1 / 1 / 0 stretch';
    endpointName.innerHTML = '<span class="label text-gray-500"># Skills</span>';
    endpoint.appendChild(endpointName);
    const endpointOutput = document.createElement('span');
    endpointOutput.className =
      'block absolute ep w-[15px] h-[15px] rounded-full -right-[23px] float-left border-0 top-1/2 -translate-y-1/2';
    endpointOutput.style.backgroundColor = '#3C89F9';
    endpoint.appendChild(endpointOutput);

    // Create preview button container
    const previewButtonContainer = document.createElement('div');
    previewButtonContainer.className =
      'preview-button-container flex items-center gap-2 bg-[#F5F5F5] rounded-lg p-1 pl-2 border border-[#EDE8E8]';

    // Create agent variables button
    const agentSettingsButton = document.createElement('button');
    agentSettingsButton.className =
      'agent-settings-button flex items-center justify-center hover:bg-[#D3D3D3] rounded-lg p-1';
    agentSettingsButton.innerHTML = `
     <svg xmlns="http://www.w3.org/2000/svg" width="28" height="27" viewBox="0 0 17 16" fill="none">
      <path d="M5.41467 3.44531C2.1001 3.44531 5.41467 8.00267 2.1001 8.00267C5.41467 8.00267 2.1001 12.5601 5.41467 12.5601" stroke="#424242" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M7.13867 6.26562L9.43354 9.37743" stroke="#424242" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9.43354 6.26562L7.13867 9.37743" stroke="#424242" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10.7856 3.44531C14.1002 3.44531 10.7856 8.00267 14.1002 8.00267C10.7856 8.00267 14.1002 12.5601 10.7856 12.5601" stroke="#424242" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    new TooltipV2(agentSettingsButton, {
      text: 'Global Variables',
      position: 'top',
      showWhen: 'hover',
    });

    // Create preview button
    const previewButton = document.createElement('button');
    previewButton.className = 'preview-button w-full bg-white rounded border border-[#C7C7C7]';
    previewButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 13 12" fill="none">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M9.99811 9.27993C9.08886 10.3587 7.81286 10.8942 6.53776 10.8898C6.09116 10.8878 4.10195 10.8893 2.92807 10.8898C2.57878 10.8898 2.37251 10.4998 2.56662 10.2089C2.6751 10.0453 2.81424 9.84668 2.92418 9.69193C3.03364 9.53673 3.04337 9.33318 2.94851 9.16818C2.78164 8.87823 2.53354 8.43698 2.46883 8.27638C1.69825 6.60503 1.99549 4.56074 3.37077 3.1808C5.25248 1.29273 8.39416 1.42793 10.0949 3.58644C11.4016 5.24413 11.3583 7.66618 9.99811 9.27993Z" stroke="#3C89F9" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>Preview as Chatbot</span>
    `;

    previewButtonContainer.appendChild(agentSettingsButton);
    previewButtonContainer.appendChild(previewButton);

    // Assemble agent actions

    agentActions.appendChild(epControl);
    agentActions.appendChild(endpoint);
    // agentActions.appendChild(previewButton);
    agentInfo.appendChild(agentActions);
    agentInfo.appendChild(previewButtonContainer);
    // Assemble the card content
    cardContent.appendChild(imageContainer);
    cardContent.appendChild(agentInfo);

    await delay(50);
    let jsPlumbInstance = this.workspace.jsPlumbInstance;
    const jsPlumbEndpoint = jsPlumbInstance.addEndpoint(endpoint, {
      paintStyle: { fill: '#ddddff00' },
      endpoint: ['Rectangle', { height: 10, width: 40 }],
      //anchor: [1.07, 0.5] ,
      anchor: 'Right',
      isSource: true,
      maxConnections: -1,
      cssClass: 'exclude-panzoom',
    }) as jsPlumb.Endpoint;

    // @ts-ignore
    // jsPlumbEndpoint.endpoint.endpoint = jsPlumbEndpoint;
    endpoint.endpoint = jsPlumbEndpoint;
    // @ts-ignore
    jsPlumbEndpoint['_domElement'] = endpoint;

    // Create placeholder for React component (initially hidden)
    const variablesPlaceholder = document.createElement('div');
    variablesPlaceholder.id = `agent-card-variables-placeholder-${this._uid}`;
    variablesPlaceholder.className = 'hidden agent-card-variables'; // Hide initially

    div.appendChild(variablesPlaceholder); // Append placeholder to the main card div
    div.appendChild(cardContent);

    // Set the domElement property
    this.domElement = div;
    this.variablesPlaceholder = variablesPlaceholder; // Store reference

    div['_control'] = this;

    // Add the element to the workspace
    workspace.domElement.appendChild(div);

    // Make the card draggable
    this.makeDraggable();

    // Add event listeners
    this.addEventListeners();

    // Update skills display
    // this.updateSkills();

    this.emit('AgentCardCreated');
  }

  /**
   * Make the agent card draggable
   */
  private makeDraggable(): void {
    const workspace = this.workspace;
    const agentCard = this;

    interact(this.domElement)
      .draggable({
        // Allow dragging from the entire card
        allowFrom: '.agent-card',
        ignoreFrom: '.agent-name', // Don't drag when editing the name
        listeners: {
          start(event) {
            if (workspace?.locked) return false;
            agentCard.domElement.classList.add('dragging');
            agentCard.domElement.style.cursor = 'grabbing';
          },
          move(event) {
            if (workspace?.locked) return false;
            if (!event.target) return;
            let targets = [event.target];

            for (let target of targets) {
              // Get the current top and left values, or default to 0 if they're not set
              const x = (parseFloat(target.style.left) || 0) + event.dx / workspace.scale;
              const y = (parseFloat(target.style.top) || 0) + event.dy / workspace.scale;

              // Update the top and left values
              target.style.left = x + 'px';
              target.style.top = y + 'px';

              target._control.repaint();
            }
          },
          end(event) {
            if (workspace?.locked) return false;

            agentCard.repaint(true);
            agentCard.domElement.style.cursor = '';
            setTimeout(() => {
              agentCard.workspace.saveAgent();
              agentCard.domElement.classList.remove('dragging');
            }, 200);
          },
        },
        inertia: true,
      })
      .styleCursor(false);
  }

  /**
   * Mount the variables component
   */
  private mountVariablesComponent(): void {
    if (!this.variablesPlaceholder) return;

    this.variablesPlaceholder.classList.remove('hidden');
    this.variablesReactRoot = ReactDOM.createRoot(this.variablesPlaceholder);
    this.variablesReactRoot.render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(VariablesWidget, {
          agentId: this.workspace.agent?.id,
          workspace: this.workspace,
        }),
      ),
    );
    this.isVariablesComponentMounted = true;
  }

  /**
   * Unmount the variables component
   */
  private unmountVariablesComponent(): void {
    if (!this.variablesReactRoot) return;

    this.variablesReactRoot.unmount();
    this.variablesReactRoot = null;
    if (this.variablesPlaceholder) {
      this.variablesPlaceholder.classList.add('hidden');
    }
    this.isVariablesComponentMounted = false;
  }

  /**
   * Add event listeners to the card elements
   */
  private addEventListeners(): void {
    // Add skill button
    const addSkillButton = this.domElement.querySelector('#add-skill-button');
    if (addSkillButton) {
      addSkillButton.addEventListener('click', async (e) => {
        destroyCanvasContextMenu();
        e.stopPropagation();
        // console.log('Add skill button clicked');
        // Functionality will be added later

        // Cases:
        // 1. No skills: add a new skill on same level X and Y as the agent card
        // 2. One or more skills: get the skill with the gratest Y and add the new skill on that reference skill Y + 200px and X + 200px

        const skills = this.workspace.agent?.data?.components?.filter(
          (c) => c.name === 'APIEndpoint',
        );
        if (skills.length === 0) {
          // add a new skill on Y = agentCardY + 100 and X = agentCardWidth + 250px the agent card
          // get rect of the agent card
          const agentCardRect = this.domElement.getBoundingClientRect();
          const compElm = await this.workspace.addComponent(
            'APIEndpoint',
            {
              top: Number(this.properties.top.split('px')[0]) + agentCardRect.height + 100 + 'px',
              left: Number(this.properties.left.split('px')[0]) + agentCardRect.width + 450 + 'px',
            },
            true,
          );
          this.workspace.scrollToComponent(compElm);
          this.workspace.refreshComponentSelection(compElm);

          return;
        }
        const referenceSkill = skills.reduce((prev, current) => {
          return Number(prev.top.split('px')[0] || 0) < Number(current.top.split('px')[0] || 0)
            ? current
            : prev;
        });
        const referenceSkillElm = document.querySelector(`#${referenceSkill.id}`);
        let top;
        if (referenceSkillElm) {
          const referenceSkillRect = referenceSkillElm.getBoundingClientRect();
          top = Number(referenceSkill.top.split('px')[0]) + referenceSkillRect.height + 200 + 'px';
        } else {
          top = Number(referenceSkill.top.split('px')[0]) + 400 + 'px';
        }

        const compElm = await this.workspace.addComponent(
          'APIEndpoint',
          {
            top,
            // left: Number(referenceSkill.left.split('px')[0]) + 200 + 'px',
            left: referenceSkill.left,
          },
          true,
        );
        this.workspace.scrollToComponent(compElm);
        this.workspace.refreshComponentSelection(compElm);
      });
    }

    // Settings button - Toggles React component visibility
    const agentSettingsButton = this.domElement.querySelector('.agent-settings-button');
    if (agentSettingsButton) {
      agentSettingsButton.addEventListener('click', (e) => {
        destroyCanvasContextMenu();
        e.stopPropagation(); // Prevent the main card click handler from firing

        // Toggle React component mount state
        if (this.isVariablesComponentMounted) {
          this.variablesPlaceholder.classList.toggle('hidden');
        } else {
          this.mountVariablesComponent();
        }

        // Optional: Recalculate layout if needed
        this.workspace.jsPlumbInstance.revalidate(this.domElement);
      });
    }

    // Add click handler to the entire card (now opens sidebar)
    this.domElement.addEventListener('click', (e) => {
      destroyCanvasContextMenu();
      e.stopPropagation();

      // Check if clicked target is an HTMLElement before using closest()
      const target = e.target as HTMLElement;

      // Skip opening sidebar if click was inside variables placeholder
      if (
        target.closest(`#agent-card-variables-placeholder-${this._uid}`) ||
        target.closest('.vault-keys-dropdown')
      ) {
        return;
      }

      // Use the new openAgentSettingsRightSidebar function to open and configure the sidebar
      const sidebar = openAgentSettingsRightSidebar();

      // Render agent settings in the sidebar
      renderAgentSettingsSidebar({ rootID: 'agent-settings-in-right-sidebar-root' });
    });

    // Preview button
    const previewButton = this.domElement.querySelector('.preview-button');
    if (previewButton) {
      previewButton.addEventListener('click', (e) => {
        destroyCanvasContextMenu();
        e.stopPropagation();

        Observability.observeInteraction('app_preview_as_chatbot_click', {});

        const embodimentTestButton = document.querySelector('#btn-emb-chatbot-main');
        const embodimentOpened = document.querySelector(
          '#right-container.open #embodiment-sidebar:not(.hidden)',
        );

        if (!embodimentOpened && embodimentTestButton) {
          // Click the test button to open the embodiment sidebar
          (embodimentTestButton as HTMLButtonElement)?.click();
        }

        const chatbotEmbBtn: HTMLButtonElement | null = document.querySelector(
          "[data-embodiment-type='chat']",
        );
        // Open the chatbot embodiment tab
        if (chatbotEmbBtn) {
          chatbotEmbBtn?.click();
        }
      });
    }

    // Make agent name editable
    const agentNameElement = this.domElement.querySelector('.agent-name');
    // if (agentNameElement) {
    //   agentNameElement.addEventListener('click', (e) => {
    //     e.stopPropagation();
    //     this.makeAgentNameEditable(agentNameElement as HTMLElement);
    //   });
    // }

    // Prevent event propagation when clicking on the card
    this.domElement.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });

    this.workspace.addEventListener('AgentSaved', () => {
      if (agentNameElement && this.workspace.agent?.data?.name != agentNameElement.textContent) {
        agentNameElement.textContent = this.workspace.agent?.data?.name || '';
      }

      // const topBarAgentAvatarElm: HTMLImageElement | null = document.querySelector('#agent-avatar');

      const cardAgentAvatarElm: HTMLImageElement | null =
        document.querySelector('#agent-card-avatar');
      const agentImagePlaceholder: HTMLDivElement | null = document.querySelector(
        '#agent-card-avatar-placeholder',
      );
      // if (
      //   topBarAgentAvatarElm &&
      //   cardAgentAvatarElm &&
      //   topBarAgentAvatarElm.src != cardAgentAvatarElm.src
      // ) {
      //   cardAgentAvatarElm.src = topBarAgentAvatarElm.src;
      //   cardAgentAvatarElm.classList.remove('hidden');
      //   agentImagePlaceholder?.classList.add('hidden');
      // }
    });

    this.workspace.agent.addEventListener('AvatarUpdated', (url: string) => {
      // Update agent card avatar
      const cardAgentAvatarElm: HTMLImageElement | null =
        document.querySelector('#agent-card-avatar');
      if (cardAgentAvatarElm) {
        cardAgentAvatarElm.src = url;
        cardAgentAvatarElm.classList.remove('hidden');
      }

      // Hide the placeholder when avatar is available
      const agentImagePlaceholder: HTMLDivElement | null = document.querySelector(
        '#agent-card-avatar-placeholder',
      );
      if (agentImagePlaceholder) {
        agentImagePlaceholder.classList.add('hidden');
      }

      // Update builder topbar avatar
      const topbarAvatarElm: HTMLImageElement | null = document.querySelector('#agent-avatar');
      if (topbarAvatarElm) {
        topbarAvatarElm.src = url;
      }

      // Update any other avatar elements in the builder
      const allAvatarElements = document.querySelectorAll('[data-agent-avatar]');
      allAvatarElements.forEach((element: HTMLImageElement) => {
        element.src = url;
      });

      // Save to session storage for persistence
      if (this.workspace.agent?.id) {
        window.sessionStorage.setItem(`agent-avatar-${this.workspace.agent.id}`, url);
      }

      // Trigger a custom event for React components to listen to
      window.dispatchEvent(
        new CustomEvent('agentAvatarUpdated', {
          detail: { agentId: this.workspace.agent?.id, avatarUrl: url },
        }),
      );
    });
  }

  /**
   * Make the agent name editable
   *
   * @param element - The element to make editable
   */
  private makeAgentNameEditable(element: HTMLElement): void {
    return;
    element.contentEditable = 'true';
    element.focus();

    // Save on blur
    element.addEventListener('blur', () => {
      element.contentEditable = 'false';
      // this.agentName = element.textContent || 'Agent Name';
      // this.properties.title = this.agentName;
    });

    // Save on enter
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        element.blur();
      }
    });
  }

  /**
   * Destroy the agent card
   */
  public destroy(): void {
    if (this._destroyed) return;

    // Unmount React component if it exists
    if (this.isVariablesComponentMounted) {
      this.unmountVariablesComponent();
    }

    // Remove the DOM element
    if (this.domElement && this.domElement.parentNode) {
      this.domElement.parentNode.removeChild(this.domElement);
    }

    // Remove from the global list
    delete AgentCardList[this.uid];

    this._destroyed = true;
  }

  protected async repaint(redrawConnectors = false) {
    if (redrawConnectors) {
      let connections = [...this.domElement.querySelectorAll('.endpoint')]
        .map((ep: any) => ep?.endpoint?.connections)
        .flat(Infinity);
      //deduplicate
      connections = [...new Set(connections)];

      connections.forEach((connection) => {
        this.workspace.updateConnectionStyle(connection);
      });
    }

    this.workspace.jsPlumbInstance.repaint(this.domElement);
  }

  private async handleSkillsConnections(configuration: any) {
    // connect the agent card to skills

    const skills = configuration?.components?.filter((c) => c.name === 'APIEndpoint');
    if (!skills) return;
    for (const skill of skills) {
      await this.handleCompConn(skill.id);
      // conn.__smt_color = '#919191';
      // this.updateConnectionColors(conn);
    }
  }

  private async handleCompConn(compId: string) {
    const agentCardConn: any = document.querySelector('.agent-card .agent-card-connection');
    if (!agentCardConn) return;
    const compElm: any = document.querySelector(`#${compId} `);
    if (!compElm) return;

    const connect = () => {
      const compConn: any = compElm.querySelector('.agent-card-connection');
      if (!compConn) return;

      // Check if connection already exists between these endpoints
      // @ts-ignore
      const existingConnections = this.workspace.jsPlumbInstance.getConnections({
        source: agentCardConn.id,
        target: compConn.id,
      });

      if (existingConnections.length === 0) {
        this.workspace.jsPlumbInstance.connect({
          source: agentCardConn.endpoint,
          target: compConn.endpoint,
          detachable: true,
          cssClass: 'exclude-panzoom',
          //@ts-ignore
          paintStyle: AgentCard.connPaintStyles,
        });
      }
    };

    const disconnect = () => {
      const compConn: any = compElm.querySelector('.agent-card-connection');
      if (!compConn) return;

      // Get all connections between these endpoints and remove them
      // @ts-ignore
      const connections = this.workspace.jsPlumbInstance.getConnections({
        source: agentCardConn.id,
        target: compConn.id,
      });

      connections.forEach((connection) => {
        this.workspace.jsPlumbInstance.deleteConnection(connection);
      });
    };

    if (!compElm._control) return;

    const handleSettingsChange = (values: any) => {
      const newAiExposed = values?.ai_exposed;

      if (newAiExposed) {
        connect();
      } else {
        disconnect();
      }
    };

    // Bind the event handlers
    const boundHandleSettingsChange = handleSettingsChange.bind(this);
    const boundHandleDelete = disconnect.bind(this);

    // Remove any existing listeners first
    compElm._control.removeEventListener('settingsSaved', boundHandleSettingsChange);
    compElm._control.removeEventListener('settingsDraftUpdated', boundHandleSettingsChange);
    compElm._control.removeEventListener('beforeDelete', boundHandleDelete);

    // Add new listeners
    compElm._control.addEventListener('settingsSaved', boundHandleSettingsChange);
    compElm._control.addEventListener('settingsDraftUpdated', boundHandleSettingsChange);
    compElm._control.addEventListener('beforeDelete', boundHandleDelete);

    // Initial state check
    if (compElm._control.data.ai_exposed) {
      connect();
    } else {
      disconnect();
    }

    // listen to connection events
    compElm._control.addEventListener('connectionDetached', async (name, element, info) => {
      if (!this._init_state_populated) return; // this is called before the card is initialized
      if (!info.source.classList.contains('agent-card-connection')) return;
      compElm._control.data.ai_exposed = false;
      await delay(100);
      this.workspace.saveAgent();
    });

    compElm._control.addEventListener('connectionAttached', async (name, element, info) => {
      if (!this._init_state_populated) return; // this is called before the card is initialized
      if (!info.source.classList.contains('agent-card-connection')) return;
      compElm._control.data.ai_exposed = true;
      await delay(100);
      this.workspace.saveAgent();
    });
  }

  static checkConnValidity(info: any) {
    // if (!info.source.classList.contains('agent-card-connection')) return true;
    if (
      !info.target.classList.contains('agent-card-connection') &&
      info.source.classList.contains('agent-card-connection')
    ) {
      alert(
        'Unsupported Connection',
        'You can only connect skill components directly to the agent. Please add a skill component first and then connect it to the agent card. <a href="https://smythos.com/documentation/#/" target="_blank" class="text-v2-blue underline hover:text-v2-blue/80">Read documentation</a>.',
        'OK',
        'error',
      );
      return false;
    } // target is not an agent card
    return true;
  }

  static setConnPaintStyles(conn: any) {
    //@ts-ignore
    conn.__smt_color = AgentCard.connPaintStyles.stroke;
    conn.__smt_dashstyle = AgentCard.connPaintStyles.dashstyle;
    conn.__smt_thickness = AgentCard.connPaintStyles.strokeWidth;
  }
  static isCardConn(conn: any) {
    return conn.source.classList.contains('agent-card-connection');
  }
}

// Add CSS styles for the agent card
