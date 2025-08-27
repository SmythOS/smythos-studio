declare var Metro, $;
import { EXTENSION_COMP_NAMES } from '../config';
import { DialogAction, DialogActions, DialogEvents, ExtensionCompNames } from '../types';
import {
  addExtension,
  delay,
  dispatchSubmitEvent,
  getDataByCompName,
  getExtensionCompLabel,
  getExtensionManualFieldDescription,
  getExtensionManualFieldLabel,
  getExtensionsByCompName,
  renderExtensions,
  renderExtensionsSkeleton,
  searchExtensions,
} from '../utils';
import { createForm, handleTemplateVars, readFormValidation, readFormValues } from './form/';

import { errorToast } from '@src/shared/components/toast';
import yaml from 'js-yaml';
import { debounce } from 'lodash-es';
import { EMBODIMENT_DESCRIPTIONS } from '../../shared/constants/general';
import config from '../config';
import { openLLMEmbodiment } from '../pages/builder/llm-embodiment';
import { PostHog } from '../services/posthog';
import { smythValidator } from './form/';
import { getIconFormEmbTab, rightSidebarTitle } from './right-sidebar-title';

// Add this near the top of the file with other declarations
const embodimentHandlers = {
  openEmbodimentDialog: null,
  openChatGPTEmbodiment: null,
  openPostmanEmbodiment: null,
  openAlexaEmbodiment: null,
  openChatbotEmbodiment: null,
  openAPIEmbodiment: null,
  openFormPreviewEmbodiment: null,
  openMCPEmbodiment: null,
};

// Add this export to allow setting the handlers
export function setEmbodimentHandlers(handlers) {
  Object.assign(embodimentHandlers, handlers);
}

const hotkeyBinding = {};

const uiServer = config.env.UI_SERVER;

let rightSidebarStyle = '';
let embodimentSidebarStyle = '';
function resetRightSidebar(selector) {
  const rightSidebar: any = document.querySelector(selector);

  //rightSidebar.className = 'z-10 right-sidebar ';
  rightSidebar.classList.add('hidden');
  const sidebarTitle = rightSidebar.querySelector('.title');
  const sidebarContent = rightSidebar.querySelector('.content');
  const sidebarActions = rightSidebar.querySelector('.actions .action-content');
  const titleLeftButton = rightSidebar.querySelector('.title-left-buttons');
  const titleRightButton = rightSidebar.querySelector('.title-right-buttons');
  const actionButton = rightSidebar.querySelector('.action-buttons');

  [...rightSidebar.querySelectorAll('button.btn-action')].forEach((btn) => {
    btn.remove();
  });

  sidebarTitle.innerHTML = '';
  sidebarContent.innerHTML = '';
  sidebarActions && (sidebarActions.innerHTML = '');
  rightSidebar.data = {};

  titleLeftButton?.querySelectorAll('button').forEach((btn) => {
    btn.classList.add('hidden');
    btn.onclick = null;
  });
  titleRightButton?.querySelectorAll('button').forEach((btn) => {
    btn.classList.add('hidden');
    btn.onclick = null;
  });
  actionButton?.querySelectorAll?.('button')?.forEach((btn) => {
    btn.classList.add('hidden');
    btn.onclick = null;
  });
}

export async function createRightSidebar(title?, content?, actions?, trActions?, tlActions?) {
  resetRightSidebar('#right-sidebar');

  const embodimentSidebar: any = document.querySelector('#embodiment-sidebar');

  const rightSidebar: any = document.querySelector('#right-sidebar');
  const agentSettingsSidebar = document.querySelector('#agent-settings-sidebar');
  agentSettingsSidebar.classList.remove('hidden');
  rightSidebar.classList.remove('hidden');

  // Remove setting icon selection, when right sidebar is created
  window.dispatchEvent(
    new CustomEvent('sidebarStateChanged', {
      detail: {
        rightSidebarOpen: false,
        isSidebarOpen: window?.localStorage?.getItem('sidebarOpen') === 'true', // Keep the left sidebar open, on right sidebar toggle except for agent settings
        currentSidebarTab:
          getCurrentSidebarTab() || window?.localStorage?.getItem('currentSidebarTab'),
      },
    }),
  );

  const sidebarTitle = rightSidebar.querySelector('.title');
  const sidebarContent = rightSidebar.querySelector('.content');
  const sidebarActions = rightSidebar.querySelector('.actions .action-content');
  const titleRightActions = rightSidebar.querySelector('.title-right-buttons');
  const titleLeftActions = rightSidebar.querySelector('.title-left-buttons');
  const closeBtn: HTMLButtonElement = rightSidebar.querySelector('.close-btn');
  const saveBtn: HTMLButtonElement = rightSidebar.querySelector('.save-btn');

  if (title) sidebarTitle.innerHTML = title;
  if (content) sidebarContent.innerHTML = content;
  if (closeBtn) {
    closeBtn.onclick = async () => {
      resetEmbodimentButtons();
      closeRightSidebar();
    };
  }
  if (tlActions) {
    for (let btn in tlActions) {
      const action = tlActions[btn];
      const button = document.createElement('button');
      button.setAttribute(
        'class',
        `button btn-action h-10 action-${btn} items-center px-2 py-1 text-sm font-medium text-[#757575] bg-transparent focus:z-10 ` +
          (action.cls || ''),
      );
      button.innerHTML = action.label || btn;

      // Add data attributes directly to the button
      if (btn === 'help') {
        button.setAttribute('data-tooltip-target', 'tooltip-help-sidebar');
        button.setAttribute('data-tooltip-placement', 'left');

        // Create and append tooltip
        const tooltip = document.createElement('div');
        tooltip.id = 'tooltip-help-sidebar';
        tooltip.setAttribute('role', 'tooltip');
        tooltip.className =
          'tooltip absolute z-10 inline-block text-sm w-max bg-black shadow-lg text-white py-2 px-4 rounded-lg opacity-0 invisible';
        tooltip.style.fontFamily = 'Inter, sans-serif';
        tooltip.style.transform = 'translate3d(-100%, 0px, 0px)';
        if (action.tooltip) {
          tooltip.style.maxWidth = '200px';
        }
        tooltip.textContent = action.tooltip || 'Help';

        // Add event listeners to the button
        button.addEventListener('mouseenter', () => {
          tooltip.classList.remove('invisible', 'opacity-0');
          tooltip.classList.add('visible', 'opacity-100');
        });

        button.addEventListener('mouseleave', () => {
          tooltip.classList.add('invisible', 'opacity-0');
          tooltip.classList.remove('visible', 'opacity-100');
        });

        titleLeftActions.appendChild(button);
        titleLeftActions.appendChild(tooltip);
      } else {
        if (action.click) button.addEventListener('click', action.click);
        titleLeftActions.appendChild(button);
      }
    }
  }

  if (trActions) {
    for (let btn in trActions) {
      const action = trActions[btn];
      const button = document.createElement('button');
      const cssClass =
        action.class ||
        action.cls ||
        'items-center px-2 py-2 text-sm font-medium text-[#757575] bg-transparent';
      button.setAttribute('class', `button btn-action h-10 action-${btn}  ${cssClass}`);
      button.innerHTML = action.label || btn;
      if (action.click) button.addEventListener('click', action.click);

      titleRightActions.appendChild(button);
    }
  }

  if (saveBtn) {
    saveBtn.onclick = async () => {
      closeRightSidebar();
    };
  }

  if (actions) {
    for (let btn in actions) {
      const action = actions[btn];
      const button = document.createElement('button');
      const cssClass =
        action.class ||
        action.cls ||
        'items-center px-4 py-2 text-sm font-medium text-gray-900 bg-transparent hover:bg-gray-400 hover:text-white';
      button.setAttribute('class', `button btn-action h-12 action-${btn} ${cssClass}`);
      button.innerHTML = action.label || btn;
      if (action.click) button.addEventListener('click', action.click);

      if (action?.hint) {
        button.setAttribute('data-role', 'hint');
        button.setAttribute('data-hint-text', action.hint);
        button.setAttribute('data-hint-position', action?.hintPosition || 'top');
      }

      sidebarActions.appendChild(button);
    }
  }

  embodimentSidebar.classList.add('hidden');
  //embodimentSidebar.style.width = '';

  //rightSidebar.className = 'z-10 right-sidebar ';
  if (!rightSidebar.closest('.sidebar-container').classList.contains('open'))
    rightSidebar.closest('.sidebar-container').classList.add('open');

  return rightSidebar;
}

