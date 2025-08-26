import config from '../../config';
import * as dbg from '../../debugger';
import { closeRightSidebar, createRightSidebar, showOverlay } from '../../ui/dialogs';
import { Workspace } from '../../workspace/Workspace.class';

import { plugins, PluginTarget, PluginType } from '@react/shared/plugins/Plugins';
import {
  renderAgentDeploymentSidebar,
  renderMobileHandler,
} from '@src/builder-ui/ui/react-injects';
import { llmModelsStore } from '@src/shared/state_stores/llm-models';
import { builderPageTutorialWorkflow } from '../../tutorials';
import { popupValuesDialog } from '../../ui/tw-dialogs';
import { delay } from '../../utils';
import { registerCanvasContextMenu } from '../../workspace/CanvasContextMenu';
import { setupAgentAuthScripts } from './agent-auth';
import { setupAgentScripts } from './agent-settings';
import { setupAgentTemplateScripts } from './agent-template';
import { setupComponentsScripts } from './components-menu';
import { handleBuilderReactInjects, setupModals } from './modals';
import { preloadDataScripts } from './preload-data';

declare var Metro, $;
const uiServer = config.env.UI_SERVER;
//let _welcomeDialog = null;
let _agentsListDialog = null;
let _agentReady = false;
let workspace: Workspace;

// TODO: move all the experiments related code to a separate file
const BUTTON_VARIANTS = {
  CONTROL: 'control',
  VARIANT_1: 'variant_1',
  VARIANT_2: 'variant_2',
  VARIANT_3: 'variant_3',
} as const;

const DEBUG_TOGGLE_UI_REFRESH_VARIANTS = {
  CONTROL: 'control',
  VARIANT_1: 'variant_1',
} as const;

// Initialize LLM models store
llmModelsStore.getState().init();

function handleButtonVariants() {
  const buttonContainer = document.querySelector('.nav-action-buttons') as HTMLElement;

  if (!buttonContainer) return;

  // Get all relevant buttons/wrappers
  const testBtnWrapper = document
    .getElementById('btn-emb-chatbot-main-wrapper')
    ?.closest('.relative') as HTMLElement;
  const upgradeBtn = document.getElementById('upgrade-button-topbar') as HTMLElement;
  const shareBtn = document.getElementById('share-agent-button-topbar') as HTMLElement;
  const deployBtn = document.getElementById('deploy-button-topbar') as HTMLElement;

  // Add flex-order support to container
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '1rem'; // Maintain spacing between buttons

  // setButtonStyles({
  //   leftButtons: [testBtnWrapper],
  //   rightButtons: [deployBtn, upgradeBtn, shareBtn],
  //   leftColor: 'green',
  //   rightColor: 'gray',
  // });
}

function handleDebugBarUIExperiment(featureVariant: string) {
  const buttonContainer = document.querySelector('.debug-switcher') as HTMLElement;

  if (!buttonContainer) return;

  const switcherText = document.querySelector('.debug-switcher-text') as HTMLElement;
  // const switchOn = document.querySelector('.debug-switcher .switch-on') as HTMLElement;
  // const switchOff = document.querySelector('.debug-switcher .switch-off') as HTMLElement;

  switch (featureVariant) {
    case DEBUG_TOGGLE_UI_REFRESH_VARIANTS.CONTROL:
      switcherText.classList.add('hidden');
      break;

    case DEBUG_TOGGLE_UI_REFRESH_VARIANTS.VARIANT_1:
      switcherText.classList.remove('hidden');
      // switchOn.classList.add('hidden');
      // switchOff.classList.add('hidden');
      break;
    default:
      switcherText.classList.add('hidden');
      break;
  }
}

interface ButtonStyleOptions {
  leftButtons: HTMLElement[];
  rightButtons: HTMLElement[];
  leftColor: 'gray' | 'green';
  rightColor: 'gray' | 'green';
}

