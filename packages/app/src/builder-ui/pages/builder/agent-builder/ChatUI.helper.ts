import { Workspace } from '@src/builder-ui/workspace/Workspace.class';
import ADLParser from './ADLParser.class';

import { PRIMARY_BUTTON_STYLE, SECONDARY_BUTTON_STYLE } from '@src/react/shared/constants/style';
import markdownit from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';
import { recordNextStepsShown, shouldShowNextSteps } from '../../../../shared/utils';
import { PostHog } from '../../../services/posthog';
import { renderArcadeTutorial } from '../../../ui/react-injects';
import { twModalDialog } from '../../../ui/tw-dialogs';
import { addVoiceRecognitionToElement } from '../../../ui/voice';
import { uid } from '../../../utils';
import { sortAgent } from '../../../workspace/ComponentSort';
import { importSmythFile } from '../../../workspace/FileDrag';
import { openChatbotEmbodiment } from '../agent-settings';
import {
  MAX_ATTACHMENT_SIZE,
  WEAVER_REQUIRE_CREDITS,
} from './../../../../shared/constants/general';
import {
  weaverActionButtons,
  weaverLimitButtons,
} from './../../../../shared/constants/weaver-buttons';
import { WeaverAPI } from './ChatAPI.helper';
import { lint } from './Linter';
import { initializeMessageLimitDisplay, updateRemainingRequestsCount } from './MessageLimit.helper';

interface ActionButton {
  text: string;
  url: string;
  icon: string;
  event: string;
  arcadeUrl?: string;
}

interface ButtonContainerConfig {
  buttons: ActionButton[];
  containerClasses?: string[];
  title?: {
    text: string;
    classes?: string[];
  };
  subtitle?: {
    text: string;
    classes?: string[];
  };
  isLimitReached?: boolean;
}

declare var workspace: Workspace;
declare var __LLM_MODELS__: any;
declare var toast: any;
let hasComponents: boolean = false;
const md = markdownit({
  html: true,
  linkify: true,
  typographer: true,
});
md.use(markdownItAttrs);
// Override the default link renderer
const defaultRender =
  md.renderer.rules.link_open ||
  function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  // Add target="_blank" to the opening link tag
  const aIndex = tokens[idx].attrIndex('target');
  if (aIndex < 0) {
    tokens[idx].attrPush(['target', '_blank']); // Add new attribute
  } else {
    tokens[idx].attrs[aIndex][1] = '_blank'; // Replace existing attribute
  }

  // Return the updated token
  return defaultRender(tokens, idx, options, env, self);
};

// override the default "fence" renderer
const defaultFence =
  md.renderer.rules.fence ||
  function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

md.renderer.rules.fence = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  const info = token.info ? token.info.trim() : '';
  const langName = info.split(/\s+/g)[0];

  if (langName === 'plan') {
    // special case for myLang
    const additionalClasses = info.split(/\s+/g).slice(1).join(' ');
    return `<pre class="plan ${additionalClasses}">${md.utils.escapeHtml(token.content)}</pre>`;
  }

  // fallback to default rendering
  return defaultFence(tokens, idx, options, env, self);
};

const weaverComponentsBackup = {};

const delay = (ms) => new Promise((resolve) => setTimeout(() => resolve(true), ms));

let weaverAPI: WeaverAPI;

async function waitForChatRefresh() {
  const loadingOverlay = document.getElementById('agent-chat-loading-overlay');
  //await refreshChat();
  weaverAPI = new WeaverAPI(workspace);
  await weaverAPI.refreshChat();
  //wait For Chat Refresh
  loadingOverlay?.classList?.add('hidden');
}

function handleWeaverChatOverlay() {
  const loadingOverlay = document.getElementById('agent-chat-loading-overlay');
  if (loadingOverlay) {
    // Helper function for agent locking UI updates
    function handleAgentLocking() {
      // Show loading overlay
      loadingOverlay?.classList?.remove('hidden');
      //AgentLocked
      // Handle loading state and permission message
      const loadingState = loadingOverlay?.querySelector('.loading-spinner');
      const permissionErrorMessage = loadingOverlay?.querySelector('.permission-error-message');

      // Show loading spinner, hide permission message
      loadingState?.classList.add('hidden');
      permissionErrorMessage?.classList.remove('hidden');
    }

    workspace.addEventListener('AgentLoaded', () => {
      console.log('AgentLoaded');
      //Handle loading overlay with proper state management
      loadingOverlay?.classList?.remove('hidden');
      //AgentLoaded
      // Get overlay state elements
      const loadingState = loadingOverlay?.querySelector('.loading-spinner');
      const permissionErrorMessage = loadingOverlay?.querySelector('.permission-error-message');
      // Show loading state, hide permission message during load
      loadingState?.classList.remove('hidden');
      permissionErrorMessage?.classList.add('hidden');
    });
    workspace.agent.addEventListener('lock', () => {
      handleAgentLocking();
    });
    workspace.agent.addEventListener('lock-as-view-mode', () => {
      handleAgentLocking();
    });
    workspace.agent.addEventListener('unlock', (prevStatus) => {
      // Handle chat loading overlay

      // Hide the entire overlay
      loadingOverlay?.classList?.add('hidden');

      // Reset states
      const loadingState = loadingOverlay?.querySelector('.loading-spinner');
      const permissionErrorMessage = loadingOverlay?.querySelector('.permission-error-message');
      loadingState?.classList?.remove('hidden');
      permissionErrorMessage?.classList.add('hidden');

      if (!prevStatus?.startsWith('lock')) return;
      console.log('Unlocking agent from locked state');
      setTimeout(() => {
        // Re-enable all input elements when unlocked
        const messageInput = document?.getElementById('agentMessageInput') as HTMLTextAreaElement;
        const sendButton = document?.getElementById('agentSendButton') as HTMLButtonElement;
        const micButton = document?.getElementById('agentMicButton') as HTMLButtonElement;
        const attachButton = document?.getElementById('agentAttachButton') as HTMLButtonElement;
        const fileInput = document?.getElementById('agentFileInput') as HTMLInputElement;
        const urlAttachments = document?.getElementById('agentUrlAttachments') as HTMLInputElement;

        // Enable message input
        if (messageInput) {
          //messageInput.disabled = false;
          messageInput.removeAttribute('readonly');
          messageInput.setAttribute('autocomplete', 'off');
          messageInput.placeholder =
            workspace?.agent?.data?.components?.length > 0
              ? 'Type your message...'
              : 'Describe the agent you want to build...';
        }

        // Enable buttons
        if (sendButton) {
          sendButton.disabled = false;
        }

        if (micButton) {
          micButton.disabled = false;
          micButton?.removeAttribute('disabled');
        }

        if (attachButton) {
          attachButton.disabled = false;
          attachButton?.removeAttribute('disabled');
        }

        // Enable attachment inputs
        if (fileInput) {
          fileInput.disabled = false;
          fileInput?.removeAttribute('readonly');
        }

        if (urlAttachments) {
          urlAttachments.disabled = false;
          urlAttachments?.removeAttribute('readonly');
        }

        // #region show upsell section for free users
        const isFreeUser = workspace?.userData?.subscription?.plan?.isDefaultPlan;

        if (isFreeUser) {
          initializeMessageLimitDisplay(workspace?.userData);
        }
        // #endregion
      }, 200);
      if (workspace.locked) {
        handleAgentLocking();
      }
    });
  }
}

async function downVoteDialog(messageContainer: HTMLElement, feedback: any) {
  return new Promise((resolve) => {
    const tpl = document.getElementById('agent-downvote-dialog');
    if (!tpl) return resolve(false);
    const dialog_tpl = tpl.cloneNode(true) as HTMLElement;
    dialog_tpl.removeAttribute('id');
    dialog_tpl.classList.remove('hidden');

    twModalDialog({
      title: 'Give Feedback',
      content: dialog_tpl.innerHTML,
      onDOMReady: (dialog) => {
        dialog.classList.add('overflow-hidden');

        setTimeout(() => {
          const buttons = dialog.querySelectorAll('button');
          const submitButton = Array.from(buttons).find(
            (button) => button.textContent?.trim() === 'Submit',
          ) as HTMLButtonElement;

          if (submitButton) {
            // Initialize button state
            submitButton.disabled = true;
            submitButton.classList.remove('bg-smythos-blue-500', 'text-white');
            submitButton.classList.add('bg-gray-100', 'cursor-not-allowed', 'text-gray-400');

            const checkboxes = dialog.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
            checkboxes.forEach((checkbox) => {
              checkbox.addEventListener('change', () => {
                const isAnyChecked = [...checkboxes].some((cb) => cb.checked);
                submitButton.disabled = !isAnyChecked;
                if (isAnyChecked) {
                  submitButton.classList.remove(
                    'bg-gray-100',
                    'cursor-not-allowed',
                    'text-gray-400',
                  );
                  submitButton.classList.add('bg-smythos-blue-500', 'text-white');
                } else {
                  submitButton.classList.remove('bg-smythos-blue-500', 'text-white');
                  submitButton.classList.add('bg-gray-100', 'cursor-not-allowed', 'text-gray-400');
                }
              });
            });
          }
        }, 0);
      },
      actions: [
        {
          label: 'Cancel',
          cssClass: SECONDARY_BUTTON_STYLE,
          callback: (dialog) => {
            resolve(false);
          },
        },
        {
          label: 'Submit',
          cssClass: PRIMARY_BUTTON_STYLE,
          callback: async (dialog) => {
            const checkedCheckboxes = [
              ...dialog.querySelectorAll('input[type="checkbox"]:checked'),
            ].map((c) => c.parentElement.querySelector('label').textContent.trim());
            const otherFeedback = dialog.querySelector('textarea').value;

            const _feedback = { ...feedback, reasons: checkedCheckboxes, comment: otherFeedback };
            const result = await weaverAPI.sendFeedback(_feedback);
            if (result?.success) {
              toast('Thank you', 'Feedback Received');
            }
            PostHog.track('app_weaver_feedback', {
              action: 'negative feedback submitted',
            });
            messageContainer.classList.add('downvoted');
            resolve(true);
          },
        },
      ],
    });
  });
}