export async function closeRightSidebar() {
  const rightSidebar: any = document.querySelector('#right-sidebar');
  rightSidebar.closest('.sidebar-container').classList.remove('open');
  await delay(150);

  const embodimentSidebar: any = document.querySelector('#embodiment-sidebar');
  embodimentSidebar.classList.add('hidden');

  const agentSettingsSidebar = document.querySelector('#agent-settings-sidebar');
  agentSettingsSidebar.classList.add('hidden');

  rightSidebar.classList.remove('hidden');

  resetRightSidebar('#right-sidebar');
  // Remove setting icon selection, when right sidebar is closed
  window.dispatchEvent(
    new CustomEvent('sidebarStateChanged', {
      detail: {
        rightSidebarOpen: false,
        isSidebarOpen: window?.localStorage?.getItem('sidebarOpen') === 'true', // Keep the left sidebar open, on right sidebar toggle except for agent settings
        currentSidebarTab:
          getCurrentSidebarTab() || window?.localStorage?.getItem('currentSidebarTab'),
      },
    }),
  );
}
export function openRightSidebar() {
  const rightSidebar = document.querySelector('#right-sidebar');
  const embodimentSidebar: any = document.querySelector('#embodiment-sidebar');
  const agentSettingsSidebar = document.querySelector('#agent-settings-sidebar');
  rightSidebar.classList.add('right-sidebar');
  rightSidebar.classList.remove('hidden');
  embodimentSidebar.classList.add('hidden');
  agentSettingsSidebar.classList.add('hidden');
  //embodimentSidebar.style.width = '';
  rightSidebar.closest('.sidebar-container').classList.add('open');
  return rightSidebar;
}

function genericToEmbTab(embodimentSidebar) {
  const activeTab = embodimentSidebar.querySelector(
    '.tab-container nav button.border-b-2.border-v2-blue',
  ) as HTMLButtonElement;
  if (activeTab) {
    activeTab.click();
  } else {
    const chatTab = embodimentSidebar.querySelector(
      '[data-embodiment-type="chat"]',
    ) as HTMLButtonElement;
    if (chatTab) {
      chatTab.click();
    }
  }
}

function closeEmbSidebarOnTestClick(embodimentSidebar) {
  const closeBtn = embodimentSidebar.querySelector('.close-btn') as HTMLButtonElement;
  if (closeBtn) {
    closeBtn.click();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const chatbotButton = document.getElementById('btn-emb-chatbot-main');
  if (chatbotButton) {
    chatbotButton.addEventListener('click', async (event) => {
      PostHog.track('test_embodiment_click', {
        position: 'top right of builder dropdown',
      });

      const sidebarContainer = document.querySelector('.sidebar-container');
      const embodimentSidebar = document.querySelector('#embodiment-sidebar');
      const embodimentSidebarContent = embodimentSidebar.querySelector('.dialog-content');
      const rightSidebar = document.querySelector('#right-sidebar');
      const isOpen = sidebarContainer.classList.contains('open');
      const isCurrSidebarEmbodiment = !embodimentSidebar.classList.contains('hidden');

      // Check if nav buttons already exist
      const nav = embodimentSidebar.querySelector('.tab-container nav');
      let isInitialized = nav && nav.querySelectorAll('button').length > 0;

      // Check for generic content
      const genericContent = embodimentSidebarContent.querySelector('.generic-content');
      const isGenericContentVisible =
        genericContent && !genericContent.classList.contains('hidden');

      // Determine initialization state
      if (embodimentSidebarContent.children.length < 1) {
        isInitialized = false;
      } else if (embodimentSidebarContent.children.length === 1 && isGenericContentVisible) {
        // If we only have generic content visible, we're not fully initialized
        isInitialized = false;
      } else if (embodimentSidebar.querySelector('.dialog-content').children.length > 1) {
        isInitialized = true;
      }
      // If sidebar is open and showing embodiment content
      if (isOpen && isInitialized) {
        if (isCurrSidebarEmbodiment && !isGenericContentVisible) {
          closeEmbSidebarOnTestClick(embodimentSidebar);
        } else {
          await openEmbodimentSidebar();
        }

        if (isGenericContentVisible) {
          genericToEmbTab(embodimentSidebar);
        }
      } else {
        if (!isInitialized) {
          // Initialize if not initialized or if showing generic content
          await embodimentHandlers.openChatbotEmbodiment?.();
          genericToEmbTab(embodimentSidebar);
        } else {
          await openEmbodimentSidebar();
          genericToEmbTab(embodimentSidebar);
        }
      }
      event.preventDefault();
      event.stopPropagation();
    });
  }
});

