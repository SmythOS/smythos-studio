import {
  DELETE_BUTTON_STYLE,
  PRIMARY_BUTTON_STYLE,
  SECONDARY_BUTTON_STYLE,
} from '@src/react/shared/constants/style';
import { EMBODIMENT_DESCRIPTIONS, SMYTHOS_DOCS_URL } from '@src/shared/constants/general';
import { builderStore } from '@src/shared/state_stores/builder/store';
import { setCodeEditor } from '../../ui/dom';
import { twModalDialog } from '../../ui/tw-dialogs';
import { Workspace } from '../../workspace/Workspace.class';

declare global {
  interface Window {
    workspace: Workspace;
  }
}

function createListEntry({
  key,
  date,
  id,
  name,
}: {
  key: string;
  date: string;
  id: string;
  name: string;
}) {
  const html = `<div class="w-full bg-gray-50 rounded-lg flex items-center justify-around gap-4 py-2">
            <div class="min-w-0">
              <div class="text-sm font-medium text-gray-700 mb-1 max-w-[245px] truncate">${name}</div>
              <div id="copy-key-btn-${id}" class="copy-key-btn font-mono text-sm text-gray-900 truncate relative group cursor-pointer">
                <span class="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 text-gray-800 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity copy-tooltip">
                  Copy
                </span>
                ${key}
              </div>
              <div class="text-xs text-gray-500">${date}</div>
            </div>
            <button
              id="revoke-key-btn-${id}"
              class="revoke-key-btn p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
          </div>`;

  return html;
}

/**
 * Fetches agent LLM keys from the API
 * @returns The API response data or null if the request fails
 */
async function fetchAgentLLMKeys(): Promise<{
  success: boolean;
  data: Record<string, any>;
} | null> {
  try {
    const workspace = window.workspace;
    const agentId = workspace?.agent?.id;
    if (!agentId) return null;
    const response = await fetch(`/api/page/builder/${agentId}/keys/agent-llm`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const result = await response.json();
    console.log('Agent LLM keys:', result);
    return result;
  } catch (error) {
    console.error('Error fetching agent LLM keys:', error);
    return null;
  }
}

function revokeAgentLLMKey(agentId: string, keyId: string) {
  return fetch(`/api/page/builder/${agentId}/keys/agent-llm/${keyId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

function createNewAgentLLMKey(agentId: string, keyName: string) {
  return fetch(`/api/page/builder/${agentId}/keys/agent-llm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ keyName: keyName }),
  });
}

async function populateKeysList() {
  const keysList = document.getElementById('keys-list') as HTMLDivElement;
  if (!keysList) return;

  const result = await fetchAgentLLMKeys();
  if (!result) return;

  const workspace = window.workspace;

  // Generate HTML entries from fetched data
  const entries =
    Object.keys(result.data).length === 0
      ? ['<div class="w-full text-center text-gray-500">No API keys found.</div>']
      : Object.entries(result.data)
          .sort(([, a], [, b]) => {
            const timeA = a.metadata?.created_time || 0;
            const timeB = b.metadata?.created_time || 0;
            return timeB - timeA;
          })
          .map(([id, keyData]) => {
            if (!keyData.key) return '';
            return createListEntry({
              id: id,
              name: keyData.name,
              key: keyData.key.slice(0, 18) + '...' + keyData.key.slice(-5),
              date: keyData.metadata?.created_time
                ? new Date(keyData.metadata.created_time).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: 'numeric',
                  })
                : 'Unknown date',
            });
          });

  // Insert entries into keys list
  keysList.innerHTML = entries.join('');

  // Add click handlers for revoke buttons
  Object.keys(result.data).forEach((keyId) => {
    const revokeBtn = document.getElementById(`revoke-key-btn-${keyId}`) as HTMLButtonElement;
    const keyCopyBtn = document.getElementById(`copy-key-btn-${keyId}`) as HTMLDivElement;
    if (!revokeBtn) return;

    revokeBtn.onclick = async () => {
      // Show confirmation dialog
      twModalDialog({
        title: 'Revoke API Key',
        content: `
          <div class="p-4">
            <p class="text-gray-700">Are you sure you want to revoke this API key? This action cannot be undone.</p>
          </div>
        `,
        onCloseClick: function () {},
        actions: [
          {
            label: 'Revoke Key',
            cssClass: DELETE_BUTTON_STYLE,
            callback: async () => {
              revokeBtn.disabled = true;
              const agentId = workspace?.agent?.id;
              if (!agentId) return;

              try {
                const response = await revokeAgentLLMKey(agentId, keyId);

                if (!response.ok) {
                  console.error('Failed to revoke key');
                }

                populateKeysList();
              } catch (error) {
                revokeBtn.disabled = false;
                console.error('Error revoking key:', error);
              }
            },
          },
        ],
      });
    };

    keyCopyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(result.data[keyId].key);
      const tooltip = keyCopyBtn.querySelector('.copy-tooltip');
      if (!tooltip) return;

      tooltip.textContent = 'Copied!';
      setTimeout(() => {
        tooltip.textContent = 'Copy';
      }, 2000);
    });
  });
}