let attachmentFile: File | null = null;

// Define handleFixWithAIBtn function at module level
const handleFixWithAIBtn = async (data) => {
  const messageInput = document.getElementById('agentMessageInput') as HTMLTextAreaElement;

  if (data?.weaverPrompt) {
    if (messageInput) {
      // Create a new string to ensure we're not modifying the original

      const prompt = String(data.weaverPrompt);
      messageInput.value = prompt;
      await delay(50);
      // Trigger the send function directly
      const event = new Event('click');
      document.getElementById('agentSendButton')?.dispatchEvent(event);
      await delay(50);
      const lastUserMessage = document.querySelector(
        '#agentChatHistory .user-messages-container:last-child',
      ) as HTMLElement;

      if (
        lastUserMessage &&
        lastUserMessage.innerText.includes(`Component With ID=${data.componentId}`)
      ) {
        lastUserMessage.classList.add('user-message-weaver-fix');
      }
    }
  }
};

window.addEventListener('fixWithAIBtn', (event: any) => {
  if (event?.detail?.data?.weaverPrompt) {
    handleFixWithAIBtn(event.detail?.data);
  }
});

export async function autoResizeTextarea() {
  const textarea = document.getElementById('agentMessageInput') as HTMLTextAreaElement;
  // Ensure textarea exists before proceeding
  if (!textarea) {
    return;
  }

  function autoResize() {
    // Resetting height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Calculating new height (clamped between 36px and 144px)
    const newHeight = Math.min(Math.max(36, textarea.scrollHeight), 144);

    textarea.style.height = `${newHeight}px`;
  }

  autoResize();
  textarea.addEventListener('input', autoResize);
  textarea.addEventListener('focus', autoResize);
}