function setButtonStyles({ leftButtons, rightButtons, leftColor, rightColor }: ButtonStyleOptions) {
  // First, reset all buttons to their default state
  const buttonContainer = document.querySelector('.nav-action-buttons') as HTMLElement;
  if (!buttonContainer) return;

  // First reset all buttons and their wrappers
  buttonContainer
    .querySelectorAll('button, a, div.share-agent-button-wrapper, div.relative')
    .forEach((btn) => {
      if (btn) {
        if (btn instanceof HTMLElement) {
          btn.style.order = '';
        }
        btn.classList.remove('order-first', 'order-last', 'ml-auto');
      }
    });

  // Configure container
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '1rem';

  // Set explicit ordering for left buttons
  leftButtons.forEach((btn, index) => {
    if (!btn) return;

    // Handle share button wrapper specifically
    if (btn.classList.contains('share-agent-button-wrapper')) {
      btn.style.order = `${index}`;
      setButtonColor(btn.querySelector('button'), leftColor); // Apply color to the inner button
    } else {
      btn.style.order = `${index}`;
      setButtonColor(btn, leftColor);
    }
  });

  // Set explicit ordering for right buttons
  rightButtons.forEach((btn, index) => {
    if (!btn) return;

    // Handle share button wrapper specifically
    if (btn.classList.contains('share-agent-button-wrapper')) {
      btn.style.order = `${100 + index}`; // Using 100 to ensure clear separation
      setButtonColor(btn.querySelector('button'), rightColor); // Apply color to the inner button
    } else {
      btn.style.order = `${100 + index}`;
      setButtonColor(btn, rightColor);
    }
  });

  // Add margin to first right button
  if (rightButtons[0]) {
    rightButtons[0].classList.add('ml-auto');
  }
}

function setButtonColor(button: HTMLElement, color: 'gray' | 'green') {
  if (!button.classList.contains('no-color-switch')) {
    if (color === 'gray') {
      button.classList.add('bg-gray-50', 'border-gray-200', 'text-gray-900');
      button.classList.remove('bg-primary-100', 'text-white');
    } else {
      button.classList.add('bg-primary-100', 'text-white');
      button.classList.remove('bg-gray-50', 'border-gray-200', 'text-gray-900');
    }
  }
}

// Helper function to determine button type
function getButtonType(button: HTMLElement): string | null {
  if (button.id === 'upgrade-button-topbar') return 'upgrade button';
  if (button.id === 'share-agent-button-topbar') return 'share button';
  if (button.id === 'deploy-button-topbar') return 'deploy button';
  if (button.id === 'btn-emb-chatbot-main-wrapper') return 'test button';
  return null;
}

function runDebugBarUIExperiment() {
  handleDebugBarUIExperiment(DEBUG_TOGGLE_UI_REFRESH_VARIANTS.VARIANT_1);
}