function attachCreateKeyBtn() {
  const createKeyBtn = document.getElementById('create-new-key-btn') as HTMLButtonElement;
  if (!createKeyBtn) return;
  const workspace = window.workspace;

  createKeyBtn.onclick = async function () {
    // Disable button while showing dialog
    createKeyBtn.disabled = true;

    try {
      const agentId = workspace?.agent?.id;
      if (!agentId) return;

      // Show dialog to get key name
      twModalDialog({
        title: 'Create New AgentLLM Key',
        content: `
          <div class="p-4">
            <div class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
              <input autofocus type="text"
                id="agent-llm-key-name"
                class="w-full px-3 py-2 
              bg-white text-gray-900 block text-sm font-normal placeholder:text-sm placeholder:font-normal
                rounded outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none
                border border-gray-300 border-b-gray-500 focus:border-b-2 focus:border-b-blue-500 focus-visible:border-b-2 focus-visible:border-b-blue-500"
                placeholder="e.g. Production Key">
            </div>
          </div>
        `,
        onCloseClick: function (dialog) {
          createKeyBtn.disabled = false;
        },
        actions: [
          {
            label: 'Create',
            cssClass: PRIMARY_BUTTON_STYLE,
            callback: async function (dialog) {
              const keyNameInput = dialog.querySelector('#agent-llm-key-name') as HTMLInputElement;
              const keyName = keyNameInput.value.trim();

              if (!keyName) {
                createKeyBtn.disabled = false;
                return;
              }

              try {
                // Send request to create new agent LLM key
                const response = await createNewAgentLLMKey(agentId, keyName);
                if (!response.ok) {
                  console.error('Failed to create key');
                }

                // Refresh the keys list to show the new key
                await populateKeysList();
              } catch (error) {
                console.error('Error creating key:', error);
              } finally {
                // Re-enable button after request completes
                createKeyBtn.disabled = false;
              }
            },
          },
        ],
      });
    } catch (error) {
      console.error('Error showing dialog:', error);
      createKeyBtn.disabled = false;
    }
  };
}

function initTabSwitcher() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // Helper function to handle tab switching
  const switchTab = (btn: Element) => {
    // Remove active state from all tabs
    tabBtns.forEach((b) => {
      b.classList.remove('bg-white', 'shadow-sm', 'text-gray-900');
      b.classList.add('text-gray-500');
    });

    // Activate clicked tab
    btn.classList.add('bg-white', 'shadow-sm', 'text-gray-900');
    btn.classList.remove('text-gray-500');

    // Show corresponding content
    const contentId = btn.id.replace('-btn', '-content');
    document.getElementById(contentId)?.classList.remove('hidden');

    // Hide all other tab content
    tabContents.forEach((content) => {
      if (content.id !== contentId) {
        content.classList.add('hidden');
      }
    });
  };

  // Add click handlers
  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn));
  });

  // Select first tab by default
  const firstTab = tabBtns[0];
  if (firstTab) {
    switchTab(firstTab);
  }
}

let currentEditor: any = null; // Store the current editor instance

function updateCodeEditor(selector: string, language: string, theme: string, code: string) {
  // If there's an existing editor, destroy it
  if (currentEditor) {
    currentEditor.destroy();
    currentEditor.container.remove();
  }

  // Remove any existing ace-editor-styles elements
  const existingEditors = document.querySelectorAll('#ace-editor-styles');
  existingEditors.forEach((editor) => editor.remove());

  // Create new editor
  currentEditor = setCodeEditor(selector, language, theme)?.[0];

  // Set the new code
  if (currentEditor) {
    currentEditor.setValue(code, -1);
  }

  const editorElement = document.querySelector('.ace-editor');

  if (editorElement) {
    editorElement.classList.remove('hidden');
  }
}

