import { errorToast, successToast, warningToast } from '@src/shared/components/toast';
import { Observability } from '@src/shared/observability';
import interact from 'interactjs';
import { jsonrepair } from 'jsonrepair';
import { Component } from './components/Component.class';
import SmythFile from './lib/SmythFile.class';
import { alert, modalDialog } from './ui/dialogs';
import { twModalDialog } from './ui/tw-dialogs';
import { delay } from './utils';
import { getFileCategory, getMimeTypeFromUrl, isURL } from './utils/general.utils';
import { Workspace } from './workspace/Workspace.class';
// import microlight from 'microlight';
// import hljs from 'highlight.js/lib/core';
// import hljs_json from 'highlight.js/lib/languages/json';
// import 'highlight.js/styles/atom-one-dark.css';
// hljs.registerLanguage('json', hljs_json);

import Prism from 'prismjs';
import 'prismjs/components/prism-json.js';
import 'prismjs/themes/prism-okaidia.css';
import { FEATURE_FLAGS } from '../shared/constants/featureflags';
import { SMYTHOS_DOCS_URL } from '../shared/constants/general';
import { EmbodimentRPCManager } from '../shared/services/embodiment_rpc_manager';
import {
  DebugInjectOutputFields,
  getMockData,
  isMockDataEnabled,
} from './components/Component.class/mock-data-handler';
import { COMP_NAMES } from './config';
import {
  enableAllDebugControls,
  updateDebugControls,
  updateDebugControlsOnSelection,
} from './utils/debugger.utils';
import { Monitor } from './workspace/Monitor';

const DEBUG_INJECT_TEXT_EXPERIMENT_VARIANTS = {
  CONTROL: 'control',
  VARIANT_1: 'variant_1',
  VARIANT_2: 'variant_2',
} as const;

const FIX_WITH_AI_EXPERIMENT_VARIANTS = {
  CONTROL: 'control',
  VARIANT_1: 'variant_1',
} as const;

Prism.languages.smythLog = {
  error: {
    pattern: /^Error\s:.*$/m,
    inside: {
      keyword: /^Error/,
    },
    greedy: true,
  },
  // Now include all JSON syntax rules as part of your log language
  json: {
    pattern: /{[^{}]*}/,
    inside: Prism.languages.json,
    greedy: true,
  },
};

// #region TODO: We need to use these functions from data.utils.ts
const isNumber = (str: string): boolean => {
  const numRegex = /^-?\d+(\.\d+)?$/;
  return numRegex.test(str.trim());
};

const isValidNumber = (str: string): boolean => {
  const num = parseFloat(str);
  return (
    !isNaN(num) &&
    num <= Number.MAX_SAFE_INTEGER &&
    num >= Number.MIN_SAFE_INTEGER &&
    num.toString() === str.trim()
  );
};

function parseJson(str: string): string | Record<string, unknown> | null {
  if (!str) return null;

  if (
    (isNumber(str) && !isValidNumber(str)) ||
    (!str.trim().startsWith('{') && !str.trim().startsWith('['))
  )
    return str;

  try {
    return JSON.parse(str);
  } catch (e) {
    try {
      return JSON.parse(jsonrepair(str));
    } catch (e: any) {
      console.error('Error on parseJson: ', e.toString());
      console.error('   Tried to parse: ', str);
      return null;
    }
  }
}
// #endregion