export async function createEmbodimentSidebar(title?, content?, actions?, tooltipText?) {
  // resetRightSidebar('#embodiment-sidebar');

  const rightSidebar: any = document.querySelector('#right-sidebar');
  const embodimentSidebar: any = document.querySelector('#embodiment-sidebar');
  const agentSettingsSidebar = document.querySelector('#agent-settings-sidebar');
  agentSettingsSidebar.classList.add('hidden');
  embodimentSidebar.classList.remove('hidden');

  const sidebarTitle = embodimentSidebar.querySelector('.title');

  // Add tab container after title
  const tabContainer = embodimentSidebar.querySelector('.tab-container');
  const nav = embodimentSidebar.querySelector('.tab-container nav');
  const convertTitleToKeys = {
    'LLM API / AgentLLM': 'Test as LLM',
    Chatbot: 'Test as Chat',
    api: 'Test as API',
    'Custom GPT': 'Test in ChatGPT',
    'Postman Integration': 'Test in Postman',
    LLM: 'Test as LLM',
  };
  let currentKey = null;
  // Create tabs from EMBODIMENT_DESCRIPTIONS
  Object.entries(EMBODIMENT_DESCRIPTIONS).forEach(([key, desc]) => {
    const sidebarTitleText = convertTitleToKeys[key] || key;
    // Skip empty descriptions, agent_skill, or agentllm
    if (
      !desc.title ||
      // key === 'agent_skill' ||
      key.toLowerCase() === 'agentllm' ||
      desc.title.toLowerCase() === 'agentllm'
    ) {
      return;
    }

    if (desc.title?.toLowerCase() === title?.toLowerCase()) {
      currentKey = key;
      embodimentSidebar.setAttribute('openedtab', key?.toLowerCase());
    }

    const displayHeading = getDisplayHeading(key, desc.title);
    const navText = getNavText(key, desc.title);
    if (!displayHeading) {
      return; // Skip if no display heading (like for agentllm)
    }

    // Check if a button with this heading or key already exists
    const existingButton =
      nav.querySelector(`[data-embodiment-type="${key}"]`) ||
      Array.from(nav.querySelectorAll('button')).find(
        (btn) => (btn as HTMLButtonElement).textContent === navText,
      );

    if (existingButton) {
      return; // Skip if button already exists
    }

    const button = document.createElement('button');
    button.className = `inline-flex items-center first:ml-0 mx-4 pt-2 pb-1 mb-1 text-sm font-medium text-gray-500 hover:text-gray-700 ${
      key === 'chat' ? 'border-b-2 border-v2-blue' : ''
    }`;
    button.setAttribute('aria-current', 'page');
    button.setAttribute('data-embodiment-type', key);
    button.textContent = navText;

    // Add click handler
    button.addEventListener('click', async () => {
      sidebarTitle.querySelector('.title-icon')?.classList?.remove('hidden');
      tabContainer?.classList?.remove('hidden');
      // Remove active state from all tabs
      nav.querySelectorAll('button').forEach((btn) => {
        btn.classList.remove('text-gray-900', 'border-b-2', 'border-v2-blue');
        btn.classList.add('text-gray-500');
      });

      // Add active state to clicked tab
      button.classList.remove('text-gray-500');
      button.classList.add('text-gray-900', 'border-b-2', 'border-v2-blue');

      embodimentSidebar.setAttribute('openedtab', key?.toLowerCase());
      // Trigger corresponding embodiment action
      switch (key.toLowerCase()) {
        case 'llm':
          if (window.workspace) {
            PostHog.track('agentLLM_embodiment_click', {
              position: 'embodiment sidebar tab',
            });
            openLLMEmbodiment(window.workspace, embodimentHandlers.openEmbodimentDialog);
          }
          break;
        case 'api':
          PostHog.track('api_embodiment_click', {
            position: 'embodiment sidebar tab',
          });
          embodimentHandlers.openAPIEmbodiment?.();
          break;
        case 'chat':
          const chatContCls = convertTitleToClass(EMBODIMENT_DESCRIPTIONS.chat.title);
          if (!sidebarContent.querySelector(`.${chatContCls}`)) {
            PostHog.track('chatbot_embodiment_click', {
              position: 'embodiment sidebar tab',
            });
            embodimentHandlers.openChatbotEmbodiment?.();
          } else {
            hideAllChildrenExcept(sidebarContent, chatContCls);

            // Update the title when showing existing chat content
            const icon = sidebarTitle.querySelector('.title-icon');
            const title = sidebarTitle.querySelector('#embodiment-sidebar-title');
            if (title) {
              title.innerHTML =
                convertTitleToKeys[EMBODIMENT_DESCRIPTIONS.chat.title] ||
                EMBODIMENT_DESCRIPTIONS.chat.title;
            }
            if (icon) {
              icon.innerHTML = getIconFormEmbTab(EMBODIMENT_DESCRIPTIONS.chat.title);
            }

            const allActions = sidebarTitle?.querySelector?.('.actions .action-content');
            allActions &&
              toggleChildren(allActions, `action-btn-emb.${chatContCls}-btn`, 'hidden', false);
          }
          break;
        case 'chatgpt':
          PostHog.track('chatgpt_embodiment_click', {
            position: 'embodiment sidebar tab',
          });
          embodimentHandlers.openChatGPTEmbodiment?.();
          break;
        case 'postman':
          PostHog.track('postman_embodiment_click', {
            position: 'embodiment sidebar tab',
          });
          embodimentHandlers.openPostmanEmbodiment?.();
          break;
        case 'alexa':
          PostHog.track('alexa_embodiment_click', {
            position: 'embodiment sidebar tab',
          });
          embodimentHandlers.openAlexaEmbodiment?.();
          break;
        case 'agent_skill':
          const agentSkillContCls = convertTitleToClass(EMBODIMENT_DESCRIPTIONS.agent_skill.title);
          PostHog.track('form_preview_embodiment_click', {
            position: 'embodiment sidebar tab',
          });
          if (!sidebarContent.querySelector(`.${agentSkillContCls}`)) {
            embodimentHandlers.openFormPreviewEmbodiment?.();
          } else {
            hideAllChildrenExcept(sidebarContent, agentSkillContCls);
            const icon = sidebarTitle.querySelector('.title-icon');
            const title = sidebarTitle.querySelector('#embodiment-sidebar-title');
            if (title) {
              title.innerHTML =
                convertTitleToKeys[EMBODIMENT_DESCRIPTIONS.agent_skill.title] ||
                EMBODIMENT_DESCRIPTIONS.agent_skill.title;
            }
            if (icon) {
              icon.innerHTML = getIconFormEmbTab(EMBODIMENT_DESCRIPTIONS.agent_skill.title);
            }
          }
          break;

        case 'mcp':
          PostHog.track('mcp_embodiment_click', {
            position: 'embodiment sidebar tab',
          });
          embodimentHandlers.openMCPEmbodiment?.();
          break;
      }
    });

    nav.appendChild(button);
  });

  if (currentKey) {
    const navButtons = nav.querySelectorAll('button');
    navButtons.forEach((button) => {
      button.classList.remove('text-gray-900', 'border-b-2', 'border-v2-blue');
      button.classList.add('text-gray-500');
      if (button.getAttribute('data-embodiment-type') === currentKey) {
        button.classList.add('text-gray-900', 'border-b-2', 'border-v2-blue');
        button.classList.remove('text-gray-500');
      }
    });
  }

  tabContainer.appendChild(nav);

  const sidebarContent = embodimentSidebar.querySelector('.content');
  const contentCls = convertTitleToClass(title) || 'generic-content';

  if (!sidebarContent.querySelector(`.${contentCls}`)) {
    const newDiv = document.createElement('div');
    newDiv.classList.add(contentCls, 'h-full');
    sidebarContent.appendChild(newDiv);
  }

  //add class hidden to all children of sidebarContent except with class contentCls
  hideAllChildrenExcept(sidebarContent, contentCls);
  // const sidebarActions = embodimentSidebar.querySelector('.actions .action-content');

  let sidebarActions;

  // Create title with tooltip if tooltipText is provided
  if (title.trim()) {
    sidebarTitle.querySelector('.title-icon')?.classList?.remove('hidden');
    tabContainer?.classList?.remove('hidden');

    // Determine which icon to use based on title
    if (!sidebarTitle.querySelectorAll('#embodiment-sidebar-title').length) {
      const titleHTML = rightSidebarTitle(convertTitleToKeys[title] || title, tooltipText);
      sidebarTitle.innerHTML = titleHTML;

      // Add tooltip event listeners if tooltip exists
      if (tooltipText) {
        const infoIcon = sidebarTitle.querySelector('[data-tooltip-target]');
        const tooltip = sidebarTitle.querySelector('#title-tooltip');

        infoIcon?.addEventListener('mouseenter', () => {
          tooltip?.classList.remove('invisible', 'opacity-0');
          tooltip?.classList.add('visible', 'opacity-100');
        });

        infoIcon?.addEventListener('mouseleave', () => {
          tooltip?.classList.add('invisible', 'opacity-0');
          tooltip?.classList.remove('visible', 'opacity-100');
        });
      }
    } else {
      if (sidebarTitle.querySelector('#embodiment-sidebar-title')) {
        sidebarTitle.querySelector('#embodiment-sidebar-title').innerHTML =
          convertTitleToKeys[title] || title;
      }
      if (sidebarTitle.querySelector('.title-icon')) {
        sidebarTitle.querySelector('.title-icon').innerHTML = getIconFormEmbTab(title);
      }
    }
  } else {
    if (!sidebarTitle.querySelector('#embodiment-sidebar-title')) {
      const titleHTML = rightSidebarTitle(convertTitleToKeys[title] || title, tooltipText);
      sidebarTitle.innerHTML = titleHTML;
    }
    sidebarTitle.querySelector('.title-icon')?.classList?.add('hidden');
    tabContainer?.classList?.add('hidden');
  }
  sidebarActions = sidebarTitle?.querySelector?.('.actions .action-content');

  const closeBtn: HTMLButtonElement = sidebarTitle.querySelector('.close-btn');
  const saveBtn: HTMLButtonElement = embodimentSidebar.querySelector('.save-btn');
  if (content) sidebarContent.querySelector(`.${contentCls}`).innerHTML = content;
  if (closeBtn) {
    closeBtn.onclick = async () => {
      closeEmbodimentSidebar();
    };
  }
  if (saveBtn) {
    saveBtn.onclick = async () => {
      closeEmbodimentSidebar();
    };
  }

  sidebarActions && toggleChildren(sidebarActions, 'action-btn-emb', 'hidden', true);
  if (actions) {
    for (let btn in actions) {
      if (!sidebarActions.querySelector(`.${contentCls}-btn`)) {
        const action = actions[btn];
        const button = document.createElement('button');

        // Add tooltip attributes if tooltip is provided
        if (action.tooltip) {
          const tooltipId = `tooltip-${btn.toLowerCase()}-${Date.now()}`;
          button.setAttribute('data-tooltip-target', tooltipId);
          button.setAttribute('data-tooltip-placement', action.tooltipPlacement || 'left');

          const tooltipElement = document.createElement('div');
          tooltipElement.id = button.getAttribute('data-tooltip-target');
          tooltipElement.setAttribute('role', 'tooltip');
          tooltipElement.setAttribute(
            'class',
            'tooltip absolute z-10 inline-block text-sm w-max bg-black shadow-lg text-white py-2 px-4 rounded-lg opacity-0 invisible transition-opacity duration-300 pointer-events-none', // Added pointer-events-none
          );
          tooltipElement.style.fontFamily = "'Inter', sans-serif";
          tooltipElement.style.position = 'absolute';
          tooltipElement.style.left = '-5px'; // Add offset
          tooltipElement.style.transform = 'translateX(-100%)'; // Move tooltip to the left of the button
          tooltipElement.textContent = action.tooltip;

          // Make button position relative for proper tooltip positioning
          button.style.position = 'relative';

          // Add hover event listeners for tooltip visibility
          button.addEventListener('mouseenter', () => {
            tooltipElement.classList.remove('invisible', 'opacity-0');
            tooltipElement.classList.add('visible', 'opacity-100');
          });

          button.addEventListener('mouseleave', () => {
            tooltipElement.classList.add('invisible', 'opacity-0');
            tooltipElement.classList.remove('visible', 'opacity-100');
          });

          // Add tooltip after the button
          sidebarActions.appendChild(tooltipElement);
        }

        button.setAttribute(
          'class',
          `items-center text-sm text-xl text-gray-900 w-7 h-7 pt-[1px] action-btn-emb ${
            action.cls || ''
          } ${contentCls + '-btn'}`,
        );
        button.innerHTML = action.label || btn;

        if (action.click) {
          button.addEventListener('click', action.click.bind(null, embodimentSidebar));
        }

        sidebarActions.appendChild(button);
      }
    }
  }

  rightSidebar.classList.add('hidden');
  //rightSidebar.style.width = '';

  //embodimentSidebar.className = 'z-10 right-sidebar ' + cls;

  if (!embodimentSidebar.closest('.sidebar-container').classList.contains('open'))
    embodimentSidebar.closest('.sidebar-container').classList.add('open');

  return embodimentSidebar;
}
export function openEmbodimentSidebar() {
  // Remove setting icon selection, when embodiment sidebar is opened
  window.dispatchEvent(
    new CustomEvent('sidebarStateChanged', {
      detail: {
        rightSidebarOpen: false,
        isSidebarOpen: window?.localStorage?.getItem('sidebarOpen') === 'true', // Keep the left sidebar open, on right sidebar toggle except for agent settings
        currentSidebarTab:
          getCurrentSidebarTab() || window?.localStorage?.getItem('currentSidebarTab'),
      },
    }),
  );
  const embodimentSidebar = document.querySelector('#embodiment-sidebar');
  const rightSidebar: any = document.querySelector('#right-sidebar');
  const agentSettingsSidebar = document.querySelector('#agent-settings-sidebar');
  agentSettingsSidebar.classList.add('hidden');
  embodimentSidebar.classList.add('right-sidebar');
  embodimentSidebar.classList.remove('hidden');
  rightSidebar.classList.add('hidden');
  //rightSidebar.style.width = '';
  embodimentSidebar.closest('.sidebar-container').classList.add('open');
  return embodimentSidebar;
}