async function populateVersionSelector() {
  const versionSelect = document.getElementById('agent-version-select') as HTMLSelectElement;
  if (!versionSelect) return;

  try {
    const workspace = window.workspace;
    const agentId = workspace?.agent?.id;
    if (!agentId) return;

    // Fetch deployments
    const response = await fetch(`/api/page/builder/ai-agent/${agentId}/deployments`);
    const result = await response.json();

    // Add default options
    const options = [
      { value: 'dev', text: 'Dev (Current)' },
      { value: 'prod', text: 'Prod' },
    ];

    // Add deployed versions
    if (result.deployments?.length) {
      result.deployments.forEach((deployment: any) => {
        options.push({
          value: deployment.version,
          text: `v${deployment.version}`,
        });
      });
    }

    // Populate select element
    versionSelect.innerHTML = options
      .map((opt) => `<option value="${opt.value}">${opt.text}</option>`)
      .join('');

    // Select dev by default
    versionSelect.value = 'dev';
  } catch (error) {
    console.error('Error fetching agent versions:', error);
  }
}

type CodeLanguage = 'nodejs' | 'python' | 'curl' | 'json';

interface CodeTemplate {
  code: string;
  language: string; // For editor syntax highlighting
}

/**
 * Generates code samples with the given API key and version
 * @param baseUrl - The base URL for the API
 * @param agentId - The agent ID
 * @param apiKey - Optional API key to inject
 * @param version - Optional version to use
 * @returns Record of language-specific code samples
 */
function generateCodeSamples(
  baseUrl: string,
  agentId: string,
  apiKey?: string,
  version: string = 'dev',
): Record<CodeLanguage, CodeTemplate> {
  // Create the model ID with version
  const modelId = `${agentId}@${version}`;

  // Use placeholder if no API key provided
  const keyPlaceholder = 'process.env.SMYTHOS_AGENTLLM_KEY';
  const apiKeyValue = apiKey ? `'${apiKey}'` : keyPlaceholder;

  return {
    nodejs: {
      language: 'javascript',
      code: `import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: ${apiKeyValue},
  baseURL: "${baseUrl}/_openai/v1",
});

const response = await openai.chat.completions.create({
  model: "${modelId}",
  // Available options:
  // ${agentId}@dev: use the current in-development agent
  // ${agentId}@prod: use the latest deployed agent
  // ${agentId}@1.0: use v1.0 of the deployed agent (you can specify any deployed version)

  messages: [{
    role: "user",
    content: "Hello, what can you do?",
  }],
  stream: false,
});

console.log(response?.choices);`,
    },

    python: {
      language: 'python',
      code: `from openai import OpenAI
client = OpenAI(
  api_key=${apiKey ? `'${apiKey}'` : 'os.getenv("SMYTHOS_AGENTLLM_KEY")'},
  base_url="${baseUrl}/_openai/v1"
)

response = client.chat.completions.create(
  model="${modelId}",
  # Available options:
  # ${agentId}@dev: use the current in-development agent
  # ${agentId}@prod: use the latest deployed agent
  # ${agentId}@1.0: use v1.0 of the deployed agent (you can specify any deployed version)

  messages=[{"role": "user", "content": "Hello, what can you do?"}],
)

print(response.choices)`,
    },

    curl: {
      language: 'bash',
      code: `curl ${baseUrl}/_openai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey || '$SMYTHOS_AGENTLLM_KEY'}" \\
  -d '{
  "model": "${modelId}",
  "messages": [{
    "role": "user",
    "content": "Hello, what can you do?"
  }]
}'`,
    },

    json: {
      language: 'json',
      code: `{
  "model": "${modelId}",
  "messages": [{
    "role": "user",
    "content": "Hello, what can you do?"
  }]
}`,
    },
  };
}

// Then in your event handlers, you can simply do:
function updateCodeDisplay(
  selectedLanguage: CodeLanguage,
  apiKey?: string,
  version: string = 'dev',
): void {
  const baseUrl = builderStore.getState().serverStatus.embodimentUrl;
  const agentId = window.workspace?.agent?.id;

  if (!agentId) {
    console.error('No agent ID available');
    return;
  }

  const samples = generateCodeSamples(baseUrl, agentId, apiKey, version);
  const sample = samples[selectedLanguage];

  updateCodeEditor('.llm-sdk-code', sample.language, 'dawn', sample.code);
}