/**
 * Escape a string for use in a regular expression.
 * Used in debug log search so the user can also search for strings like *, /, {, etc.
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

declare var Metro, $;
declare var workspace: Workspace;
const debugSessions = {};

const debugInputs = {};

let DEBUG_ENDPOINT = undefined;
let DEBUG_SERVER = undefined;

let AttachedAgent = undefined;
export function getDebugSessionID() {
  const agent = workspace.agent;
  return debugSessions?.[agent.id]?.sessionID;
}

let initialized = false;
let debugExperimentRun = false;
let fixWithAIEExperimentRun = false;

function toggleSwitch(on: boolean) {
  const debugSwitcher = document.querySelector('.debug-switcher');
  const debugSwitcherContainer: HTMLElement = document.getElementById(
    'debug-switcher-container',
  ) as HTMLElement;
  // const onElement = debugSwitcher.querySelector('.switch-on');
  // const offElement = debugSwitcher.querySelector('.switch-off');
  const debugMenu: HTMLElement = document.getElementById('debug-menu') as HTMLElement;
  const switcherText: HTMLElement = debugSwitcher.querySelector('.debug-switcher-text');
  const pulsingDotContainer: HTMLElement = debugSwitcher.querySelector('.pulsing-dot-container');
  const mifBug: HTMLElement = debugSwitcher.querySelector('.mif-bug');
  const inspectButton = document?.getElementById('cmp-inspect-btn');
  const debugSwitcherMessage = document?.querySelector('.debug-switcher-message');

  if (on) {
    Observability.observeInteraction('debug_button_click', {
      position: 'bottom center of builder',
      type: 'debug',
    });
  }
  // if (switcherText?.classList.contains('hidden')) {
  //   if (on) {
  //     onElement.classList.remove('hidden');
  //     offElement.classList.add('hidden');
  //   } else {
  //     onElement.classList.add('hidden');
  //     offElement.classList.remove('hidden');
  //   }
  // } else {
  if (on) {
    // Use textContent instead of innerText for better cross-browser compatibility
    // debugMenu.classList.remove('hidden');
    debugSwitcherMessage?.classList.remove('hidden');
    debugSwitcherMessage?.classList.add('block');
    pulsingDotContainer.classList.remove('hidden');
    switcherText.textContent = 'Debug On';
    mifBug.classList.add('hidden');
    debugSwitcher.classList.add('active');
    debugSwitcherContainer.classList.add('active');
    updateInspectButtonIcon(inspectButton, true);
  } else {
    // Reset the components state before toggling the debug switch
    resetComponentsState({ resetPinned: true });
    // debugMenu.classList.add('hidden');
    switcherText.textContent = 'Debug Off';
    debugSwitcher.classList.remove('active');
    debugSwitcherContainer.classList.remove('active');
    mifBug.classList.remove('hidden');
    pulsingDotContainer.classList.add('hidden');
    debugSwitcherMessage?.classList.remove('block');
    debugSwitcherMessage?.classList.add('hidden');

    updateInspectButtonIcon(inspectButton, false);
  }
  // }
}

async function _openDebugDialog(event: Event, operation: 'step' | 'run' = 'step') {
  const selectedComponent = workspace.domElement.querySelector('.component.selected');

  if (!selectedComponent) {
    warningToast('No component selected', 'Please select a component');
    return;
  }

  const component = selectedComponent?.['_control'];

  await component.openDebugDialog.call(component, event, operation);
}

function handleDebugButtons(variant: string) {
  const debugBars = document.querySelectorAll('.component .debug-bar');

  debugBars.forEach((debugBar) => {
    const debugBtn: HTMLElement = debugBar.querySelector('.btn-debug');
    const debugLogBtn: HTMLElement = debugBar.querySelector('.btn-debug-log');
    const fixWithAIBtn: HTMLElement = debugBar.querySelector('.btn-fix-with-ai');

    applyDebugButtonStyles(debugLogBtn, fixWithAIBtn);

    // if (debugBtn) {
    //   debugBtn.classList.add('text-sm', 'flex');
    // }

    // debugBar.classList.add(
    //   'cursor-pointer',
    //   'w-[90%]',
    //   'mx-auto',
    //   'text-white',
    //   'variant_2',
    //   'rounded-lg',
    //   'bg-smythos-green-500',
    // );

    const btnDebug: HTMLElement = debugBar.querySelector('.btn-debug');
    if (btnDebug) {
      if (variant === DEBUG_INJECT_TEXT_EXPERIMENT_VARIANTS.VARIANT_1) {
        btnDebug.style.right = '35px';
        btnDebug.insertAdjacentHTML('afterbegin', '<span class="text-white">Debug</span>');
      }
      if (variant === DEBUG_INJECT_TEXT_EXPERIMENT_VARIANTS.VARIANT_2) {
        btnDebug.style.right = '30px';
        btnDebug.insertAdjacentHTML('afterbegin', '<span class="text-white">Click</span>');
      }
    }

    debugBar.addEventListener('click', (e) => {
      e.stopPropagation();
      e.stopImmediatePropagation();
      debugBtn?.click();
    });
  });
}

// Add this function after handleDebugButtons
function applyDebugButtonStyles(debugLogBtn: HTMLElement, fixWithAIBtn: HTMLElement) {
  if (debugLogBtn) {
    debugLogBtn.classList.add('variant_2', 'h-6');
  }

  if (fixWithAIBtn) {
    fixWithAIBtn.classList.add('variant_2', 'h-6');
  }
}

function runDebugInjectButtonExperiment() {
  try {
    const featureVariant = Observability.features.getFeatureFlag(
      FEATURE_FLAGS.DEBUG_INJECT_TEXT_EXPERIMENT,
    ) as string;
    handleDebugButtons(featureVariant);
  } catch (error) {
    console.error('Error on runDebugInjectButtonExperiment: ', error.toString());
  }
}

function runFixWithAIEExperiment() {
  const featureVariant = Observability.features.getFeatureFlag(
    FEATURE_FLAGS.POSTHOG_EXPERIMENT_FIX_WITH_AI,
  ) as string;
  if (featureVariant === FIX_WITH_AI_EXPERIMENT_VARIANTS.VARIANT_1) {
    const debugBars = document.querySelectorAll('.component .debug-bar');
    debugBars?.forEach((debugBar) => {
      const fixWithAIBtn: HTMLElement = debugBar?.querySelector('.btn-fix-with-ai');
      if (fixWithAIBtn) {
        fixWithAIBtn.setAttribute('style', 'display:none !important');
      }
    });
  }
}

export async function init() {
  if (initialized) {
    console.log('Debugger already initialized ... Skipping');
    return;
  }
  //updateServerStatus(false);

  await workspace.waitUnlock(120_000); // 120 seconds max wait time
  // if (workspace?.locked) {
  //     //retry in 3s
  //     setTimeout(init, 3000);
  //     return false;
  // }

  initialized = true;
  console.log('Initializing debugger');
  const debugMenu = document.getElementById('debug-menu');
  const dbgMenuToggle: any = document.getElementById('debug-menu-tgl');
  const dbgStatus: HTMLElement = document.getElementById('debug-status');
  const debugSwitcher = document.querySelector('.debug-switcher');
  //dbgStatus.classList.add('hidden');

  function toggleDebugMenu() {
    dbgMenuToggle.checked = !dbgMenuToggle.checked;
    const event = new Event('change', { bubbles: true });
    dbgMenuToggle.dispatchEvent(event);

    if (dbgMenuToggle.checked && !debugExperimentRun) {
      runDebugInjectButtonExperiment();
      debugExperimentRun = true;
    }
  }

  debugSwitcher?.addEventListener('click', toggleDebugMenu);

  debugMenu?.addEventListener('click', () => {
    if (!dbgMenuToggle.checked) {
      toggleDebugMenu();
    }
  });

  dbgMenuToggle?.addEventListener('change', () => {
    stopDebugSession(); //Always stop debug when the button is toggled in order to prevent debug sessions conflicts
    if (dbgMenuToggle?.checked) {
      toggleSwitch(true);
      dbgStatus.classList.remove('hidden');
      debugMenu.classList.remove('hidden');

      //disabled auto-attach on toggle
      //if (workspace?.agent?.id) attachLiveDebugSession(workspace?.agent?.id, 1);
    } else {
      toggleSwitch(false);
      // comment this out for now until we have a better way to handle this
      // debugMenu.classList.add('hidden');
      dbgStatus.classList.add('hidden');
    }

    [...document.querySelectorAll('.debug-btn')].forEach((el: HTMLElement) => {
      if (dbgMenuToggle?.checked) {
        el.removeAttribute('disabled');
        workspace.domElement.classList.add('debug-enabled');
      } else {
        el.setAttribute('disabled', 'true');
        workspace.domElement.classList.remove('debug-enabled');
        stopDebugSession();
        dbgStatus.classList.add('hidden');
      }
    });
    workspace.saveAgent();
    setTimeout(() => {
      //workspace.redraw();
      repaintDebugComponentsAfter();
      updateDebugControlsOnSelection();
    }, 500);
  });

  if (workspace.agent.data.debugSessionEnabled) {
    dbgMenuToggle.checked = true;
    const event = new Event('change', { bubbles: true });
    dbgMenuToggle.dispatchEvent(event);

    dbgStatus.classList.remove('hidden');
    [...document.querySelectorAll('.debug-btn')].forEach((el: HTMLElement) => {
      el.removeAttribute('disabled');
      workspace.domElement.classList.add('debug-enabled');
    });
    setTimeout(() => {
      //workspace.redraw();
      repaintDebugComponentsAfter();
      if (workspace?.agent?.id) {
        //force stop any existing debug session to avoid conflicts
        stopDebugSession();
      }

      if (!debugExperimentRun) {
        runDebugInjectButtonExperiment();
        debugExperimentRun = true;
      }

      if (!fixWithAIEExperimentRun) {
        runFixWithAIEExperiment();
        fixWithAIEExperimentRun = true;
      }

      //disabled auto-attach on startup
      // if (workspace?.agent?.id) {
      //   attachLiveDebugSession(workspace?.agent?.id, 1);
      // }
    }, 500);
  }

  const runBtn = document.getElementById('debug-menubtn-run');
  const stepBtn = document.getElementById('debug-menubtn-step');
  const stopBtn = document.getElementById('debug-menubtn-stop');
  const attachBtn = document.getElementById('debug-menubtn-attach');
  runBtn?.addEventListener('click', async (event) => {
    console.log('debug run');
    Observability.observeInteraction('debug_button_click', {
      position: 'bottom center of builder',
      type: 'run',
    });
    const playIcon = runBtn.querySelector('.mif-play');
    const stopIcon = runBtn.querySelector('.mif-pause');
    const isRunning = runBtn.classList.contains('running');
    // const label = runBtn.querySelector('.label');

    const agent = workspace.agent;
    if (!debugSessions?.[agent.id]?.sessionID) {
      await _openDebugDialog(event, 'run');
    }

    if (isRunning) {
      const runTooltipLabel = document.querySelector('#tooltip-run');
      runTooltipLabel.innerHTML = 'Run';

      runBtn.classList.remove('running');
      playIcon.classList.remove('hidden');
      stopIcon.classList.add('hidden');

      stepBtn.removeAttribute('disabled');
      attachBtn.removeAttribute('disabled');
      stopBtn.removeAttribute('disabled');
    } else {
      // label.innerHTML = 'Pause';
      // //runBtn.classList.add('running');
      // playIcon.classList.add('hidden');
      // stopIcon.classList.remove('hidden');

      // stepBtn.setAttribute('disabled', 'true');
      // attachBtn.setAttribute('disabled', 'true');
      // stopBtn.setAttribute('disabled', 'true');
      const { result } = await runDebug();
      // Show deploy agent toast if the workflow executed successfully until the last component
      if (!result?.errorOccurred && result?.states?.sessionClosed) {
        showDeployAgentToast();
      }
    }
  });
  stepBtn.addEventListener('click', async (event) => {
    console.log('debug Step');
    Observability.observeInteraction('debug_button_click', {
      position: 'bottom center of builder',
      type: 'step',
    });
    const agent = workspace.agent;
    if (!debugSessions?.[agent.id]?.sessionID) {
      _openDebugDialog(event, 'step');
      return;
    }

    // ! Deprecated: will be removed (we handle debug controls with updateDebugControls() function)
    // const runBtn = document.getElementById('debug-menubtn-run');
    // const stepBtn = document.getElementById('debug-menubtn-step');
    // const attachBtn = document.getElementById('debug-menubtn-attach');
    // const stopBtn = document.getElementById('debug-menubtn-stop');

    // runBtn.setAttribute('disabled', 'true');
    // stepBtn.setAttribute('disabled', 'true');
    // attachBtn.setAttribute('disabled', 'true');
    // stopBtn.setAttribute('disabled', 'true');

    updateDebugControls({
      step: { enable: false },
      run: { enable: false },
      stop: { enable: true },
      attach: { enable: false },
    });

    try {
      const debugStepResult: any = await runDebugStep(agent.id);
      const sessionID = debugStepResult?.sessionID;
      if (sessionID) {
        const result = await processDebugStep(debugStepResult?.result?.newState, agent.id);

        // Show deploy agent toast if the workflow executed successfully until the last component
        if (!result?.errorOccurred && result?.states?.sessionClosed) {
          showDeployAgentToast();
        }
      } else {
        errorToast(
          'Debug session terminated unexpectedly. Check logs for details.',
          'Debug Interrupted',
        );
        setDebugMessage();
      }
    } finally {
      enableAllDebugControls();
    }

    // ! Deprecated: will be remove (we handle debug controls with enableAllDebugControls() function)
    // runBtn.removeAttribute('disabled');
    // stepBtn.removeAttribute('disabled');
    // attachBtn.removeAttribute('disabled');
    // stopBtn.removeAttribute('disabled');
  });

  attachBtn.addEventListener('click', async (e) => {
    //attach to a live debug session
    Observability.observeInteraction('debug_button_click', {
      position: 'bottom center of builder',
      type: 'attach',
    });
    log('Attaching to live debug session ...');
    const agent = workspace.agent;
    if (!agent) return;

    updateDebugControls({
      step: { enable: false },
      run: { enable: false },
      stop: { enable: false },
      attach: { enable: false },
    });

    const dbgSession = await attachLiveDebugSession(agent.id, 1);
    if (dbgSession) {
      successToast('Successfully attached to action', 'Debug Session Attached');
      log('Successfully attached to action');
    } else {
      errorToast('Failed to attach debugger', 'No active session found');
      log('Failed to attach debugger, No active session found');
    }

    // const sessionID = await prompt('Enter debug session ID');
    // if (!sessionID) return;
    // //first we stop the current debug session
    // //TODO : ask the user before stopping the current session
    // workspace.debugger.stopDebugSession();
    // const result = await workspace.debugger.readDebugStep(workspace.agent.id, sessionID);
    // if (!result.attached) {
    //     toast('Cannot attach to this session.<br />Make sure that the session ID is valid and that the corresponding agent is loaded', 'warning');
    // }

    // AttachedAgent = workspace.agent.id;
  });

  document.getElementById('debug-menubtn-stop').addEventListener('click', async (e) => {
    Observability.observeInteraction('debug_button_click', {
      position: 'bottom center of builder',
      type: 'stop',
    });
    stopDebugSession();

    runBtn.removeAttribute('disabled');
    stepBtn.removeAttribute('disabled');
    attachBtn.removeAttribute('disabled');
    stopBtn.removeAttribute('disabled');

    warningToast('Debug session stopped. Review and re-initiate if needed.', 'Debug Stopped');
    setDebugMessage();
  });

  updateServerStatus();

  handleEmbodimentRPCDebug();

  checkWeaverAvailability();
}

function checkWeaverAvailability() {
  const currentSidebarTab = localStorage.getItem('currentSidebarTab');
  const sidebarOpen = localStorage.getItem('sidebarOpen');
  // Switch to components if weaver is not enabled
  if (
    (!sidebarOpen || sidebarOpen === 'true') &&
    currentSidebarTab === 'agentBuilderTab' &&
    window?.SMYTHOS_EDITION !== 'enterprise'
  ) {
    setSidebarTab('buildTab');
  }
}

function setSidebarTab(tab) {
  localStorage.setItem('currentSidebarTab', tab);
  localStorage.setItem('previousTab', null);
  window.dispatchEvent(
    new CustomEvent('sidebarStateChanged', {
      detail: {
        isSidebarOpen: true,
        currentSidebarTab: tab,
        rightSidebarOpen: false,
      },
    }),
  );
}

function waitDebugStep() {
  return new Promise((resolve) => {
    const stepBtn = document.getElementById('debug-menubtn-step');
    const interval = setInterval(() => {
      const stepAttribute = stepBtn.getAttribute('disabled');
      if (!stepAttribute) {
        clearInterval(interval);
        resolve(true);
      }
    }, 100);
  });
}

export function log(message) {
  const domLogElt = document.querySelector('#debug-status pre');
  //prepend the new message
  domLogElt.innerHTML = message + '\n' + domLogElt.innerHTML;
}

export async function runDebug() {
  const runBtn = document.getElementById('debug-menubtn-run');
  const playIcon = runBtn.querySelector('.mif-play');
  const stopIcon = runBtn.querySelector('.mif-pause');
  const stepBtn = document.getElementById('debug-menubtn-step');
  const attachBtn = document.getElementById('debug-menubtn-attach');
  const stopBtn = document.getElementById('debug-menubtn-stop');
  const runTooltipLabel = document.querySelector('#tooltip-run');
  runTooltipLabel.innerHTML = 'Pause';
  //runBtn.classList.add('running');
  playIcon.classList.add('hidden');
  stopIcon.classList.remove('hidden');

  stepBtn.setAttribute('disabled', 'true');
  attachBtn.setAttribute('disabled', 'true');
  stopBtn.setAttribute('disabled', 'true');

  let isRunning = runBtn.classList.contains('running');

  if (isRunning) return;
  runBtn.classList.add('running');
  isRunning = true;

  Observability.observeInteraction('app_run_agent', {});

  let sessionID;
  let processComponents = true;
  let workflowStatus = 'success';
  let result;

  while (isRunning) {
    const agent = workspace.agent;
    if (!debugSessions?.[agent.id]?.sessionID) break;

    let debugStepResult;
    if (processComponents) {
      debugStepResult = await runDebugStep(agent.id);
      sessionID = debugStepResult?.sessionID;
    }

    if (!sessionID) {
      errorToast(
        'Debug session terminated unexpectedly. Check logs for details.',
        'Debug Interrupted',
      );
      workflowStatus = 'failed';
      setDebugMessage();
      break;
    }

    //if newState is included no need to send a read request
    result = await processDebugStep(debugStepResult?.result?.newState, agent.id);
    const activeComponents = Object.values(result.states.state).filter((c: any) => c.active);
    console.log(activeComponents);
    processComponents = activeComponents.length > 0;

    if (result?.error) workflowStatus = 'failed';

    if (result.error || result.sessionClosed || result?.states?.sessionClosed) {
      break;
    }
    isRunning = runBtn.classList.contains('running');
  }
  console.log('debug run end');

  Observability.observeInteraction('app_workflow_test_completed', {
    status: workflowStatus,
    source: 'debugger',
  });

  runTooltipLabel.innerHTML = 'Run';
  runBtn.classList.remove('running');
  playIcon.classList.remove('hidden');
  stopIcon.classList.add('hidden');

  stepBtn.removeAttribute('disabled');
  attachBtn.removeAttribute('disabled');
  stopBtn.removeAttribute('disabled');

  return { result };
}

function waitRunningDebug() {
  return new Promise((resolve) => {
    const runBtn = document.getElementById('debug-menubtn-run');
    const interval = setInterval(() => {
      let isRunning = runBtn.classList.contains('running');
      if (!isRunning) {
        clearInterval(interval);
        resolve(true);
      }
    }, 100);
  });
}

function handleEmbodimentRPCDebug() {
  const rpcFunctions = {
    debugLastAction: async () => {
      const dbgMenuToggle: any = document.getElementById('debug-menu-tgl');

      if (dbgMenuToggle && !dbgMenuToggle.checked) return;

      if (rpcFunctions.debugLastAction['running']) return;
      rpcFunctions.debugLastAction['running'] = true;
      try {
        updateChatbotStatus('Debugger:Attaching...');
        let retries = 3;
        console.log('Waiting for debugger to be ready ...');
        await waitRunningDebug();

        console.log('Waiting previous session to close ...');
        await waitSessionClose(workspace.agent.id);

        //await delay(500);
        console.log('debugger ready, trying to attach ...');
        //const dbgActionBtn: HTMLButtonElement = document.querySelector('button.btn-debug-last-action');
        //if (dbgActionBtn) dbgActionBtn.click();
        const dbgSession = await attachLiveDebugSession(workspace.agent.id, 10);

        if (dbgSession) {
          updateChatbotStatus(
            'Debug is attached. Interact with the debug controls to proceed with debugging your agent',
          );
          //toast('Successfully attached to action');
          log('Successfully attached to action');
        } else {
          errorToast('Failed to attach debugger', 'No active session found');
          log('Failed to attach debugger');
        }
      } catch (e) {
        console.error('debugLastAction', e);
      }
      rpcFunctions.debugLastAction['running'] = false;
    },
  };

  //make sure that this event is bound only once
  window.onmessage = function (event) {
    const testDomain = `${workspace.agent.id}.${workspace.serverData.agent_domain}`
      .split(':')[0]
      .trim();

    const agentUrl = `${testDomain}`;
    // Check the origin to make sure we're receiving a message from the expected domain
    // console.log('Received message from parent:', event.data, event.origin, event);
    const origin = event.origin.replace('https://', '').replace('http://', '').split(':')[0].trim();
    if (origin !== agentUrl) return;
    try {
      const jsonRPC = JSON.parse(event.data);
      if (jsonRPC.function && typeof rpcFunctions[jsonRPC.function] === 'function') {
        const args = jsonRPC.args || [];
        rpcFunctions[jsonRPC.function].apply(null, args);
      } else {
        console.error('Invalid jsonRPC call', jsonRPC);
      }
    } catch (e) {
      console.error('Invalid jsonRPC call', e);
    }
  };
}

async function updateServerStatus(enableDebugger = true) {
  await workspace.waitServerData();
  // const serverStatusElement: HTMLElement = document.querySelector('#server-status span.status');
  //const url = `${workspace.server}/api/status`;
  //const result = await fetch(url).then((res) => res.json());

  //const status = this.serverData.baseUrl ? 'Online' : 'Offline';
  // serverStatusElement.innerHTML = workspace.serverData.status;
  DEBUG_ENDPOINT = workspace.serverData.dbgUrl + '/api';
  DEBUG_SERVER = workspace.serverData.dbgUrl;
  // serverStatusElement.className = 'status ' + workspace.serverData.status.toLowerCase();

  console.log('DBG Server Status:', workspace.serverData.status.toLowerCase());

  if (!enableDebugger) return;

  const debuggerButton = document.querySelector('.debug-switcher') as HTMLButtonElement;

  if (workspace.serverData.status.toLowerCase() === 'offline') {
    document.querySelectorAll('#debug-menu .debugger').forEach((e) => {
      $(e).removeClass('flex').addClass('hidden');
    });

    debuggerButton.disabled = true;
    debuggerButton.style.opacity = '0.5';

    document.querySelectorAll('#debug-menu .no-debugger').forEach((e) => {
      $(e).addClass('flex').removeClass('hidden');
    });
  } else {
    document.querySelectorAll('#debug-menu .debugger').forEach((e) => {
      $(e).removeClass('hidden').addClass('flex');
    });

    debuggerButton.disabled = false;
    debuggerButton.style.opacity = '1';

    document.querySelectorAll('#debug-menu .no-debugger').forEach((e) => {
      $(e).addClass('hidden').removeClass('flex');
    });
  }
}

async function readDebugInfo(agentID, sessionID) {
  const dbgUrl = DEBUG_ENDPOINT + '?read';
  const headers = {
    'Content-type': 'application/json; charset=UTF-8',
    'X-AGENT-ID': agentID,
    'X-DEBUG-READ': sessionID,
  };
  if ((window as any).currentMonitorId) {
    headers['X-MONITOR-ID'] = (window as any).currentMonitorId;
  }
  let result = await fetch(dbgUrl, {
    method: 'POST',
    headers,
  }).then((res) => res.json());

  // #region[mock_data] Mutate Result for Mock Data
  try {
    const componentIDs = Object.keys(result.state);
    const mockedResult = JSON.parse(JSON.stringify(result));

    for (const componentID of componentIDs) {
      const mockDataEnabled = await isMockDataEnabled(componentID);

      if (mockDataEnabled) {
        // When mock data is enabled, we need to mutate the result to attach a _debug info to the result
        // to indicate that the response is generated with mock data.
        const state = mockedResult.state?.[componentID];

        if (state?.output && state?.output?.constructor === Object) {
          mockedResult.state[componentID].output._debug =
            'Response generated using mock data. Please disable mock data to see actual response.';

          result = mockedResult;
        }
      } else if (
        Object.keys(mockedResult.state?.[componentID]?.output || {})?.length > 0 &&
        !mockedResult.state?.[componentID].output._debug
      ) {
        // When output is configured from debug window, we need to attach a _debug info to the result
        // to indicate that the response is generated with configured output data.
        mockedResult.state[componentID].output._debug =
          'Response generated with configured output data.';

        result = mockedResult;
      }
    }
  } catch {
    console.warn('Error mutating result for inject/mock output data');
  }
  // #endregion[mock_data]

  return result;
}

function waitSessionClose(agentID) {
  return new Promise((resolve) => {
    setInterval(() => {
      let sessionID = debugSessions[agentID]?.sessionID;
      if (!sessionID) return resolve(true);
    }, 1000);
  });
}

export async function attachLiveDebugSession(agentID, maxRetries = 1) {
  let retries = maxRetries;
  let dbgSession;
  let moreWait = 0;
  while (!dbgSession && retries > 0) {
    await delay(100 + moreWait);
    const activeDebug = document.querySelectorAll('.component.dbg-active');
    if (activeDebug.length > 0) {
      console.log('attachLiveDebugSession canceled, there is already an active debug session');
      break;
    }
    dbgSession = await _attachLiveDebugSession(workspace.agent.id);
    retries--;
    if (!dbgSession && retries > 0) {
      console.log('Attach failed, retrying ...');
      moreWait += 500;
    }
  }

  setTimeout(() => {
    const activeComponent = [...document.querySelectorAll('.component.dbg-active')].filter(
      (c) => c.classList.contains('dbg-always-active') === false,
    )[0];
    workspace.scrollToComponent(activeComponent);

    updateDebugControls({
      step: { enable: !!dbgSession },
      run: { enable: !!dbgSession },
      stop: { enable: !!dbgSession },
      attach: { enable: !dbgSession },
    });
  }, 1000);

  return dbgSession;
}

//Live debug session is typically initiated from embodiments, but can be triggered from outside
async function _attachLiveDebugSession(agentID) {
  console.log('attachLiveDebugSession', agentID);
  clearDebugUIInfo();

  if (AttachedAgent != agentID) {
    await stopDebugSession();
    await delay(200);
  }

  const dbgUrl = `${DEBUG_SERVER}/debugSession/${agentID}`;

  const result = await fetch(dbgUrl).then((res) => res.json());
  console.log('getLiveDebugSession', result);

  const SessionID = result.dbgSession;

  if (SessionID) {
    const dbgResult = await processDebugStep(null, workspace.agent.id, SessionID);
    if (!dbgResult.attached) {
      warningToast(
        'Cannot attach to this session.<br />Make sure that the session ID is valid and that the corresponding agent is loaded',
        'Invalid Debug Session',
      );
      log('Cannot attach to session ' + SessionID);
    }
  }

  AttachedAgent = agentID;

  return SessionID;
}

function updateChatbotStatus(status) {
  // const iframe = document.querySelector('#chatbot-iframe') as HTMLIFrameElement;
  // if (iframe) {
  //   iframe.contentWindow.postMessage(
  //     JSON.stringify({ function: 'updateStatus', args: [status] }),
  //     '*',
  //   );
  // }
  EmbodimentRPCManager.send({ function: 'updateStatus', args: [status] }, ['chatbot']);
}

function JSONExpression(obj, propertyString) {
  const properties = propertyString.split(/\.|\[|\]\.|\]\[|\]/).filter(Boolean);
  let currentProperty = obj;

  for (let property of properties) {
    if (currentProperty === undefined || currentProperty === null) {
      return undefined;
    }

    currentProperty = currentProperty[property];
  }

  return currentProperty;
}

function getFormattedContent(content, compName?) {
  let isPreviewable = false;
  let previewBtn = '';

  const isPreviewableUrl = (url) => isSmythFileObject(url) || isSmythFileUrl(url) || isUrl(url);

  const isImageGenerator = compName === COMP_NAMES.imageGenerator;

  if (
    (Array.isArray(content) && content.some(isPreviewableUrl)) ||
    isPreviewableUrl(content) ||
    isImageGenerator
  ) {
    isPreviewable = true;
  }

  if (isPreviewable) {
    previewBtn = `<div class="text-center"><a href="#" class="w-[100px] px-3 py-1 text-xs font-medium text-center text-white bg-blue-700 rounded-md hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 btn-file-preview" data-is-image-generator="${isImageGenerator}">${'Preview'}</a></div>`;
  }

  //convert escaped newlines to real newlines
  let rawContent = typeof content != 'string' ? JSON.stringify(content, null, 2) : content;
  rawContent = rawContent.replace(/\\n/g, '\n');

  // Escape HTML content to prevent XSS attacks when displaying Web Scrape output
  const escapedContent = rawContent === '' ? '[empty string]' : escapeHTML(rawContent);

  content = `<textarea readonly class="dbg dbg-textarea text-gray-800">${escapedContent}</textarea>${previewBtn}`;

  return content;
}

function disableComponentEndpoints(component: HTMLElement) {
  component.querySelectorAll('.smyth.endpoint').forEach((element: any) => {
    const id = element.id;
    element.classList.add('disabled-endpoint');
    element.endpoint.canvas.style.display = 'none';
  });
}

function enableComponentEndpoints(component: HTMLElement) {
  component.querySelectorAll('.smyth.endpoint').forEach((element: any) => {
    const id = element.id;
    element.classList.remove('disabled-endpoint');
    element.endpoint.canvas.style.display = '';
  });
}

function togglePinning(div, action) {
  if (!action) return;

  if (action === 'pin') {
    div.classList.add('pinned');
    div.closest('.endpoint').classList.add('pinned');
  } else if (action === 'toggle') {
    div.classList.toggle('pinned');
    div.closest('.endpoint').classList.toggle('pinned');
    if (!div.classList.contains('pinned')) {
      div.removeAttribute('style'); //reset styles
    }
  }

  const parentComponent = div.closest('.component');
  const pinnedElements = [...parentComponent.querySelectorAll('.pinned')];

  if (pinnedElements.length > 0) {
    disableComponentEndpoints(parentComponent);
    parentComponent.style.zIndex = 500;
  } else {
    enableComponentEndpoints(parentComponent);
    parentComponent.style.zIndex = '';
  }
}

// Helper functions to identify different types of content
function isSmythFileObject(item: unknown): boolean {
  return SmythFile.isSmythFileObject(item);
}
function isSmythFileUrl(item: unknown): boolean {
  return typeof item === 'string' && item.startsWith('smythfs://');
}
function isUrl(item: unknown): boolean {
  return typeof item === 'string' && isURL(item);
}

/**
 * Processes file content from textarea and returns files with their metadata
 * @param textContent The text content to process
 * @returns Array of file objects with name, url, and mimeType
 */