export async function closeEmbodimentSidebar() {
  const embodimentSidebar: any = document.querySelector('#embodiment-sidebar');
  embodimentSidebar.closest('.sidebar-container').classList.remove('open');
  await delay(150);

  const rightSidebar: any = document.querySelector('#right-sidebar');
  const agentSettingsSidebar = document.querySelector('#agent-settings-sidebar');
  agentSettingsSidebar.classList.add('hidden');
  rightSidebar.classList.add('hidden');

  embodimentSidebar.classList.add('hidden');
}

export function showRefreshAuthPopup() {
  return new Promise(async (resolve) => {
    if (showRefreshAuthPopup['open']) return resolve(false); // skip if already open
    showRefreshAuthPopup['open'] = true;
    const confirmAuth = await confirm(
      'Authentication',
      'Session expired, do you want to re-authenticate?',
      {
        icon: '',
        btnYesLabel: 'Yes',
        btnNoLabel: 'No',
      },
    );
    showRefreshAuthPopup['open'] = false;

    if (confirmAuth) {
      window.open('/_auth', '_blank'); //open auth page in new tab

      //setup an event listener to resolve the auth event after returning back to the app
      const authEventListener = (event) => {
        // Changed selector from [id*="confirmModal"] to [id^="confirmModal-"] to remove only cloned confirm modals
        // (those with generated IDs like confirmModal-random), while preserving the original #confirmModal template.
        // This ensures the template remains in the DOM for future confirm dialogs after reauthentication,
        // preventing fallback to native window.confirm and maintaining custom modal functionality.
        document.querySelectorAll('div[id^="confirmModal-"]').forEach((d) => d.remove());
        resolve(true);
        window.removeEventListener('focus', authEventListener);
      };

      setTimeout(() => {
        window.addEventListener('focus', authEventListener);
      }, 500);
    }
    resolve(false);
  });

  return new Promise((resolve) => {
    Metro.dialog.create({
      title: 'Authentication',
      content: `<div class="form">Session expired, do you want to re-authenticate ?</div>`,
      onShow: async function (dialog) {
        showRefreshAuthPopup['open'] = true;
        showOverlay();
      },
      onHide: async function (dialog) {
        showRefreshAuthPopup['open'] = false;
        hideOverlay();
      },
      actions: [
        {
          caption: 'No',
          cls: 'js-dialog-close alert',
          onclick: function () {
            resolve(false);
          },
        },
        {
          caption: 'Yes',
          cls: 'success',
          onclick: function (dialog) {
            const authEventListener = (event) => {
              resolve(true);
              window.removeEventListener('message', authEventListener);
              Metro.dialog.close(dialog);
            };
            window.open('/_auth', '_blank');
            setTimeout(() => {
              window.addEventListener('focus', authEventListener);
            }, 500);
          },
        },
      ],
    });
  });
}

let itv;

export async function showOverlay(
  secondary: any = false,
  showAfter = 50,
  isOverlayBottom = false,
  overlayHTML = '',
  isOverlayBlocking = true,
) {
  await delay(showAfter);
  clearTimeout(itv);
  const selector = typeof secondary !== 'string' && secondary ? '.overlay-secondary' : '#overlay';

  const overlay = document.querySelector(selector);

  if (typeof secondary === 'string') {
    overlay.innerHTML = overlayHTML ? overlayHTML : `<div>${secondary}</div>`;
  }
  if (isOverlayBottom) overlay.classList.add('bg-transparent', 'backdrop-blur-none');
  if (!isOverlayBlocking) overlay.classList.add('pointer-events-none');

  overlay.classList.remove('hidden');
  overlay.classList.remove('hiding');
}

export async function hideOverlay(secondary = false, hideAfter = 0) {
  await delay(hideAfter);
  clearTimeout(itv);
  const selector = secondary ? '.overlay-secondary' : '#overlay';

  const overlay = document.querySelector(selector);

  overlay.classList.add('hiding');
  if (!secondary) overlay.innerHTML = '';

  itv = setTimeout(() => {
    overlay.classList.add('hidden');
    overlay.classList.remove('bg-transparent', 'backdrop-blur-none', 'pointer-events-none');
  }, 0.3 * 1000);
}

export function prompt(message, defaultValue = '') {
  return new Promise((resolve) => {
    Metro.dialog.create({
      title: message,
      overlay: false,
      onShow: async function (dialog) {
        showOverlay();
      },
      onHide: async function (dialog) {
        hideOverlay();
      },
      content: `<div class="form">
                      <div class="form-group">
                          <input type="text" class="form-control" id="metro-prompt-input" value="${defaultValue}" data-role="input">
                      </div>
                      </div>`,
      actions: [
        {
          caption: 'Cancel',
          cls: 'js-dialog-close alert',
          onclick: function () {
            resolve(null);
          },
        },
        {
          caption: 'OK',
          cls: 'js-dialog-close success',
          onclick: function () {
            const promptInput = document.querySelector('#metro-prompt-input') as HTMLInputElement;
            const value = promptInput.value;
            resolve(value);
          },
        },
      ],
    });
  });
}

interface DialogOptions {
  title?: string;
  entriesObject?: Record<string, any>;
  inputs?: Array<string>;
  features?: {
    templateVars?: boolean;
  };
  onCancel?: () => void;
  onLoad?: (dialog: HTMLElement) => void;
  style?: {
    dialogWidth?: number;
    dialogContentMinHeight?: number;
  };
  secondary?: boolean;
  focusOption?: {
    selector: string;
    cursorPosition?: number;
  };
}

export function editValues({
  title = '',
  entriesObject,
  features = {
    templateVars: false,
  },
  onCancel,
  onLoad,
  style,
  secondary = false,
  focusOption = null,
}: DialogOptions) {
  return new Promise((resolve) => {
    const dialogSelector = secondary ? '#smyth-dialog-secondary' : '#smyth-dialog';
    const dialogElm: HTMLElement = document.querySelector(dialogSelector);

    /* set dialog title */
    const titleElm = dialogElm.querySelector('.dialog-title-text');
    titleElm.innerHTML = title;
    if (!title) {
      titleElm.classList.add('hidden');
    } else {
      titleElm.classList.remove('hidden');
    }
    /* set dialog content */
    const form = createForm(entriesObject, 'inline');
    form._init();

    const contentElm = dialogElm.querySelector('.dialog-content');
    contentElm.innerHTML = '';
    contentElm.appendChild(form);

    /* Handle Template Variable Buttons */
    if (features.templateVars) {
      handleTemplateVars(dialogElm);
    }

    // set dialog width
    const dialogWidth = style?.dialogWidth || 650;
    dialogElm.setAttribute('data-width', `${dialogWidth}`);
    dialogElm.style.width = `${dialogWidth}px`;

    // set min dialog content height
    const dialogContentMinHeight = style?.dialogContentMinHeight;
    const dialogContentElm = dialogElm?.querySelector('.dialog-content') as HTMLElement;

    if (dialogContentMinHeight) {
      dialogContentElm?.setAttribute('data-width', `${dialogContentMinHeight}`);
      dialogContentElm.style.minHeight = `${dialogContentMinHeight}px`;
    } else {
      dialogContentElm?.style?.removeProperty('min-height');
    }

    // Open dialog
    Metro.dialog.open(dialogSelector);

    // as we are using Metro UI built-in overlay for secondary dialog
    showOverlay(secondary);

    // handle input focus
    // if (focusOption) {
    //     delay(25).then(() => {
    //         if (!focusOption?.selector) return;

    //         const element = document.querySelector(focusOption?.selector) as HTMLInputElement;

    //         element.focus();

    //         element.selectionStart = element.selectionEnd = focusOption?.cursorPosition ?? element.value.length;
    //     });
    // }

    /* === dialog actions handler === */

    const handleCancel = () => {
      // as we are using Metro UI built-in overlay for secondary dialog
      hideOverlay(secondary);

      if (typeof onCancel === 'function') onCancel();

      // keep the template variable buttons
      const templateVarBtns = dialogElm.querySelector('.template-var-buttons');
      if (templateVarBtns) {
        dialogElm.appendChild(templateVarBtns);
      }

      // reset content to avoid state conflicts, specially for key-value pair fields
      contentElm.innerHTML = '';

      resolve(null);
    };

    /* handle cancel action */
    const closeBtnElm = dialogElm.querySelector('.btn-close');
    const cancelBtnElm = dialogElm.querySelector('.btn-cancel');

    if (cancelBtnElm) cancelBtnElm.addEventListener('click', handleCancel);
    if (closeBtnElm) closeBtnElm.addEventListener('click', handleCancel);

    /* handle submit action */
    const submitBtnElm: HTMLButtonElement = dialogElm.querySelector('.btn-submit');

    //we use onclick instead of addEventListener to avoid multiple event listeners
    submitBtnElm.onclick = async (event) => {
      const _this = event.target as HTMLButtonElement;

      const btnText = _this.textContent;
      _this.textContent = 'Saving...';
      _this.disabled = true;

      const formElm = _this.closest('.dialog').querySelector('.dlg-form') as HTMLFormElement;

      const isValid = await smythValidator.validateInputs(formElm);

      if (!isValid) {
        _this.textContent = btnText;
        _this.disabled = false;
        return;
      }

      /* form validation */
      const form = dialogElm.querySelector('.dlg-form') as HTMLFormElement;

      dispatchSubmitEvent(form); // to trigger validation

      await delay(30);

      const invalid = form.querySelector('.invalid');
      if (invalid) {
        _this.textContent = btnText;
        _this.disabled = false;
        return;
      }

      /* read form values */
      const result = readFormValues(form, entriesObject);

      submitBtnElm.onclick = null; //remove the event listener to avoid multiple calls
      // close the dialog
      Metro.dialog.close(dialogSelector);

      // as we are using Metro UI built-in overlay for secondary dialog
      hideOverlay(secondary);

      // reset content to avoid state conflicts, specially for key-value pair fields
      contentElm.innerHTML = '';

      _this.textContent = btnText;
      _this.disabled = false;

      resolve(result);
    };

    if (typeof onLoad === 'function') onLoad(dialogElm);
  });
}

