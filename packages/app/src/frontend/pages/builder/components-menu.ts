import { EXTENSION_COMP_NAMES } from '../../config';
import { delay, deleteExtensionHandler, loadDynamicCompMenu, uid } from '../../utils';
import { Workspace } from '../../workspace/Workspace.class';

import { PRICING_PLAN_REDIRECT } from '@react/shared/constants/navigation';
import { V4_ENTERPRISE_PLANS } from '@src/react/features/agent-settings/constants';
import { LEGACY_PLANS } from '@src/shared/constants/general';
import { Analytics } from '@src/shared/posthog/services/analytics';
import interact from 'interactjs';
import { Agent } from '../../Agent.class';
import config from '../../config';
import { extensionsDialog } from '../../ui/dialogs';
import { closeTwDialog, twEditValuesWithCallback } from '../../ui/tw-dialogs';
import { addVaultKey } from '../../utils';
import { checkComponentValidity, createSpinner, renderMenuSkeleton } from '../../utils/';
import { sortAgent } from '../../workspace/ComponentSort';
const uiServer = config.env.UI_SERVER;

let workspace: Workspace;
export function setupComponentsScripts(_workspace: Workspace) {
  workspace = _workspace;
  handleWorkspaceEvents(workspace);
  handleComponentSearch();
  setupGPTExtension();
  setupHuggingFaceExtension();
  setupAgentsExtension();
  setupZapierActionExtension(workspace?.agent);
  setupCollapseAllButton();
  setupPrettifyButton();
  setupZoomInButton();
  setupZoomOutButton();
  setupComponentsCollapseAllButton();
  setupBuilderMenuDragDrop();
}

function handleWorkspaceEvents(workspace: Workspace) {
  const CmpToggleBtn: HTMLButtonElement = document.querySelector('#cmp-collapse-btn');
  const CmpToggleBtnIcon = CmpToggleBtn?.querySelector('.icon');
  const CmpToggleBtnText = CmpToggleBtn?.querySelector('.text');

  // init
  if (CmpToggleBtnText) {
    CmpToggleBtnText.textContent = workspace.areComponentsCollapsed() ? 'Expand' : 'Collapse';
  }
  if (CmpToggleBtnIcon) {
    CmpToggleBtnIcon.classList.remove('mif-unfold-less', 'mif-unfold-more');
    CmpToggleBtnIcon.classList.add(
      workspace.areComponentsCollapsed() ? 'mif-unfold-more' : 'mif-unfold-less',
    );
  }

  CmpToggleBtn.onclick = function () {
    const isCollapsed = workspace.areComponentsCollapsed();
    if (!isCollapsed) {
      CmpToggleBtnIcon?.classList.remove('mif-unfold-less');
      CmpToggleBtnIcon?.classList.add('mif-unfold-more');
      if (CmpToggleBtnText) {
        CmpToggleBtnText.textContent = 'Expand';
      }
      workspace.collapseComponents();
    } else {
      CmpToggleBtnIcon?.classList.remove('mif-unfold-more');
      CmpToggleBtnIcon?.classList.add('mif-unfold-less');
      if (CmpToggleBtnText) {
        CmpToggleBtnText.textContent = 'Collapse';
      }
      workspace.expandComponents();
    }
  };
}