export async function runChatUI() {
  handleAttachment();
  const messageInput: HTMLInputElement = document.getElementById(
    'agentMessageInput',
  ) as HTMLInputElement;
  const sendButton: HTMLButtonElement = document.getElementById(
    'agentSendButton',
  ) as HTMLButtonElement;
  const stopButton: HTMLButtonElement = document.getElementById(
    'agentStopButton',
  ) as HTMLButtonElement;
  const attachButton: HTMLButtonElement = document.getElementById(
    'agentAttachButton',
  ) as HTMLButtonElement;
  const expandButton: HTMLButtonElement = document.getElementById(
    'agentExpandButton',
  ) as HTMLButtonElement;

  const chatContainer: HTMLElement = document.getElementById('agentChatContainer');

  const agentFileInput = document.getElementById('agentFileInput') as HTMLInputElement;
  const agentFileInputLabel = document.getElementById('agentFileInputLabel') as HTMLLabelElement;
  const agentUrlAttachments = document.getElementById('agentUrlAttachments') as HTMLInputElement;

  handleWeaverChatOverlay();

  let isStreaming = false;
  let isExpanded = false;
  let previousScrollY = 0;

  // these are to fix the issue where the page scrolls up when the keyboard opens on mobile
  messageInput.addEventListener('focus', () => {
    // Save the scroll position before the keyboard opens
    previousScrollY = window.scrollY;
  });

  messageInput.addEventListener('blur', () => {
    // Restore the scroll position after the keyboard closes
    setTimeout(() => {
      window.scrollTo(0, previousScrollY);
    }, 100); // Small delay to allow keyboard animation to complete
  });

  // Define MessageType enum
  const MessageType = {
    USER: 'user',
    BOT: 'bot',
    ERROR: 'error',
    INFO: 'info',
  };

  // Map message types to their corresponding classes
  const messageTypeClasses = {
    [MessageType.USER]: [
      'text-sm',
      'bg-[#eaeaea]',
      't_user',
      'rounded-[30px]',
      'rounded-br-none',
      'max-w-[90%]',
      'p-3',
      'flex',
      'flex-col',
      'gap-2',
    ],
    [MessageType.ERROR]: ['p-3', 't_error', 'rounded-lg', 'text-xs', 'font-bold'],

    [MessageType.INFO]: [
      'mx-2',
      'my-0',
      'bg-gray-200',
      't_info',
      'border-2',
      'border-gray-200',
      'border-solid',
      'text-xs',
      'font-bold',
      'text-gray-700',
      'animate-border-pulse',
    ],
    [MessageType.BOT]: ['bg-gray-200/0', 't_content', 'bot_message', 'text-sm'],
  };

  // Main application logic
  const chatHistory: HTMLElement = document.getElementById('agentChatHistory');
  let lastScrollHeight = 0;
  let currentContainer: HTMLElement | null = null;

  await waitForChatRefresh();

  addVoiceRecognitionToElement(
    document.getElementById('agentMessageInput') as HTMLTextAreaElement,
    document.getElementById('agentMicButton') as HTMLButtonElement,
  );
  // Function to get or create a message container
  function getOrCreateMessageContainer(isUser: boolean): HTMLElement {
    if (
      currentContainer &&
      ((isUser && currentContainer.classList.contains('user-messages-container')) ||
        (!isUser && currentContainer.classList.contains('bot-messages-container')))
    ) {
      return currentContainer;
    }

    const newContainer = document.createElement('div');
    newContainer.className = isUser
      ? 'messages-container user-messages-container mt-4 flex justify-end'
      : 'messages-container bot-messages-container mt-4 animate group';
    chatHistory.appendChild(newContainer);
    newContainer.setAttribute('data-message-id', weaverAPI.getConvMessages().length.toString());
    currentContainer = newContainer;
    return newContainer;
  }

  // Function to get the last bot message div
  function getLastBotMessageDiv(): HTMLElement | null {
    const botContainer = getOrCreateMessageContainer(false);
    return botContainer.lastElementChild as HTMLElement | null;
  }

  if (workspace.agent?.data?.components?.length > 0) {
    hasComponents = true;
    messageInput.setAttribute('placeholder', 'Type your message...');
    addBotMessage(
      "Hello, I'm Agent Smyth Weaver!\nIt appears you already have an agent. I can assist you in enhancing its capabilities, understanding its behavior, and addressing any issues you may encounter.",
    );
    stopAllAnimations();
  } else {
    messageInput.setAttribute('placeholder', 'Describe the agent you want to build...');
    addBotMessage(
      "Hello, I'm Agent Smyth Weaver!\nI can assist you in building your agent from the ground up. Simply describe what you need it to do, and I'll help you create it.",
    );
    stopAllAnimations();
  }

  async function removeComponentAndSaveConnections(componentId) {
    let savedConnections = [];
    const dom = document;

    const domElt: any = dom.getElementById(componentId);
    const component = domElt._control;

    //get all connections attached to the component so we can restore them later
    const targetEPList = [...domElt.querySelectorAll('.input-container .endpoint')].map(
      (e) => e.id,
    );
    const sourceEPList = [...domElt.querySelectorAll('.output-container .endpoint')].map(
      (e) => e.id,
    );

    const connectionsToRemove = [];
    const targetConList = workspace.jsPlumbInstance
      .getConnections({
        target: targetEPList,
      })
      .map((c) => {
        const sourceEPId = c.source.id;
        const targetEPId = c.target.id;
        const sourceId = dom.getElementById(sourceEPId).closest('.component').id;
        const targetId = dom.getElementById(targetEPId).closest('.component').id;
        const sourceIndex = c.source.getAttribute('smt-name');
        // [...dom.getElementById(sourceEPId).parentElement.querySelectorAll('.endpoint'),]
        //   .map((e) => e.id)
        //   .indexOf(sourceEPId);
        const targetIndex = c.target.getAttribute('smt-name');
        // [
        //   ...dom.getElementById(targetEPId).parentElement.querySelectorAll('.endpoint'),
        // ]
        //   .map((e) => e.id)
        //   .indexOf(targetEPId);
        connectionsToRemove.push(c);
        return { sourceId, targetId, sourceIndex, targetIndex };
      });
    const sourceConList = workspace.jsPlumbInstance
      .getConnections({
        source: sourceEPList,
      })
      .map((c) => {
        const sourceEPId = c.source.id;
        const targetEPId = c.target.id;
        const sourceId = dom.getElementById(sourceEPId).closest('.component').id;
        const targetId = dom.getElementById(targetEPId).closest('.component').id;
        const sourceIndex = c.source.getAttribute('smt-name');
        // [
        //   ...dom.getElementById(sourceEPId).parentElement.querySelectorAll('.endpoint'),
        // ]
        //   .map((e) => e.id)
        //   .indexOf(sourceEPId);
        const targetIndex = c.target.getAttribute('smt-name');
        // [
        //   ...dom.getElementById(targetEPId).parentElement.querySelectorAll('.endpoint'),
        // ]
        //   .map((e) => e.id)
        //   .indexOf(targetEPId);
        connectionsToRemove.push(c);
        return { sourceId, targetId, sourceIndex, targetIndex };
      });

    savedConnections.push(...targetConList, ...sourceConList);

    await component.delete(true, false);

    return savedConnections;
  }

  async function restoreComponent(id) {
    const componentData = weaverComponentsBackup[id];
    const newComponent = await createComponent(componentData, 'restore');
    delete weaverComponentsBackup[id];
    newComponent.removeAttribute('data-weaver-action');
    newComponent.querySelector('.weaver-meta')?.remove();
  }

  async function createComponent(component, action = 'create') {
    const posX = 0;
    const posY = 0;
    const dom = document;
    const domElt: any = dom.getElementById(component.id);
    let savedConnections = [];
    let isNew = true;
    let componentBackup = null;
    let isLLM = false;

    if (__LLM_MODELS__ && component?.data?.model) {
      isLLM = true;
      //this is an LLM component
      if (component.data.model.toLowerCase() != 'echo' && !__LLM_MODELS__[component.data.model]) {
        console.warn(
          'weaver: found invalid LLM model',
          component.data.model,
          'using gpt-4o instead',
        );
        component.data.model = 'gpt-4o';
      }
    }

    if (domElt) {
      isNew = false;
      //backup the component before removing it
      if (action == 'create' || action == 'update') {
        componentBackup = domElt._control.export();
      }

      savedConnections = await removeComponentAndSaveConnections(component.id);

      await delay(100);
    }

    if (isLLM && isNew) {
      if (__LLM_MODELS__[`smythos/${component?.data?.model}`]) {
        //console.log('weaver: builtin model available for', component?.data?.model);
        component.data.model = `smythos/${component?.data?.model}`;
      }
    }

    //detect AgentSkill Simple mode

    if (component.name == 'APIEndpoint') {
      if (
        Array.isArray(component?.inputs) &&
        component?.inputs?.length > 0 &&
        Array.isArray(component?.outputs) &&
        component?.outputs?.length > 0
      ) {
        const inputs = component.inputs.map((e: any) => e.name).sort();
        const outputs = component.outputs
          .filter((e: any) => !e.default)
          .map((e: any) => (e.expression || e.name || '').replace('body.', ''))
          .sort();

        if (inputs.length == outputs.length && JSON.stringify(inputs) == JSON.stringify(outputs)) {
          component.data.advancedModeEnabled = false;
          //console.log('APIEndpoint Simple mode ==> AgentSkill');
        }

        const bodyProp = component?.outputs
          ?.map((e) => e.name)
          .find((e) => e.includes('body.') || e.includes('query.') || e.includes('headers.'));

        if (bodyProp) {
          component.data.advancedModeEnabled = true;
        }
      }
    }
    //create the new component with a temporary uid because sometimes jsplumb defers connection deletes using the original uid which leads to inconsistencies
    const tempUID = 'C' + uid();
    const newComponent = await workspace.addComponent(
      component.name,
      {
        outputs: component?.outputs?.map((c) => c.name) || [],
        inputs: component?.inputs?.map((r) => r.name) || [],
        outputProps: component.outputs || [],
        inputProps: component.inputs || [],
        data: component.data || {},
        top: `${parseInt(component.top) + posY}px`,
        left: `${parseInt(component.left) + posX}px`,
        width: component.width,
        title: component.title || '',
        aiTitle: component.aiTitle || '',
        description: component.description || '',
        uid: component.id,
        template: component.template,
      },
      false,
    );
    //newComponent.id = component.id;

    newComponent.setAttribute('data-weaver-action', isNew ? 'Weaver Created' : 'Weaver Updated');
    weaverComponentsBackup[newComponent.id] = componentBackup;

    const weaverDiv = document.createElement('div');
    weaverDiv.className = `weaver-meta absolute flex justify-center items-center py-1 ${
      isNew ? 'bg-violet-200' : 'bg-violet-300'
    }  w-full h-0 overflow-hidden rounded-b bottom-0 group-hover:-bottom-6 group-hover:h-9 transition ease-in-out delay-150`;
    weaverDiv.setAttribute('data-weaver-component-id', newComponent.id);
    let actionChild;
    if (isNew) {
      actionChild = document.createElement('div');
      actionChild.textContent = 'Just Created By Weaver';
      actionChild.className =
        'grow px-2 text-xs text-center text-violet-800 text-opacity-0 group-hover:text-opacity-100';
    } else {
      actionChild = document.createElement('button');
      actionChild.textContent = 'Click to Undo Changes';
      actionChild.className =
        'grow px-2 text-sm font-bold text-center text-violet-800 text-opacity-0 group-hover:text-opacity-100';
      const restoreId = newComponent.id;
      actionChild.addEventListener('click', () => {
        restoreComponent(restoreId);
      });
    }

    weaverDiv.appendChild(actionChild);
    newComponent.appendChild(weaverDiv);

    if (savedConnections.length > 0) {
      await delay(400); //Sometimes the input/output props are not ready immediately after creation
      //restore connections
      for (let connection of savedConnections) {
        try {
          const con = workspace.addConnection(
            connection.sourceId,
            connection.targetId,
            connection.sourceIndex,
            connection.targetIndex,
          );
        } catch (error) {
          if (window['DEBUG_WEAVER']) console.warn('addConnection failed', connection);
        }
      }

      await delay(100);
    }
    //newComponent.classList.add('selected');
    //cptIdMapping[component.id] = newComponent.id;

    workspace.scrollToComponent(newComponent);
    return newComponent;
  }

  async function createConnection(connection) {
    if (weaverFirstConnection && weaverCreatingAgent) {
      workspace.scrollToAgentCard();
      weaverFirstConnection = false;
    }

    await delay(~~(Math.random() * 100));

    try {
      // Remap IDs
      const sourceId = connection.sourceId;
      const targetId = connection.targetId;

      const sourceDOMComponent: any = document.getElementById(sourceId);
      const targetDOMComponent: any = document.getElementById(targetId);
      if (!sourceDOMComponent || !targetDOMComponent) {
        console.error('Source or target DOM component not found:', sourceId, targetId);
        return;
      }
      const sourceComponent = sourceDOMComponent._control;
      const targetComponent = targetDOMComponent._control;

      if (typeof connection.sourceIndex == 'string') {
        const source = sourceComponent.outputContainer.querySelector(
          `.endpoint[smt-name="${connection.sourceIndex}"]`,
        );

        if (!source) {
          console.warn('Missing source endpoint', connection.sourceIndex, 'will add it');
          sourceComponent.addOutput(sourceComponent.outputContainer, connection.sourceIndex);
        }
      }
      if (typeof connection.targetIndex == 'string') {
        const target = targetComponent.inputContainer.querySelector(
          `.endpoint[smt-name="${connection.targetIndex}"]`,
        );

        if (!target) {
          console.warn('Missing target endpoint', connection.targetIndex, 'will add it');
          targetComponent.addInput(targetComponent.inputContainer, connection.targetIndex);
        }
      }

      let retries = 5;
      let retryMultiplier = 100;

      for (let i = 0; i < retries; i++) {
        //exponential backoff
        const nextDelay = ~~(Math.random() * 50) + i * retryMultiplier;
        try {
          const con = workspace.addConnection(
            connection.sourceId,
            connection.targetId,
            connection.sourceIndex,
            connection.targetIndex,
          );

          //if everything went well break the loop
          break;
        } catch (error) {
          await delay(nextDelay);
        }
      }
    } catch (error) {
      console.error('Error adding connection:', error);
    }
  }

  // Function to add info message

  let _parser;
  //ADLSource.split('\n').forEach((line) => parser.parseLine(line));
  //console.log(JSON.stringify(parser.getJSON(), null, 2));

  async function updateAgentName(name) {
    const nameInput: any = document.getElementById('agent-name-input');
    const wmAgentName: any = document.getElementById('watermark-agent-name');
    if (nameInput) {
      nameInput.value = name;
    }
    if (wmAgentName) {
      wmAgentName.textContent = name;
    }
    workspace.agent.name = name;
    await workspace.saveAgent();
  }

  async function updateAgentBehavior(behavior) {
    workspace.agent.behavior = behavior.replace(/\\n/g, '\n');
    workspace.agent.data.behavior = behavior.replace(/\\n/g, '\n');
    await workspace.saveAgent();
  }

  async function updateAgentDescription(description) {
    workspace.agent.shortDescription = description.replace(/\\n/g, '\n');
    workspace.agent.data.shortDescription = description.replace(/\\n/g, '\n');
    await workspace.saveAgent();
  }

  async function updateAgentProps() {
    if (!_parser?.agentData) return;
    const behavior = _parser.agentData.behavior;
    const shortDescription = _parser.agentData.shortDescription;
    weaverAPI.ensureSaveAgent(() => {
      if (behavior) {
        workspace.agent.behavior = behavior.replace(/\\n/g, '\n');
        workspace.agent.data.behavior = behavior.replace(/\\n/g, '\n');
      }
      if (shortDescription) {
        workspace.agent.shortDescription = shortDescription.replace(/\\n/g, '\n');
        workspace.agent.data.shortDescription = shortDescription.replace(/\\n/g, '\n');
      }
    });
  }

  let waitParserResolve;
  let waitParser = new Promise((resolve) => {
    waitParserResolve = resolve;
  });
  async function parseADL(content) {
    generatingCode = true;
    //lock the workspace during agent operations
    if (!workspace.locked) {
      workspace.lock();
    }

    waitParser = new Promise((resolve) => {
      waitParserResolve = resolve;
    });
    if (!_parser) {
      _parser = new ADLParser();
      window['_parser'] = _parser;
      _parser.on('agentSettingsUpdated', async (prop, value) => {
        if (prop == 'name') {
          await updateAgentName(value);
          await delay(500);
        }
        if (prop == 'behavior') {
          await updateAgentBehavior(value);
          await delay(500);
        }
        if (prop == 'description') {
          await updateAgentDescription(value);
          await delay(500);
        }
      });
    }
    _parser.parseLine(content);

    for (let component of _parser.agentData.components) {
      if (_parser.componentStatus[component.id] == 'DELETED') {
        _parser.componentStatus[component.id] = 'REMOVING';

        await removeComponentAndSaveConnections(component.id);
        _parser.componentStatus[component.id] = 'REMOVED';
        await delay(100);
      }
    }

    let deleteCon;
    while ((deleteCon = _parser.deleteConnections.shift())) {
      //await wor removeConnection(connection);
      await workspace.deleteConnection(
        deleteCon.sourceId,
        deleteCon.targetId,
        deleteCon.sourceIndex,
        deleteCon.targetIndex,
      );
    }

    for (let component of _parser.agentData.components) {
      if (_parser.componentStatus[component.id] == 'READY') {
        _parser.componentStatus[component.id] = 'CREATING';

        await createComponent(component);
        _parser.componentStatus[component.id] = 'CREATED';
        await delay(100);
      }
    }

    let addCon;
    while ((addCon = _parser.addConnections.shift())) {
      await createConnection(addCon);
    }

    await delay(100);

    await workspace.saveAgent();
    waitParserResolve(true);
  }

  // Function to add user message
  function addUserMessage(content: string) {
    const container = getOrCreateMessageContainer(true);
    const messageDiv = document.createElement('div');
    const baseClasses = ['p-2', 'rounded-lg', 'mb-2'];
    const userClasses = messageTypeClasses[MessageType.USER] || [];

    messageDiv.className = [...baseClasses, ...userClasses].join(' ');

    // Create message content with attachment preview if present
    let messageContent = `<div>${content.replace(/\n/g, '<br>')}</div>`;

    let attachmentUrl = '';
    let attachmentName = '';
    let attachmentSize = 0;
    let isImage = false;
    if (attachmentFile) {
      attachmentUrl = URL.createObjectURL(attachmentFile);
      attachmentName = attachmentFile.name;
      attachmentSize = attachmentFile.size;
      isImage = attachmentFile.type.startsWith('image/');
    }

    if (!attachmentUrl && agentUrlAttachments) {
      attachmentUrl = agentUrlAttachments.value;
      attachmentName = agentUrlAttachments.value.split('/').pop();
      isImage =
        attachmentUrl.endsWith('.png') ||
        attachmentUrl.endsWith('.jpg') ||
        attachmentUrl.endsWith('.jpeg') ||
        attachmentUrl.endsWith('.webp') ||
        attachmentUrl.endsWith('.gif') ||
        attachmentUrl.endsWith('.svg');
    }
    if (attachmentUrl) {
      messageContent += `
        <div class="msg-attachment-img flex items-center gap-2 p-2 bg-gray-100 rounded-lg">
          ${
            isImage
              ? `
            <img
              src="${attachmentUrl}"
              alt="${attachmentName}"
              class="w-10 h-10 object-cover rounded border border-solid border-gray-200"
            />
          `
              : `
            <div class="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
              <i class="fas fa-file text-gray-500"></i>
            </div>
          `
          }
          <div class="flex flex-col text-xs">
            <span class="font-medium truncate max-w-[200px]">${attachmentName}</span>
            <span class="text-gray-500">${
              attachmentSize ? (attachmentSize / 1024).toFixed(1) + ' KB' : ' '
            }</span>
          </div>
        </div>
      `;
    }

    messageDiv.innerHTML = messageContent;

    //tag linter messages
    if (content.includes(`Lint:Weaver`)) {
      container.classList.add('user-message-weaver-lint');
    }
    container.appendChild(messageDiv);
    updateScroll();
  }

  // Function to add bot message
  function addBotMessage(content: string) {
    const container = getOrCreateMessageContainer(false);
    const messageDiv = document.createElement('div');
    const baseClasses = ['rounded-lg', 'mb-4'];
    const botClasses = messageTypeClasses[MessageType.BOT] || [];

    messageDiv.className = [...baseClasses, ...botClasses].join(' ');

    messageDiv.innerHTML = md.render(`${content}`);
    container.appendChild(messageDiv);
    updateScroll();
  }

  function addSystemMessage(
    content: string,
    cssClasses: String | Array<String> = ['text-red-700', 'bg-red-100'],
  ) {
    const container = getOrCreateMessageContainer(false);
    const messageDiv = document.createElement('div');
    const baseClasses = [
      'rounded-lg',
      'm-2',
      Array.isArray(cssClasses) ? cssClasses.join(' ') : cssClasses,
    ];
    const errorClasses = messageTypeClasses[MessageType.ERROR] || [];
    messageDiv.className = [...errorClasses, ...baseClasses].join(' ');

    messageDiv.innerHTML = `<div>${content.replace(/\n/g, '<br>')}</div>`;
    container.appendChild(messageDiv);
    updateScroll();
  }

  async function createAgentSnapshot() {
    const undoContainer = document.createElement('div');

    undoContainer.className =
      'revert-container text-xs opacity-0 overflow-hidden flex justify-between bg-purple-100 mx-2 transition-opacity delay-150 duration-300 group-hover:opacity-100 rounded-t-lg';

    const span = document.createElement('span');
    span.className = 'revert-message text-xs text-gray-500 text-left p-1 px-3';
    span.textContent = '';

    const revertBtn = document.createElement('button');
    revertBtn.className =
      'btn-revert flex w-24 btn btn-primary cursor-pointer px-2 py-1 mx-0 my-0 text-xs text-purple-500 font-small text-center rounded-br-lg bg-purple-100 hover:bg-purple-200 hidden';
    revertBtn.innerHTML = `<i class="fa-solid fa-rotate-left align-middle text-xs mr-1 group-hover:font-bold"></i> <span class="align-middle text-xs ml-2 group-hover:font-bold">Revert</span>`;

    const reapplyBtn = document.createElement('button');
    reapplyBtn.className =
      'btn-reapply flex w-24btn btn-primary cursor-pointer px-2 py-1 mx-0 my-0 text-xs text-purple-500 font-small text-center rounded-bl-lg bg-purple-100 hover:bg-purple-200 hidden';
    reapplyBtn.innerHTML = `<span class="align-middle text-xs mr-2 group-hover:font-bold">Reapply</span> <i class="fa-solid fa-rotate-right align-middle text-xs ml-1 group-hover:font-bold"></i>`;

    //Controller Logic

    const agentDataStr = JSON.stringify(await workspace.export(false));
    //console.log('Saved Agent State before weaver changes', agentDataStr);
    const restoreHandler = async () => {
      const agentData = JSON.parse(agentDataStr);
      console.log('Restoring Previous Agent data');
      await importSmythFile(workspace, agentData, true);
      workspace.stateManager.reset(agentData);
    };

    const reapplyHandler = async () => {};
    const resultObj = {
      container: undoContainer,
      revertBtn,
      reapplyBtn,
      restoreHandler,
      reapplyHandler,
      setReapplyHandler: async () => {
        const agentReapplyDataStr = JSON.stringify(await workspace.export(false));
        resultObj.reapplyHandler = async () => {
          const agentData = JSON.parse(agentReapplyDataStr);
          console.log('Replaying Agent Changes');
          await importSmythFile(workspace, agentData, true);
          workspace.stateManager.reset(agentData);
        };
      },
    };

    undoContainer['_controler'] = resultObj;

    revertBtn.addEventListener('click', restoreHandler);
    reapplyBtn.addEventListener('click', () => {
      resultObj.reapplyHandler(); //the function is set later
    });
    undoContainer.appendChild(revertBtn);
    undoContainer.appendChild(span);
    undoContainer.appendChild(reapplyBtn);

    return resultObj;
  }
  async function addInfoMessage(info: string, options: any = {}) {
    const {
      infoId = null,
      details = null,
      callback = null,
      icon = null,
      content = null,
      status = null,
      code = null,
    } = options;

    const lastBotMessageDiv = [
      ...document.querySelectorAll('#agentChatHistory .bot-messages-container'),
    ].pop();

    let messageDiv: HTMLElement = lastBotMessageDiv.querySelector(`[data-info-id="${infoId}"]`);

    if (!messageDiv) {
      //Save current agent state before continuing

      // const agentData = await workspace.export(false);
      // console.log('Saved Agent State before weaver changes', agentData);
      // const restoreHandler = async () => {
      //   console.log('Restoring Previous Agent data');
      //   await importSmythFile(workspace, agentData, true);
      //   workspace.stateManager.reset(agentData);
      // };

      if (_parser) await _parser.refreshAgentData();
      messageDiv = document.createElement('div');
      const baseClasses = [
        'p-2',
        'py-4',
        'rounded-t-lg',
        'rounded-b-lg',
        'group-hover:rounded-t-[0px]',
      ];
      const infoClasses = messageTypeClasses[MessageType.INFO] || [];
      messageDiv.className = [...baseClasses, ...infoClasses].join(' ');

      if (infoId) {
        messageDiv.setAttribute('data-info-id', infoId);
      }

      const container = getOrCreateMessageContainer(false);

      // const undoContainer = document.createElement('div');
      // undoContainer.className = 'flex justify-between bg-purple-100 rounded-md m-2';
      // const span = document.createElement('span');
      // span.className = 'text-xs text-gray-500 text-left p-1 px-3';
      // span.textContent = 'Agent Snapshot Before Weaver Changes';
      // undoContainer.appendChild(span);

      // const revertBtn = document.createElement('button');
      // revertBtn.className =
      //   'btn-revert btn btn-primary cursor-pointer px-2 py-1 mx-0 my-0 text-xs text-gray-700 font-small text-center bg-purple-200 rounded-r-md hover:bg-purple-300 hidden';
      // revertBtn.innerHTML = '<i class="fa-solid fa-clock-rotate-left mr-1"></i><span>Revert</span>';
      // revertBtn.addEventListener('click', restoreHandler);
      // undoContainer.appendChild(revertBtn);

      const { container: undoContainer } = await createAgentSnapshot();

      container.appendChild(undoContainer);
      container.appendChild(messageDiv);

      if (workspace.scale > 0.5) workspace.zoomTo(0.5);
    }

    if (status || code) {
      await parseADL(content);
    }
    if (info) {
      messageDiv.setAttribute('data-message-filename', info);
      messageDiv.classList.add('smyth_code');
      let messageContent = '';
      if (icon) {
        messageContent += `<div class="flex items-center">${icon}`;
      }

      messageContent += `<div>${info.replace(/\n/g, '<br>')}</div>`;
      if (details) {
        messageContent += `<div class="text-xs text-gray-600 font-normal">${details}</div>`;
      }
      if (code) {
        //escape html tags
        const escapedCode = window['DEBUG_WEAVER']
          ? code.replace(/</g, '&lt;').replace(/>/g, '&gt;')
          : '...';
        //console.log('escapedCode', escapedCode);
        messageContent += `<div><pre class="_code overflow-auto max-h-96 transition-all duration-300 ease-in-out text-xs text-gray-900/60 bg-gray-300 p-2 py-3 rounded-md hidden">${escapedCode}</pre></div>`;
      }

      if (icon) {
        messageContent += '</div>';
      }

      messageDiv.innerHTML = messageContent;
      const codeBlock = messageDiv.querySelector('._code');
      if (codeBlock) {
        if (window['DEBUG_WEAVER']) {
          codeBlock.classList.remove('hidden');
        } else {
          codeBlock.classList.add('hidden');
        }
        codeBlock.scrollTop = codeBlock.scrollHeight;
      }
    }

    // Add click event listener if callback is provided
    if (callback) {
      messageDiv.style.cursor = 'pointer';
      messageDiv.onclick = () => callback(infoId);
    }

    if (status == 'done') {
      messageDiv.classList.remove('animate-border-pulse');
    }

    updateScroll();
  }

  function addUpDownVoteBox() {
    const voteBox = document.createElement('div');
    voteBox.className =
      'vote-box flex items-center justify-end group-hover:opacity-100 transition-opacity duration-300 space-x-1 w-full px-2 pt-6';
    voteBox.innerHTML = `
                        <div role="status" class="_status hidden">
                            <svg aria-hidden="true" class="w-4 h-4 me-2 text-gray-200 animate-spin dark:text-gray-600 fill-emerald-700" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/><path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/></svg>
                            <span class="sr-only">Loading...</span>
                        </div>
                    <button class="upvote p-0 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400" aria-label="Upvote">

                        <i class="fa-regular my-1 mx-4 fa-thumbs-up hover:-rotate-12 transition-transform duration-300"></i>
                    </button>
                    <button class="downvote p-0 rounded-full bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400" aria-label="Downvote">

                        <i class="fa-regular my-1 mx-4  fa-thumbs-down hover:rotate-12 transition-transform duration-300"></i>
                    </button>
                `;

    voteBox.querySelector('.upvote').addEventListener('click', async () => {
      const vote_data = [];
      const vote_ids = [];
      const buttons = voteBox.querySelectorAll('button');
      const spinner = voteBox.querySelector('._status');

      const messageContainer = voteBox.closest('.messages-container');
      if (!messageContainer || messageContainer.classList.contains('upvoted')) return;

      const messageId = messageContainer.getAttribute('data-message-id');
      if (!weaverAPI.getConvMessages()[messageId]) return;

      // Add PostHog tracking for upvote
      PostHog.track('app_weaver_feedback', {
        action: 'positive feedback clicked',
      });

      buttons.forEach((button) => button.classList.add('hidden'));
      spinner.classList.remove('hidden');

      vote_data.push(weaverAPI.getConvMessages()[messageId]);
      vote_ids.push(messageId);

      const prevMessageContainer = messageContainer.previousElementSibling;
      if (prevMessageContainer && prevMessageContainer.getAttribute('data-message-id')) {
        const prevMessageId = prevMessageContainer.getAttribute('data-message-id');
        if (weaverAPI.getConvMessages()[prevMessageId]) {
          vote_data.unshift(weaverAPI.getConvMessages()[prevMessageId]);
          vote_ids.unshift(prevMessageId);
        }
      }

      try {
        //console.log('Upvoted', vote_data, vote_ids);
        const result: any = await weaverAPI.sendFeedback({ vote_data, vote_ids, upvote: true });
        if (result?.success) {
          messageContainer.classList.add('upvoted');
          toast('Thank you', 'Feedback Received');
        }
      } catch {}
      buttons.forEach((button) => button.classList.remove('hidden'));
      spinner.classList.add('hidden');
    });
    voteBox.querySelector('.downvote').addEventListener('click', async () => {
      const vote_data = [];
      const vote_ids = [];
      const buttons = voteBox.querySelectorAll('button');
      const spinner = voteBox.querySelector('._status');
      const messageContainer: HTMLElement = voteBox.closest('.messages-container');
      if (!messageContainer || messageContainer.classList.contains('downvoted')) return;
      const messageId = messageContainer.getAttribute('data-message-id');
      if (!weaverAPI.getConvMessages()[messageId]) return;

      // Add PostHog tracking for downvote
      PostHog.track('app_weaver_feedback', {
        action: 'negative feedback clicked',
      });

      buttons.forEach((button) => button.classList.add('hidden'));
      spinner.classList.remove('hidden');

      vote_data.push(weaverAPI.getConvMessages()[messageId]);
      vote_ids.push(messageId);

      const prevMessageContainer = messageContainer.previousElementSibling;
      if (prevMessageContainer && prevMessageContainer.getAttribute('data-message-id')) {
        const prevMessageId = prevMessageContainer.getAttribute('data-message-id');
        if (weaverAPI.getConvMessages()[prevMessageId]) {
          vote_data.unshift(weaverAPI.getConvMessages()[prevMessageId]);
          vote_ids.unshift(prevMessageId);
        }
      }

      //messageContainer.classList.add('downvoted');

      //console.log('Downvoted', vote_data, vote_ids);
      try {
        await downVoteDialog(messageContainer, { vote_data, vote_ids, downvote: true });
        //   const result: any = await sendFeedback({ vote_data, vote_ids, downvote: true });
        //   if (result?.success) {
        //     toast('Thank you', 'Feedback Received');
        //   }
      } catch {}
      buttons.forEach((button) => button.classList.remove('hidden'));
      spinner.classList.add('hidden');
    });
    return voteBox;
  }
  function addOrUpdateStatus(status, id) {
    let statusDiv = document.querySelector(`[data-status-id="${id}"]`);
    let container = getOrCreateMessageContainer(false);

    if (!statusDiv) {
      statusDiv = document.createElement('div');
      statusDiv.className =
        'text-xs font-bold text-gray-500 m-2 animate-pulse-custom h-4 transition-all duration-300 ease-in-out t_status';
      statusDiv.setAttribute('data-status-id', id);
      container.appendChild(statusDiv);
    }
    statusDiv.textContent = status;
    updateScroll();
  }

  async function removeStatus(id) {
    fadeOutStatus(id);
    await delay(300);
    const statusDiv = document.querySelector(`[data-status-id="${id}"]`);
    if (statusDiv) {
      statusDiv.textContent = ' ';
      statusDiv.classList.remove('animate-pulse-custom'); // Remove animation classes but keep spacing
      statusDiv.remove();
    }
  }

  async function removeAllStatus() {
    const statusDivs = document.querySelectorAll('.t_status');
    statusDivs.forEach((status) => {
      status.remove();
    });

    // if (!window['DEBUG_WEAVER']) {
    //   document.querySelectorAll('pre.plan').forEach((plan) => {
    //     plan.classList.add(
    //       'done',
    //       'transition',
    //       'delay-150',
    //       'duration-300',
    //       'ease-in-out',
    //       'opacity-0',
    //       'max-h-10',
    //     );
    //     setTimeout(() => {
    //       plan.classList.add('hidden');
    //     }, 400);
    //   });
    // }
  }
  async function stopAllAnimations() {
    await stopInfoAnimations();
    await stopLogoAnimations();
  }

  function stopInfoAnimations() {
    const infoMessages = document.querySelectorAll('.t_info');
    infoMessages.forEach((message) => {
      message.classList.remove('animate-border-pulse');
    });
  }
  function stopLogoAnimations() {
    const logoMessages = document.querySelectorAll('.bot-messages-container');
    logoMessages.forEach((message) => {
      message.classList.remove('animate');
    });
  }

  function stopStatusAnimations(id) {
    const statusDiv = document.querySelector(`[data-status-id="${id}"]`);
    if (statusDiv) {
      statusDiv.classList.remove('animate-pulse-custom');
    }
  }
  function fadeOutStatus(id) {
    const statusDiv: HTMLElement = document.querySelector(`[data-status-id="${id}"]`);
    if (statusDiv) {
      statusDiv.style.opacity = '0';
    }
  }

  function removeBotGradientTexts() {
    const elements = [...chatHistory.querySelectorAll('.gradient-text')];
    elements.forEach(async (element) => {
      element.classList.remove('gradient-text');
      await delay(300);
      element.innerHTML = element.textContent;
    });
  }

  function clearWeaverMeta() {
    const weaverMeta = document.querySelectorAll('.weaver-meta');
    if (weaverMeta) {
      weaverMeta.forEach((meta) => {
        meta.remove();
      });
    }
  }

  //Globals
  let weaverFirstConnection = false;
  let weaverStopping = false;
  let weaverCreatingAgent = workspace.agent.data.components.length <= 0;
  let linterRemainingAttempts = 0;
  let linting = false;
  let agentNeedSorting = false;
  let chatEmitter;
  let generatingCode = false;

  let emitterOrder = 0;

  async function stopWeaver() {
    weaverStopping = true;
    try {
      await weaverAPI.stopChat(chatEmitter);

      stopButton.disabled = true;
      sendButton.disabled = false;
      messageInput.disabled = false;
      sendButton.classList.remove('hidden');
      stopButton.classList.add('hidden');
    } catch (error) {
      console.error('Error stopping Weaver', error);
    }
  }

  async function handleSend() {
    weaverAPI = new WeaverAPI(workspace);
    let message = messageInput.value.trim();
    generatingCode = false;
    weaverStopping = false;
    weaverCreatingAgent = workspace.agent.data.components.length <= 0;
    if (weaverCreatingAgent) {
      agentNeedSorting = true;
      linterRemainingAttempts = 5;
      linting = false;
      console.log('Linter set to 5 attempts');
    } else {
      // If it is NOT a new agent, then we do not show the weaver next steps.
      recordNextStepsShown(workspace.agent.id);
      // if (!linting) {
      //   linterRemainingAttempts = 3;
      // }
    }
    if (!message && (attachmentFile || agentUrlAttachments.value)) message = ' ';
    if (message === '' || isStreaming) return;

    addUserMessage(message);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    isStreaming = true;
    sendButton.disabled = true;
    messageInput.disabled = true;

    PostHog.track('message_sent_to_weaver', {
      agent_id: workspace?.agent?.id,
      team_id: workspace?.agent?.data?.teamId,
      agent_name: workspace?.agent?.name || 'Unnamed Agent',
      has_attachment: attachmentFile || agentUrlAttachments.value ? true : false,
    });

    let botResponse = '';
    const attachmentUrl = agentUrlAttachments.value;
    weaverFirstConnection = true;
    clearWeaverMeta();

    emitterOrder++;
    const emitterId = emitterOrder;
    chatEmitter = await weaverAPI.sendChatMessage(message, attachmentFile, attachmentUrl);

    attachmentFile = null;
    (agentFileInput as HTMLInputElement).value = '';
    agentFileInputLabel.textContent = '';
    agentUrlAttachments.value = '';
    const attachmentContainer = document.getElementById('attachments-container');
    if (attachmentContainer) {
      attachmentContainer.innerHTML = '';
      attachmentContainer.classList.remove('p-2');
    }
    sendButton.classList.add('hidden');
    sendButton.disabled = true;
    messageInput.disabled = true;
    stopButton.classList.remove('hidden');
    stopButton.disabled = true;
    setTimeout(() => {
      stopButton.disabled = false;
    }, 6000);

    chatEmitter.on('content', (data) => {
      if (chatEmitter.interrupted) {
        console.warn('Chat interrupted, skipping content event');
        return;
      }
      //console.log('[DBG]', 'UI content', data);
      // if (weaverStopping) {
      //   return;
      // }

      const botMessageDiv = getLastBotMessageDiv();
      if (botMessageDiv && botMessageDiv.classList.contains('t_content')) {
        botResponse += data.content;

        botMessageDiv.innerHTML = md.render(botResponse);
        updateScroll();
      } else if (data.content.trim() !== '') {
        if (botResponse) {
          // Previous content, render it before resetting botResponse
          const prevBotMessageDiv = getLastBotMessageDiv();
          if (prevBotMessageDiv && prevBotMessageDiv.classList.contains('t_content')) {
            prevBotMessageDiv.innerHTML = md.render(botResponse);
          }
        }

        botResponse = data.content.replace(/\n/g, '<br>');
        addBotMessage(botResponse.trim());
      }
    });

    chatEmitter.on('info', (data) => {
      if (chatEmitter.interrupted) {
        console.warn('Chat interrupted, skipping info event');
        return;
      }
      // if (weaverStopping) {
      //   return;
      // }

      removeBotGradientTexts();
      addInfoMessage(data.info, {
        infoId: data.id,
        details: data.details,
        callback: data.callback,
        icon: data.icon,
        content: data.content,
        file: data.file,
        type: data.type,
        code: data.code,
        status: data.status,
      });
    });

    chatEmitter.on('status', (data) => {
      if (chatEmitter.interrupted) {
        console.warn('Chat interrupted, skipping status event');
        return;
      }
      // if (weaverStopping) {
      //   return;
      // }

      if (data.status === null) {
        removeStatus(data.id);
      } else {
        addOrUpdateStatus(data.status, data.id);
      }
    });

    chatEmitter.on('error', async (data) => {
      if (chatEmitter.interrupted) {
        console.warn('Chat interrupted, skipping error event');
        return;
      }

      addSystemMessage(data.error);
      // weaver-limit-reached-data.teamId:next-req-time
      const teamId = data.teamId;
      const nextReqTime = workspace?.userData?.weaver?.requests?.nextRequestTime;

      // Check if this is a limit reached error
      if (
        data.error?.toLowerCase()?.includes('daily limit') ||
        data.error?.toLowerCase()?.includes('usage cap')
      ) {
        // Check if we have both teamId and nextReqTime
        if (teamId && nextReqTime) {
          try {
            // Check if this combination already exists in Redis
            const response = await fetch('/api/page/builder/check-limit-reached', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ teamId, nextReqTime }),
            });

            if (response.ok) {
              const { exists } = await response.json();

              if (!exists) {
                // Data doesn't exist, call handleLimitReachedButtons and store in Redis
                handleLimitReachedButtons();

                // Store the data in Redis
                await fetch('/api/page/builder/store-limit-reached', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ teamId, nextReqTime }),
                });
              }
              // If exists is true, don't call handleLimitReachedButtons
            } else {
              // If Redis check fails, fallback to calling handleLimitReachedButtons
              handleLimitReachedButtons();
            }
          } catch (error) {
            console.error('Error checking/storing limit reached data:', error);
            // Fallback to calling handleLimitReachedButtons if Redis operations fail
            handleLimitReachedButtons();
          }
        } else {
          // If we don't have both teamId and nextReqTime, call handleLimitReachedButtons
          handleLimitReachedButtons();
        }
      }

      isStreaming = false;
      sendButton.disabled = false;
      messageInput.disabled = false;
      messageInput.removeAttribute('readonly');
      removeAllStatus();
      stopInfoAnimations();
      stopAllAnimations();
    });

    chatEmitter.on('interrupted', (data) => {
      chatEmitter.interrupted = true;
      addSystemMessage(data.content, [
        'bg-white',
        'text-gray-300',
        'p-0',
        'pb-2',
        'grow',
        'text-right',
      ]);
      isStreaming = false;
      //unlock the workspace
      console.log('unlocking workspace after interrupted signal');
      workspace.unlock();
      sendButton.classList.remove('hidden');
      stopButton.classList.add('hidden');
      sendButton.disabled = false;
      messageInput.disabled = false;
      messageInput.removeAttribute('readonly');
      stopButton.disabled = true;
      weaverStopping = false;
      weaverFirstConnection = false;
      removeAllStatus();
      stopInfoAnimations();
      stopAllAnimations();

      const botMessageDiv = [
        ...document.querySelectorAll('#agentChatHistory .bot-messages-container'),
      ].pop();

      const undoContainer = botMessageDiv.querySelector('.revert-container') as HTMLDivElement;
      if (undoContainer) {
        const undoController = undoContainer['_controler'];

        undoController.setReapplyHandler();
        undoController.revertBtn.classList.remove('hidden');
        undoController.revertBtn.disabled = false;
        undoController.reapplyBtn.classList.remove('hidden');
        undoController.reapplyBtn.disabled = false;
      }
    });

    chatEmitter.on('end', async () => {
      if (chatEmitter.interrupted) {
        console.warn('Chat interrupted, skipping end event');
        return;
      }
      // #region Update remaining requests count after sending message
      const isFreeUser = workspace?.userData?.subscription?.plan?.isDefaultPlan;
      if (isFreeUser) {
        updateRemainingRequestsCount(workspace?.userData);
      }
      // #endregion

      // if (weaverFirstCreatedUpdatedComponent) {
      //   workspace.scrollToComponent(weaverFirstCreatedUpdatedComponent);
      //   weaverFirstCreatedUpdatedComponent = null;
      // }
      updateAgentProps();
      isStreaming = false;
      sendButton.disabled = false;
      messageInput.disabled = false;
      removeAllStatus();
      stopInfoAnimations();
      removeBotGradientTexts();
      stopAllAnimations();

      const lastBotResponse = [
        ...document.querySelectorAll('#agentChatHistory .bot-messages-container'),
      ].pop();

      const lastLintRequest = [
        ...document.querySelectorAll('#agentChatHistory .user-message-weaver-lint'),
      ].pop();
      //are we currently in a linting operation
      //if yes, hide the latest linter interaction
      if (linting && !window['DEBUG_WEAVER']) {
        //keep linting messages if we are in debug mode
        //otherwise remove them after processing them
        if (lastBotResponse) lastBotResponse.remove();
        if (lastLintRequest) lastLintRequest.remove();
      }

      //add up/down vote box to the latest bot_message
      const botMessageDiv = getLastBotMessageDiv();
      if (!weaverStopping && botMessageDiv && botMessageDiv.classList.contains('bot_message')) {
        botMessageDiv.appendChild(addUpDownVoteBox());
        updateScroll();
      }

      let lintingCompleted = false;
      linting = false;

      if (weaverStopping) {
        linterRemainingAttempts = 0;
        linting = false;
        lintingCompleted = true;
      }

      const hasCodeBlock = lastBotResponse.querySelector('pre._code');
      if (linterRemainingAttempts > 0 && hasCodeBlock) {
        //we can run multiple linting attempts before completing the agent generation
        linterRemainingAttempts--;

        await waitParser;
        await delay(200);

        const lintErrors = await lint();

        if (!lintErrors) {
          lintingCompleted = true;
        } else {
          linting = true;
        }
      } else {
        lintingCompleted = true;
        linting = false;
      }

      if (lintingCompleted) {
        if (!weaverStopping && agentNeedSorting) {
          //Weaver just generated components in a previously empty canva and finished linting
          agentNeedSorting = false;
          await sortAgent();
        }

        //unlock the workspace
        console.log('unlocking workspace after end signal');
        workspace.unlock();
        sendButton.classList.remove('hidden');
        stopButton.classList.add('hidden');
        sendButton.disabled = false;
        messageInput.disabled = false;
        messageInput.removeAttribute('readonly');
        stopButton.disabled = true;
        weaverStopping = false;
        weaverFirstConnection = false;

        if (generatingCode) {
          const botMessageDiv = [
            ...document.querySelectorAll('#agentChatHistory .bot-messages-container'),
          ].pop();

          const undoContainer = botMessageDiv.querySelector('.revert-container') as HTMLDivElement;

          const undoController = undoContainer['_controler'];

          undoController.setReapplyHandler();
          undoController.revertBtn.classList.remove('hidden');
          undoController.revertBtn.disabled = false;
          undoController.reapplyBtn.classList.remove('hidden');
          undoController.reapplyBtn.disabled = false;

          const latestSmythCodeBlock = [...botMessageDiv.querySelectorAll('.smyth_code')].pop();

          if (latestSmythCodeBlock) {
            if (latestSmythCodeBlock.hasAttribute('data-message-filename')) {
              let messageFilename = latestSmythCodeBlock
                .getAttribute('data-message-filename')
                .trim();
              const innerDiv = latestSmythCodeBlock.firstChild as HTMLDivElement;

              setTimeout(() => {
                if (messageFilename.startsWith('Updating')) {
                  innerDiv.textContent = messageFilename.replace('Updating', 'Updated');
                }
                if (messageFilename.startsWith('Creating')) {
                  innerDiv.textContent = messageFilename.replace('Creating', 'Created');
                }
              }, 3000);
            }
          }

          updateScroll();
        }

        // //reveal revert buttons
        // const revertBtn = document.querySelectorAll('#agentChatHistory .btn-revert');
        // revertBtn.forEach((btn: HTMLButtonElement) => {
        //   btn.classList.remove('hidden');
        //   btn.disabled = false;
        // });

        if (!weaverStopping && !lastBotResponse?.textContent.includes(WEAVER_REQUIRE_CREDITS)) {
          handlePostChatMessageActions();
        }
        // } else if (botMessageDiv?.textContent.includes(WEAVER_FREE_CREDITS_EXHAUSTED)) {
        //   handleLimitReachedButtons('Free Credits Exhausted');
        // }

        linterRemainingAttempts = 0; //Hotfix : disable further linting
      }
    });
  }

  /**
   * Creates a container with action buttons and optional title/subtitle
   * @param config - Configuration for the button container
   * @returns HTMLDivElement containing the buttons and optional elements
   */
  function createButtonContainer(config: ButtonContainerConfig): HTMLDivElement {
    const container = document.createElement('div');
    container.classList.add(
      'flex',
      'flex-col',
      'gap-2',
      'mt-4',
      'weaver-button-container',
      // 'hidden',
      ...(config.containerClasses || []),
    );

    if (config.title) {
      const title = document.createElement('h3');
      title.textContent = config.title.text;
      title.classList.add(...(config.title.classes || ['font-bold']));
      container.appendChild(title);
    }

    config.buttons.forEach((buttonConfig) => {
      const button = document.createElement('button');
      const isUpgradeButton = buttonConfig.url === '/plans';

      button.classList.add(
        'weaver-action-button',
        isUpgradeButton ? 'weaver-button-primary' : 'weaver-button-secondary',
      );
      button.innerHTML = `${buttonConfig.text}`;

      button.addEventListener('click', async () => {
        if (buttonConfig.text.includes('Test')) {
          try {
            PostHog.track(`weaver_next_step_${buttonConfig.event}`, {
              button: buttonConfig.event,
            });

            const featureVariant = 'variant_1'; //PostHog.getFeatureFlag('weaver-next-steps') as string;

            // Control group - keep existing behavior
            // @ts-ignore
            if (featureVariant === 'control') {
              if (buttonConfig.arcadeUrl) {
                renderArcadeTutorial(buttonConfig.arcadeUrl, 'Tutorial');
              } else {
                window.open(buttonConfig.url, '_blank');
              }
              return;
            }

            // Variant 1 - Check for AgentSkill component
            // @ts-ignore
            else if (featureVariant === 'variant_1') {
              const hasComponents = workspace?.agent?.data?.components?.length > 0;

              if (!hasComponents) {
                // If no components, keep existing behavior
                if (buttonConfig.arcadeUrl) {
                  renderArcadeTutorial(buttonConfig.arcadeUrl, 'Tutorial');
                } else {
                  window.open(buttonConfig.url, '_blank');
                }
                return;
              }

              // Check for AgentSkill component
              const hasAgentSkill = workspace.agent.data.components.some(
                (component: any) => component.name === 'APIEndpoint',
              );

              if (hasAgentSkill) {
                // Get the DOM element for the component
                const firstWorkflow = workspace.agent.data.components.find(
                  (component: any) => component.name === 'APIEndpoint',
                );
                if (firstWorkflow) {
                  // Disable the test button and show spinner
                  const testButton = button;
                  const originalContent = testButton.innerHTML;
                  testButton.disabled = true;
                  testButton.innerHTML = `
                    <svg class="animate-spin h-5 w-5 mr-2 inline" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Preparing your form preview ...
                  `;

                  try {
                    const componentElement = document.getElementById(firstWorkflow.id);
                    if (!componentElement) throw new Error('Component element not found');

                    const apiEndpointInstance = (componentElement as any)._control;
                    if (!apiEndpointInstance) throw new Error('API Endpoint instance not found');

                    await apiEndpointInstance.handleFormPreviewBtnClick();

                    // Highlight the component that's used to create the form preview
                    workspace.refreshComponentSelection(componentElement);

                    const observer = new MutationObserver((mutations, obs) => {
                      const runButton = document.querySelector(
                        '[data-test="form-preview-run-button"]',
                      );
                      if (runButton) {
                        // Reset button state when Run button is found
                        testButton.disabled = false;
                        testButton.innerHTML = originalContent;
                        testButton.classList.remove('opacity-75');
                        obs.disconnect();
                      }
                    });

                    // Start observing the document body for the Run button
                    observer.observe(document.body, {
                      childList: true,
                      subtree: true,
                    });
                  } catch (error) {
                    // Reset button state
                    testButton.disabled = false;
                    testButton.innerHTML = originalContent;
                    testButton.classList.remove('opacity-75');

                    // Fallback to default behavior
                    const dbgMenuToggle = document.getElementById(
                      'debug-menu-tgl',
                    ) as HTMLInputElement;
                    if (dbgMenuToggle) {
                      dbgMenuToggle.checked = true;
                      const event = new Event('change', { bubbles: true });
                      dbgMenuToggle.dispatchEvent(event);
                    }
                    await openChatbotEmbodiment();
                  }
                }
              } else {
                const dbgMenuToggle = document.getElementById('debug-menu-tgl') as HTMLInputElement;
                if (dbgMenuToggle) {
                  dbgMenuToggle.checked = true;
                  const event = new Event('change', { bubbles: true });
                  dbgMenuToggle.dispatchEvent(event);
                }

                await openChatbotEmbodiment();
              }
              return;
            }

            // Variant 2 - Debug mode for first component
            else if (featureVariant === 'variant_2') {
              const hasComponents = workspace?.agent?.data?.components?.length > 0;

              if (!hasComponents) {
                // If no components, keep existing behavior
                if (buttonConfig.arcadeUrl) {
                  renderArcadeTutorial(buttonConfig.arcadeUrl, 'Tutorial');
                } else {
                  window.open(buttonConfig.url, '_blank');
                }
                return;
              }

              // Toggle debug mode using the debug menu toggle
              const dbgMenuToggle = document.getElementById('debug-menu-tgl') as HTMLInputElement;
              if (dbgMenuToggle) {
                dbgMenuToggle.checked = true;
                const event = new Event('change', { bubbles: true });
                dbgMenuToggle.dispatchEvent(event);
              }

              return;
            }

            // Fallback to default behavior if feature flag is not set or has unexpected value
            if (buttonConfig.arcadeUrl) {
              renderArcadeTutorial(buttonConfig.arcadeUrl, 'Tutorial');
            } else {
              window.open(buttonConfig.url, '_blank');
            }
          } catch (error) {
            console.error('Error checking weaver-next-steps feature flag:', error);
          }
          return;
        }

        // For non-Test buttons, keep existing behavior
        if (
          buttonConfig.arcadeUrl &&
          ['test_agent', 'test_debug', 'deploy'].includes(buttonConfig.event)
        ) {
          renderArcadeTutorial(buttonConfig.arcadeUrl, 'Tutorial');
        } else {
          window.open(buttonConfig.url, '_blank');
        }

        // Existing tracking logic
        if (isUpgradeButton) {
          PostHog.track('upgrade_click', {
            page_url: '/builder',
            source: 'weaver daily limit reached',
          });
          PostHog.track('weaver_limit_reached_next_step_upgrade', {
            button: buttonConfig.event,
          });
        } else {
          const eventPrefix = config.isLimitReached
            ? 'weaver_limit_reached_next_step_'
            : 'weaver_next_step_';
          PostHog.track(`${eventPrefix}${buttonConfig.event}`, {
            button: buttonConfig.event,
          });
        }
      });

      if (isUpgradeButton) {
        button.setAttribute('data-tutorial-id', 'subscribe-features-cta');
      }
      container.appendChild(button);
      // show subtitle only after the upgrade button
      if (isUpgradeButton && config.subtitle) {
        const subtitle = document.createElement('p');
        subtitle.textContent = config.subtitle.text;
        subtitle.classList.add(...(config.subtitle.classes || ['text-sm', 'text-gray-500']));
        container.appendChild(subtitle);
      }
    });

    return container;
  }

  /**
   * Removes existing button containers from the DOM
   */
  function removeExistingButtonContainers(): void {
    const existingContainers = document.querySelectorAll('.weaver-button-container');
    existingContainers.forEach((container) => container.remove());
  }

  /**
   * Handles post-chat message actions, showing relevant buttons based on agent state
   */
  async function handlePostChatMessageActions(): Promise<void> {
    // Check if agent is currently saving by looking at the status bar
    const saveStatusBar = document.getElementById('agent-top-bar-status');

    if (saveStatusBar?.classList.contains('st-progress')) {
      // Wait for the save to complete by checking for success/alert class
      await new Promise<void>((resolve) => {
        const observer = new MutationObserver((mutations) => {
          if (
            saveStatusBar.classList.contains('st-success') ||
            saveStatusBar.classList.contains('st-alert')
          ) {
            observer.disconnect();
            resolve();
          }
        });

        observer.observe(saveStatusBar, {
          attributes: true,
          attributeFilter: ['class'],
        });

        // Add timeout to prevent infinite waiting
        setTimeout(() => {
          observer.disconnect();
          resolve(); // Resolve anyway after timeout
        }, 5000); // 5 second timeout
      });
    }

    // Check if components exist
    if (!workspace?.agent?.data?.components?.length) return;

    // Check if next steps have already been shown for this agent
    const shouldShow = shouldShowNextSteps(workspace.agent.id);
    if (!shouldShow) return;

    // Now we can safely show the buttons
    removeExistingButtonContainers();

    const buttonContainer = createButtonContainer({
      title: {
        text: `What's next?`,
      },
      buttons: weaverActionButtons,
      isLimitReached: false,
    });

    const botMessageDiv = [
      ...document.querySelectorAll('#agentChatHistory .bot-messages-container'),
    ].pop();
    //getLastBotMessageDiv();
    if (botMessageDiv) {
      botMessageDiv.appendChild(buttonContainer);
      updateScroll();
    }

    recordNextStepsShown(workspace.agent.id);
  }

  /**
   * Handles displaying buttons when the daily limit is reached
   */
  const handleLimitReachedButtons = (title: string = 'Daily Limit Reached'): void => {
    removeExistingButtonContainers();

    const buttonContainer = createButtonContainer({
      buttons: weaverLimitButtons,
      title: { text: title },
      subtitle: { text: 'Or continue your development manually:' },
      isLimitReached: true,
    });

    // Track upgrade impression
    PostHog.track('upgrade_impression', {
      page_url: '/builder',
      source: 'weaver daily limit reached',
    });

    const botMessageDiv = getLastBotMessageDiv();
    if (botMessageDiv) {
      botMessageDiv.appendChild(buttonContainer);
      updateScroll();
    }
  };

  function toggleExpand() {
    isExpanded = !isExpanded;
    if (isExpanded) {
      chatContainer.classList.remove('max-w-md');
      chatContainer.classList.add('w-screen', 'h-screen');
      expandButton.innerHTML = '<i class="fas fa-compress"></i>';
    } else {
      // Add 'max-w-md' class back
      chatContainer.classList.add('max-w-md');
      chatContainer.classList.remove('w-screen', 'h-screen');
      expandButton.innerHTML = '<i class="fas fa-expand"></i>';
    }
  }

  function updateScroll() {
    lastScrollHeight = Math.max(chatHistory.scrollHeight, lastScrollHeight);
    chatHistory.scrollTop = lastScrollHeight;

    const planBlock = [
      ...document.querySelectorAll('#agentChatHistory pre.plan:last-of-type'),
    ].pop();
    if (planBlock) {
      planBlock.scrollTop = planBlock.scrollHeight;
    }
  }

  sendButton.addEventListener('click', handleSend);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  stopButton.addEventListener('click', stopWeaver);

  messageInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = this.scrollHeight + 'px';
  });

  //handle agent attachment

  attachButton.addEventListener('click', () => {
    agentFileInput.click();
  });
  agentFileInput.addEventListener('change', function (event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];

    if (file) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        toast('File exceeds 5MB size limit', '', 'alert');
        // Clear the file input
        (event.target as HTMLInputElement).value = '';
        attachmentFile = null;

        // Clear any existing preview
        const attachmentContainer = document.getElementById('attachments-container');
        if (attachmentContainer) {
          attachmentContainer.innerHTML = '';
          attachmentContainer.classList.remove('p-2');
        }
        return;
      }

      attachmentFile = file;

      const attachmentContainer = document.getElementById('attachments-container');
      if (attachmentContainer) {
        attachmentContainer.innerHTML = '';
        attachmentContainer.classList.add('p-2');
        attachmentContainer.appendChild(createAttachmentPreview(file));
      }
    }
  });

  const attachmentContainer = document.getElementById('attachments-container');
  if (attachmentContainer) {
    attachmentContainer.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const removeButton = target.closest('.remove-attachment');
      if (removeButton) {
        const attachmentPreview = removeButton.closest('.attachment-preview');
        if (attachmentPreview) {
          attachmentContainer.removeChild(attachmentPreview);
          // Reset the file input and attachment state
          agentFileInput.value = '';
          attachmentFile = null;
          agentFileInputLabel.textContent = '';
          attachmentContainer.classList.remove('p-2');
        }
      }
    });
  }

  function createAttachmentPreview(file: File) {
    const attachmentPreview = document.createElement('div');
    attachmentPreview.className =
      'attachment-preview w-14 h-14 rounded-lg relative group border border-solid border-gray-200';
    attachmentPreview.innerHTML = `
      <img src="${URL.createObjectURL(file)}" alt="${
        file.name
      }" class="rounded-lg w-full h-full object-cover" />
      <button title="Remove attachment" class="remove-attachment absolute -right-1 -top-1 border border-solid border-gray-200 rounded-full w-4 h-4 bg-gray-100 flex items-center justify-center group-hover:bg-white">
          <i class="fas fa-times text-gray-500 text-xs group-hover:text-gray-700"></i>
      </button>
    `;
    return attachmentPreview;
  }

  expandButton.addEventListener('click', toggleExpand);

  //auto trigger weaver chat
  const chatMessageItem = localStorage.getItem('chatMessage');
  const chatAttachmentsItem = localStorage.getItem('chatAttachments');

  if (chatAttachmentsItem) {
    const item = JSON.parse(chatAttachmentsItem);
    if (item.ttl > Date.now()) {
      const attachment = item.attachments[0];

      // If it's a URL (external attachment)
      if (typeof attachment === 'string') {
        agentUrlAttachments.value = attachment;
      }
      // If it's our stored File data
      else if (attachment.data) {
        // Convert base64 back to File
        const byteString = atob(attachment.data.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const file = new File([ab], attachment.name, { type: attachment.type });

        // Set the global attachmentFile variable
        attachmentFile = file;

        // Set the file input
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        agentFileInput.files = dataTransfer.files;

        // Update the file input label if it exists
        if (agentFileInputLabel) {
          agentFileInputLabel.textContent = file.name;
        }

        agentUrlAttachments.value = URL.createObjectURL(file);

        // Create attachment preview
        const attachmentContainer = document.getElementById('attachments-container');
        if (attachmentContainer) {
          attachmentContainer.innerHTML = '';
          attachmentContainer.classList.add('p-2');
          attachmentContainer.appendChild(createAttachmentPreview(file));
        }
      }

      localStorage.removeItem('chatAttachments');
    }
  }
  if (chatMessageItem) {
    const item = JSON.parse(chatMessageItem);
    if (item.ttl > Date.now()) {
      messageInput.value = item.message;
      localStorage.removeItem('chatMessage');
    }
  }

  //auto trigger send if there is a message or attachment
  if (messageInput.value.trim() || attachmentFile || agentUrlAttachments.value) {
    sendButton.click();
  }
}