export default async function scripts() {
  showOverlay('Initializing ...');
  const container = document.getElementById('workspace-container');
  if (!container) {
    const overlay = document.getElementById('overlay');
    overlay.style.display = 'none';
    return;
  }
  const nameInput = document.getElementById('agent-name-input') as HTMLInputElement;
  const idInput = document.getElementById('agent-id-input') as HTMLInputElement;
  workspace = Workspace.getInstance({ container, server: uiServer });

  window['workspace'] = workspace;
  workspace.debugger = dbg;

  window['smt'] = {
    redraw: () => {
      workspace.redraw();
    },
  };

  // Setup inspect button to toggle bottom-bar
  const inspectButton = document.getElementById('cmp-inspect-btn');
  const bottomBar = document.getElementById('bottom-bar');
  if (inspectButton && bottomBar) {
    const debugConsoleHeight = localStorage.getItem(`debug-console-height`);
    if (debugConsoleHeight) {
      bottomBar.style.height = debugConsoleHeight;
    }
    inspectButton.addEventListener('click', () => {
      if (bottomBar) {
        // Toggle the 'hidden' class to show/hide the bottom-bar
        bottomBar.classList.toggle('hidden');
      }
    });
  }

  //handle agent
  setupAgentScripts(workspace).then(() => {
    renderAgentDeploymentSidebar({ rootID: 'agent-sidebar-root' });
    setupAgentAuthScripts(workspace);
    setupAgentTemplateScripts(workspace);

    const matchedPlugins = plugins.getPluginsByTarget(
      PluginTarget.BuilderLoadScript,
      PluginType.Function,
    );

    console.log('matchedPlugins:  d', matchedPlugins);
    matchedPlugins.forEach((plugin) => {
      (plugin as any).function(workspace);
    });

    //load Chat Agent Builder
    setupModals(workspace);
  });

  //handle components
  setupComponentsScripts(workspace);

  // Register canvas context menu
  registerCanvasContextMenu(workspace);

  // preload data
  preloadDataScripts(workspace);

  workspace.addEventListener('AgentReady', async (e) => {
    console.log('AgentReady');

    const workflow = builderPageTutorialWorkflow();
    if (workflow) workflow?.start();

    dbg.init();
  });

  // Render mobile handler
  renderMobileHandler({ rootID: 'mobile-handler-root' });

  const agentExplainerBtn = document.querySelector('.agent-explain-btn');
  agentExplainerBtn?.addEventListener('click', async () => {
    const sidebar: HTMLElement = document.querySelector('#right-sidebar');
    const container: HTMLElement = sidebar.querySelector('.container');
    $(container).css('opacity', 0);
    await delay(200);
    createRightSidebar(
      'Generating workflow explanation',
      'Please wait...<br><center><div data-role="activity" data-type="atom" data-style="color"></div></center>',
      null,
    );
    $(container).css('opacity', 1);
    //const result = await axios.get(`${uiServer}/api/agent/${workspace.agentInfo.id}/explain`);
    const result = await fetch(`${uiServer}/api/agent/${workspace.agent.id}/explain`).then((res) =>
      res.json(),
    );
    if (result.success) {
      createRightSidebar('Workflow explanation', result.data, {
        ok: {
          cls: 'success',
          text: 'Close',
          click: async () => {
            $(container).css('opacity', 0);
            closeRightSidebar();
          },
        },
      });
      $(container).css('opacity', 1);
    }
  });

  //pluginsMenuHandler();

  /*
   * Plugin components
   */

  // Handle expandable textarea
  const expandableTextarea = document.querySelectorAll('[data-auto-expand=true]');
  expandableTextarea.forEach((el: HTMLTextAreaElement) => {
    el.addEventListener('focus', async () => {
      if (expandableTextarea['editing']) return; //prevent multiple edits dues to focus event
      const labelElm = document.querySelector(`label[for="${el.id}"]`);

      expandableTextarea['editing'] = true;
      await delay(25); // to make the el?.selectionStart available

      const values: any = await popupValuesDialog({
        title: labelElm?.textContent,
        fields: {
          content: {
            type: 'textarea',
            label: '',
            value: el.value,
            autoSize: false,
            cls: 'h-[300px] overflow-hidden',
            fieldCls: 'h-[300px] overflow-auto text-sm',
          },
        },
        onLoad: async (dialog) => {
          const textarea: HTMLTextAreaElement = dialog.querySelector('#content');
          textarea.placeholder = el?.placeholder;
          textarea.focus();
          textarea.setSelectionRange(el?.selectionStart, el?.selectionEnd);
        },
      });

      // const values = (await editValues({
      //     entriesObject: {
      //         content: {
      //             type: 'textarea',
      //             label: labelElm?.textContent,
      //             value: el.value,
      //             autoSize: false,
      //             cls: 'h-[300px] overflow-hidden',
      //             fieldCls: 'h-[300px] overflow-auto',
      //         },
      //     },
      //     style: {
      //         dialogWidth: 800,
      //     },
      //     focusOption: {
      //         selector: '#content',
      //         cursorPosition: el?.selectionStart,
      //     },
      // })) as { content: string };

      if (values) {
        const { content } = values;
        el.value = content;
      }

      delete expandableTextarea['editing'];
    });
  });

  // handle A/B testing for help button
  // const helpButton = document.querySelector('#help-button') as HTMLElement;
  // if (helpButton) {
  //   if (PostHog.getFeatureFlag('app-help-button') === 'show') {
  //     helpButton.classList.remove('hidden');
  //     helpButton.classList.add('flex');
  //   } else {
  //     helpButton.classList.add('hidden');
  //     helpButton.classList.remove('flex');
  //   }
  // }

  handleButtonVariants();
  runDebugBarUIExperiment();

  handleBuilderReactInjects();
}