/* GPT Plugin Implementation */
function setupGPTExtension() {
  // Load all plugins
  loadDynamicCompMenu({
    compName: EXTENSION_COMP_NAMES.gptPlugin,
  });

  const importPluginBtn = document.getElementById(`btn-import-${EXTENSION_COMP_NAMES.gptPlugin}`);

  importPluginBtn?.addEventListener('click', () => {
    if (!isPremiumPlan()) {
      renderRestrictedAccessModal('OpenAI');
      return;
    }
    extensionsDialog.bind(this, EXTENSION_COMP_NAMES.gptPlugin)();
  });
  // * New GPT Plugin Implementation
  /* importPluginBtn?.addEventListener('click', () => {
    twEditValuesWithCallback(
      {
        title: `Add GPT Plugin`,
        fields: {
          name: {
            type: 'text',
            value: '',
            label: 'Name',
            validate: 'required maxlength=200',
            validateMessage: 'GPT Plugin Name is required and must be less than 200 characters.',
          },
          openApiSpec: {
            type: 'text',
            value: '',
            label: 'Open API Specification URL',
            validate: 'required maxlength=2048',
            validateMessage:
              'Open API Specification is required and must be less than 2048 characters.',
          },
          descForModel: {
            type: 'textarea',
            value: '',
            label: 'Description for Model (Optional)',
            validate: 'maxlength=5000',
            validateMessage: 'Description for Model must be less than 5000 characters.',
            hint: 'If not provided, the description from the OpenAPI specification will be used to run the plugin. This field allows you to override or customize the description.',
          },
          iconUrl: {
            type: 'text',
            value: '',
            label: 'Icon URL (Optional)',
            validate: 'maxlength=2048',
            validateMessage: 'Icon URL must be less than 2048 characters.',
          },
        },
        actions: [
          {
            label: 'Save',
            cssClass: 'bg-smyth-emerald-400 clm-btn-create cursor-pointer',
            requiresValidation: true,
            callback: async (gptPluginInfo, gptPluginDialog) => {
              if (!gptPluginInfo || Object.keys(gptPluginInfo)?.length === 0) return;

              const createBtnElm = gptPluginDialog.querySelector('.clm-btn-create');

              createBtnElm.textContent = 'Saving...';
              createBtnElm.disabled = true;

              const name = gptPluginInfo.name.trim();
              const logoUrl = gptPluginInfo.iconUrl.trim();
              const descForModel = gptPluginInfo.descForModel.trim();
              const specUrl = gptPluginInfo.openApiSpec.trim();

              const dataToSave = { name, logoUrl, descForModel, specUrl };

              try {
                await addExtension({
                  compName: EXTENSION_COMP_NAMES.gptPlugin as ExtensionCompNames,
                  btnElm: createBtnElm,
                  data: dataToSave,
                });

                closeTwDialog(gptPluginDialog); // Close the model settings dialog
              } finally {
                createBtnElm.textContent = 'Save';
                createBtnElm.disabled = false;
              }
            },
          },
        ],
        onCloseClick: (_, dialog) => {
          closeTwDialog(dialog);
        },
      },
      '560px',
      '384px',
      'none',
    );
  }); */

  const pluginListElm = document.querySelector(
    `.navview-menu-group.group-${EXTENSION_COMP_NAMES.gptPlugin}`,
  );

  pluginListElm?.addEventListener(
    'click',
    deleteExtensionHandler.bind(this, EXTENSION_COMP_NAMES.gptPlugin),
  );
}

/* Hugging Face Implementation */
function setupHuggingFaceExtension() {
  // Load all models from Hugging Face
  loadDynamicCompMenu({
    compName: EXTENSION_COMP_NAMES.huggingFaceModel,
  });

  const importHuggingFaceBtn = document.getElementById(
    `btn-import-${EXTENSION_COMP_NAMES.huggingFaceModel}`,
  );

  importHuggingFaceBtn?.addEventListener('click', () => {
    if (!isPremiumPlan()) {
      renderRestrictedAccessModal('Hugging Face');
      return;
    }
    extensionsDialog.bind(this, EXTENSION_COMP_NAMES.huggingFaceModel)();
  });

  const huggingFaceListElm = document.querySelector(
    `.navview-menu-group.group-${EXTENSION_COMP_NAMES.huggingFaceModel}`,
  );

  huggingFaceListElm?.addEventListener(
    'click',
    deleteExtensionHandler.bind(this, EXTENSION_COMP_NAMES.huggingFaceModel),
  );
}

/* Agent Component Implementation */
function setupAgentsExtension() {
  // Load all agent components
  loadDynamicCompMenu({
    compName: EXTENSION_COMP_NAMES.agentPlugin,
  });

  const importAgentCompBtn = document.getElementById(
    `btn-import-${EXTENSION_COMP_NAMES.agentPlugin}`,
  );

  importAgentCompBtn?.addEventListener(
    'click',
    extensionsDialog.bind(this, EXTENSION_COMP_NAMES.agentPlugin),
  );

  const agentCompListElm = document.querySelector(
    `.navview-menu-group.group-${EXTENSION_COMP_NAMES.agentPlugin}`,
  );

  agentCompListElm?.addEventListener(
    'click',
    deleteExtensionHandler.bind(this, EXTENSION_COMP_NAMES.agentPlugin),
  );
}

export async function manageAction(event: MouseEvent) {
  const actionUrl = 'https://actions.zapier.com/custom/start/';

  const importBtn = event.target as HTMLButtonElement;

  const spinner = createSpinner('grey', 'mt-0 mr-2');
  importBtn.insertAdjacentElement('afterend', spinner);
  importBtn.classList.add('hidden');

  try {
    let result = await fetch(
      `${uiServer}/api/page/builder/keys?scope=${EXTENSION_COMP_NAMES.zapierAction}&fields=owner,isInvalid`,
    ).then((res) => res.json());
    const data = result?.data || {};

    const dataIsEmpty = Object.keys(data).length === 0;
    const hasValidKey = Object.values(data).some(
      (item: { isInvalid: boolean }) => !item?.isInvalid,
    );
    let requireKey = dataIsEmpty || !hasValidKey;

    if (requireKey) {
      const result = await addVaultKey(EXTENSION_COMP_NAMES.zapierAction);

      if (result?.keyId) {
        window.open(actionUrl, '_blank');
      }
    } else {
      window.open(actionUrl, '_blank');
    }
  } catch (error) {
    console.log('Something went wrong in Zapier (NLO) Dialog');
  } finally {
    spinner.remove();
    importBtn.classList.remove('hidden');
  }
}