// Variable to store the selected attachment file

function handleAttachment() {
  // Attach event listeners after the DOM is fully loaded
  document.addEventListener('DOMContentLoaded', function () {
    const agentAttachButton = document.getElementById('agentAttachButton');
    const agentFileInput = document.getElementById('agentFileInput') as HTMLInputElement;

    //const agentSendButton = document.getElementById('agentSendButton');
    //const agentMessageInput = document.getElementById('agentMessageInput');

    // Trigger file input when attachment button is clicked
    agentAttachButton.addEventListener('click', function () {
      agentFileInput.click();
    });

    // Handle file selection
    agentFileInput.addEventListener('change', function (event: Event) {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        attachmentFile = file; // Save selected file
        //console.log('Attachment selected:', file.name);
      }
    });

    // // Handle message send button click
    // agentSendButton.addEventListener('click', function () {
    //   const message = (agentMessageInput as HTMLTextAreaElement).value;
    //   sendMessage('agentId', message, attachmentFile); // Use the saved attachmentFile
    //   (agentMessageInput as HTMLTextAreaElement).value = ''; // Clear the input after sending
    //   attachmentFile = null; // Clear the attachment after sending
    //   (agentFileInput as HTMLInputElement).value = ''; // Reset the file input for future use
    // });
  });
}