window['editValues'] = editValues;

interface SidebarOptions {
  title?: string;
  entriesObject: Record<string, any>;
  inputs?: Array<string>;
  features?: {
    templateVars?: boolean;
  };
  actions?: Record<string, any>;
  compUid?: string;
  showHelpIcon?: boolean;
  onSave?: (values: any) => void;
  onDraft?: (values: any) => void;
  onBeforeCancel?: (sidebar) => Promise<boolean>;
  onCancel?: (sidebar) => void;
  onLoad?: (sidebar: HTMLElement) => void;
  helpTooltip?: string;
}

export function sidebarEditValues({
  title = '',
  entriesObject,
  actions = null,
  showHelpIcon = true,
  features = { templateVars: false },
  onSave = () => {},
  onDraft = () => {},
  onBeforeCancel = async (sidebar) => {
    return true;
  },
  onCancel = (sidebar) => {},
  onLoad = (sidebar) => {},
  helpTooltip = '',
}: SidebarOptions): Promise<any> | null {
  return new Promise(async (resolve) => {
    const sidebar = await createRightSidebar(
      '',
      '',
      actions,
      null,
      showHelpIcon
        ? {
            help: {
              cls: 'justify-self-end',
              label: '<span class="font-bold text-lg icon-question-mark"></span>',
              tooltip: helpTooltip,
            },
          }
        : null,
    );

    const container: HTMLElement = sidebar.querySelector('.container');
    // Remove the 'open' class temporarily to prevent premature width animation
    sidebar.closest('.sidebar-container').classList.remove('open');
    $(container).css('opacity', 0);

    // Set content immediately without delay
    sidebar.querySelector('.title').innerHTML = title || '';
    const sidebarContent = sidebar.querySelector('.content');
    const sidebarActions = sidebar.querySelector('.actions .action-content');
    sidebarContent.innerHTML = '';

    const containers = {};
    const forms = {};

    if (entriesObject) {
      const tabsCount = Object.keys(entriesObject).length;
      const tabs = document.createElement('div');

      tabs.classList.add('py-0', 'w-full');

      const tabsContainer = document.createElement('div');
      tabsContainer.classList.add(
        'flex',
        'space-x-4',
        'p-1',
        'mx-4',
        'bg-gray-200',
        'rounded-full',
        'text-xs',
      );
      for (let tab in entriesObject) {
        if (!tabs.getAttribute('x-data')) tabs.setAttribute('x-data', `{ openTab: "${tab}" }`);
        const tabElm = document.createElement('button');
        tabElm.setAttribute('x-on:click', `openTab = "${tab}"`);
        tabElm.setAttribute(':class', `{'bg-white text-gray-600': openTab === "${tab}"}`);
        tabElm.setAttribute(
          'class',
          'flex-1 p-1 rounded-full focus:outline-none transition-all duration-300',
        );
        tabElm.innerHTML = tab;
        tabsContainer.appendChild(tabElm);
      }
      tabs.appendChild(tabsContainer);
      if (tabsCount <= 1) tabsContainer.classList.add('hidden');

      for (let tab in entriesObject) {
        const tabContent = document.createElement('div');
        tabContent.setAttribute('x-show', `openTab === "${tab}"`);
        tabContent.classList.add('transition-all', 'duration-300', 'bg-white', 'py-0');
        containers[tab] = tabContent;
        tabs.appendChild(tabContent);
      }

      sidebarContent.appendChild(tabs);

      for (let tab in containers) {
        const formFields = entriesObject[tab];
        if (typeof formFields == 'object') {
          const _form = createForm(formFields);
          _form.classList.add(tab);
          containers[tab].appendChild(_form);

          // Add input and change event listeners for draft updates
          const debouncedDraft = debounce(async () => {
            const values = await readRightSidebarValues(sidebar);
            if (values && typeof onDraft === 'function') {
              onDraft(values);
            }
          }, 300);

          // Listen for immediate input changes (text inputs, textareas)
          _form.addEventListener('input', (event: Event) => {
            const target = event.target as HTMLElement;
            if (target.matches('input:not([type="checkbox"]):not([type="radio"]), textarea')) {
              debouncedDraft();
            }
          });

          // Listen for committed changes (select, checkbox, radio)
          _form.addEventListener('change', (event: Event) => {
            const target = event.target as HTMLElement;
            if (target.matches('select, input[type="checkbox"], input[type="radio"]')) {
              debouncedDraft();
            }
          });

          _form._init();
          forms[tab] = { form: _form, fields: formFields };
        } else {
          containers[tab].innerHTML = entriesObject[tab];
          containers[tab].classList.add('mx-4');
        }
      }
    }

    sidebar.data = { forms };
    /* Create Form */
    //const settingsObject = entriesObject?.__tabs ? entriesObject?.__tabs['Settings'] : entriesObject;
    //const form = createForm(settingsObject);
    //containers['Settings'].appendChild(form);

    /* Handle Template Variable Buttons */
    if (features.templateVars) {
      handleTemplateVars(sidebarContent);
    }

    const saveBtn: HTMLButtonElement = sidebar.querySelector('.save-btn');
    saveBtn.onclick = async (e) => {
      const result = {};
      let saveBeforeCloseState = 0;

      for (let tab in forms) {
        const form = forms[tab].form;
        const formFields = forms[tab].fields;

        dispatchSubmitEvent(form); // to trigger validation

        await delay(30);
        const invalidElements = [...form.querySelectorAll('.invalid')] as HTMLElement[];

        const invalid = invalidElements[0];
        const closestScrollable = form.closest('.overflow-y-auto');
        if (invalid && closestScrollable) {
          closestScrollable.scrollTo({ top: invalid.offsetTop - 50, behavior: 'smooth' });
        }
        if (invalid) {
          const saveBeforeClose = await confirm(
            // 'Configuration Error',
            null,
            'You have validation errors. Are you sure you want to discard these changes?',
            {
              btnNoLabel: 'Discard Changes',
              btnYesLabel: 'Continue Editing',
              btnNoClass: 'h-[48px] rounded-lg px-8',
              btnYesClass: 'h-[48px] rounded-lg px-8',
            },
          );
          saveBeforeCloseState = !saveBeforeClose ? 1 : 2;
        }

        const values = readFormValues(form, formFields);
        result[tab] = values;
      }
      if (saveBeforeCloseState == 1) {
        closeRightSidebar();
        resolve(null);
        e.stopPropagation();
        return;
      } else if (saveBeforeCloseState == 2) {
        return false;
      }
      if (typeof onSave === 'function') onSave.apply({ sidebar }, [result]);
      closeRightSidebar();
      window['workspace']?.emit?.('componentUpdated', result);
      resolve(result);
    };
    saveBtn.classList.remove('hidden');

    const closeBtn: HTMLButtonElement = sidebar.querySelector('.close-btn');
    closeBtn.onclick = async () => {
      if (typeof onBeforeCancel === 'function') {
        const canClose = await onBeforeCancel.apply({ sidebar }, [sidebar]);
        if (!canClose) return;
      }
      closeRightSidebar();
      if (typeof onCancel === 'function') onCancel.apply({ sidebar }, [sidebar]);
      resolve(null);
    };
    // closeBtn.classList.remove('hidden');

    //sidebarActions.appendChild(saveBtn);
    //sidebarActions.appendChild(cancelBtn);

    //sidebar.classList.add('open');
    //sidebar.closest('.sidebar-container').classList.add('open');

    openRightSidebar();
    $(container).css('opacity', 1);

    if (typeof onLoad === 'function') onLoad.apply({ sidebar }, [sidebar]);
  });
}

//returns an object with right sidebar tabs, each tab contains an object with settings values and validation status
export async function readRightSidebarValues(sidebar) {
  if (!sidebar || !sidebar?.data?.forms) return null;
  const forms = sidebar.data.forms;

  const validationResult = {};
  for (let tab in forms) {
    const form = forms[tab].form;
    const formFields = forms[tab].fields;

    dispatchSubmitEvent(form); // to trigger validation

    await delay(30);
    //const invalidElements = [...form.querySelectorAll('.invalid')] as HTMLElement[];

    // const validElements = [...form.querySelectorAll('.valid')] as HTMLElement[];
    // validElements.forEach((elm) => {
    //     elm.classList.remove('valid');
    // });

    const validation = readFormValidation(form, formFields);
    validationResult[tab] = validation;
  }

  return validationResult;
}