/* Zapier Action implementation */
type SetupZapierActionExtension = {
  (agent: Agent): void;
  lastLoadedTime?: number;
};
const setupZapierActionExtension: SetupZapierActionExtension = async (
  agent: Agent,
): Promise<void> => {
  const menuList = document.querySelector('.comp-menuitem-list-ZapierAction') as HTMLElement;
  renderMenuSkeleton(menuList);

  const manageActionBtn = document.getElementById(
    `btn-import-${EXTENSION_COMP_NAMES.zapierAction}`,
  );

  manageActionBtn.addEventListener('click', manageAction);

  setupZapierActionExtension.lastLoadedTime = Date.now();

  menuList?.addEventListener(
    'click',
    deleteExtensionHandler.bind(this, EXTENSION_COMP_NAMES.zapierAction),
  );

  window.addEventListener('focus', async () => {
    if (!document.hidden) {
      if (Date.now() - setupZapierActionExtension.lastLoadedTime > 10000) {
        renderMenuSkeleton(menuList);

        // Load all actions
        await loadDynamicCompMenu({
          compName: EXTENSION_COMP_NAMES.zapierAction,
          resetPrevItems: true,
        });

        checkComponentValidity(menuList, agent);

        setupZapierActionExtension.lastLoadedTime = Date.now();
      }
    }
  });

  // Load all actions
  await loadDynamicCompMenu({
    compName: EXTENSION_COMP_NAMES.zapierAction,
    resetPrevItems: true,
  });

  checkComponentValidity(menuList, agent);
};

interface SearchConfig {
  /**
   * Container element that holds the search input and icons
   */
  searchContainer: HTMLElement;
  /**
   * Input element for search
   */
  searchInput: HTMLInputElement;
  /**
   * Button to clear the search input
   */
  clearButton: HTMLElement;
  /**
   * Icon element for search
   */
  searchIcon: HTMLElement;
  /**
   * Container elements that hold searchable items
   */
  itemContainers: NodeListOf<HTMLElement>;
  /**
   * Query selector for items that can be searched
   */
  itemSelector: string;
  /**
   * Optional attribute name on items that contains the searchable text
   * If not provided, will use textContent of the item
   */
  searchableAttribute?: string;
  /**
   * Optional selector for the caption element within each item
   * If provided, this element's content will be highlighted
   */
  captionSelector?: string;
  /**
   * Optional callback when search state changes
   */
  onSearchStateChange?: (isSearching: boolean) => void;
  /**
   * Optional Alpine.js configuration for handling group state
   */
  alpine?: {
    /**
     * Whether to use Alpine.js for managing group state
     */
    enabled: boolean;
    /**
     * Function to get stored state key for a group
     */
    getStoredStateKey?: (groupId: string) => string;
  };
}

/**
 * Creates a generic search functionality for a list of items
 * @param config - Configuration object for the search functionality
 */