interface DragDropHandlers {
  handleDragEnter: (e: DragEvent) => void;
  handleDragOver: (e: DragEvent) => void;
  handleDragLeave: (e: DragEvent) => void;
  handleDrop: (e: DragEvent) => void;
}

function initializeDragAndDrop(): void {
  const dragDropZone = document.getElementById('dragDropZone');
  const dragOverlay = document.getElementById('dragOverlay');
  const fileInput = document.getElementById('agentFileInput') as HTMLInputElement;

  if (!dragDropZone || !dragOverlay || !fileInput) return;

  let dragCounter = 0;

  const handlers: DragDropHandlers = {
    handleDragEnter: (e: DragEvent): void => {
      e.preventDefault();
      e.stopPropagation();

      dragCounter++;

      if (dragCounter === 1) {
        dragOverlay?.classList.remove('hidden');
      }
    },

    handleDragOver: (e: DragEvent): void => {
      e.preventDefault();
      e.stopPropagation();
    },

    handleDragLeave: (e: DragEvent): void => {
      e.preventDefault();
      e.stopPropagation();

      dragCounter--;

      if (dragCounter === 0) {
        dragOverlay?.classList.add('hidden');
      }
    },

    handleDrop: (e: DragEvent): void => {
      e.preventDefault();
      e.stopPropagation();

      dragCounter = 0;
      dragOverlay?.classList.add('hidden');

      const dt = e.dataTransfer;
      if (!dt?.files) return;

      const file = dt.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast('Please upload only image files (PNG, JPG, GIF)', '', 'alert');
        return;
      }

      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInput.files = dataTransfer.files;

      const event = new Event('change');
      fileInput.dispatchEvent(event);
    },
  };

  dragDropZone?.addEventListener('dragenter', handlers.handleDragEnter);
  dragDropZone?.addEventListener('dragover', handlers.handleDragOver);
  dragDropZone?.addEventListener('dragleave', handlers.handleDragLeave);
  dragDropZone?.addEventListener('drop', handlers.handleDrop);

  // TODO: Implement cleanup function to remove event listeners from the dragDropZone
}

function handlePasteEvent() {
  const messageInput = document.getElementById('agentMessageInput') as HTMLInputElement;
  const fileInput = document.getElementById('agentFileInput') as HTMLInputElement;

  if (!messageInput || !fileInput) return;

  messageInput?.addEventListener('paste', (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
          fileInput.files = dataTransfer.files;

          const changeEvent = new Event('change');
          fileInput.dispatchEvent(changeEvent);

          event.preventDefault();
          break;
        }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initializeDragAndDrop();
  handlePasteEvent();

  // Prevent default behavior for dragover and drop events on the entire document
  document.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
  });
});