async function processFileContent(
  textContent: string,
): Promise<Array<{ name: string; url: string; mimetype: string }>> {
  try {
    let parsedContent;

    try {
      parsedContent = JSON.parse(textContent);
    } catch {
      // If JSON parsing fails, treat the content as a plain string
      parsedContent = textContent.trim();
    }

    // Helper functions to convert different types to standardized file objects
    const smythFileToOutput = (file: any): { name: string; url: string; mimetype: string } => ({
      name: file.name || '',
      url: `${DEBUG_SERVER}/file-proxy?url=${file.url}`,
      mimetype: file.mimetype || '',
    });

    const smythFileUrlToOutput = (
      url: string,
    ): { name: string; url: string; mimetype: string } => ({
      name: '',
      url: `${DEBUG_SERVER}/file-proxy?url=${url}`,
      mimetype: '',
    });

    const urlToOutput = (url: string): { name: string; url: string; mimetype: string } => ({
      name: '',
      url,
      mimetype: '',
    });

    // Process array content
    if (Array.isArray(parsedContent)) {
      // Process in priority order: Smyth files, Smyth file URLs, regular URLs
      if (parsedContent.some(isSmythFileObject)) {
        return parsedContent.filter(isSmythFileObject).map(smythFileToOutput);
      }

      if (parsedContent.some(isSmythFileUrl)) {
        return parsedContent
          .filter(isSmythFileUrl)
          .map((url) => smythFileUrlToOutput(url as string));
      }

      if (parsedContent.some(isUrl)) {
        return parsedContent.filter(isUrl).map((url) => urlToOutput(url as string));
      }
    }
    // Process single item content
    else {
      if (isSmythFileObject(parsedContent)) {
        return [smythFileToOutput(parsedContent)];
      }

      if (isSmythFileUrl(parsedContent)) {
        return [smythFileUrlToOutput(parsedContent as string)];
      }

      if (isUrl(parsedContent)) {
        return [urlToOutput(parsedContent as string)];
      }
    }

    // If no valid content was found
    return [];
  } catch (error) {
    console.error('Error processing file content:', error);
    return [];
  }
}

/**
 * Determines file type from file object or URL
 */
async function getFileType(file: any, fileUrl: string) {
  if (file?.mimetype) {
    return getFileCategory(file.mimetype);
  }
  try {
    const mimetype = await getMimeTypeFromUrl(fileUrl);
    return getFileCategory(mimetype);
  } catch (e) {
    return 'unknown';
  }
}

/**
 * Generates HTML for a single file preview
 */
function generateFilePreviewHTML(
  fileType: string,
  fileUrl: string,
  fileName: string,
  removeLoader: string,
) {
  const commonButtonClasses =
    'btn btn-primary font-medium text-sm text-gray-400 dark:text-gray-500 hover:underline';

  switch (fileType) {
    case 'image':
      return `
        <div class="image-container p-2">
          <div class="text-sm font-medium mb-2 text-gray-500">${fileName}</div>
          <div class="w-full flex justify-center bg-gray-100 rounded-lg relative">
            <img
              src="${fileUrl}"
              alt="${fileName}"
              class="max-w-full max-h-[80vh] object-contain rounded-lg"
              onerror="${removeLoader}"
              onload="${removeLoader}"
            />
          </div>
          <div class="text-center mt-2 flex justify-between gap-2">
            <a href="${fileUrl}" target="_blank" class="${commonButtonClasses}">Open in new tab</a>
            <a href="${fileUrl}" download="${fileName}" class="${commonButtonClasses}">Download</a>
          </div>
        </div>`;

    case 'audio':
      return `
        <div class="audio-container p-2">
          <audio controls src="${fileUrl}" class="max-w-full m-auto" onerror="${removeLoader}" oncanplay="${removeLoader}"></audio>
          <div class="text-center mt-2">
            <a href="${fileUrl}" target="_blank" class="${commonButtonClasses}">Open in new tab</a>
          </div>
        </div>`;

    case 'video':
      return `
        <div class="video-container p-2">
          <video controls class="max-w-full m-auto" onerror="${removeLoader}" oncanplay="${removeLoader}">
            <source src="${fileUrl}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
          <div class="text-center mt-2">
            <a href="${fileUrl}" target="_blank" class="${commonButtonClasses}">Open in new tab</a>
          </div>
        </div>`;

    case 'pdf':
      return `
        <div class="pdf-container p-2">
          <div class="text-sm font-medium mb-2 text-gray-500">${fileName}</div>
          <div class="w-full h-[80vh] bg-gray-100 rounded-lg relative">
            <iframe
              src="${fileUrl}#toolbar=0"
              class="w-full h-full rounded-lg"
              type="application/pdf"
              onerror="${removeLoader}"
              onload="${removeLoader}"
            ></iframe>
          </div>
          <div class="text-center mt-2 flex justify-between gap-2">
            <a href="${fileUrl}" target="_blank" class="${commonButtonClasses}">Open in new tab</a>
            <a href="${fileUrl}" download="${fileName}" class="${commonButtonClasses}">Download</a>
            </div>
          </div>`;

    default:
      return `
          <div class="file-container p-2">
            <div class="text-sm font-medium mb-2 text-gray-700">${fileName}</div>
            <div class="text-center">
              <a href="${fileUrl}" target="_blank" download="${fileName}" class="btn btn-primary font-medium text-blue-600 dark:text-blue-500 hover:underline">Download File</a>
            </div>
          </div>`;
  }
}

/**
 * Shows preview dialog with file content
 */
function showPreviewDialog(content: string) {
  modalDialog(
    'File Preview',
    `${content}<div class="h-1 mt-1">
      <div data-role="progress" data-type="line" data-small="true" data-cls-back="bg-gray-300" class="file-preloader h-1"></div>
    </div>`,
    {
      Close: {
        class: 'border border-gray-700 hover:opacity-75',
        handler: () => {},
      },
    },
    {
      onShow: () => {
        if (document.querySelector('.fallback-file-download-link')) {
          document.querySelector('.file-preloader')?.remove();
        }
      },
    },
  );
}

/**
 * Main preview handler function
 * @todo This preview handler should be moved to a dedicated file to improve code organization and maintainability.
 * Consider creating a new file like 'file-preview-handler.ts' to handle all preview-related functionality.
 */
async function previewHandler(event: Event) {
  event.preventDefault();

  const buttonElm = event.target as HTMLAnchorElement;

  // Disable the button and show loading state
  const originalText = buttonElm.textContent || 'Preview';
  buttonElm.textContent = '...';
  buttonElm.classList.add('opacity-50', 'cursor-not-allowed');
  buttonElm.setAttribute('disabled', 'true');

  try {
    const removeLoader = `document.querySelector('.file-preloader')?.remove()`;

    const parentTextarea = buttonElm
      .closest('.dbg-element')
      ?.querySelector('.dbg-textarea') as HTMLElement;
    if (!parentTextarea) {
      throw new Error('Parent textarea not found');
    }

    // TODO: remove image component component checking when we return smythfs url for ImageGenerator components
    const isImageComponent = buttonElm.getAttribute('data-is-image-generator') === 'true';
    const _fileType = isImageComponent ? 'image' : '';

    const textContent = parentTextarea.textContent;
    const files = await processFileContent(textContent);

    let content: string;

    // When we have more than one file, we need to generate a gallery of previews
    if (files.length > 1) {
      const elements = await Promise.all(
        files.map(async (file, index) => {
          const fileName = file?.name || `File ${index + 1}`;
          const fileUrl = file?.url;
          const fileType = _fileType || (await getFileType(file, fileUrl));
          return generateFilePreviewHTML(fileType, fileUrl, fileName, removeLoader);
        }),
      );

      content = `
      <div class="file-gallery grid grid-cols-2 gap-4">
        ${elements.join('')}
      </div>`;
    } else if (files.length === 1) {
      const file = files[0];
      const fileUrl = file.url;
      const fileName = file.name || 'File';
      const fileType = _fileType || (await getFileType(file, fileUrl));
      content = generateFilePreviewHTML(fileType, fileUrl, fileName, removeLoader);
    } else {
      throw new Error('No valid files found to preview');
    }

    showPreviewDialog(content);
  } catch (error) {
    console.error('Preview error:', error);
    // Show error message to user
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate preview';
    alert(`Preview failed: ${errorMessage}`);
  } finally {
    // Re-enable the button and restore original text
    buttonElm.textContent = originalText;
    buttonElm.classList.remove('opacity-50', 'cursor-not-allowed');
    buttonElm.removeAttribute('disabled');
  }
}