window['sidebarEditValues'] = sidebarEditValues;

const enterKeyArray = [];

export function pushUIEnterKeyElement(element) {
  //clean existing elements
  while (enterKeyArray.length > 0) {
    const element = enterKeyArray.pop();
    if (!element || !element.isConnected) continue;
    if (!element.checkVisibility()) continue;
    break;
  }

  //push the new element
  enterKeyArray.push(element);
}
export function runUIEnterKey() {
  while (enterKeyArray.length > 0) {
    const element = enterKeyArray.pop();
    if (!element || !element.isConnected) continue;

    if (!element.checkVisibility()) continue;

    element.click();
    break;
  }
}

//Replacement for confirm()
export function confirm(
  title,
  message = '',
  {
    icon = '',
    btnYesLabel = 'Ok',
    btnNoLabel = 'Cancel',
    btnYesClass = '',
    btnNoClass = '',
    btnYesCallback = (btnYes) => {},
  } = {},
) {
  return new Promise(async (resolve) => {
    const confirmModalTpl = document.querySelector('#confirmModal');
    if (!confirmModalTpl) return resolve(window.confirm(message)); //fallback to default JS confirm

    const confirmModal = confirmModalTpl.cloneNode(true) as HTMLElement;
    confirmModal.setAttribute('id', `confirmModal-${Math.random().toString(36).substr(2, 9)}`); //generate random id to avoid conflicts

    const btnYes: HTMLElement = confirmModal.querySelector('.btn-yes');
    const btnNo: HTMLElement = confirmModal.querySelector('.btn-no');
    const btnClose: HTMLElement = confirmModal.querySelector('.btn-close');
    const txtContent: HTMLElement = confirmModal.querySelector('.txt-content');
    const txtTitle: HTMLElement = confirmModal.querySelector('.txt-title');

    pushUIEnterKeyElement(btnYes);
    txtTitle.innerHTML = title;
    txtContent.innerHTML = message;

    if (btnYesLabel) {
      btnYes.innerHTML = btnYesLabel;
      btnYes.className += ` ${btnYesClass}`;
    }
    if (btnNoLabel && btnNoLabel !== null) {
      btnNo.innerHTML = btnNoLabel;
      btnNo.className += ` ${btnNoClass}`;
    }
    if (icon) {
      const iconElement = document.createElement('div');
      iconElement.className += `icon svg-icon ${icon} m-auto w-11 h-11`;
      txtTitle.prepend(iconElement);
    }

    btnYes.onclick = async () => {
      // Occasionally, we need to wait for an operation to complete before closing the confirmation modal.
      if (typeof btnYesCallback === 'function') {
        await btnYesCallback(btnYes);
      }

      resolve(true);
      confirmModal.remove();
    };

    if (btnNoLabel !== null) {
      btnNo.onclick = () => {
        resolve(false);
        confirmModal.remove();
      };
      btnClose.onclick = () => {
        resolve(false);
        confirmModal.remove();
      };
    } else {
      btnNo.remove();
      btnClose.remove();
    }
    confirmModal.classList.remove('hidden');
    document.body.appendChild(confirmModal);
  });
}

window['confirm'] = <any>confirm;

export function modalDialog(
  title,
  content,
  actions: DialogActions,
  events?: DialogEvents,
  options?: { bringToFront: boolean },
) {
  const modalTpl = document.querySelector('#dialogModal');
  if (!modalTpl) {
    console.error('#dialogModal not found, cannot build dialog modal');
    return;
  }
  const dialogModal = modalTpl.cloneNode(true) as HTMLElement;
  dialogModal.setAttribute('id', `dialog-${Math.random().toString(36).substr(2, 9)}`);
  if (options?.bringToFront) {
    dialogModal.classList.add('z-[1051]');
  }

  const titleDom: HTMLElement = dialogModal.querySelector('.title');
  titleDom.innerHTML = title;

  const contentDom: HTMLElement = dialogModal.querySelector('.content');
  contentDom.innerHTML = content;

  const actionsDom: HTMLElement = dialogModal.querySelector('.actions');

  for (let actionId in actions) {
    const action: DialogAction = actions[actionId];
    const label = action.label || actionId;
    const cls = action.class || 'bg-gray-300 hover:bg-gray-400';
    const handler = action.handler || null;
    const button = document.createElement('button');
    button.setAttribute(
      'class',
      `text-center text-sm font-medium py-1.5 px-3 w-40 rounded-lg border hover:opacity-75 focus:ring-4 focus:outline-none ${cls}`,
    );
    button.innerHTML = label;
    button.onclick = () => {
      if (typeof handler === 'function') handler(dialogModal, button);
      dialogModal.remove();
      if (events?.onClose) events.onClose(dialogModal);
    };

    actionsDom.appendChild(button);
  }

  dialogModal.classList.remove('hidden');
  document.body.appendChild(dialogModal);
  if (events?.onShow) events.onShow(dialogModal);

  return dialogModal;
}
export const confirmYesNo = ({
  message,
  title = 'Confirm',
  btnYesLabel = 'Yes',
  btnNoLabel = 'No',
  icon = 'default-icon-question',
}: {
  message: string;
  title?: string;
  btnYesLabel?: string;
  btnNoLabel?: string;
  icon?: string;
}) => {
  return new Promise((resolve) => {
    Metro.dialog.create({
      title,
      overlay: false,
      onShow: async function (dialog) {
        showOverlay();
      },
      onHide: async function (dialog) {
        hideOverlay();
      },
      content: `<p>${message}</p>`,
      actions: [
        {
          caption: btnNoLabel,
          cls: 'js-dialog-close alert',
          onclick: function () {
            resolve(false);
          },
        },
        {
          caption: btnYesLabel,
          cls: 'js-dialog-close success',
          onclick: function () {
            resolve(true);
          },
        },
      ],
    });
  });
};

export function alert(
  message,
  title?: string,
  btnLabel?: string,
  btnClass?: string,
  callback?: () => void,
) {
  return confirm(message, title, {
    btnYesLabel: btnLabel,
    btnNoLabel: null,
    btnYesClass: btnClass,
    btnYesCallback: callback,
  });
}

const _searchBtnStatus = {
  _changeStatus: (elm, classesToRemove, classesToAdd) => {
    if (!elm) return;
    elm?.querySelector('span')?.classList.remove(...classesToRemove);
    elm?.querySelector('span')?.classList.add(...classesToAdd);
  },
  initial: (elm: HTMLButtonElement) => {
    elm.disabled = false;
    _searchBtnStatus._changeStatus(elm, ['smyth-spinner', 'dark'], ['default-icon-search']);
  },
  processing: (elm: HTMLButtonElement) => {
    elm.disabled = true;
    _searchBtnStatus._changeStatus(elm, ['smyth-spinner', 'dark'], ['default-icon-search']);
  },
};

/**
 * Open extensions dialog
 * @param {ExtensionCompNames} compName
 * @returns {void}
 */