function setupSearch(config: SearchConfig): void {
  const {
    searchContainer,
    searchInput,
    clearButton,
    searchIcon,
    itemContainers,
    itemSelector,
    searchableAttribute,
    captionSelector,
    onSearchStateChange,
    alpine = { enabled: false },
  } = config;

  function defaultSearchUI() {
    clearButton.classList.add('hidden');
    searchIcon.classList.remove('hidden');
  }

  function highlightSubtext(text: string, subtext: string): string {
    if (!text || !subtext) return text;

    // Create a case-insensitive regex but preserve original matched text
    const regex = new RegExp(`(${subtext})`, 'gi');
    return text.replace(regex, (match) => `<span class="highlight">${match}</span>`);
  }

  clearButton.addEventListener('click', () => {
    searchInput.value = '';
    defaultSearchUI();
    searchInput.dispatchEvent(new Event('keyup'));
  });

  searchInput.addEventListener('keyup', () => {
    const searchValue = searchInput.value.trim().toLowerCase();

    if (searchValue !== '') {
      clearButton.classList.remove('hidden');
      searchIcon.classList.add('hidden');
      onSearchStateChange?.(true);

      itemContainers.forEach((container: HTMLElement) => {
        const items = container.querySelectorAll(itemSelector);
        let hasMatchingItems = false;

        const groupTitleElement = container.querySelector('.name');
        const categoryName = groupTitleElement?.textContent || '';
        const categoryMatches = categoryName.toLowerCase().includes(searchValue);

        // Add highlighting to group title if it matches
        if (groupTitleElement && categoryMatches) {
          groupTitleElement.innerHTML = highlightSubtext(
            groupTitleElement.textContent || '',
            searchValue,
          );
        }

        items.forEach((item) => {
          const searchText = searchableAttribute
            ? item.getAttribute(searchableAttribute) || ''
            : item.textContent || '';

          // Use original text for display, lowercase only for comparison
          const searchTextLower = searchText.toLowerCase();

          const itemDiv = item.closest('div');

          if (searchTextLower.includes(searchValue) || categoryMatches) {
            hasMatchingItems = true;
            itemDiv?.classList.remove('hidden');

            if (captionSelector && !categoryMatches) {
              const caption = item.querySelector(captionSelector);
              if (caption) {
                // Use original cased text for highlighting
                caption.innerHTML = highlightSubtext(searchText, searchValue);
              }
            }
          } else {
            itemDiv?.classList.add('hidden');
          }
        });

        // When search is done, restore original group titles if no match
        if (!categoryMatches && groupTitleElement) {
          groupTitleElement.innerHTML = categoryName;
        }

        // Handle container visibility
        if (hasMatchingItems) {
          container.classList.remove('hidden');

          // Force expand only during search
          if (alpine.enabled && (window as any).Alpine) {
            (window as any).Alpine.evaluate(container, 'open = true');
          }
        } else {
          container.classList.add('hidden');
        }
      });
    } else {
      defaultSearchUI();
      onSearchStateChange?.(false);

      itemContainers.forEach((container: HTMLElement) => {
        container.classList.remove('hidden');

        const groupTitleElement = container.querySelector('.name');
        if (groupTitleElement) {
          groupTitleElement.textContent = groupTitleElement.textContent; // This removes any HTML formatting
        }

        // Restore original collapse state when search is cleared
        if (alpine.enabled && (window as any).Alpine) {
          const groupId = container.querySelector('[aria-controls]')?.getAttribute('aria-controls');
          if (groupId && alpine.getStoredStateKey) {
            const storedState = localStorage.getItem(alpine.getStoredStateKey(groupId));
            // Only set state if we have a stored value
            if (storedState !== null) {
              (window as any).Alpine.evaluate(container, `open = ${storedState === 'true'}`);
            }
          }
        }

        const items = container.querySelectorAll(itemSelector);
        items.forEach((item) => {
          item.closest('div')?.classList.remove('hidden');

          if (captionSelector) {
            const caption = item.querySelector(captionSelector);
            if (caption) {
              caption.innerHTML = searchableAttribute
                ? item.getAttribute(searchableAttribute) || ''
                : item.textContent || '';
            }
          }
        });
      });
    }
  });
}

function handleComponentSearch() {
  // Setup search for main components menu
  setupSearch({
    searchContainer: document.querySelector('.cpt-search-container'),
    searchInput: document.querySelector('#cpt-search'),
    clearButton: document.querySelector('.cpt-search-container .search-clear-btn'),
    searchIcon: document.querySelector('.cpt-search-container .search-glass-icon'),
    itemContainers: document.querySelectorAll('#left-menu .items-group-container'),
    itemSelector: '[smt-component][data-label]',
    searchableAttribute: 'data-label',
    captionSelector: '.name',
    alpine: {
      enabled: true,
      getStoredStateKey: (groupId) => `toggle${groupId}`,
    },
    onSearchStateChange: (isSearching) => {
      const actionButtons = document.querySelectorAll(
        '#left-menu .btn-import, #left-menu .expand-btn',
      );
      actionButtons.forEach((btn: HTMLElement) => {
        if (!isSearching) btn.classList.remove('hidden');
      });
    },
  });

  // Setup search for integrations sidebar
  setupSearch({
    searchContainer: document.querySelector('.integration-search-container'),
    searchInput: document.querySelector('#integrations-cpt-search'),
    clearButton: document.querySelector('.integration-search-container .search-clear-btn'),
    searchIcon: document.querySelector('.integration-search-container .search-glass-icon'),
    itemContainers: document.querySelectorAll(
      '#left-sidebar-integrations-menu .items-group-container',
    ),
    itemSelector: '[smt-component][data-label]',
    searchableAttribute: 'data-label',
    captionSelector: '.name',
    alpine: {
      enabled: true,
      getStoredStateKey: (groupId) => `toggle${groupId}`,
    },
    onSearchStateChange: (isSearching) => {
      const actionButtons = document.querySelectorAll(
        '#left-sidebar-integrations-menu .btn-import, #left-sidebar-integrations-menu .expand-btn',
      );
      actionButtons.forEach((btn: HTMLElement) => {
        if (!isSearching) btn.classList.remove('hidden');
      });
    },
  });
}

/**
 * Checks if a drag and drop action occurred within the workspace canvas area
 * @param event - Drag event or object with coordinates
 * @returns True if dropped in canvas area, false otherwise
 */