function showOutputInfo(outputEndpoint, outputContent, compName?) {
  //console.log('showOutputInfo', outputContent);
  let div = outputEndpoint.querySelector('.dbg-element.dbg-output');

  if (!div) {
    div = document.createElement('div');
    outputEndpoint.appendChild(div);
  }

  let outputValue = '';
  if (outputContent === '') outputValue = '[empty string]';
  else if (outputContent === null) outputValue = '[null]';
  else
    outputValue =
      typeof outputContent != 'string' ? JSON.stringify(outputContent, null, 2) : outputContent;

  const formattedContent = outputContent
    ? getFormattedContent(outputContent, compName)
    : outputContent + '';

  div.innerHTML = `<button class="pin button primary"><span class="mif-pin icon"></span></button>${formattedContent}`;
  div.className = 'dbg-element dbg-output';

  // keep the pinning state if the debugger window is already pinned
  const isPinned = div.closest('.endpoint')?.classList.contains('pinned');
  togglePinning(div, isPinned ? 'pin' : '');

  div.querySelector('.pin').onclick = async (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    togglePinning(div, 'toggle');
  };

  // Handle file preview
  div.querySelector('.btn-file-preview')?.addEventListener('click', previewHandler);

  // Add event listeners to clear text selection when hover window closes
  const endpoint = div.closest('.endpoint');
  const dbgTextarea = div.querySelector('.dbg-textarea');

  if (endpoint && dbgTextarea && !endpoint.classList.contains('pinned')) {
    // Clear selection when mouse leaves the endpoint (hover window closes)
    const clearSelectionHandler = async () => {
      // Only clear if selection is within this debug textarea
      const selection = window.getSelection();
      if (
        selection &&
        selection.toString() &&
        selection.anchorNode &&
        (dbgTextarea.contains(selection.anchorNode) || dbgTextarea.contains(selection.focusNode))
      ) {
        selection.removeAllRanges();
      }
    };

    endpoint.addEventListener('mouseleave', clearSelectionHandler);

    // Also clear selection when clicking outside the debug element
    document.addEventListener('click', async (e) => {
      if (!div.contains(e.target as Node) && !endpoint.classList.contains('pinned')) {
        const selection = window.getSelection();
        if (
          selection &&
          selection.toString() &&
          selection.anchorNode &&
          (dbgTextarea.contains(selection.anchorNode) || dbgTextarea.contains(selection.focusNode))
        ) {
          selection.removeAllRanges();
        }
      }
    });
  }

  outputEndpoint.querySelector('.name').classList.add('dbg-info');
  outputEndpoint.querySelector('.ep').classList.add('dbg-info');
}

function showInputInfo(inputEndpoint, inputContent) {
  //console.log('showInputInfo', inputEndpoint, inputContent);
  let div = inputEndpoint?.querySelector('.dbg-element.dbg-output');
  if (!div) {
    div = document.createElement('div');
    inputEndpoint?.appendChild(div);
  }

  const formattedContent = getFormattedContent(inputContent);

  div.innerHTML = `<button class="pin button primary"><span class="mif-pin icon"></span></button>${formattedContent}`;
  div.className = 'dbg-element dbg-output';

  inputEndpoint?.appendChild(div);

  // keep the pinning state if the debugger window is already pinned
  const isPinned = div.closest('.endpoint')?.classList.contains('pinned');
  togglePinning(div, isPinned ? 'pin' : '');

  div.querySelector('.pin').onclick = async (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    togglePinning(div, 'toggle');
  };

  // Handle file preview
  div.querySelector('.btn-file-preview')?.addEventListener('click', previewHandler);

  // Add event listeners to clear text selection when hover window closes
  const endpoint = div.closest('.endpoint');
  const dbgTextarea = div.querySelector('.dbg-textarea');

  if (endpoint && dbgTextarea && !endpoint.classList.contains('pinned')) {
    // Clear selection when mouse leaves the endpoint (hover window closes)
    const clearSelectionHandler = () => {
      // Only clear if selection is within this debug textarea
      const selection = window.getSelection();
      if (
        selection &&
        selection.toString() &&
        selection.anchorNode &&
        (dbgTextarea.contains(selection.anchorNode) || dbgTextarea.contains(selection.focusNode))
      ) {
        selection.removeAllRanges();
      }
    };

    endpoint.addEventListener('mouseleave', clearSelectionHandler);

    // Also clear selection when clicking outside the debug element
    document.addEventListener('click', (e) => {
      if (!div.contains(e.target as Node) && !endpoint.classList.contains('pinned')) {
        const selection = window.getSelection();
        if (
          selection &&
          selection.toString() &&
          selection.anchorNode &&
          (dbgTextarea.contains(selection.anchorNode) || dbgTextarea.contains(selection.focusNode))
        ) {
          selection.removeAllRanges();
        }
      }
    });
  }

  inputEndpoint?.querySelector('.name')?.classList?.add('dbg-info');
  inputEndpoint?.querySelector('.ep')?.classList?.add('dbg-info');
}

let lastStepData: any = {};