export async function extensionsDialog(compName: ExtensionCompNames): Promise<void> {
  const dialogElm: HTMLElement = document.querySelector('#smyth-dialog-extensions');
  const extensionsWrapper: HTMLElement = dialogElm.querySelector(
    '.dialog-content .extensions__container .grid',
  );

  // Set title for the dialog
  const dialogTitle = dialogElm.querySelector('.dialog-title');
  let extensionLabel = getExtensionCompLabel(compName);
  dialogTitle.innerHTML = `${extensionLabel} Store`;

  // Set title for the extension manual field
  const emfTitle = dialogElm.querySelector('.emf-title');
  let emfTitleText = getExtensionManualFieldLabel(compName);
  emfTitle.innerHTML = emfTitleText;

  let emfDescriptionText = dialogElm.querySelector('.extensions__manual-field-hint');
  if (emfDescriptionText) {
    emfDescriptionText.innerHTML = getExtensionManualFieldDescription(compName);
  }
  renderExtensionsSkeleton(extensionsWrapper);

  // Reset search field
  const searchInputField = document.querySelector(
    '#smyth-dialog-extensions .extensions__search-field input',
  ) as HTMLInputElement;
  searchInputField.value = '';

  const smythDialog = document.querySelector('#smyth-dialog-extensions') as HTMLElement;
  if (compName === EXTENSION_COMP_NAMES.gptPlugin) {
    document.querySelector('.emf-separator')?.classList?.add('hidden');
    document.querySelector('.extensions__container')?.classList?.add('hidden');
    document.querySelector('.extensions__search-field')?.classList?.add('hidden');
    smythDialog.classList.add('extension-dialog-small');
  } else {
    document.querySelector('.emf-separator')?.classList?.remove('hidden');
    document.querySelector('.extensions__container')?.classList?.remove('hidden');
    document.querySelector('.extensions__search-field')?.classList?.remove('hidden');
    smythDialog.classList.remove('extension-dialog-small');
  }
  Metro.dialog.open('#smyth-dialog-extensions');
  showOverlay();

  let allExtensions = await getExtensionsByCompName({ compName, page: 1 });

  // show initial extensions
  const initialExtensions = searchExtensions({
    query: '',
    compName,
    extensions: allExtensions?.data,
    page: 1,
  });
  renderExtensions({ elm: extensionsWrapper, extensions: initialExtensions, compName });

  // On close dialog
  const dialogCloseBtn = dialogElm.querySelector('.js-dialog-close') as HTMLButtonElement;
  dialogCloseBtn.onmouseup = () => {
    hideOverlay();
  };

  const loadMoreBtn = dialogElm.querySelector('.btn-load-more') as HTMLButtonElement;

  // reset pagination index every time the dialog is opened
  loadMoreBtn.setAttribute('data-next', '2');

  if (allExtensions?.data?.length < 8) {
    loadMoreBtn.disabled = true;
  } else {
    loadMoreBtn.disabled = false;
  }

  if (allExtensions?.pagination?.next) {
    if (compName === EXTENSION_COMP_NAMES.huggingFaceModel) {
      loadMoreBtn.setAttribute(
        'data-next',
        `${uiServer}/api/component/${compName}/models` + allExtensions?.pagination?.next,
      );
    } else if (compName === EXTENSION_COMP_NAMES.gptPlugin) {
      loadMoreBtn.setAttribute('data-next', allExtensions?.pagination?.next);
    }
  }

  const fetchOpenAPIDetails = async (specUrl: string) => {
    // We have CORS issue when callling OpenAPI spec URL directly
    //const res = await fetch(specUrl);

    // TODO: Just want to provide a quick solution, will check it later
    const res = await fetch(`${uiServer}/api/component/OpenAPI/fetch-spec?url=${specUrl}`);
    if (!res.ok) {
      throw new Error(`HTTP error! Status: ${res.status}`);
    }

    const resText = await res.text();

    try {
      const parsedJSON = JSON.parse(resText);
      return parsedJSON;
    } catch (e) {
      try {
        const data = yaml.load(resText);
        return data;
      } catch (e) {
        console.log(e);
        throw new Error('Invalid OpenAPI specification!');
      }
    }
  };

  const displaySearchResult = async (query: string) => {
    let matchedExtensions = [];

    renderExtensionsSkeleton(extensionsWrapper);

    if (compName === EXTENSION_COMP_NAMES.huggingFaceModel) {
      const res = await getExtensionsByCompName({
        compName: EXTENSION_COMP_NAMES.huggingFaceModel,
        page: 1,
        query,
      });
      matchedExtensions = res?.data;

      if (res?.pagination?.next) {
        loadMoreBtn.setAttribute(
          'data-next',
          `${uiServer}/api/component/${compName}/models` + res?.pagination?.next,
        );
      }
    } else {
      matchedExtensions = searchExtensions({
        query,
        compName,
        extensions: allExtensions?.data,
        page: 1,
      });

      loadMoreBtn.setAttribute('data-next', '2');
    }

    if (matchedExtensions?.length < 8) {
      loadMoreBtn.disabled = true;
    } else {
      loadMoreBtn.disabled = false;
    }

    renderExtensions({ elm: extensionsWrapper, extensions: matchedExtensions, compName });
  };

  const searchBtn = document.querySelector(
    '#smyth-dialog-extensions .extensions__search-field .input-search-button',
  ) as HTMLButtonElement;

  searchBtn.onclick = async (event: MouseEvent) => {
    const btnElm = event.target as HTMLButtonElement;
    const searchField = btnElm
      .closest('.input')
      .querySelector('input[data-search-button="true"]') as HTMLInputElement;
    const query = searchField.value;

    // show spinner and disable button
    _searchBtnStatus.processing(btnElm);

    await displaySearchResult(query);

    // show search icon and enable button
    _searchBtnStatus.initial(btnElm);
  };

  searchInputField.onkeydown = async (event: KeyboardEvent) => {
    const inputElm = event.target as HTMLInputElement;
    const btnElm = inputElm
      .closest('.input')
      .querySelector('.input-search-button') as HTMLButtonElement;
    const query = inputElm?.value;

    if (event.key === 'Enter') {
      // show spinner and disable button
      _searchBtnStatus.processing(btnElm);

      await displaySearchResult(query);

      // show search icon and enable button
      _searchBtnStatus.initial(btnElm);
    }
  };

  dialogElm.onclick = async (event: MouseEvent) => {
    const currentElm = event.target as HTMLButtonElement;

    if (currentElm?.getAttribute('data-role') !== 'add-extension') return;

    const btnElm = currentElm;

    const cardElm = btnElm.closest('.card') as HTMLElement;
    const data = getDataByCompName(cardElm, compName);

    addExtension({ compName, btnElm: currentElm, data });
  };

  const manualAddBtn = dialogElm.querySelector('.btn-add-extension-manually') as HTMLButtonElement;

  manualAddBtn.onclick = async (event: MouseEvent) => {
    const btnElm = event.target as HTMLButtonElement;

    const dialogElm = btnElm.closest('.dialog') as HTMLElement;
    const inputElm = dialogElm?.querySelector(
      '.extensions__resource-key input',
    ) as HTMLInputElement;
    const resourceKey = inputElm?.value;

    if (!resourceKey) return;

    btnElm.disabled = true;
    btnElm.textContent = 'Adding...';

    try {
      const openAPIDetails = await fetchOpenAPIDetails(resourceKey);
      const data = {
        specUrl: resourceKey,
        name: openAPIDetails?.info?.title,
        desc: openAPIDetails?.info?.description,
        logoUrl: openAPIDetails?.info?.logo,
      };
      await addExtension({ compName, btnElm, data, addingType: 'manual' });

      // #region close dialog
      const closeBtn = dialogElm.querySelector('.js-dialog-close') as HTMLButtonElement;
      closeBtn.click();

      const mouseUpEvent = new MouseEvent('mouseup');
      closeBtn.dispatchEvent(mouseUpEvent);
      // #endregion

      inputElm.value = '';
    } catch (e) {
      errorToast(
        'Failed to add OpenAPI extension. Please verify that the URL is valid and points to a valid OpenAPI specification.',
      );
    } finally {
      btnElm.disabled = false;
      btnElm.textContent = 'Add';
    }
  };

  const loadMoreClickHandler = async (event: MouseEvent) => {
    const btnElm = event.target as HTMLButtonElement;
    let extensions = [];

    if (compName === EXTENSION_COMP_NAMES.huggingFaceModel) {
      const nextLink = btnElm.getAttribute('data-next');

      btnElm.textContent = 'Loading...';

      if (!nextLink) return;

      const res = await getExtensionsByCompName({ compName, nextLink });

      if (res?.pagination?.next) {
        btnElm.setAttribute(
          'data-next',
          `${uiServer}/api/component/${compName}/models` + res?.pagination?.next,
        );
      }

      extensions = res?.data;
    } else {
      let pageIndex = +btnElm.getAttribute('data-next') || 2;
      const searchField = btnElm
        .closest('.dialog-content')
        .querySelector('.input input[data-search-button="true"]') as HTMLInputElement;

      extensions = searchExtensions({
        query: searchField?.value,
        compName,
        extensions: allExtensions?.data,
        page: pageIndex,
      });

      btnElm.setAttribute('data-next', `${++pageIndex}`);
    }

    if (extensions?.length < 8) {
      loadMoreBtn.disabled = true;
    } else {
      loadMoreBtn.disabled = false;
    }

    renderExtensions({ elm: extensionsWrapper, extensions, compName, append: true });

    btnElm.textContent = 'Load More';
  };

  loadMoreBtn.onclick = loadMoreClickHandler;
}

/**
 * Resets the styling of embodiment buttons to their default state.
 * This function removes the active class and resets SVG colors.
 */
export function resetEmbodimentButtons(): void {
  const buttons: NodeListOf<Element> = document.querySelectorAll(
    '.embodiments-toolbar .icon-button.active',
  );

  if (!buttons || buttons.length === 0) {
    console.warn('No active embodiment buttons found to reset.');
    return;
  }

  buttons.forEach((btn: Element) => {
    if (!(btn instanceof HTMLElement)) {
      console.error('Invalid button element:', btn);
      return;
    }

    btn.classList.remove('bg-primary-100');
    const svg: SVGElement | null = btn.querySelector('svg');

    if (!svg) {
      console.warn('No SVG found in button:', btn);
      return;
    }

    const paths: NodeListOf<SVGPathElement> = svg.querySelectorAll('path');

    if (paths.length === 0) {
      console.warn('No paths found in SVG:', svg);
      return;
    }

    paths.forEach((path: SVGPathElement) => {
      if (path.hasAttribute('stroke')) {
        path.setAttribute('stroke', 'white');
      }
      if (path.hasAttribute('fill') && path.getAttribute('fill') !== 'none') {
        path.setAttribute('fill', 'white');
      }
    });
  });
}