function isDroppedInCanvasArea(
  event: DragEvent | { dragEvent?: DragEvent; clientX?: number; clientY?: number },
): boolean {
  // Extract coordinates from either DragEvent or custom event object
  const dropX = 'clientX' in event ? event.clientX : event.dragEvent?.clientX ?? 0;
  const dropY = 'clientY' in event ? event.clientY : event.dragEvent?.clientY ?? 0;

  // Return false if coordinates are unavailable
  if (!dropX || !dropY) {
    return false;
  }

  const droppedAtElement = document.elementFromPoint(dropX, dropY);

  // check if droppedAtElement is a child of workspace-container or workspace-container itself
  return !!(
    droppedAtElement === document.getElementById('workspace-container') ||
    droppedAtElement?.closest('#workspace-container')
  );
}

function setupBuilderMenuDragDrop() {
  // Initialize the dummy dragging div
  let dummyDiv = null;
    interact(
    '#left-menu a[smt-component], #left-sidebar-integrations-menu a[smt-component]',
  ).draggable({
    // Create the dummy div when starting the drag
    onstart: function (event) {
      if (workspace?.locked) return false;
      dummyDiv = document.createElement('div');
      dummyDiv.classList.add('drag-menuitem', 'dragging');
      dummyDiv.innerHTML = event.target.innerHTML;
      dummyDiv.style.position = 'absolute';
      dummyDiv.style.top = event.clientY + 'px';
      dummyDiv.style.left = event.clientX + 'px';
      document.body.appendChild(dummyDiv);
    },
    // Update the dummy div's position while dragging
    onmove: function (event) {
      if (workspace?.locked) return false;
      if (dummyDiv) {
        dummyDiv.style.top = event.clientY - dummyDiv.offsetHeight / 2 + 'px';
        dummyDiv.style.left = event.clientX - dummyDiv.offsetWidth / 2 + 'px';
      }
    },
    // Handle the end of the drag
    onend: function (event) {
      if (workspace?.locked) return false;

      dummyDiv.style.pointerEvents = 'none';

      const droppedInCanvasArea = isDroppedInCanvasArea(event);

      // Show tooltip if the component is dropped outside of the studio canvas
      if (!event?.dropzone?.target || !droppedInCanvasArea) {
        const targetCoords = event?.target?.getBoundingClientRect();

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.setAttribute('role', 'tooltip');
        tooltip.className =
          'tooltip fixed z-50 inline-block text-sm font-medium bg-white text-[#3E3E3E] py-2.5 px-5 rounded-xl shadow-lg max-w-[200px] animate-fade-in before:content-[""] before:absolute before:top-[50%] before:right-[100%] before:-translate-y-[50%] before:border-8 before:border-transparent before:border-r-white';
        tooltip.style.left = targetCoords.right + 10 + 'px';
        tooltip.style.top = targetCoords.top - 20 + 'px';
        tooltip.textContent =
          'Oops! You’re dropping this component off the Canvas—please drop it inside.';

        event.target.appendChild(tooltip);

        setTimeout(() => {
          event.target.removeChild(tooltip);
        }, 3000);
      }

      if (dummyDiv) {
        // If the component is dropped outside of the studio canvas, animate it to the initial position
        if (!event?.dropzone?.target || !droppedInCanvasArea) {
          const targetCoords = event?.target?.getBoundingClientRect();
          // Add transition CSS
          dummyDiv.style.transition = 'all 0.5s ease-in-out';
          dummyDiv.style.top = targetCoords.top + 'px';
          dummyDiv.style.left = targetCoords.left + 'px';
          dummyDiv.style.transform = 'scale(0.5)';

          // Remove the div after animation completes
          setTimeout(() => {
            document.body.removeChild(dummyDiv);
            dummyDiv = null;
          }, 500); // Match this with the transition duration
        } else {
          document.body.removeChild(dummyDiv);
          dummyDiv = null;
        }
      }
    },
  });

  interact('#workspace-container').dropzone({
    // Only accept elements matching this CSS selector
    accept: 'a[smt-component]',
    // Listen for drop related events
    ondrop: async function (event) {
      dummyDiv.style.pointerEvents = 'none';
      const droppedInCanvasArea = isDroppedInCanvasArea(event);
      if (workspace?.locked || !droppedInCanvasArea) return false;

      // Add new restriction check for web tools
      const RESTRICTED_WEB_TOOLS = new Set(['WebSearch', 'WebScrape']);
      const componentName = event.relatedTarget.getAttribute('smt-component');

      if (RESTRICTED_WEB_TOOLS.has(componentName) && !isLegacyPlan()) {
        renderRestrictedAccessModalWebTools();
        return;
      }

      // Check if it's an integration (has template ID)
      const templateId = event.relatedTarget.getAttribute('smt-template-id');
      const isPaidPlan = workspace?.userData?.subscription?.plan?.paid;
      const cpName = event.relatedTarget.getAttribute('smt-component');

      const RAG_COMPONENTS = new Set([
        'DataSourceLookup',
        'DataSourceIndexer',
        'DataSourceCleaner',
      ]);
      if (RAG_COMPONENTS.has(cpName) && !isPremiumPlan()) {
        renderCompUpgradeModal({
          msg: `RAG search, remember, and forget functions are not available on your plan.
               {{Upgrade}} to enable RAG capabilities and much more.`,
          title: 'Unlock RAG Components',
          analytics: {
            page_url: '/builder',
            source: 'drag and drop rag component',
          },
        });
        return;
      }
      if (cpName === 'ComputerUse' && !isEnterprisePlan()) {
        renderCompUpgradeModal({
          msg: `Computer Use is not available on your plan.
               {{Upgrade}} to enable Computer Use and much more.`,
          title: 'Unlock Computer Use',
          analytics: {
            page_url: '/builder',
            source: 'drag and drop computer use component',
          },
        });
        return;
      }

      Analytics.track('app_component_used', {
        name: event.relatedTarget.getAttribute('smt-component'),
        type: !!templateId ? 'integration' : 'component',
      });
      const workspaceDom: any = workspace.domElement;
      const rect = workspaceDom.getBoundingClientRect();
      const e = event.dragEvent;
      const properties: any = { sender: event.relatedTarget };
      const scale = workspace.scale;
      const x = Math.round((e.clientX - rect.x) / scale);
      const y = Math.round((e.clientY - rect.y) / scale);

      if (!properties.top) properties.top = y - 20 + 'px';
      if (!properties.left) properties.left = x - 85 + 'px';

      //is this a template ?
      if (templateId) {
        const jsonData = JSON.parse(JSON.stringify(workspace.componentTemplates[templateId]));
        jsonData.templateInfo = jsonData.templateInfo || {};
        jsonData.templateInfo.id = templateId;
        if (jsonData.name && jsonData.componentName) {
          console.log('pasting component template');
          //this is a template
          const properties = {
            uid: 'TPL' + uid(),
            top: workspace.mouseCoords.y + 'px',
            left: workspace.mouseCoords.x + 'px',
            sender: null,
            title: jsonData.templateInfo?.name || jsonData.name,
            description: jsonData.templateInfo?.description || jsonData.description,
            template: jsonData,
          };

          const componentElement = await workspace.addComponent(
            jsonData.componentName,
            properties,
            true,
          );
          const component = componentElement._control;
          for (let entry in jsonData.data) {
            component.data[entry] = jsonData.data[entry];
          }

          await delay(100);
          component.checkSettings();
          workspace.refreshComponentSelection(componentElement);
          return;
        }
      } else {
        const componentName = event.relatedTarget.getAttribute('smt-component');
        const component = await workspace.addComponent(componentName, properties, true);
        workspace.refreshComponentSelection(component);
      }
    },
  });

  interact('#right-sidebar,#embodiment-sidebar,#agent-settings-sidebar')
    .resizable({
      margin: 5,
      // Enable resize from right edge; preset cursor styles
      edges: { left: true, right: false, bottom: false, top: false },

      // Set min and max width
      modifiers: [
        (<any>interact).modifiers!.restrictSize({
          min: { width: 280 },
          max: (x, y, element) => {
            const workspaceRect = document
              .querySelector('#workspace-container')
              ?.getBoundingClientRect();
            const leftSidebarRect = document
              .querySelector('#left-sidebar-container')
              ?.getBoundingClientRect();

            if (!workspaceRect || !leftSidebarRect) {
              return { width: 280 }; // Fallback to min-width
            }

            const minCanvasSpace = 420;
            const responsiveBreakpoint = 768;
            const maxRightSidebarWidth = 1000;

            // Calculate max width ensuring minimum canvas space is preserved
            const maxWidthForCanvas =
              element.element.getBoundingClientRect().right -
              (leftSidebarRect.right + minCanvasSpace);

            // On large screens, sidebar shouldn't be more than half the workspace
            if (workspaceRect.width >= responsiveBreakpoint) {
              const halfWorkspace = workspaceRect.width / 2;
              return { width: Math.min(maxWidthForCanvas, halfWorkspace, maxRightSidebarWidth) };
            }

            return { width: maxWidthForCanvas };
          },
        }),
      ],

      inertia: true,
    })
    .on('resizestart', function (event) {
      document.body.classList.add('select-none');
      event.target.classList.add('no-transition');
      event.target.classList.add('pointer-events-none');
    })
    .on('resizemove', function (event) {
      event.target.style.width = event.rect.width + 'px';
    })
    .on('resizeend', function (event) {
      document.body.classList.remove('select-none');
      event.target.classList.remove('no-transition');
      event.target.classList.remove('pointer-events-none');
      localStorage.setItem(`${event.target.id}-width`, event.target.style.width);
    });

  // temporary debug console height: move to a better place
  interact('#bottom-bar')
    .resizable({
      margin: 5,
      edges: { left: false, right: false, bottom: false, top: true },

      // Set min and max width
      modifiers: [
        (<any>interact).modifiers!.restrictSize({
          min: { height: 300 },
          max: { height: 600 },
        }),
      ],

      inertia: true,
    })
    .on('resizestart', function (event) {
      document.body.classList.add('select-none');
      event.target.classList.add('no-transition');
      event.target.classList.add('pointer-events-none');
    })
    .on('resizemove', function (event) {
      event.target.style.height = event.rect.height + 'px';
    })
    .on('resizeend', function (event) {
      document.body.classList.remove('select-none');
      event.target.classList.remove('no-transition');
      event.target.classList.remove('pointer-events-none');

      localStorage.setItem(`debug-console-height`, event.target.style.height);
    });
}