export async function openLLMEmbodiment(
  workspace: Workspace,
  openEmbodimentDialog: (code: string, options: any, title: string, tooltip: string) => void,
) {
  // const baseUrl = isProdEnv() ? 'https://llm.emb.smyth.ai' : 'https://llm.emb-stg.smyth.ai';
  const baseUrl = builderStore.getState().serverStatus.embodimentUrl;
  const agentId = `${workspace.agent.id}@dev`;

  const codeSamples = {
    nodejs: `import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.SMYTHOS_AGENTLLM_KEY,
  baseURL: "${baseUrl}/_openai/v1",
});

const response = await openai.chat.completions.create({
  model: "${agentId}",
  // Available options:
  // ${workspace.agent.id}@dev: use the current in-development agent
  // ${workspace.agent.id}@prod: use the latest deployed agent
  // ${workspace.agent.id}@1.0: use v1.0 of the deployed agent (you can specify any deployed version)

  messages: [{
    role: "user",
    content: "Hello, what can you do?",
  }],
  stream: false,
});

console.log(response?.choices);`,

    curl: `curl ${baseUrl}/_openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SMYTHOS_AGENTLLM_KEY" \
  -d '{
  "model": "${agentId}",
  "messages": [{
    "role": "user",
    "content": "Hello, what can you do?"
  }]
}'`,

    python: `from openai import OpenAI
client = OpenAI(api_key=os.getenv("SMYTHOS_AGENTLLM_KEY"), base_url="${baseUrl}/_openai/v1")

response = client.chat.completions.create(
  model="${agentId}",
  # Available options:
  # ${workspace.agent.id}@dev: use the current in-development agent
  # ${workspace.agent.id}@prod: use the latest deployed agent
  # ${workspace.agent.id}@1.0: use v1.0 of the deployed agent (you can specify any deployed version)

  messages=[{"role": "user", "content": "Hello, what can you do?"}],
)

print(response.choices)`,

    json: `{
  "model": "${agentId}",
  "messages": [{
    "role": "user",
    "content": "Hello, what can you do?"
  }]
}`,
  };

  const codeTab = `<div>
          <p>Use your agent like an OpenAI-compatible API. Seamlessly integrate it into your applications to send prompts and receive responses using standard OpenAI endpoints, such as /chat/completions. No SDK changes required.</p>
          <p class="my-3">Base URL: <code class="font-mono p-1 bg-gray-50 rounded">${baseUrl}/_openai/v1</code></p>

          <div class="flex items-center justify-between p-2 bg-gray-50 border-b border-solid border-gray-200 rounded-t-lg">
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 text-xs font-semibold text-gray-600 bg-gray-200 rounded">POST</span>
              <span class="font-mono text-sm text-gray-700">/chat/completions</span>
            </div>
            <div class="flex items-center gap-2">
              <select id="code-sample-selector" class="px-2 py-1 w-20 text-sm border-none rounded focus:outline-none focus:ring-1 focus:ring-gray-500 bg-gray-50">
                ${Object.keys(codeSamples)
                  .map((key) => `<option value="${key}">${key}</option>`)
                  .join('')}
              </select>
              <button id="copy-code-btn" class="p-1.5 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between px-2 py-1 bg-gray-50 border-b border-solid border-gray-200">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-700">API Key:</span>
              <select
                id="api-key-select"
                class="py-1 text-sm border-none rounded focus:outline-none focus:ring-1 focus:ring-gray-500 bg-gray-50"
              >
                <option value="">Select API Key</option>
              </select>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-700">Version:</span>
              <select
                id="agent-version-select"
                class="py-1 text-sm border-none rounded focus:outline-none focus:ring-1 focus:ring-gray-500 bg-gray-50"
              >
                <option value="">Select Version</option>
              </select>
            </div>
          </div>

          <textarea id="code-sample-textarea" class="llm-sdk-code" readonly data-hide-line-numbers="true" data-wrap-line="true"></textarea>

          <div class="my-3">
            <p>You can read more about <a href="${SMYTHOS_DOCS_URL}/agent-deployments/deployments/deploy-as-llm" target="_blank" class="text-blue-500 hover:underline">available options</a> here.</p>
          </div>
        </div>`;

  const keysTab = `<div>
  <div class="mb-6">
    <h3 class="text-sm font-medium text-gray-700 mb-1">AgentLLM API Keys</h3>
    <p class="text-xs text-gray-500">Use these keys to authenticate your API requests</p>
  </div>

  <div id="keys-list" class="space-y-3 mb-6 px-8">
    <p class="text-xs text-center text-gray-500">Loading keys...</p>
  </div>

  <div class="flex justify-center">
    <button id="create-new-key-btn"
      class="h-8 flex items-center justify-center text-sm font-normal border border-solid text-base px-4 py-1 text-center rounded transition-all duration-200 outline-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:ring-shadow-none ${SECONDARY_BUTTON_STYLE} disabled:opacity-50 disabled:cursor-not-allowed">
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
      </svg>
      <span>Create new key</span>
    </button>
    </div>
  </div>`;

  const tabs = {
    Code: {
      content: codeTab,
    },
    Keys: {
      content: keysTab,
    },
  };

  // Create tabbed interface HTML
  const sidebarHtml = `
    <div class="tabs-container">
      <div class="tabs-header flex justify-center p-1 bg-gray-100 rounded-full w-fit mx-auto my-2">
        ${Object.entries(tabs)
          .map(([key, tab], index) => {
            return `<button id="${key}-tab-btn" class="tab-btn px-6 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 rounded-full transition-colors">${key}</button>`;
          })
          .join('')}
      </div>
      <div class="tabs-content">
        ${Object.entries(tabs)
          .map(([key, tab]) => {
            return `<div id="${key}-tab-content" class="tab-content p-4 hidden">${tab.content}</div>`;
          })
          .join('')}
      </div>
    </div>
  `;

  openEmbodimentDialog(
    sidebarHtml,
    {},
    EMBODIMENT_DESCRIPTIONS.llm.title,
    EMBODIMENT_DESCRIPTIONS.llm.tooltipTitle,
  );

  function initSidebar() {
    initTabSwitcher();

    const codeSelector = document.getElementById('code-sample-selector') as HTMLSelectElement;
    const apiKeySelect = document.getElementById('api-key-select') as HTMLSelectElement;
    const versionSelect = document.getElementById('agent-version-select') as HTMLSelectElement;

    // Single function to handle all code display updates
    function handleCodeDisplayUpdate() {
      const key = apiKeySelect?.value.trim();
      const version = versionSelect?.value || 'dev';
      const language = codeSelector?.value as CodeLanguage;

      if (language) {
        updateCodeDisplay(language, key, version);
      }
    }

    // Initialize copy button functionality
    const copyButton = document.getElementById('copy-code-btn');
    if (copyButton) {
      copyButton.addEventListener('click', async () => {
        try {
          const codeTextarea = document.getElementById(
            'code-sample-textarea',
          ) as HTMLTextAreaElement;
          if (codeTextarea) {
            await navigator.clipboard.writeText(codeTextarea.value);
            copyButton.classList.add('text-green-600');
            setTimeout(() => {
              copyButton.classList.remove('text-green-600');
            }, 2000);
          }
        } catch (err) {
          console.error('Failed to copy code:', err);
        }
      });
    }

    // Initialize API key selector
    if (apiKeySelect) {
      const updateKeyOptions = async () => {
        const result = await fetchAgentLLMKeys();
        if (!result) return;

        apiKeySelect.innerHTML =
          '<option value="">None</option>' +
          Object.entries(result.data)
            .map(([id, keyData]) => `<option value="${keyData.key}">${keyData.name}</option>`)
            .join('');
      };

      updateKeyOptions();
      apiKeySelect.addEventListener('change', handleCodeDisplayUpdate);
    }

    // Initialize version selector
    if (versionSelect) {
      populateVersionSelector();
      versionSelect.addEventListener('change', handleCodeDisplayUpdate);
    }

    // Initialize code language selector
    if (codeSelector) {
      codeSelector.addEventListener('change', handleCodeDisplayUpdate);

      // Set initial code display
      const firstLanguage = codeSelector.value as CodeLanguage;
      updateCodeDisplay(firstLanguage);
    }

    // Initialize other UI elements
    attachCreateKeyBtn();
    populateKeysList();
  }

  setTimeout(initSidebar, 500);
}