const DEBUG_LOG_MAX_LENGTH = 10000;
export async function processDebugStep(debugInfo, agentID, sessionID?, IDFilter?: any[]) {
  console.log('processDebugStep', agentID, sessionID);

  if (!sessionID) sessionID = debugSessions?.[agentID]?.sessionID;

  //if a session is present disable debug inject buttons, otherwise enable them
  // document
  //   .querySelectorAll('.title-bar button.btn-debug')
  //   .forEach((btn: HTMLButtonElement) => (btn.disabled = sessionID ? true : true));

  //ensure that the sessionID is properly stored in case of debug session attach
  if (!debugSessions[agentID]) debugSessions[agentID] = {};
  debugSessions[agentID].sessionID = sessionID;

  const result = debugInfo || (await readDebugInfo(agentID, sessionID));

  lastStepData = result;
  let attached = sessionID ? false : true;

  // Reset the components state before reading the new step
  resetComponentsState({ resetPinned: true });

  const activeComponentsInfo = [];

  let errorOccurred = false;
  for (let id in result.state) {
    if (IDFilter && !IDFilter.includes(id)) continue;
    const componentElement = document.getElementById(id);

    if (componentElement) {
      const defaultOutputEPs = componentElement.querySelectorAll('.smyth.output-endpoint.default');

      if (!attached) attached = true;
      const active = result.state[id].active;
      if (active) {
        componentElement.classList.add('dbg-active');
        activeComponentsInfo.push(componentElement);

        const debugBtn = componentElement.querySelector('.btn-debug');
        if (debugBtn) {
          debugBtn.setAttribute('data-tooltip', 'Debug Step');
        }
      }

      if (result.state[id].alwaysActive) componentElement.classList.add('dbg-always-active');
      const status = result.state[id].status;
      const sourceId = result.state[id].sourceId;

      let input = result.state[id].active
        ? result.state[id].runtimeData.input
        : result.state[id]?.input;
      let output = result.state[id]?.output;
      let step = result.state[id]?.step;
      let _LoopData = result.state[id]?.runtimeData?._LoopData;
      const compName = result.state[id]?.name;

      // --- Input Emptiness Check and Icon Display ---
      if (input) {
        let hasEmptyRequiredInput = false;
        let inputEndpoints = [];

        // First, collect all input endpoints from the DOM
        const allInputEndpointElements = componentElement.querySelectorAll('.smyth.input-endpoint');

        // Check each input endpoint
        allInputEndpointElements.forEach((inputElement: HTMLElement) => {
          const inputName = inputElement.getAttribute('smt-name');
          const isOptional = inputElement.getAttribute('smt-optional') === 'true';
          if (!inputName) return; // Skip if no name attribute

          let isEmpty = true; // Default to empty

          // Check if this input exists in the input object
          if (input[inputName] !== undefined) {
            const inputValue = input[inputName];
            isEmpty = false; // Start with assumption it's not empty

            if (inputValue === null || inputValue === undefined) {
              isEmpty = true;
            } else if (typeof inputValue === 'string' && inputValue.trim() === '') {
              isEmpty = true;
            }
          }

          // Add to our collection
          inputEndpoints.push({
            element: inputElement,
            name: inputName,
            isEmpty: isEmpty,
            isOptional: isOptional,
          });
          // Only count empty required inputs for warning status
          if (isEmpty && !isOptional) {
            hasEmptyRequiredInput = true;
          }
        });

        const isFunctionalComponent = componentElement?.['_control']?.isFunctionalComponent();

        // If there's at least one empty required input, add the appropriate icons to all inputs
        if (hasEmptyRequiredInput) {
          // Add a class to the component to mark it as having empty required inputs
          componentElement.classList.add('has-empty-inputs');
          // Check if there are any messages other than the component button e.g Form Preview Button
          const hasNonButtonMessages = Array.from(
            componentElement.querySelectorAll('.messages-container .message'),
          ).some((message) => message.id !== 'component-button');

          if (!hasNonButtonMessages) {
            const component = componentElement['_control'] as Component;
            if (component) {
              component.addComponentMessage('Missing Required Inputs', 'missing-input');
            }
          }
          // Add icons to all input endpoints
          for (let endpoint of inputEndpoints) {
            // Create the icon
            const icon = document.createElement('img');
            icon.className = 'input-status-icon';
            icon.src = endpoint.isOptional
              ? '/img/builder/empty-input.svg'
              : '/img/builder/fill-input.svg';
            icon.style.width = isFunctionalComponent ? '12px' : '16px';
            icon.style.height = isFunctionalComponent ? '12px' : '16px';
            icon.style.position = 'absolute';
            icon.style.left = isFunctionalComponent ? '-7px' : '-8px';
            icon.style.top = isFunctionalComponent ? '1px' : '6px';
            icon.style.zIndex = '100'; // Ensure it's above other elements

            // Remove any existing icon first
            const existingIcon = endpoint.element.querySelector('.input-status-icon');
            if (existingIcon) {
              existingIcon.remove();
            }

            // Append the icon to the endpoint element
            endpoint.element.appendChild(icon);
          }
        }
        // Add icons to all input endpoints regardless of component warning status
        for (let endpoint of inputEndpoints) {
          // Create the icon
          const icon = document.createElement('img');
          icon.className = 'input-status-icon';
          icon.src = endpoint.isOptional
            ? '/img/builder/empty-input.svg'
            : '/img/builder/fill-input.svg';
          icon.style.width = isFunctionalComponent ? '12px' : '16px';
          icon.style.height = isFunctionalComponent ? '12px' : '16px';
          icon.style.position = 'absolute';
          icon.style.left = isFunctionalComponent ? '-7px' : '-8px';
          icon.style.top = isFunctionalComponent ? '1px' : '6px';
          icon.style.zIndex = '100'; // Ensure it's above other elements

          // Remove any existing icon first
          const existingIcon = endpoint.element.querySelector('.input-status-icon');
          if (existingIcon) {
            existingIcon.remove();
          }

          // Append the icon to the endpoint element
          endpoint.element.appendChild(icon);
        }

        // Only add this class if we actually need styling changes
        if (hasEmptyRequiredInput) {
          componentElement.classList.add('empty-inputs-style');
        }
      }
      // --- End of Input Emptiness Check ---

      if (_LoopData) {
        let idx = _LoopData.loopIndex;
        //if (!_LoopData.result && idx == 2) idx = 1;
        const len = _LoopData.loopLength;
        const loopEndpoint = componentElement.querySelector(
          '.smyth.output-endpoint[smt-name="Loop"]',
        );
        if (loopEndpoint) {
          // * when we have 'dbg-element' class we cannot open the settings for the "For Each" Component when the loop info is visible (it's the default behavior for 'dbg-element'), that's why we need to remove the 'dbg-element' class

          // let dbgLoopInfo = loopEndpoint.querySelector('.dbg-element.dbg-loop-info');
          let dbgLoopInfo = loopEndpoint.querySelector('.dbg-loop-info');
          if (!dbgLoopInfo) {
            dbgLoopInfo = document.createElement('div');
            // dbgLoopInfo.className = 'dbg-element dbg-loop-info';
            dbgLoopInfo.className = 'dbg-loop-info';
            loopEndpoint.insertBefore(dbgLoopInfo, loopEndpoint.firstChild);
          }
          dbgLoopInfo.innerHTML = `[ ${idx} / ${len} ]`;
        }
      }

      let _job_components = result.state[id]?._job_components;
      if (Array.isArray(_job_components)) {
        for (let id of _job_components) {
          const cpt = document.getElementById(id);
          if (cpt) cpt.classList.add('dbg-async');
        }
      }

      if (status) componentElement.classList.add(`dbg-active-${status}`);

      if (active && input) {
        debugInputs[id] = { inputs: {} };
        for (let inputName in input) {
          const inputElement = componentElement.querySelector(
            `.smyth.input-endpoint[smt-name="${inputName}"]`,
          );
          if (inputElement) {
            showInputInfo(inputElement, input[inputName]);
            const val =
              typeof input[inputName] != 'string'
                ? JSON.stringify(input[inputName], null, 2)
                : input[inputName];
            debugInputs[id].inputs[inputName] = val;
          }
        }
      }

      if (output) {
        //first we clear previous output
        const outputEndpoints = componentElement.querySelectorAll('.smyth.output-endpoint');
        for (let ep of outputEndpoints) {
          showOutputInfo(ep, '');
        }

        // #region remove empty expression outputs
        // If mock or debug-injected data contains an empty expression, it can overwrite real values with empty ones.
        // Example:
        // {
        //   Response: { url: "https://example.com" },
        //   Response.url: ""
        // }
        // First, Response.url is set to "https://example.com" from the Response object.
        // Then, it's overwritten with an empty string as Response.url is empty.
        // To prevent this, we remove any empty expressions to fallback to the real value from the object.
        const _output = JSON.parse(JSON.stringify(output));

        for (let [outputName, outputValue] of Object.entries(_output)) {
          const isExpression = /[.\[\]]/.test(outputName);

          if (isExpression && !outputValue) {
            delete _output[outputName];
          }
        }
        // #endregion

        for (let outputName in _output) {
          const outputEndpoints = [
            ...componentElement.querySelectorAll(
              `.smyth.output-endpoint[smt-expression*="${outputName}."], .smyth.output-endpoint[smt-name*="${outputName}."], .smyth.output-endpoint[smt-expression*="${outputName}["], .smyth.output-endpoint[smt-name*="${outputName}["]`,
            ),
          ];
          const mainOutputEndpoint = componentElement.querySelector(
            `.smyth.output-endpoint[smt-name="${outputName}"]`,
          );

          if (mainOutputEndpoint) {
            showOutputInfo(mainOutputEndpoint, output[outputName], compName);
            for (let outputEndpoint of outputEndpoints) {
              const expression =
                outputEndpoint.getAttribute('smt-expression') ||
                outputEndpoint.getAttribute('smt-name');
              const outputContent = JSONExpression(output, expression);
              showOutputInfo(outputEndpoint, outputContent, compName);
            }

            //only run the following if there is a single default output endpoint
            if (defaultOutputEPs.length <= 1) {
              for (let entryName in output[outputName]) {
                const matchingEndpoints = [
                  ...componentElement.querySelectorAll(
                    `.smyth.output-endpoint[smt-expression="${entryName}"], .smyth.output-endpoint[smt-name="${entryName}"]`,
                  ),
                ];
                for (let outputEndpoint of matchingEndpoints) {
                  // show the output info only if there is single default output endpoint

                  showOutputInfo(outputEndpoint, output[outputName][entryName]);
                }
              }
            }
          }
        }
        //set missing default outputs to undefined
        for (let ep of defaultOutputEPs) {
          if (!ep.querySelector('.dbg-element.dbg-output')) {
            let div = document.createElement('div');
            ep.appendChild(div);
            div.innerHTML = `<span class="mif-bug icon"></span>[undefined]`;
            div.className = 'dbg-element dbg-output';
            ep.querySelector('.name').classList.add('dbg-info');
            ep.querySelector('.ep').classList.add('dbg-info');
          }
        }

        const dbgInfo = componentElement.querySelector('.debug-info');
        dbgInfo.innerHTML = ``;

        if (output['_debug']) {
          const outputWrapper = document.createElement('div');

          const debugOutput = output['_debug'];
          // set info with 'textContent', to escape HTML and XML
          outputWrapper.textContent = debugOutput;

          // Show the error message with debug info
          const errorOutput = output?.['_error'] || '';
          if (errorOutput) {
            // It's possible to have large data with the error message, so we need to limit the output
            outputWrapper.append(`\n\n${errorOutput}`);
            errorOccurred = true;
          }

          let dbgBox: HTMLElement = workspace.domElement.querySelector(
            `.debug-box[rel="${componentElement.id}"]`,
          );
          const downloadTooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;
          const copyTooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;
          if (!dbgBox) {
            dbgBox = document.createElement('div');
            dbgBox.className = 'debug-box bg-gray-800 exclude-panzoom hidden';
            dbgBox.setAttribute('rel', componentElement.id);
            const topPos = componentElement.offsetTop + 100;
            const leftPos = componentElement.offsetLeft - 20;

            dbgBox.style.position = 'absolute';
            dbgBox.style.top = topPos + 'px';
            dbgBox.style.left = leftPos + 'px';
            dbgBox.style.height = '300px';
            dbgBox.style.width = '500px';

            dbgBox.innerHTML = `<div class="debug-info-title flex justify-between px-2 py-1">
                                <h2 class="text-base">Debug Log</h2>
                                <div class="space-x-2">
                                    <input type="search" placeholder="Search ..." class="search-input w-24 h-6 rounded-md p-1 bg-gray-600 text-gray-200 hidden" />
                                    <button class="downlaod text-gray-400 hover:text-gray-200 hidden" data-tooltip-target="${downloadTooltipId}"  data-tooltip-placement="top" type="button">
                                        <i class="fa-solid fa-download"></i>
                                    </button>
                                    <div
                                        id="${downloadTooltipId}"
                                        role="tooltip"
                                        class="tooltip absolute z-10 inline-block bg-gray-900 shadow-lg text-white py-2 px-4 rounded-lg opacity-0 invisible"
                                        style="font-size: 12px; left:12px; top:30px;"
                                        data-popper-reference-hidden=""
                                        data-popper-escaped=""
                                        data-popper-placement="bottom"
                                    >
                                        Download log
                                    </div>
                                    <button class="copy text-gray-400 hover:text-gray-200 hidden" data-tooltip-target="${copyTooltipId}"   data-tooltip-placement="top" type="button" >
                                        <i class="fa-solid fa-copy"></i>
                                    </button>
                                    <div
                                        id="${copyTooltipId}"
                                        role="tooltip"
                                        class="tooltip absolute z-10 inline-block bg-gray-900 shadow-lg text-white py-2 px-4 rounded-lg opacity-0 invisible"
                                        style="font-size: 12px; left:68px; top:30px;"
                                        data-popper-reference-hidden=""
                                        data-popper-escaped=""
                                        data-popper-placement="bottom"
                                    >
                                        Copy log
                                    </div>
                                    <button class="close text-gray-400 hover:text-gray-200">
                                        <i class="fa-solid fa-xmark"></i>
                                    </button>
                                </div>
                            </div>
                            <div class="dbg dbg-textarea syntax bg-gray-700">
                                <!-- this is the actual syntax highlighting -->
                                <div readonly class="dbg-log absolute top-0"></div>
                                <!-- this is the search highlighting layer with transparent background and text color -->
                                <div readonly class="dbg-search-highlight bg-transparent text-transparent absolute top-0"></div>
                            </div>
                            <div class="dbg-info-footer px-2 hidden">The data is too long to display, <a class="dbg-log-download-link" href="#">click here to download</a></div>
                        `;
            workspace.domElement.appendChild(dbgBox);

            const dbgCloseBtn: HTMLButtonElement = dbgBox.querySelector('.close');
            dbgCloseBtn.onclick = () => {
              dbgBox.classList.add('hidden');
              dbgBox['_connection'].canvas.classList.add('hidden');
            };

            interact(dbgBox).draggable({
              // Enable drag only from the debug-info-title element
              allowFrom: '.debug-info-title',
              // Call this function on every dragmove event
              onmove: function (event) {
                const target = event.target;
                const x = (parseFloat(target.style.left) || 0) + event.dx / workspace.scale;
                const y = (parseFloat(target.style.top) || 0) + event.dy / workspace.scale;

                // Update the top and left values
                target.style.left = x + 'px';
                target.style.top = y + 'px';

                workspace.jsPlumbInstance.repaint(dbgBox);
              },
            });
          }

          const dbgTextArea: HTMLElement = dbgBox.querySelector('.dbg-log');
          dbgTextArea.textContent = outputWrapper.textContent.replace(/debug:/gm, '');

          const log = outputWrapper.textContent.replace(/debug:/gm, '');

          const trimmedLog =
            log?.length > DEBUG_LOG_MAX_LENGTH
              ? log?.substring(0, DEBUG_LOG_MAX_LENGTH) + '...'
              : log;

          const escapedLog = escapeHTML(trimmedLog);

          dbgTextArea.innerHTML =
            log.length < DEBUG_LOG_MAX_LENGTH ? highlightCode(escapedLog) : escapedLog;

          //microlight.reset();
          //syntaxPostProcess(dbgTextArea);

          const dbgSearchHighlight: HTMLElement = dbgBox.querySelector('.dbg-search-highlight');

          // copy and search functionality disabled for large logs as the search is not working properly with the partial log text and user may expect to copy all the log with the copy button (it's confusing to copy only the visible part of the log)
          const dbgFooterElm = dbgBox.querySelector('.dbg-info-footer');
          const dbgCopyBtn: HTMLButtonElement = dbgBox.querySelector('.copy');
          const searchInput: HTMLInputElement = dbgBox.querySelector('.search-input');
          const downloadBtn: HTMLButtonElement = dbgBox.querySelector('.downlaod');
          dbgCopyBtn.addEventListener('mouseenter', () => showTooltip(copyTooltipId));
          dbgCopyBtn.addEventListener('mouseleave', () => hideTooltip(copyTooltipId));
          downloadBtn.addEventListener('mouseenter', () => showTooltip(downloadTooltipId));
          downloadBtn.addEventListener('mouseleave', () => hideTooltip(downloadTooltipId));

          if (log?.length < DEBUG_LOG_MAX_LENGTH) {
            // show download button for large logs
            dbgFooterElm.classList.add('hidden');

            dbgCopyBtn.classList.remove('hidden');
            searchInput.classList.remove('hidden');
            downloadBtn.classList.remove('hidden');

            dbgCopyBtn.onclick = () => {
              try {
                navigator.clipboard.writeText(log);
                successToast('Copied to clipboard', 'Success');
              } catch (error) {
                // in case clipboard API is not available or it fails for the lack of permission
                warningToast('Please manually select and copy the log.', 'Failed to copy');
                console.error('debugger:copy', error);
              }
            };
            downloadBtn.onclick = () => {
              const log = `${debugOutput}\n\n${errorOutput}`;
              const blob = new Blob([log], { type: 'text/plain' });
              const url = URL?.createObjectURL(blob);
              const a = document?.createElement('a');
              a.href = url;
              a.download = 'log.txt';
              document?.body?.appendChild(a);
              a?.click();
              document?.body?.removeChild(a);
              URL?.revokeObjectURL(url);
            };

            searchInput.oninput = () => {
              const searchTerm = searchInput.value;
              if (searchTerm) {
                // search and replace all instances of the searched term
                const highlightedLog = escapedLog.replace(
                  new RegExp(escapeRegExp(searchTerm), 'gi'),
                  `<mark>${searchTerm}</mark>`,
                );
                dbgSearchHighlight.innerHTML = highlightedLog;
                // scroll to first instance of mark
                const mark = dbgSearchHighlight.querySelector('mark');
                if (mark) {
                  mark.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              } else {
                dbgSearchHighlight.innerHTML = '';
              }
            };
          } else {
            // hide copy and search functionality for large logs
            dbgCopyBtn.classList.add('hidden');
            searchInput.classList.add('hidden');
            downloadBtn.classList.add('hidden');

            // * As we only use the footer of the debugger to show the download button, so we adjust the display and height here
            dbgFooterElm.classList.remove('hidden');
            const dbgTextAreaWrapper: HTMLDivElement = dbgBox.querySelector('.dbg-textarea');
            dbgTextAreaWrapper.classList.add('dbg-textarea-with-footer');

            const dbgDownloadBtn: HTMLAnchorElement =
              dbgBox.querySelector('.dbg-log-download-link');
            const blob = new Blob([`${debugOutput}\n\n${errorOutput}`], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            dbgDownloadBtn.href = url;
            dbgDownloadBtn.download = 'log.txt';
          }

          const dbgLogBtn: HTMLElement = componentElement.querySelector('.btn-debug-log');
          const aiFixBtn: HTMLElement = componentElement.querySelector('.btn-fix-with-ai');
          const agentBuilderEnabled = true; //workspace.userData?.isSmythStaff || workspace.userData?.isSmythAlpha;
          dbgLogBtn.classList.remove('hidden');
          // Apply styling classes
          applyDebugButtonStyles(dbgLogBtn, aiFixBtn);
          if (output['_error']) {
            componentElement.classList.add('state-error');
            componentElement.classList.remove('state-success');
            componentElement.classList.remove('has-empty-inputs');

            componentElement.querySelector('.message.missing-input')?.remove();

            dbgLogBtn.classList.add('error');
            if (agentBuilderEnabled) {
              aiFixBtn?.classList.remove('hidden');
              const dataError =
                typeof output['_error'] == 'string'
                  ? output['_error']
                  : JSON.stringify(output['_error']);
              aiFixBtn.setAttribute('data-error', dataError);
            }
          } else {
            componentElement.classList.remove('state-error');
            componentElement.classList.remove('has-empty-inputs');
            componentElement.classList.add('state-success');

            componentElement.querySelector('.message.missing-input')?.remove();

            dbgLogBtn.classList.remove('error');
            aiFixBtn?.classList.add('hidden');
            aiFixBtn?.removeAttribute('data-error');
          }

          // Toggle debug bar visibility based on button visibility
          toggleDebugBarVisibility(componentElement);

          if (output['_debug_time']) {
            const debugBar = componentElement.querySelector('.debug-bar');
            debugBar.setAttribute('debug-time', output['_debug_time'] + 'ms');
          }

          //dettach from component and attach it to workspace.domElement while preserving the initial position

          //workspace.domElement.appendChild(dbgBox);
        }
      }
    }
    // Repaint connections for the updated component after state changes
    workspace.jsPlumbInstance.repaint(componentElement);
  }

  if (activeComponentsInfo.length === 1) {
    const title = activeComponentsInfo[0]?._control?.title || '';
    setDebugMessage(title);
  } else {
    setDebugMessage();
  }

  // const asyncRunning = [...document.querySelectorAll('.dbg-async')].map((c) => c.id);
  // if (asyncRunning.length > 0) {
  //     setTimeout(() => {
  //         readDebugStep(agentID, sessionID);
  //     }, 3000);
  // }

  if (result.sessionClosed) {
    // Remove all the 'dbg-running' after debug session is closed
    document
      .querySelectorAll('.dbg-running')
      ?.forEach((item) => item?.classList.remove('dbg-running'));

    // const runningAsync = [...document.querySelectorAll('.dbg-async')].map((c) => c.id);
    // if (runningAsync.length > 0) {
    //     toast('Waiting for Async jobs to finish ...', '', 'info');
    //     await waitPendingAsyncComponents();
    // } else {

    if (errorOccurred) {
      errorToast('Debug encountered an error. Please check the logs for details.', 'Debug Error');
      log('Debug session failed: Check the debug log for error details');
    } else {
      log('Debug session completed successfully');
    }
    console.log('Deleting debug session', agentID, sessionID);
    delete debugSessions[agentID].sessionID;
    //await stopDebugSession(false);
    stopDebugUI(false);
    //}

    updateChatbotStatus('Debugger:Checking remaining debug jobs ...');
  }
  if (result.error) {
    // Remove all the 'dbg-running' after debug session is closed
    // document
    //   .querySelectorAll('.dbg-running')
    //   ?.forEach((item) => item?.classList.remove('dbg-running'));

    alert('An error occured', result.error);
    log('An error occured : ' + result.error);
    await stopDebugSession(true);
  }

  function showTooltip(tooltipId) {
    const tooltipElement = document?.querySelector(`#${tooltipId}`);
    tooltipElement?.classList?.remove('invisible', 'opacity-0');
    tooltipElement?.classList?.add('visible', 'opacity-100');
  }

  function hideTooltip(tooltipId) {
    const tooltipElement = document?.querySelector(`#${tooltipId}`);
    tooltipElement?.classList?.remove('visible', 'opacity-100');
    tooltipElement?.classList?.add('invisible', 'opacity-0');
  }

  return { states: result, attached, errorOccurred };
}

function setDebugMessage(title?: string) {
  const messageBlock = document.querySelector('.debug-switcher-message > p');
  if (!messageBlock) return;

  if (title) {
    messageBlock.innerHTML = `<div class='flex'>
    Next Component:&nbsp;<div class="text-ellipsis max-w-[120px] overflow-hidden whitespace-nowrap font-bold">${title}</div>
    </div>
    <div>Click step to continue debugging.</div>`;

    return;
  }
  messageBlock.textContent = `Debug session active. Use the controls above to step through execution.`;
}

function escapeHTML(html) {
  const textArea: HTMLTextAreaElement = document.createElement('textarea');
  textArea.textContent = html;
  return textArea.innerHTML;
}
function highlightCode(code, language = 'smythLog') {
  return Prism.highlight(code, Prism.languages[language], language);
}

export function startDebugListener(agentID, sessionID, callback) {
  clearDebugUIInfo();
  if (!debugSessions[agentID]) {
    debugSessions[agentID] = {};
  }
  if (!sessionID) sessionID = debugSessions?.[agentID]?.sessionID;
  if (!sessionID) return;

  debugSessions[agentID][sessionID] = setInterval(async () => {
    const result = await processDebugStep(null, agentID, sessionID);
    if (typeof callback === 'function') callback(result);
  }, 5000);
}

export function stopDebugListener(agentID, sessionID) {
  if (!debugSessions[agentID]) {
    return;
  }
  clearInterval(debugSessions[agentID][sessionID]);
  delete debugSessions[agentID][sessionID];
}

export async function injectComponentDebugInfo(agentID, componentID, { input, output }) {
  // Commented out, as we need to keep the debug UI info even if the new workflow is started
  // clearDebugUIInfo();

  // ! Deprecated: will be removed (we handle debug controls in the - src/frontend/components/Component.class/index.ts)
  // const runBtn = document.getElementById('debug-menubtn-run');
  // const stepBtn = document.getElementById('debug-menubtn-step');
  // const attachBtn = document.getElementById('debug-menubtn-attach');
  // const stopBtn = document.getElementById('debug-menubtn-stop');

  // runBtn.setAttribute('disabled', 'true');
  // stepBtn.setAttribute('disabled', 'true');
  // attachBtn.setAttribute('disabled', 'true');

  const sessionID = debugSessions?.[agentID]?.sessionID || '';
  const dbgUrl = DEBUG_ENDPOINT + '?includeNewState=true';
  const headers = {
    'Content-type': 'application/json; charset=UTF-8',
    'X-AGENT-ID': agentID,
    'X-DEBUG-INJ': sessionID,
  };
  if ((window as any).currentMonitorId) {
    headers['X-MONITOR-ID'] = (window as any).currentMonitorId;
  }

  let _outputs = JSON.parse(JSON.stringify(output));

  const mockDataEnabled = await isMockDataEnabled(componentID);

  if (mockDataEnabled) {
    const mockData = await getMockData(componentID);
    const mockOutputs = mockData.data?.outputs;

    const isEmptyValue = (value) => {
      if (value === null || value === undefined || value === '') return true;
      if (Array.isArray(value) && value.length === 0) return true;
      if (typeof value === 'object' && Object.keys(value).length === 0) return true;
      return false;
    };

    // We prioritize configured outputs from the debug window over the mock data
    for (const [key, value] of Object.entries(_outputs)) {
      _outputs[key] = isEmptyValue(value) ? mockOutputs[key] : value;
    }
  }

  const body = [
    {
      id: componentID,
      // dbg is Deprecated, will be removed in next update
      /* dbg: {
                active: true,
                input,
                output,
            }, */
      ctx: {
        active: true,
        input,
        output: _outputs,
      },
    },
  ];

  $('#' + componentID)
    .find('.cpt-overlay')
    .show();

  const currentRunningComponent = document.getElementById(componentID);
  if (currentRunningComponent) {
    workspace.refreshComponentSelection(currentRunningComponent);
    currentRunningComponent?.classList?.add('dbg-running');
  }

  const result = await fetch(dbgUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
    .then((res) => res.json())
    .catch((error) => {
      // ! Deprecated: will be removed (we handle debug controls in the - src/frontend/components/Component.class/index.ts)
      // runBtn.removeAttribute('disabled');
      // stepBtn.removeAttribute('disabled');
      // attachBtn.removeAttribute('disabled');
      // stopBtn.removeAttribute('disabled');

      throw error;
    });

  if (!debugSessions[agentID]) debugSessions[agentID] = {};

  debugSessions[agentID].sessionID = result.dbgSession;

  // ! Deprecated: will be removed (we handle debug controls in the - src/frontend/components/Component.class/index.ts)
  // runBtn.removeAttribute('disabled');
  // stepBtn.removeAttribute('disabled');
  // attachBtn.removeAttribute('disabled');
  // stopBtn.removeAttribute('disabled');

  //disable debug inject buttons
  // document
  //   .querySelectorAll('.title-bar button.btn-debug')
  //   .forEach((btn: HTMLButtonElement) => (btn.disabled = true));

  return result;
}

export async function runDebugStep(agentID, sessionID?) {
  if (!sessionID) sessionID = debugSessions?.[agentID]?.sessionID;
  if (!sessionID) return;

  for (let id in lastStepData.state) {
    if (lastStepData?.state[id].active) {
      $('#' + id)
        .find('.cpt-overlay')
        .show();
    }

    const component = document.getElementById(id);
    if (component) {
      // Highlight the component that's being running on debug mode
      workspace.refreshComponentSelection(component);
      component.classList?.add('dbg-running');
    }
  }

  const dbgUrl = DEBUG_ENDPOINT + '?run&includeNewState=true';
  const headers = {
    'Content-type': 'application/json; charset=UTF-8',
    'X-AGENT-ID': agentID,
    'X-DEBUG-RUN': sessionID,
  };
  if ((window as any).currentMonitorId) {
    headers['X-MONITOR-ID'] = (window as any).currentMonitorId;
  }
  const result = await fetch(dbgUrl, {
    method: 'POST',
    headers,
  }).then((res) => res.json());

  if (!result.dbgSession) {
    console.log('Debug session ended');
    delete debugSessions[agentID].sessionID;

    stopDebugUI(false);

    return null;
  }

  if (result.error) {
    alert('Debug Runtime Error', result.error);
    stopDebugSession(false);

    return null;
  }

  return { result, sessionID };
}

export async function clearDebuggerSession(agentID, sessionID?) {
  if (!sessionID) sessionID = debugSessions?.[agentID]?.sessionID;
  if (!sessionID) return;

  const dbgUrl = DEBUG_ENDPOINT;

  const headers = {
    'Content-type': 'application/json; charset=UTF-8',
    'X-AGENT-ID': agentID,
    'X-DEBUG-STOP': sessionID,
  };
  if ((window as any).currentMonitorId) {
    headers['X-MONITOR-ID'] = (window as any).currentMonitorId;
  }
  const result = await fetch(dbgUrl, {
    method: 'POST',
    headers,
  })
    .then((res) => res.json())
    .catch((error) => {
      error;
    });

  if (!result.success) return false;

  return true;
}

// async function waitPendingAsyncComponents() {
//   const agent = workspace.agent;
//   if (!debugSessions?.[agent.id]?.sessionID) return;
//   const debugStepResult = await runDebugStep(agent.id);
//   const sessionID = debugStepResult?.sessionID;
//   if (!sessionID) return;
//   let asyncRunning = [];
//   do {
//     asyncRunning = [...document.querySelectorAll('.dbg-async')].map((c) => c.id);
//     console.log('asyncRunning', asyncRunning, asyncRunning.length);
//     if (asyncRunning.length > 0) {
//       await readDebugStep(agent.id, sessionID);
//     }
//     await delay(3000);
//   } while (asyncRunning.length > 0);
// }

function stopDebugUI(clearInfo = true) {
  repaintDebugComponentsAfter();
  lastStepData = {};
  workspace.domElement.classList.remove('debugging');
  workspace.domElement.querySelectorAll('.btn-debug').forEach((el: HTMLElement) => {
    el.classList.remove('active');
  });

  resetComponentsState({ resetPinned: true });

  //enable debug inject buttons
  // document
  //   .querySelectorAll('.title-bar button.btn-debug')
  //   .forEach((btn: HTMLButtonElement) => (btn.disabled = false));

  if (clearInfo) {
    workspace.domElement.querySelectorAll('.pinned').forEach((el: HTMLElement) => {
      el.classList.remove('pinned');
    });

    workspace.domElement.querySelectorAll('.disabled-endpoint').forEach((el: HTMLElement) => {
      el.classList.remove('disabled-endpoint');
    });

    workspace.domElement.querySelectorAll('.dbg-info').forEach((el: HTMLElement) => {
      el.classList.remove('dbg-info');
    });

    workspace.domElement.querySelectorAll('.debug-info').forEach((el: HTMLElement) => {
      el.classList.add('hidden');
      el.innerHTML = '';

      const dbgLogBtn = el.closest('.component').querySelector('.btn-debug-log');
      const aiFixBtn = el.closest('.component').querySelector('.btn-fix-with-ai');
      dbgLogBtn?.classList.add('hidden');
      dbgLogBtn?.classList.remove('error');
      aiFixBtn?.classList.add('hidden');
      aiFixBtn?.removeAttribute('data-error');

      // Toggle debug bar visibility based on button visibility
      toggleDebugBarVisibility(el.closest('.component'));

      //const debugBox = el.querySelector('.debug-box');
      //debugBox.innerHTML = '';
    });
    workspace.domElement.querySelectorAll('.debug-bar').forEach((el: HTMLElement) => {
      el.removeAttribute('debug-time');
    });

    workspace.domElement.querySelectorAll('.component').forEach((el: HTMLElement) => {
      el.classList.remove('state-success', 'state-error', 'has-empty-inputs');
    });
  }
}

function clearDebugUIInfo() {
  const nodes = [...workspace.domElement.querySelectorAll('.dbg-element')];
  nodes.forEach((node) => {
    node.remove();
  });
}
export async function stopDebugSession(resetUI = true) {
  repaintDebugComponentsAfter();
  stopDebugUI(resetUI);

  const sessionID = getDebugSessionID();
  if (!sessionID) return;
  AttachedAgent = undefined;
  const agent = workspace.agent;
  delete debugSessions[agent.id].sessionID;

  //Delete remote debug info

  const dbgUrl = DEBUG_ENDPOINT;

  const headers = {
    'Content-type': 'application/json; charset=UTF-8',
    'X-AGENT-ID': agent.id,
    'X-DEBUG-STOP': sessionID,
  };
  const result = await fetch(dbgUrl, {
    method: 'POST',
    headers,
  }).catch((error) => {
    console.error(error);
  });
}

export function createDebugInjectDialog(
  component: Component,
  inputs,
  outputs,
  callback,
  operation: 'step' | 'run' = 'step',
  prefillValues?: Record<string, any>,
) {
  const createInputList = (array, type) => {
    return array
      .map((el, index) => {
        if (el.type === 'file') {
          const prefillValue = prefillValues?.[el.name] || '';
          return `
            <div class="mb-5">
              <div class="flex">
                <span class="inline-flex w-40 items-center px-3 text-sm text-gray-900 bg-gray-200 border border-e-0 border-gray-300 rounded-s-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600 break-all">
                  ${el.name}
                </span>
                <input type="file" name="${el.name}" id="${type}-input-${index}" class="${type}-input input
                  block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4 file:rounded-md
                  file:border-0 file:text-sm file:font-semibold
                  file:bg-gray-200 file:text-gray-900
                  hover:file:bg-gray-300 pl-5
                " multiple>
              </div>
              ${prefillValue ? `<div class="mt-2 text-xs text-gray-600">Previously selected: ${prefillValue.substring(0, 100)}${prefillValue.length > 100 ? '...' : ''}</div>` : ''}
            </div>`;
        } else {
          return `
            <div class="flex mb-5">
              <span class="inline-flex w-40 items-center px-3 text-sm text-gray-900 bg-gray-200 border border-e-0 border-gray-300 rounded-s-md dark:bg-gray-600 dark:text-gray-400 dark:border-gray-600 break-all">
                ${el.name}
              </span>
              <textarea id="${type}-input-${index}" name="${el.name}" class="${type}-input input block p-1 w-full text-sm text-gray-900 bg-gray-50 outline-none rounded-e-md border-b border-gray-300 focus:border-gray-300 focus:border-b-smythos-blue-500 focus:border-b-2" style="min-height:44px; height: 44px; box-shadow: none;"></textarea>
            </div>`;
        }
      })
      .join('');
  };

  const createToggleList = (array, type) => {
    return array
      .map(
        (el, index) => `
      <div class="flex items-center py-2">
        <input type="checkbox" rel="${type}-input-${index}" class="
          relative w-[36px] h-[21px] bg-gray-100 border-transparent text-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200
          disabled:opacity-50 disabled:pointer-events-none checked:bg-none checked:text-smythos-blue-500 checked:border-smythos-blue-500 checked:bg-smythos-blue-500
          focus:ring-0 focus:ring-offset-0 focus:ring-offset-transparent
          before:inline-block before:w-4 before:h-4 before:bg-white checked:before:bg-white before:translate-x-0 checked:before:translate-x-full
          before:rounded-full before:shadow before:transform before:ring-0 before:transition before:ease-in-out before:duration-200
          mr-3
        ">
        <span class="text-sm text-gray-700">${el.name}</span>
      </div>
    `,
      )
      .join('');
  };

  const inputsContent = createInputList(inputs, 'inputs');
  const outputsContent = createInputList(outputs, 'outputs');
  const inputToggles = createToggleList(inputs, 'inputs');
  const outputToggles = createToggleList(outputs, 'outputs');
  const inputFileValue = {};
  const outputFileValue = {};
  const content = `
    <div class="border bd-default p-2">
      <div id="inputs">
        ${inputsContent}
        <details class="mt-4 [&_summary::-webkit-details-marker]:hidden group">
          <summary class="cursor-pointer text-sm text-gray-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="7" viewBox="0 0 11 7" fill="none"
                 class="transition-transform duration-300 ease-in-out details-arrow">
              <path d="M9.40349 0.242188L5.69516 3.94245L1.98682 0.242188L0.847656 1.38135L5.69516 6.22885L10.5427 1.38135L9.40349 0.242188Z" fill="#808080"/>
            </svg>
            Advanced options
          </summary>
          <div class=" details-content">
            <div class="pt-5 transition-all duration-300 ease-in-out details-inner">
              <div class="flex items-center gap-2 mb-2">
                <p class="text-sm text-gray-600">Use Default Values</p>
                <div class="relative inline-block group" id="default-values-tooltip">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="cursor-help">
                    <path d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8C14.6667 4.3181 11.6819 1.33333 8 1.33333C4.3181 1.33333 1.33333 4.3181 1.33333 8C1.33333 11.6819 4.3181 14.6667 8 14.6667Z" stroke="#808080" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8 10.6667V8" stroke="#808080" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8 5.33333H8.00667" stroke="#808080" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <div class="absolute left-full ml-2 -translate-y-1/2 top-1/2 hidden w-[320px] p-2 bg-gray-900 text-white text-sm rounded shadow-lg z-50 tooltip-content">
                    When toggled on, will use default value set in <a href="${SMYTHOS_DOCS_URL}/agent-studio/build-agents/building-workflows"
                      target="_blank"
                      class="underline hover:text-blue-300">Component Input Settings</a>.
                    <div class="absolute right-[98.5%] top-1/2 -translate-y-1/2 w-2 h-2">
                      <div class="bg-gray-900 w-2 h-2 transform rotate-45"></div>
                    </div>
                  </div>
                </div>
              </div>
              ${inputToggles}
            </div>
          </div>
        </details>
        <p class="mt-4 text-sm text-gray-600">
          Looking to set output values? <a href="#" class="text-blue-600 configure-output">Configure output</a>
        </p>
      </div>
      <div id="outputs" class="hidden">
        ${outputsContent}
        <details class="mt-4 [&_summary::-webkit-details-marker]:hidden group">
          <summary class="cursor-pointer text-sm text-gray-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="7" viewBox="0 0 11 7" fill="none"
                 class="transition-transform duration-300 ease-in-out details-arrow">
              <path d="M9.40349 0.242188L5.69516 3.94245L1.98682 0.242188L0.847656 1.38135L5.69516 6.22885L10.5427 1.38135L9.40349 0.242188Z" fill="#808080"/>
            </svg>
            Advanced options
          </summary>
          <div class="details-content transition-[height] duration-300 ease-in-out">
            <div class="pt-5 transition-all duration-300 ease-in-out details-inner">
              <div class="flex items-center gap-2 mb-2">
                <p class="text-sm text-gray-600">Use Default Values</p>
                <div class="relative inline-block group" id="default-values-tooltip-outputs">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="cursor-help">
                    <path d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8C14.6667 4.3181 11.6819 1.33333 8 1.33333C4.3181 1.33333 1.33333 4.3181 1.33333 8C1.33333 11.6819 4.3181 14.6667 8 14.6667Z" stroke="#808080" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8 10.6667V8" stroke="#808080" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8 5.33333H8.00667" stroke="#808080" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <div class="absolute left-full ml-2 -translate-y-1/2 top-1/2 hidden w-[320px] p-2 bg-gray-900 text-white text-sm rounded shadow-lg z-50 tooltip-content">
                    When toggled on, will use default value set in <a href="${SMYTHOS_DOCS_URL}/agent-studio/build-agents/building-workflows"
                      target="_blank"
                      class="underline hover:text-blue-300">Component Input Settings</a>.
                    <div class="absolute right-[98.5%] top-1/2 -translate-y-1/2 w-2 h-2">
                      <div class="bg-gray-900 w-2 h-2 transform rotate-45"></div>
                    </div>
                  </div>
                </div>
              </div>
              ${outputToggles}
            </div>
          </div>
        </details>
        <p class="mt-4 text-sm text-gray-600">
          Looking to set input values? <a href="#" class="text-blue-600 configure-input">Configure input</a>
        </p>
      </div>
    </div>`;

  const handleFileInput = async (fileInput: HTMLInputElement, element: any) => {
    const files = Array.from(fileInput.files || []);
    element.files = files;

    const fileValues = await Promise.all(
      files.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            let result = e.target.result as string;
            // Windows markdown file type fix
            if (
              navigator.userAgent.includes('Windows') &&
              file.type === '' &&
              file.name.toLowerCase().endsWith('.md')
            ) {
              result = result.replace('data:application/octet-stream;', 'data:text/markdown;');
            }
            resolve(result);
          };
          reader.readAsDataURL(file);
        });
      }),
    );

    // Set value as single item if there's only one file, otherwise keep as array
    element.value = fileValues.length === 1 ? fileValues[0] : fileValues;
  };

  const handleDebugAction = async function (
    component: Component,
    dialog,
    actionType: 'step' | 'run',
  ) {
    // Check if the current component has an error
    const hasError = component.domElement.querySelector('.error');

    const wfStatus = checkWorkflowStatus();

    if ((wfStatus === 'error' && !hasError) || wfStatus === 'inprogress') {
      warningToast(
        'A debug session is in progress. Please stop the current run before starting again.',
        'Debug Running',
      );
      return;
    }

    if (wfStatus === 'success') {
      document.querySelectorAll('.component').forEach((el: HTMLElement) => {
        el.classList.remove('state-success');
        el.classList.remove('state-error');
        el.classList.remove('has-empty-inputs');
      });
    }

    debugInputs[component.uid] = {
      inputs: {},
    };
    const inputElementsArray = Array.from(dialog.querySelectorAll('.inputs-input.input'));
    const input = inputElementsArray.reduce((obj, el: any, index) => {
      let val;
      try {
        // Check if the corresponding checkbox is checked for using default value
        const checkbox = dialog.querySelector(
          `input[type="checkbox"][rel="inputs-input-${index}"]`,
        );
        const useDefault = checkbox?.checked || false;

        if (useDefault) {
          // Get default value from component's data
          const elDataName = el.getAttribute('name');
          const inputDefault = component?.workspace?.agent?.data?.components
            // @ts-ignore
            ?.filter((c) => c.id === component._uid)?.[0]
            ?.inputs?.filter((i) => i.name === elDataName)[0]?.defaultVal;

          val = inputDefault || undefined;
        } else if (inputFileValue[index]) {
          val = inputFileValue[index].value || undefined;
        } else {
          const isDisabled = el.getAttribute('disabled');
          val = isDisabled ? undefined : parseJson(el.value) || el.value;
        }
      } catch (e) {
        val = el.value;
      }
      obj[inputs[index].name] = val;

      const inputVal = typeof val != 'string' ? JSON.stringify(val, null, 2) : val;
      debugInputs[component.uid].inputs[inputs[index].name] = inputVal;
      return obj;
    }, {});

    // --- Add this check for empty inputs ---
    let allInputsEmpty = true;
    // @ts-ignore
    for (let inputName in input) {
      const inputValue = input[inputName];
      let isEmpty = false;
      if (inputValue === null || inputValue === undefined) {
        isEmpty = true;
      } else if (typeof inputValue === 'string' && inputValue.trim() === '') {
        isEmpty = true;
      } else if (Array.isArray(inputValue) && inputValue.length === 0) {
        isEmpty = true;
      } else if (typeof inputValue === 'object' && Object.keys(inputValue).length === 0) {
        isEmpty = true;
      }

      if (!isEmpty) {
        allInputsEmpty = false;
        break;
      }
    }

    if (
      allInputsEmpty &&
      !(await isMockDataEnabled(component.uid)) &&
      inputElementsArray.length > 0
    ) {
      // Check if there are any messages other than the component button e.g Form Preview Button
      const hasNonButtonMessages = Array.from(
        component.domElement.querySelectorAll('.messages-container .message'),
      ).some((message) => message.id !== 'component-button');

      if (!hasNonButtonMessages) {
        component.addComponentMessage(`Missing Required Inputs`, 'missing-input');
      }
      warningToast('Cannot run with empty inputs', 'Please provide input values.');
      component.domElement.classList.add('has-empty-inputs');
      return; // Prevent further execution
    }
    // --- End of added check ---

    const output = Array.from(dialog.querySelectorAll('.outputs-input.input')).reduce(
      (obj, el: any, index) => {
        let val;
        try {
          if (outputFileValue[index]) {
            val = outputFileValue[index].value;
          } else {
            val = parseJson(el.value) || el.value;
          }
        } catch (e) {
          val = el.value;
        }
        obj[outputs[index].name] = val;
        return obj;
      },
      {},
    );
    let stepResponse;
    if (typeof callback === 'function') {
      stepResponse = await callback({ input, output });
    }
    if (actionType === 'run') {
      // Start running the full workflow
      const { result } = await runDebug();

      // Show deploy agent toast if the workflow executed successfully until the last component
      if (
        (!stepResponse?.errorOccurred && stepResponse?.states?.sessionClosed) ||
        (!result?.errorOccurred && result?.states?.sessionClosed)
      ) {
        showDeployAgentToast();
      }
    } else {
      // For step, just wait for the current component to finish
      await waitDebugStep();

      if (!stepResponse?.errorOccurred) {
        // If stepResponse is null, it means there is an active debug session already running
        if (stepResponse === null) {
          warningToast(
            'A debug session is in progress. Please stop the current run before starting again.',
            'Debug Running',
          );
        }

        // Show deploy agent toast if the workflow executed successfully until the last component
        if (stepResponse?.states?.sessionClosed) {
          showDeployAgentToast();
        }
      }
    }
    component.domElement.classList.remove('has-empty-inputs');
    // Don't clear messages while debugging, remove this line once properly tested in staging
    // component?.clearComponentMessages();
    console.log(`Debug ${actionType} done`);
  };
  twModalDialog({
    title: `<div class="flex items-center gap-2">
              <span>Debug Run</span>
              <div class="relative inline-block group" id="tooltip-container">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" class="cursor-help">
                  <path d="M8 14.6667C11.6819 14.6667 14.6667 11.6819 14.6667 8C14.6667 4.3181 11.6819 1.33333 8 1.33333C4.3181 1.33333 1.33333 4.3181 1.33333 8C1.33333 11.6819 4.3181 14.6667 8 14.6667Z" stroke="#808080" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M8 10.6667V8" stroke="#808080" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M8 5.33333H8.00667" stroke="#808080" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div class="absolute left-full ml-2 -translate-y-1/2 top-1/2 hidden w-[420px] p-2 bg-gray-900 text-white text-sm rounded shadow-lg z-50 tooltip-content font-normal">
                  Configure input and output parameters for your debug run.
                  <br/>
                  See <a href="${SMYTHOS_DOCS_URL}/agent-studio/build-agents/debugging"
                        target="_blank"
                        class="underline hover:text-blue-300">debug documentation</a> for more details.
                  <div class="absolute right-[98.5%] top-1/2 -translate-y-1/2 w-2 h-2">
                    <div class="bg-gray-900 w-2 h-2 transform rotate-45"></div>
                  </div>
                </div>
              </div>
            </div>`,
    content,
    actions: [
      {
        label: `<span class="flex items-center gap-2">
                  <span class="debug-step-icon w-5 h-5 bg-contain bg-no-repeat bg-center" style="background-image: url('/img/debug-bar/step-blue.svg');"></span>
                  <span class="!text-[#3b82f6] group-hover:!text-white">Step</span>
                </span>`,
        cssClass:
          'border border-[#3b82f6] bg-white hover:bg-[#3b82f6] group transition-all duration-200 !text-[#3b82f6] hover:!text-white',
        callback: (dialog) => handleDebugAction(component, dialog, 'step'),
      },
      {
        label: `<span class="flex items-center gap-2">
                  <span class="debug-play-icon w-5 h-5 bg-contain bg-no-repeat bg-center" style="background-image: url('/img/debug-bar/play-blue.svg');"></span>
                  <span class="!text-[#3b82f6] group-hover:!text-white">Run</span>
                </span>`,
        cssClass:
          'border border-[#3b82f6] bg-white hover:bg-[#3b82f6] group transition-all duration-200 !text-[#3b82f6] hover:!text-white',
        callback: (dialog) => handleDebugAction(component, dialog, 'run'),
      },
    ],
    onCloseClick: () => {},
    onDOMReady: function (dialog) {
      if (debugInputs[component.uid]?.inputs) {
        //console.log('debugInputs', debugInputs[component.uid]?.inputs);
        for (let inputName in debugInputs[component.uid]?.inputs) {
          const inputElement: HTMLInputElement = dialog.querySelector(
            `.inputs-input[name="${inputName}"]`,
          );

          if (!inputElement) continue;

          // setting value to the file type input leads to error
          if (inputElement.type !== 'file') {
            const value = debugInputs[component.uid]?.inputs[inputName] || '';
            inputElement.value = value;
          }
        }
      }

      const checkboxes = dialog.querySelectorAll('input[type="checkbox"]');
      [...checkboxes].forEach((checkbox: any) => {
        const rel = checkbox.getAttribute('rel');
        const input: HTMLTextAreaElement = dialog.querySelector(`#${rel}`);
        if (!input) return;

        checkbox.addEventListener('change', (e) => {
          const isChecked = e.target.checked;
          if (!isChecked) {
            input.removeAttribute('disabled');
            input.style.opacity = '1';
          } else {
            input.setAttribute('disabled', 'true');
            input.value = '';
            input.style.opacity = '0.5';
          }
        });
      });
      const inputsContainer = dialog.querySelector('#inputs');
      const outputsContainer = dialog.querySelector('#outputs');

      inputs.forEach((input, index) => {
        if (input.type === 'file') {
          const inputFile = inputsContainer.querySelector(`#inputs-input-${index}`);
          const element = { domElement: inputFile, value: null, files: [] };
          inputFileValue[index] = element;
          inputFile.addEventListener('change', (e: any) => {
            handleFileInput(e.target, element);
          });
        }
      });

      outputs.forEach((output, index) => {
        if (output.type === 'file') {
          const outputFile = outputsContainer.querySelector(`#outputs-input-${index}`);
          const element = { domElement: outputFile, value: null, files: [] };
          outputFileValue[index] = element;
          outputFile.addEventListener('change', (e: any) => {
            handleFileInput(e.target, element);
          });
        }
      });

      // Add tab switching functionality
      dialog.querySelector('.configure-output')?.addEventListener('click', async (e) => {
        e.preventDefault();
        dialog.querySelector('#inputs').classList.add('hidden');
        dialog.querySelector('#outputs').classList.remove('hidden');

        await DebugInjectOutputFields.setMockData(component.uid, dialog);
        DebugInjectOutputFields.applyJsonFieldSynchronizer(dialog);
      });

      dialog.querySelector('.configure-input')?.addEventListener('click', (e) => {
        e.preventDefault();
        dialog.querySelector('#outputs').classList.add('hidden');
        dialog.querySelector('#inputs').classList.remove('hidden');
      });

      // Add smooth transitions for details sections
      const details = dialog.querySelectorAll('details');
      details.forEach((detail) => {
        const content = detail.querySelector('.details-content') as HTMLElement;
        const inner = detail.querySelector('.details-inner') as HTMLElement;
        const arrow = detail.querySelector('.details-arrow') as HTMLElement;

        // Set initial height
        if (!detail.open) {
          content.style.height = '0';
        } else {
          content.style.height = inner.offsetHeight + 'px';
        }

        detail.addEventListener('toggle', (e) => {
          if (detail.open) {
            // Get the scroll height and set it immediately
            const height = inner.offsetHeight;
            requestAnimationFrame(() => {
              content.style.height = height + 'px';
              arrow.style.transform = 'rotate(180deg)';
            });
          } else {
            // First set the explicit height, then animate to 0
            const height = inner.offsetHeight;
            content.style.height = height + 'px';
            // Force a reflow
            content.offsetHeight;
            requestAnimationFrame(() => {
              content.style.height = '0';
              arrow.style.transform = 'rotate(0)';
            });
          }
        });

        // Add transition end listener to clean up height
        content.addEventListener('transitionend', () => {
          if (detail.open) {
            content.style.height = 'auto';
          }
        });
      });

      // Function to handle tooltip behavior
      const setupTooltip = (containerId) => {
        const container = dialog.querySelector(containerId);
        if (!container) return;

        const tooltipContent = container.querySelector('.tooltip-content');
        let hideTimeout;

        container.addEventListener('mouseenter', () => {
          clearTimeout(hideTimeout);
          tooltipContent.classList.remove('hidden');
        });

        container.addEventListener('mouseleave', () => {
          hideTimeout = setTimeout(() => {
            if (!tooltipContent.matches(':hover')) {
              tooltipContent.classList.add('hidden');
            }
          }, 400);
        });

        tooltipContent.addEventListener('mouseenter', () => {
          clearTimeout(hideTimeout);
        });

        tooltipContent.addEventListener('mouseleave', () => {
          hideTimeout = setTimeout(() => {
            tooltipContent.classList.add('hidden');
          }, 400);
        });
      };

      // Setup both tooltips
      setupTooltip('#tooltip-container');
      setupTooltip('#default-values-tooltip');
      setupTooltip('#default-values-tooltip-outputs');

      // Set prefill values if provided
      if (prefillValues) {
        inputs.forEach((input, index) => {
          const inputElement: HTMLTextAreaElement = dialog.querySelector(`#inputs-input-${index}`);
          if (inputElement && prefillValues[input.name] && inputElement.type !== 'file') {
            inputElement.value = prefillValues[input.name].toString();
          }
        });
      }
    },
  });

  // modalDialog(
  //     'Debug Inject',
  //     content,
  //     {
  //         Cancel: {
  //             class: 'text-gray-700 border-gray-700',
  //             handler: function (dialog) {
  //                 // Do nothing, just close the dialog
  //             },
  //         },
  //         Run: {
  //             class: 'text-white border-smyth-emerald-400 bg-smyth-emerald-400',
  //             handler: function (dialog) {
  //                 debugInputs[component.uid] = {
  //                     inputs: {},
  //                 };
  //                 const input = Array.from(dialog.querySelectorAll('.inputs-input.input')).reduce((obj, el: any, index) => {
  //                     let val;
  //                     try {
  //                         if (inputFileValue[index]) {
  //                             val = inputFileValue[index].value || undefined;
  //                         } else {
  //                             const isDisabled = el.getAttribute('disabled');
  //                             val = isDisabled ? undefined : JSON.parse(el.value);
  //                         }
  //                     } catch (e) {
  //                         val = el.value;
  //                     }
  //                     obj[inputs[index].name] = val;

  //                     const inputVal = typeof val != 'string' ? JSON.stringify(val, null, 2) : val;
  //                     debugInputs[component.uid].inputs[inputs[index].name] = inputVal;
  //                     return obj;
  //                 }, {});

  //                 const output = Array.from(dialog.querySelectorAll('.outputs-input.input')).reduce((obj, el: any, index) => {
  //                     let val;
  //                     try {
  //                         if (outputFileValue[index]) {
  //                             val = outputFileValue[index].value;
  //                         } else {
  //                             val = JSON.parse(el.value);
  //                         }
  //                     } catch (e) {
  //                         val = el.value;
  //                     }
  //                     obj[outputs[index].name] = val;
  //                     return obj;
  //                 }, {});

  //                 if (typeof callback === 'function') callback({ input, output });
  //             },
  //         },
  //     },
  //     {
  //         onShow: function (dialog) {
  //             if (debugInputs[component.uid]?.inputs) {
  //                 //console.log('debugInputs', debugInputs[component.uid]?.inputs);
  //                 for (let inputName in debugInputs[component.uid]?.inputs) {
  //                     const inputElement: HTMLInputElement = dialog.querySelector(`.inputs-input[name="${inputName}"]`);

  //                     if (!inputElement) continue;

  //                     // setting value to the file type input leads to error
  //                     if (inputElement.type !== 'file') {
  //                         const value = debugInputs[component.uid]?.inputs[inputName];
  //                         inputElement.value = value;
  //                     }
  //                 }
  //             }

  //             const checkboxes = dialog.querySelectorAll('input[type="checkbox"]');
  //             [...checkboxes].forEach((checkbox: any) => {
  //                 const rel = checkbox.getAttribute('rel');
  //                 const input: HTMLTextAreaElement = dialog.querySelector(`#${rel}`);
  //                 if (!input) return;
  //                 checkbox.addEventListener('change', (e) => {
  //                     const isChecked = e.target.checked;
  //                     if (isChecked) {
  //                         input.removeAttribute('disabled');

  //                         input.style.opacity = '1';
  //                     } else {
  //                         input.setAttribute('disabled', 'true');
  //                         input.value = '';
  //                         input.style.opacity = '0.5';
  //                     }
  //                 });
  //             });
  //             const inputsContainer = dialog.querySelector('#inputs');
  //             const outputsContainer = dialog.querySelector('#outputs');

  //             inputs.forEach((input, index) => {
  //                 if (input.type === 'file') {
  //                     const inputFile = inputsContainer.querySelector(`#inputs-input-${index}`);
  //                     const element = { domElement: inputFile, value: null, file: null };
  //                     inputFileValue[index] = element;
  //                     inputFile.addEventListener('change', (e: any) => {
  //                         const file = e.target.files[0];
  //                         element.file = file;
  //                         const reader = new FileReader();
  //                         reader.onload = (e) => {
  //                             element.value = e.target.result;
  //                         };
  //                         reader.readAsDataURL(file);
  //                     });
  //                 }
  //             });

  //             outputs.forEach((output, index) => {
  //                 if (output.type === 'file') {
  //                     const outputFile = outputsContainer.querySelector(`#outputs-input-${index}`);
  //                     const element = { domElement: outputFile, value: null, file: null };
  //                     outputFileValue[index] = element;
  //                     outputFile.addEventListener('change', (e: any) => {
  //                         const file = e.target.files[0];
  //                         element.file = file;
  //                         const reader = new FileReader();
  //                         reader.onload = (e) => {
  //                             element.value = e.target.result;
  //                         };
  //                         reader.readAsDataURL(file);
  //                     });
  //                 }
  //             });
  //         },
  //     },
  // );

  return;
}