function renderUpgradeModal() {
  Analytics.track('upgrade_impression', {
    page_url: '/builder',
    source: 'adding integrations to the agent',
  });

  // Show upgrade modal using the existing component
  twEditValuesWithCallback(
    {
      title: '',
      fields: {},
      content: `
          <div class="text-center">
            <h2 class="text-2xl font-medium">Access More Integrations</h2>
            <div class="flex items-center gap-4 my-4">
              <p class="text-sm text-[#2F2F2F] w-3/4 mx-auto">
                Upgrade your plan to access this integration and unlock more powerful features.
              </p>
            </div>
          </div>
        `,
      actions: [
        {
          label: 'Upgrade',
          cssClass:
            'bg-primary-100 text-white rounded-md px-4 py-1.5 hover:opacity-75 cursor-pointer w-full',
          callback: (_, dialog) => {
            Analytics.track('upgrade_click', {
              page_url: '/builder',
              source: 'adding integrations in the agent',
            });
            const upgradeUrl = config.env.IS_DEV ? '/plans' : PRICING_PLAN_REDIRECT;
            window.open(upgradeUrl, '_blank');
            closeTwDialog(dialog);
          },
        },
      ],
      onCloseClick: (_, dialog) => {
        closeTwDialog(dialog);
      },
    },
    'auto',
    'auto',
    'none',
    'auto',
    '450px',
  );
}