// Helper function to get display heading
function getDisplayHeading(key: string, title: string): string {
  // Convert key to lowercase for comparison
  const lowerKey = key.toLowerCase();
  const lowerTitle = title.toLowerCase();

  // Skip agentllm
  if (lowerKey === 'agentllm' || lowerTitle === 'agentllm') {
    return '';
  }

  // Map of lowercase test entries to their display headings
  const displayMap = {
    chat: 'Test as Chat',
    llm: 'Test as LLM',
    api: 'Test as API',
    postman: 'Test in Postman',
    chatgpt: 'Test in ChatGPT',
    agent_skill: 'Form Preview',
    alexa: 'Publish as Alexa Skill',
    mcp: 'MCP',
  };

  // Check if it's one of our special test cases
  if (displayMap[lowerKey]) {
    return displayMap[lowerKey];
  }

  // For non-test cases, use the original title
  return title;
}
// Helper function to get display heading
function getNavText(key: string, title: string): string {
  // Convert key to lowercase for comparison
  const lowerKey = key.toLowerCase();
  const lowerTitle = title.toLowerCase();

  // Skip agentllm
  if (lowerKey === 'agentllm' || lowerTitle === 'agentllm') {
    return '';
  }

  // Map of lowercase test entries to their display headings
  const displayMap = {
    chat: 'Chat',
    llm: 'LLM',
    api: 'API',
    postman: 'Postman',
    chatgpt: 'GPT',
    agent_skill: 'Form',
    alexa: 'Alexa',
    mcp: 'MCP',
  };

  // Check if it's one of our special test cases
  if (displayMap[lowerKey]) {
    return displayMap[lowerKey];
  }

  // For non-test cases, use the original title
  return key;
}
function convertTitleToClass(title: string): string {
  return (
    title
      // Remove all characters except letters, numbers and spaces
      .replace(/[^a-zA-Z0-9\s]/g, '')
      // Convert to lowercase
      .toLowerCase()
      // Replace multiple spaces with single space
      .replace(/\s+/g, ' ')
      // Trim spaces from start and end
      .trim()
      // Split by spaces and join with dashes
      .split(' ')
      .join('-')
  );
}
function hideAllChildrenExcept(parent: HTMLElement, contentCls: string) {
  Array.from(parent?.children).forEach((child) => {
    if (child.classList.contains(contentCls)) {
      child.classList.remove('hidden');
    } else {
      child.classList.add('hidden');
    }
  });
}
function toggleChildren(parent: HTMLElement, cls: string, toggleCls: string, value: boolean) {
  parent?.querySelectorAll?.(`.${cls}`).forEach((child) => {
    value && child.classList.add(toggleCls);
    !value && child.classList.remove(toggleCls);
  });
}

/**
 * Opens the agent settings sidebar in the right panel or closes it if already open
 * @returns The agent settings sidebar element or null if closed
 */
export function openAgentSettingsRightSidebar(state = undefined) {
  // Get the agent settings sidebar element by its ID
  const agentSettingsSidebar = document.querySelector('#agent-settings-sidebar');
  const rightSidebar: any = document.querySelector('#right-sidebar');
  const embodimentSidebar: any = document.querySelector('#embodiment-sidebar');

  // Check if the sidebar is already open
  const isOpen =
    !agentSettingsSidebar.classList.contains('hidden') &&
    agentSettingsSidebar.closest('.sidebar-container').classList.contains('open');

  if (isOpen === state) {
    return null;
  }
  // Added event dispatcher to update the sidebar state in the left sidebar
  window.dispatchEvent(
    new CustomEvent('sidebarStateChanged', {
      detail: {
        rightSidebarOpen: !isOpen,
        isSidebarOpen: window?.localStorage?.getItem('sidebarOpen') === 'true',
        currentSidebarTab:
          getCurrentSidebarTab() || window?.localStorage?.getItem('currentSidebarTab'),
      },
    }),
  );

  if (isOpen) {
    // If already open, close it
    closeAgentSettingsRightSidebar();
    return null;
  }

  // Configure the sidebar classes
  agentSettingsSidebar.classList.add('right-sidebar');
  agentSettingsSidebar.classList.remove('hidden');

  // Hide other sidebars
  rightSidebar.classList.add('hidden');
  embodimentSidebar.classList.add('hidden');

  // Open the sidebar container
  agentSettingsSidebar.closest('.sidebar-container').classList.add('open');

  // Clear any existing content and prepare for new content
  const contentContainer = agentSettingsSidebar.querySelector('.dialog-content');
  if (contentContainer) {
    contentContainer.innerHTML =
      '<div id="agent-settings-in-right-sidebar-root" class="py-2 px-2"></div>';
  }

  // Set the title with icon and style it properly
  const titleElement = agentSettingsSidebar.querySelector('.title');
  if (titleElement) {
    // Add settings icon and title text in a flex container
    titleElement.innerHTML = `
      <div class="flex items-center gap-2">
        <svg class="w-6 h-6 text-gray-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path fill-rule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 4.889c-.02.12-.115.26-.297.348a7.493 7.493 0 00-.986.57c-.166.115-.334.126-.45.083L6.3 5.508a1.875 1.875 0 00-2.282.819l-.922 1.597a1.875 1.875 0 00.432 2.385l.84.692c.095.078.17.229.154.43a7.598 7.598 0 000 1.139c.015.2-.059.352-.153.43l-.841.692a1.875 1.875 0 00-.432 2.385l.922 1.597a1.875 1.875 0 002.282.818l1.019-.382c.115-.043.283-.031.45.082.312.214.641.405.985.57.182.088.277.228.297.35l.178 1.071c.151.904.933 1.567 1.85 1.567h1.844c.916 0 1.699-.663 1.85-1.567l.178-1.072c.02-.12.114-.26.297-.349.344-.165.673-.356.985-.57.167-.114.335-.125.45-.082l1.02.382a1.875 1.875 0 002.28-.819l.923-1.597a1.875 1.875 0 00-.432-2.385l-.84-.692c-.095-.078-.17-.229-.154-.43a7.614 7.614 0 000-1.139c-.016-.2.059-.352.153-.43l.84-.692c.708-.582.891-1.59.433-2.385l-.922-1.597a1.875 1.875 0 00-2.282-.818l-1.02.382c-.114.043-.282.031-.449-.083a7.49 7.49 0 00-.985-.57c-.183-.087-.277-.227-.297-.348l-.179-1.072a1.875 1.875 0 00-1.85-1.567h-1.843zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" clip-rule="evenodd" />
        </svg>
        <span class="text-xl font-semibold">Settings</span>
      </div>
    `;
  }

  // Add close button to the title bar if not already present
  const titleContainer = agentSettingsSidebar.querySelector('.dialog-title .inline-flex');
  if (titleContainer) {
    // Check if close button exists
    let closeBtn = titleContainer.querySelector('.close-btn');

    if (!closeBtn) {
      // Create close button if it doesn't exist
      const closeButtonContainer = document.createElement('div');
      closeButtonContainer.className = 'title-right-buttons inline-flex ml-auto';

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className =
        'close-btn items-center py-2 text-xs font-medium text-gray-900 bg-transparent hover:text-gray-600 active:text-gray-900 focus:z-10';
      closeBtn.innerHTML = '<span class="mif-cross"></span>';

      // Add click event to close the sidebar
      closeBtn.onclick = async () => {
        // Added event dispatcher to update the sidebar state in the left sidebar
        window.dispatchEvent(
          new CustomEvent('sidebarStateChanged', {
            detail: {
              rightSidebarOpen: false,
              isSidebarOpen: window?.localStorage?.getItem('sidebarOpen') === 'true',
              currentSidebarTab:
                getCurrentSidebarTab() || window?.localStorage?.getItem('currentSidebarTab'),
            },
          }),
        );
        closeAgentSettingsRightSidebar();
      };

      closeButtonContainer.appendChild(closeBtn);
      titleContainer.appendChild(closeButtonContainer);
    } else {
      // Make sure the close button is visible
      closeBtn.classList.remove('hidden');
    }
  }

  return agentSettingsSidebar;
}

/**
 * Gets the current sidebar tab from the left sidebar using Alpine.js data stack
 * @returns The current sidebar tab
 */
export function getCurrentSidebarTab() {
  const leftSidebarEl = document.getElementById('left-sidebar');
  // Note: _x_dataStack[1] accesses the second Alpine.js data context
  // This may break if Alpine.js internal structure changes
  let currentSidebarTab: string | null = null;

  try {
    const dataStack = (leftSidebarEl as any)?._x_dataStack;
    const alpineData = Array.isArray(dataStack) && dataStack.length > 1 ? dataStack[1] : null;

    if (alpineData && typeof alpineData.currentSidebarTab === 'string') {
      currentSidebarTab = alpineData.currentSidebarTab;
    }
  } catch (error) {
    console.warn('Failed to access Alpine.js sidebar data:', error);
  }

  return currentSidebarTab || '';
}

/**
 * Closes the agent settings sidebar in the right panel
 * @returns {Promise<void>} A promise that resolves when the sidebar has been closed
 */
export async function closeAgentSettingsRightSidebar(): Promise<void> {
  const agentSettingsSidebar = document.querySelector('#agent-settings-sidebar');

  // Close the sidebar container with animation
  agentSettingsSidebar.closest('.sidebar-container').classList.remove('open');

  // Wait for the animation to complete
  await delay(150);

  // Hide the agent settings sidebar
  agentSettingsSidebar.classList.add('hidden');

  // Clear content to free memory
  const contentContainer = agentSettingsSidebar.querySelector('.dialog-content');
  if (contentContainer) {
    contentContainer.innerHTML = '';
  }
}