/**
 * Updates the inspect button icon based on its active state
 * @param {HTMLElement} inspectButton - The inspect button element
 * @param {boolean} isActive - Whether the button should be in active state
 */
function updateInspectButtonIcon(inspectButton: HTMLElement, isActive: boolean) {
  if (!inspectButton) return;

  if (isActive) {
    inspectButton.classList.add('active');
  } else {
    inspectButton.classList.remove('active');
  }
}

export async function registerDbgMonitorUI(monitor: Monitor) {
  //

  monitor.on('component', (e: any) => {
    if (e.data.action === 'callStop' && e.data.duration) {
      // finished
      const comp = document.querySelector(`#${e.data.id}`);
      if (!comp) return;
      comp.classList.remove('dbg-running');
      // hide overlay
      // if duration was below 500ms, wait for 500ms - duration before hiding to give the visual feedback
      if (e.data.duration < 500) {
        setTimeout(() => {
          $(comp.querySelector('.cpt-overlay')).hide();
          console.log('HIDDEN OVERLAY FOR COMP ', e.data.id, ' BY MONITOR ');
        }, 500 - e.data.duration);
      } else {
        $(comp.querySelector('.cpt-overlay')).hide();
        console.log('HIDDEN OVERLAY FOR COMP ', e.data.id, ' BY MONITOR ');
      }
    } else if (e.data.action === 'callStart') {
      // started
      const comp = document.querySelector(`#${e.data.id}`);
      if (!comp) return;
      workspace.refreshComponentSelection(comp as HTMLElement);
      comp.classList.add('dbg-running');
      // show overlay
      $(comp.querySelector('.cpt-overlay')).show();
    }
  });

  monitor.on('computer-use/ui-state', (e: any) => {
    const comp = document.querySelector(`#${e.data.componentId}`);
    if (!comp) return;
    const computerStateImage: HTMLImageElement = comp.querySelector('.computer-state-img');
    if (!computerStateImage) return;
    computerStateImage.src = e.data.image_url;
  });

  function showTooltip(tooltipId) {
    const tooltipElement = document?.querySelector(`#${tooltipId}`);
    tooltipElement?.classList?.remove('invisible', 'opacity-0');
    tooltipElement?.classList?.add('visible', 'opacity-100');
  }

  function hideTooltip(tooltipId) {
    const tooltipElement = document?.querySelector(`#${tooltipId}`);
    tooltipElement?.classList?.remove('visible', 'opacity-100');
    tooltipElement?.classList?.add('invisible', 'opacity-0');
  }
}