function renderCompUpgradeModal({
  msg,
  title,
  analytics = {
    page_url: '/builder',
    source: '',
  },
}: {
  msg: string;
  title: string;
  analytics: {
    source: string;
    page_url: string;
  };
}) {
  Analytics.track('upgrade_impression', {
    page_url: analytics.page_url,
    source: analytics.source,
  });

  // replace the {{Upgrade}} with the link to the plans page
  msg = msg.replace(
    '{{Upgrade}}',
    `<a href="/plans"
                 target="_blank"
                 class="text-blue-600 underline hover:opacity-75"
                 onclick="window.analytics?.track('upgrade_click', {
                   page_url: '/builder',
                   source: 'restoring previous version'
                 })">
                Upgrade</a>`,
  );

  twEditValuesWithCallback(
    {
      title: '',
      fields: {},
      content: `
        <div class="text-center px-4 py-6">
          <h2 class="text-2xl font-bold text-gray-800 mb-2">
            ${title}
          </h2>

          <div class="mb-6">
            <p class="text-base text-gray-600 leading-relaxed mx-auto max-w-md">
              ${msg}
            </p>
          </div>
        </div>
      `,
      actions: [],
      onCloseClick: (_, dialog) => {
        closeTwDialog(dialog);
      },
    },
    'auto',
    'auto',
    'none',
    'auto',
    '520px', // Slightly wider for better text layout
  );
}

function setupCollapseAllButton() {
  const collapseAllBtn = document.getElementById('collapse-all-btn');

  collapseAllBtn?.addEventListener('click', () => {
    const containers = document.querySelectorAll(
      '#left-sidebar-integrations-menu .items-group-container',
    );

    containers.forEach((container: HTMLElement) => {
      // Using Alpine.js to set the open state to false
      if ((window as any).Alpine) {
        (window as any).Alpine.evaluate(container, 'open = false');
      }
    });
  });
}

function setupPrettifyButton() {
  const prettifyBtn: HTMLButtonElement = document.querySelector('#cmp-prettify-btn');
  if (prettifyBtn) {
    prettifyBtn.onclick = async function () {
      if (workspace?.locked) return;
      console.log('Sorting agent ...');
      await sortAgent();
      console.log('Agent sorted');
    };
  }
}