/**
 * Toggles the visibility of the debug bar based on button visibility
 * @param componentElement The component element containing the debug bar and buttons
 */
function toggleDebugBarVisibility(componentElement: HTMLElement) {
  const debugBar = componentElement.querySelector('.debug-bar');
  const debugLogBtn = componentElement.querySelector('.btn-debug-log');
  const aiFixBtn = componentElement.querySelector('.btn-fix-with-ai');

  if (debugBar) {
    const isAnyButtonVisible =
      (debugLogBtn && !debugLogBtn.classList.contains('hidden')) ||
      (aiFixBtn && !aiFixBtn.classList.contains('hidden'));
    (debugBar as HTMLElement).style.display = isAnyButtonVisible ? '' : 'none';
  }
}

function resetComponentsState({
  resetMessages = false,
  resetPinned = false,
}: {
  resetMessages?: boolean;
  resetPinned?: boolean;
}) {
  document.querySelectorAll('#workspace-container .component').forEach((component: HTMLElement) => {
    // Remove all yellow icons, they are not needed on debug off mode
    component.querySelectorAll('.input-status-icon').forEach((ele) => ele?.remove());

    component.classList.remove('dbg-async');
    component.classList.remove('dbg-active');
    component.classList.remove('dbg-active-waiting');
    component.classList.remove('dbg-active-in_progress');
    component.classList.remove('dbg-active-error');
    component.classList.remove('has-empty-inputs'); // Remove the class that marks components with empty inputs
    component.classList.remove('empty-input-style');
    $(component.querySelector('.cpt-overlay')).hide();

    const debugBtn = component.querySelector('.btn-debug');
    if (debugBtn) {
      debugBtn.setAttribute('data-tooltip', 'Run with Debug');
    }

    if (resetMessages) {
      component['_control']?.clearComponentMessages();
    }

    if (resetPinned) {
      // enable endpoints if debugger window is not pinned
      const isPinned = component.querySelector('.pinned');
      if (!isPinned) {
        enableComponentEndpoints(component);
      }
    }
  });

  // Redraw workspace on next tick to ensure DOM updates are complete
  requestAnimationFrame(() => {
    //workspace.redraw();
    //TODO: redraw the active components
  });
}

/**
 * Check the status of the workflow
 * @return {string} Workflow status information
 * @returns {inprogress} Workflow is running
 * @returns {success} Workflow completed successfully
 * @returns {error} Workflow failed
 * @returns {default} Workflow is not running
 */

export function checkWorkflowStatus(): 'inprogress' | 'success' | 'error' | 'default' {
  const activeComponents = document.querySelectorAll('.component.dbg-active');
  if (activeComponents.length > 0) {
    return 'inprogress';
  }

  // Check debug logs in UI for success/error messages
  const debugLogs = (document.querySelector('#debug-status pre')?.innerHTML || '')
    .trim()
    .split('\n')?.[0];
  const successElements = document.querySelectorAll('.component .btn-debug-log:not(.hidden)');
  if (debugLogs.includes('Debug session completed successfully') && successElements.length > 0) {
    return 'success';
  }

  const errorElements = document.querySelectorAll('.component .error');
  if (
    (debugLogs.includes('Debug session failed') || debugLogs.includes('An error occured')) &&
    errorElements.length > 0
  ) {
    return 'error';
  }

  return 'default';
}

function showDeployAgentToast() {
  successToast('Debug run finished successfully. Ready to deploy?', 'Debug Complete', {
    ctaText: 'Deploy Agent',
    ctaCallback: () => {
      const deployAgentBtn = document.querySelector('#deploy-button-topbar') as HTMLButtonElement;
      if (deployAgentBtn) {
        deployAgentBtn.click();
      }
    },
  });
}

function repaintDebugComponentsAfter(ms = 300) {
  const components = [
    ...workspace.container.querySelectorAll(
      '.component.state-success, .component.dbg-active, .component.state-error',
    ),
  ];

  setTimeout(() => {
    components.forEach((component) => {
      workspace.jsPlumbInstance.repaint(component);
    });
  }, ms);
}