function setupZoomInButton() {
  const zoomInBtn: HTMLButtonElement = document.querySelector('#cmp-zoom-in-btn');
  if (zoomInBtn) {
    zoomInBtn.onclick = function () {
      if (workspace?.locked) return;
      // Get current scale and increase by 0.1, with a maximum of 2.0
      const currentScale = workspace.scale || 1;
      const newScale = Math.min(currentScale + 0.1, 2.0);
      workspace.zoomTo(newScale);
    };
  }
}

function setupZoomOutButton() {
  const zoomOutBtn: HTMLButtonElement = document.querySelector('#cmp-zoom-out-btn');
  if (zoomOutBtn) {
    zoomOutBtn.onclick = function () {
      if (workspace?.locked) return;
      // Get current scale and decrease by 0.1, with a minimum of 0.3
      const currentScale = workspace.scale || 1;
      const newScale = Math.max(currentScale - 0.1, 0.3);
      workspace.zoomTo(newScale);
    };
  }
}

function isPremiumPlan() {
  const planName: string = workspace?.userData?.subscription?.plan?.name ?? '';
  const FREE_PLANS = new Set(['SmythOS Free', 'Builder']);
  return !FREE_PLANS.has(planName);
}

function isEnterprisePlan() {
  const ENTERPRISE_PLANS = new Set(V4_ENTERPRISE_PLANS);
  return ENTERPRISE_PLANS.has(workspace?.userData?.subscription?.plan?.name ?? '');
}

function isLegacyPlan() {
  const planName: string = workspace?.userData?.subscription?.plan?.name ?? '';
  // Return true if the plan is NOT in LEGACY_PLANS,
  // is NOT a custom plan, and is NOT "SmythOS Free"
  return (
    (!LEGACY_PLANS.has(planName) || planName === 'SmythOS Free') &&
    !planName.toLowerCase().includes('custom')
  );
}

function renderRestrictedAccessModal(feature: string) {
  Analytics.track('upgrade_impression', {
    page_url: '/builder',
    source: `adding ${feature}`,
  });

  const modalContent = {
    'Hugging Face': {
      title: 'Unlock Hugging Face Models',
      message: 'Access to Hugging Face models are not available on your plan.',
    },
    OpenAI: {
      title: 'Unlock OpenAPI Models',
      message:
        'Adding models using OpenAPI specifications is not available on your plan. Please upgrade to startup or above to continue.',
      minimumPlan: 'to startup or above',
    },
  }[feature];

  twEditValuesWithCallback(
    {
      title: '',
      fields: {},
      content: `
        <div class="text-center px-4 py-6">
          <h2 class="text-2xl font-bold text-gray-800 mb-2">
            ${modalContent.title}
          </h2>

          <div class="mb-6">
            <p class="text-base text-gray-600 leading-relaxed mx-auto max-w-md">
              ${modalContent.message}
              <a href="/plans"
                target="_blank"
                class="text-blue-600 underline hover:opacity-75"
                onclick="window.analytics?.track('upgrade_click', {
                  page_url: '/builder',
                  source: 'adding ${feature}'
                })">
                Upgrade ${modalContent?.minimumPlan || ''}
              </a> to import and add third party models.
            </p>
          </div>
        </div>
      `,
      actions: [],
      onCloseClick: (_, dialog) => {
        closeTwDialog(dialog);
      },
    },
    'auto',
    'auto',
    'none',
    'auto',
    '500px',
  );
}

function renderRestrictedAccessModalWebTools() {
  Analytics.track('upgrade_impression', {
    page_url: '/builder',
    source: 'adding web tools',
  });

  twEditValuesWithCallback(
    {
      title: '',
      fields: {},
      content: `
        <div class="text-center px-4 py-6">
          <h2 class="text-2xl font-bold text-gray-800 mb-2">
            Unlock Web Access
          </h2>

          <div class="mb-6">
            <p class="text-base text-gray-600 leading-relaxed mx-auto max-w-md">
              Webscrape and Websearch components are not available on legacy plans.
              <a href="/plans"
                target="_blank"
                class="text-blue-600 underline hover:opacity-75"
                onclick="window.analytics?.track('upgrade_click', {
                  page_url: '/builder',
                  source: 'adding web tools'
                })">
                Upgrade
              </a> to continue using these features and much more.
            </p>
          </div>
        </div>
      `,
      actions: [],
      onCloseClick: (_, dialog) => {
        closeTwDialog(dialog);
      },
    },
    'auto',
    'auto',
    'none',
    'auto',
    '500px',
  );
}

function setupComponentsCollapseAllButton() {
  const collapseAllBtn = document.getElementById('components-collapse-all-btn');

  collapseAllBtn?.addEventListener('click', () => {
    const containers = document.querySelectorAll('#left-menu .items-group-container');

    containers.forEach((container: HTMLElement) => {
      // Using Alpine.js to set the open state to false
      if ((window as any).Alpine) {
        (window as any).Alpine.evaluate(container, 'open = false');
      }
    });
  });
}
